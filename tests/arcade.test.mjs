import assert from "node:assert/strict";
import test from "node:test";
import {
  ARENA, FOODS, TUNING, GAME_VERSION, createArcade, getHazard, launchFood,
  probeFlight, replayArcade, stepArcade, trajectoryPreview,
} from "../lib/game/arcade.ts";

function advance(state, tick) {
  while (state.tick < tick && state.phase === "playing") stepArcade(state);
}

/** Steps until the mouth is open enough to accept a serving. */
function waitForOpen(state, limit = 600) {
  for (let i = 0; i < limit; i += 1) {
    if (state.creature.aperture >= TUNING.openMin) return true;
    stepArcade(state);
  }
  return false;
}

/** Steps until the mouth is shut. */
function waitForShut(state, limit = 600) {
  for (let i = 0; i < limit; i += 1) {
    if (state.creature.aperture < TUNING.openMin) return true;
    stepArcade(state);
  }
  return false;
}

/**
 * Fires the shot the rules themselves say will land, so a test about feeding
 * is not also a test of whether some hard-coded angle still happens to work.
 */
function landingShot(state) {
  for (let angle = ARENA.maxAngle; angle >= ARENA.minAngle; angle -= 1) {
    const result = probeFlight(state, state.wanted, angle, null, 240);
    if (result.fed) return { angle, ticks: result.ticks };
  }
  return null;
}

/**
 * Waits for a window and then takes the shot the rules say will land. Waiting
 * is the point: at most moments there is no angle that arrives while the mouth
 * is open, which is the difference between this loop and the old one.
 */
function feedOnce(state, patience = 400) {
  const before = state.totalFeeds;
  for (let i = 0; i < patience && state.phase === "playing"; i += 1) {
    if (state.tick - state.lastLaunchTick >= ARENA.cooldownTicks) {
      const shot = landingShot(state);
      if (shot) {
        assert.equal(launchFood(state, state.wanted, shot.angle), true);
        for (let j = 0; j < 260 && state.totalFeeds === before && state.phase === "playing"; j += 1) stepArcade(state);
        return state.totalFeeds > before;
      }
    }
    stepArcade(state);
  }
  return false;
}

test("the version constant is present and the shift is endless", () => {
  assert.equal(typeof GAME_VERSION, "number");
  assert.ok(GAME_VERSION >= 1);
  assert.ok(ARENA.maxTicks >= 60 * 60 * 5, "the cap exists to bound a replay, not to end a shift");
  assert.equal("roundTicks" in ARENA, false, "there is no round any more");
});

test("the seed drives the mouth's rhythm, so two seeds are two different shifts", () => {
  const shapes = (seed) => {
    const state = createArcade(seed);
    const out = [];
    for (let i = 0; i < 900; i += 1) {
      stepArcade(state);
      if (state.creature.cycleTick === 0) out.push([state.creature.openTicks, state.creature.shutTicks]);
    }
    return JSON.stringify(out);
  };
  assert.notEqual(shapes(1), shapes(2));
  assert.equal(shapes(7), shapes(7), "the same seed is the same shift");
});

test("a shut mouth refuses food and an open one takes it", () => {
  const shut = createArcade(11);
  assert.ok(waitForShut(shut));
  // Placed inside the collision ellipse by hand: this is about the aperture
  // rule alone, not about whether a particular angle arrives on time.
  shut.projectiles.push({
    id: 99, ingredient: "metal", x: shut.creature.x, y: shut.creature.y, vx: 6, vy: 0,
    age: 0, bounces: 0, hazardBounces: 0, assisted: false, faceHits: 0,
  });
  stepArcade(shut);
  assert.equal(shut.totalFeeds, 0);
  assert.equal(shut.snubs, 1);
  assert.ok(shut.events.some((item) => item.type === "snub"));
  // It is turned away, not deleted: a snub is a physical rejection.
  assert.equal(shut.projectiles.length, 1);
  assert.ok(shut.projectiles[0].vx < 0);

  const open = createArcade(11);
  assert.ok(waitForOpen(open));
  open.projectiles.push({
    id: 99, ingredient: "metal", x: open.creature.x, y: open.creature.y, vx: 6, vy: 0,
    age: 0, bounces: 0, hazardBounces: 0, assisted: false, faceHits: 0,
  });
  stepArcade(open);
  assert.equal(open.totalFeeds, 1);
  assert.equal(open.snubs, 0);
});

test("one snack rattling against a shut face costs composure exactly once", () => {
  const state = createArcade(5);
  assert.ok(waitForShut(state));
  const food = {
    id: 99, ingredient: "metal", x: state.creature.x, y: state.creature.y, vx: 0.2, vy: 0,
    age: 0, bounces: 0, hazardBounces: 0, assisted: false, faceHits: 0,
  };
  state.projectiles.push(food);
  const rageBefore = state.rage;
  for (let i = 0; i < 40; i += 1) stepArcade(state);
  assert.equal(state.snubs, 1);
  assert.ok(state.rage - rageBefore <= TUNING.snubRage);
});

test("every accepted serving grows the creature, and growth moves the target", () => {
  const state = createArcade(2026);
  const start = { size: state.creature.size, x: state.creature.x, y: state.creature.y, rx: state.creature.rx };
  let fed = 0;
  for (let i = 0; i < 20 && state.phase === "playing"; i += 1) if (feedOnce(state)) fed += 1;
  assert.ok(fed >= 12, `expected a patient, probe-aimed player to land most shots, landed ${fed}`);
  assert.ok(state.creature.size > start.size + 0.1, "the creature did not grow");
  assert.ok(state.creature.rx > start.rx, "a bigger creature has a bigger mouth");
  assert.ok(state.creature.x < start.x, "it leans in as it grows");
  assert.ok(state.creature.y < start.y, "it rises as it grows");
});

test("growth shortens the open window and lengthens the wait", () => {
  const small = createArcade(4242);
  const big = createArcade(4242);
  // Just short of the cap: reaching the cap ends the shift.
  big.creature.size = TUNING.sizeMax - 0.05;
  big.size = big.creature.size;
  const windows = (state) => {
    const out = [];
    for (let i = 0; i < 2000; i += 1) {
      stepArcade(state);
      if (state.creature.cycleTick === 0) out.push(state.creature.openTicks);
    }
    return out.reduce((a, b) => a + b, 0) / out.length;
  };
  const smallWindow = windows(small);
  const bigWindow = windows(big);
  assert.ok(bigWindow < smallWindow * 0.6, `open window did not shrink: ${smallWindow} -> ${bigWindow}`);
});

test("appetite drains faster the bigger it is", () => {
  const drop = (size) => {
    const state = createArcade(3);
    state.creature.size = size;
    state.size = size;
    advance(state, TUNING.graceTicks + 1);
    const before = state.hunger;
    advance(state, state.tick + 600);
    return before - state.hunger;
  };
  const small = drop(1);
  const large = drop(2.2);
  assert.ok(small > 5, "a shift with no feeding must actually run down");
  assert.ok(large > small * 1.6, `drain did not scale with size: ${small} -> ${large}`);
});

test("a shift that is never fed ends on an empty belly, not on a clock", () => {
  const state = createArcade(1);
  advance(state, TUNING.graceTicks);
  assert.equal(state.hunger, TUNING.hungerStart);
  advance(state, ARENA.maxTicks);
  assert.equal(state.phase, "lost");
  assert.equal(state.failureReason, "empty-belly");
  assert.ok(state.tick < 60 * 120, "an unattended shift should not survive two minutes");
});

/**
 * The title as a test.
 *
 * Two players, one seed. One feeds whenever the launcher lets it; the other
 * only feeds when the creature is actually hungry. The rationing player must
 * last longer, or "Do Not Feed It" is not advice.
 */
function play(seed, feedBelow, untilTick = ARENA.maxTicks) {
  const state = createArcade(seed);
  while (state.phase === "playing" && state.tick < untilTick) {
    if (state.hunger <= feedBelow && state.tick - state.lastLaunchTick >= ARENA.cooldownTicks) {
      const shot = landingShot(state);
      if (shot) launchFood(state, state.wanted, shot.angle);
    }
    stepArcade(state);
  }
  return state;
}

test("feeding it whenever you can is worse than feeding it when it is hungry", () => {
  let rationedLonger = 0;
  for (const seed of [808, 1234, 99, 40404, 7]) {
    const gorger = play(seed, 101);
    assert.equal(gorger.phase, "lost", `seed ${seed}: the gorging player never died`);
    // Only played as far as the gorger got: outliving it is the whole claim,
    // and running a patient player to the twelve-minute cap is slow.
    const rationer = play(seed, 55, gorger.tick + 1);
    if (rationer.phase === "playing" || rationer.tick > gorger.tick) rationedLonger += 1;
  }
  assert.ok(rationedLonger >= 4, `rationing beat gorging on only ${rationedLonger} of 5 seeds`);
});

test("the creature always wins: every shift ends, and it ends bigger than it started", () => {
  const state = play(808, 78);
  assert.equal(state.phase, "lost");
  assert.ok(state.creature.size > 1.5, `ended at size ${state.creature.size}`);
  assert.ok(["empty-belly", "kitchen-destroyed", "outgrew-the-kitchen"].includes(state.failureReason));
});

test("terminal states are immutable", () => {
  const state = createArcade(1);
  advance(state, ARENA.maxTicks);
  assert.equal(state.phase, "lost");
  const before = structuredClone(state);
  assert.equal(launchFood(state, "metal", -40), false);
  stepArcade(state);
  assert.deepEqual(state, before);
});

test("the prediction agrees with the rules it predicts", () => {
  for (const seed of [1, 77, 4096]) {
    const state = createArcade(seed);
    advance(state, 37);
    for (const angle of [-55, -40, -20]) {
      const predicted = probeFlight(state, "metal", angle, null, 240);
      const live = createArcade(seed);
      advance(live, 37);
      assert.equal(launchFood(live, "metal", angle), true);
      let ticks = 0;
      const feeds = live.totalFeeds;
      for (let i = 1; i <= 240; i += 1) {
        stepArcade(live);
        ticks = i;
        if (live.totalFeeds > feeds) break;
        if (!live.projectiles.length) break;
      }
      assert.equal(live.totalFeeds > feeds, predicted.fed, `seed ${seed} angle ${angle}: fed disagreed`);
      assert.equal(ticks, predicted.ticks, `seed ${seed} angle ${angle}: timing disagreed`);
    }
  }
});

test("the trajectory guide uses exact flight physics without mutating its source", () => {
  const state = createArcade(25);
  advance(state, 40);
  const before = structuredClone(state);
  const guide = trajectoryPreview(state, "metal", -40);
  assert.deepEqual(state, before);
  assert.equal(launchFood(state, "metal", -40), true);
  assert.deepEqual(guide[0], { x: state.projectiles[0].x, y: state.projectiles[0].y });
  for (let i = 1; i <= 18; i += 1) {
    stepArcade(state);
    if (i % 3 === 0 && state.projectiles[0]) {
      assert.deepEqual(guide[i / 3], { x: state.projectiles[0].x, y: state.projectiles[0].y });
    }
  }
});

test("food capacity, cooldown, event history and launch angles are bounded", () => {
  const state = createArcade(1);
  assert.equal(launchFood(state, "metal", -200), true);
  const before = structuredClone(state);
  assert.equal(launchFood(state, "metal", -40), false);
  assert.deepEqual(state, before);
  advance(state, ARENA.cooldownTicks);
  state.projectiles = Array.from({ length: ARENA.maxProjectiles }, (_, id) => ({
    id, ingredient: "metal", x: 100, y: 100, vx: 0, vy: 0,
    age: 0, bounces: 0, hazardBounces: 0, assisted: false, faceHits: 0,
  }));
  assert.equal(launchFood(state, "metal", -40), false);
  for (let tick = state.tick; tick < 1500 && state.phase === "playing"; tick += 1) {
    launchFood(state, "metal", -40);
    stepArcade(state);
    assert.ok(state.projectiles.length <= ARENA.maxProjectiles);
    assert.ok(state.events.length <= 48);
  }
  assert.throws(() => launchFood(state, "metal", NaN));
  assert.throws(() => launchFood(state, "other", -40));
});

test("misses and a floor rebound are bounded, with no endless offscreen food", () => {
  for (const food of FOODS) for (const angle of [-65, -5]) {
    const state = createArcade(1);
    launchFood(state, food, angle);
    advance(state, 300);
    assert.equal(state.projectiles.length, 0);
    assert.ok(state.misses + state.totalFeeds + state.snubs >= 1);
  }
});

test("a real trace replays bit-for-bit, including the creature", () => {
  const state = createArcade(9876);
  const commands = [];
  for (let i = 0; i < 60 && state.phase === "playing"; i += 1) {
    const shot = landingShot(state) ?? { angle: -40 };
    const ingredient = FOODS[i % 3];
    if (launchFood(state, ingredient, shot.angle)) commands.push({ tick: state.tick, ingredient, angle: shot.angle });
    advance(state, state.tick + 34);
  }
  const endTick = state.tick;
  assert.ok(state.totalFeeds > 5);
  assert.deepEqual(replayArcade(9876, commands, endTick), state);
});

test("replay validates the entire trace and rejects impossible or malformed commands", () => {
  const valid = { tick: 0, ingredient: "metal", angle: -40 };
  for (const commands of [
    [null], [{ ...valid, tick: -1 }], [{ ...valid, tick: 1.5 }],
    [{ ...valid, ingredient: "unknown" }], [{ ...valid, angle: NaN }],
    [{ ...valid, angle: -40.5 }], [{ ...valid, angle: -66 }],
    [valid, { ...valid, tick: 1 }], [valid, valid],
    [{ ...valid, tick: 100 }, valid], [{ ...valid, tick: 201 }],
  ]) assert.throws(() => replayArcade(1, commands, 200));
  assert.throws(() => replayArcade(1, [], -1));
  assert.throws(() => replayArcade(1, [], ARENA.maxTicks + 1));
  assert.throws(() => createArcade(NaN));
});

test("vent flap warns before becoming solid, follows a bounded deterministic cycle", () => {
  assert.equal(getHazard(2279), null);
  assert.deepEqual(getHazard(2280), { x: 550, y: 87.5, width: 18, height: 115, warning: true });
  assert.equal(getHazard(2399).warning, true);
  assert.equal(getHazard(2400).warning, false);
  for (let tick = 2400; tick < 6000; tick += 1) {
    const hazard = getHazard(tick);
    assert.ok(hazard.y >= 87.5 && hazard.y <= 317.5);
    assert.deepEqual(getHazard(tick + 300), hazard);
  }
});

test("craving reward beats an equally precise off-menu shot", () => {
  const wanted = createArcade(1);
  const other = createArcade(1);
  assert.ok(waitForOpen(wanted));
  assert.ok(waitForOpen(other));
  assert.equal(wanted.tick, other.tick);
  for (const [state, food] of [[wanted, wanted.wanted], [other, FOODS.find((item) => item !== other.wanted)]]) {
    state.projectiles.push({
      id: 1, ingredient: food, x: state.creature.x, y: state.creature.y, vx: 4, vy: 0,
      age: 0, bounces: 0, hazardBounces: 0, assisted: false, faceHits: 0,
    });
    stepArcade(state);
  }
  assert.equal(wanted.totalFeeds, 1);
  assert.equal(other.totalFeeds, 1);
  assert.equal(wanted.score - other.score, 150);
});
