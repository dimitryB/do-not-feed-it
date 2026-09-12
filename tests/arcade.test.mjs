import assert from "node:assert/strict";
import test from "node:test";
import {
  ARENA, FOODS, TUNING, GAME_VERSION, createArcade, endingFor, getHazard, launchFood,
  probeFlight, replayArcade, slamHatch, stepArcade, trajectoryPreview,
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
  // Angle *and* power: at a single fixed power only a couple of angles land,
  // which is the point of the charge.
  for (let angle = ARENA.maxAngle; angle >= ARENA.minAngle; angle -= 1) {
    for (let power = ARENA.minPower; power <= ARENA.maxPower; power += 1) {
      const result = probeFlight(state, state.wanted, angle, power, 240);
      if (result.fed) return { angle, power, ticks: result.ticks };
    }
  }
  return null;
}

/**
 * Waits for a window and then takes the shot the rules say will land. Waiting
 * is the point: at most moments there is no angle that arrives while the mouth
 * is open, which is the difference between this loop and the old one.
 */
function feedOnce(state, patience = 900) {
  const before = state.totalFeeds;
  for (let i = 0; i < patience && state.phase === "playing"; i += 1) {
    if (state.tick - state.lastLaunchTick >= ARENA.cooldownTicks) {
      const shot = landingShot(state);
      if (shot) {
        assert.equal(launchFood(state, state.wanted, shot.angle, shot.power), true);
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
  // It is turned away once at the mouth and may then drop onto the chest, which
  // is a second, cheaper contact. What must not happen is a charge per tick.
  assert.ok(state.rage - rageBefore <= TUNING.snubRage + TUNING.blockRage + TUNING.missRage);
});

test("every accepted serving grows the creature, and growth moves the target", () => {
  const state = createArcade(2026);
  const start = { size: state.creature.size, x: state.creature.x, y: state.creature.y, rx: state.creature.rx };
  // A player this patient starves: waiting for a guaranteed window is itself a
  // way to lose, which is the point of the appetite. Take the feeds it gets.
  let fed = 0;
  for (let i = 0; i < 20 && state.phase === "playing"; i += 1) if (feedOnce(state)) fed += 1;
  assert.ok(fed >= 5, `expected a probe-aimed player to land several shots, landed ${fed}`);
  assert.ok(state.creature.size > start.size + 0.1, "the creature did not grow");
  assert.ok(state.creature.rx > start.rx, "a bigger creature has a bigger mouth");
  assert.ok(state.creature.x <= start.x, "it leans in as it grows");
  // The resting height, with the balloon's lift and the hungry lean taken out:
  // both move the mouth on their own and neither is growth.
  const restY = (size) => ARENA.mouth.y - (size - 1) * TUNING.risePerSize;
  assert.ok(restY(state.creature.size) < restY(start.size) - 20, "it rises over the counter as it grows");
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
    if (state.hunger <= feedBelow && state.tick - state.lastLaunchTick >= ARENA.cooldownTicks
        && state.tick >= state.reloadUntil && state.tick >= state.hatchClosedUntil) {
      const shot = landingShot(state);
      if (shot) launchFood(state, state.wanted, shot.angle, shot.power);
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

test("no snack stays in the air forever, however it rebounds", () => {
  for (const food of FOODS) for (const angle of [-65, -40, -5]) {
    const state = createArcade(1);
    launchFood(state, food, angle);
    advance(state, 600);
    assert.equal(state.projectiles.length, 0, `${food} at ${angle} never came down`);
    assert.ok(state.misses + state.totalFeeds + state.snubs >= 1);
  }
});

test("a snack that falls short hits the creature instead of passing through it", () => {
  const state = createArcade(3);
  advance(state, 60);
  const belly = { x: state.creature.bx, y: state.creature.by + state.creature.bry * 0.4 };
  state.projectiles.push({
    id: 1, ingredient: "metal", x: belly.x - 30, y: belly.y, vx: 9, vy: 1,
    age: 0, bounces: 0, hazardBounces: 0, assisted: false, faceHits: 0,
  });
  stepArcade(state);
  assert.equal(state.totalFeeds, 0);
  assert.equal(state.snubs, 1);
  assert.equal(state.events.at(-1).label, "OFF THE BELLY");
  assert.ok(state.projectiles[0].vx < 0, "it should come back off the chest, not carry on through");
});

test("a real trace replays bit-for-bit, including the creature", () => {
  const state = createArcade(9876);
  const commands = [];
  for (let i = 0; i < 60 && state.phase === "playing"; i += 1) {
    const shot = landingShot(state) ?? { angle: -40 };
    const ingredient = FOODS[i % 3];
    const power = shot.power ?? 13;
    if (launchFood(state, ingredient, shot.angle, power)) {
      commands.push({ tick: state.tick, kind: "launch", ingredient, angle: shot.angle, power });
    }
    advance(state, state.tick + 34);
  }
  const endTick = state.tick;
  assert.ok(state.totalFeeds > 5);
  assert.deepEqual(replayArcade(9876, commands, endTick), state);
});

test("replay validates the entire trace and rejects impossible or malformed commands", () => {
  const valid = { tick: 0, kind: "launch", ingredient: "metal", angle: -40, power: 13 };
  for (const commands of [
    [null], [{ ...valid, tick: -1 }], [{ ...valid, tick: 1.5 }],
    [{ ...valid, ingredient: "unknown" }], [{ ...valid, angle: NaN }],
    [{ ...valid, angle: -40.5 }], [{ ...valid, angle: -66 }],
    [{ ...valid, power: 8 }], [{ ...valid, power: 17 }], [{ ...valid, power: 12.5 }],
    [{ ...valid, kind: "wiggle" }],
    [valid, { ...valid, tick: 1 }], [valid, valid],
    [{ ...valid, tick: 100 }, valid], [{ ...valid, tick: 201 }],
  ]) assert.throws(() => replayArcade(1, commands, 200));
  assert.throws(() => replayArcade(1, [], -1));
  assert.throws(() => replayArcade(1, [], ARENA.maxTicks + 1));
  assert.throws(() => createArcade(NaN));
});

test("the vent only exists once the creature has bitten it off", () => {
  for (const tick of [0, 1000, 2280, 5000, 40000]) assert.equal(getHazard(null, tick), null);
  const vent = { since: 1000 };
  assert.equal(getHazard(vent, 1000).warning, true, "it is not solid the instant it is torn off");
  assert.equal(getHazard(vent, 1119).warning, true);
  assert.equal(getHazard(vent, 1120).warning, false);
  for (let tick = 1120; tick < 4000; tick += 1) {
    const hazard = getHazard(vent, tick);
    assert.ok(hazard.y >= 87.5 && hazard.y <= 317.5);
    assert.deepEqual(getHazard(vent, tick + 300), hazard);
  }
});

test("a craving satisfied in time pays, calms it and pauses the growth", () => {
  const state = createArcade(1);
  // Cravings start after a short gap; run to the first one.
  for (let i = 0; i < 600 && !state.craving; i += 1) stepArcade(state);
  assert.ok(state.craving, "no craving ever appeared");
  const wanted = state.craving.ingredient;
  const other = FOODS.find((food) => food !== wanted);
  assert.ok(waitForOpen(state));

  const place = (target, ingredient) => {
    target.projectiles.push({
      id: 1, ingredient, kind: "food", x: target.creature.x, y: target.creature.y, vx: 4, vy: 3,
      age: 0, bounces: 0, hazardBounces: 0, assisted: false, faceHits: 0,
    });
    stepArcade(target);
  };
  const onMenu = structuredClone(state);
  const offMenu = structuredClone(state);
  place(onMenu, wanted);
  place(offMenu, other);
  assert.equal(onMenu.totalFeeds, 1);
  assert.equal(offMenu.totalFeeds, 1);
  assert.ok(onMenu.score - offMenu.score >= TUNING.cravingBonus,
    `craving paid ${onMenu.score - offMenu.score}`);
  assert.equal(onMenu.cravingsMet, 1);
  assert.ok(onMenu.growthPausedUntil > onMenu.tick, "satisfying a craving must pause the growth");
  // Off-menu is eaten anyway, and it still counts toward that mutation.
  assert.equal(offMenu.servings[other], 1);
  assert.ok(offMenu.craving, "an off-menu serving does not answer the craving");
});

test("an ignored craving costs composure and knocks the bench about", () => {
  const state = createArcade(4);
  for (let i = 0; i < 600 && !state.craving; i += 1) stepArcade(state);
  assert.ok(state.craving);
  const rageBefore = state.rage;
  while (state.craving && state.phase === "playing") stepArcade(state);
  assert.equal(state.cravingsMissed, 1);
  assert.ok(state.rage > rageBefore, "ignoring it has to cost something");
  assert.ok(state.events.some((item) => item.type === "tantrum"));
  assert.ok(state.reloadUntil > state.tick, "the tantrum should cost launcher time");
});

test("power is half the aim: an angle that lands at one charge misses at another", () => {
  const state = createArcade(9);
  advance(state, 30);
  const bands = new Map();
  for (let power = ARENA.minPower; power <= ARENA.maxPower; power += 1) {
    const lands = [];
    for (let angle = ARENA.minAngle; angle <= ARENA.maxAngle; angle += 1) {
      if (probeFlight(state, "metal", angle, power, 240).fed) lands.push(angle);
    }
    bands.set(power, lands);
  }
  const shapes = new Set([...bands.values()].map((band) => band.join(",")));
  assert.ok(shapes.size >= 3, "the charge barely changes where a shot lands");
  // And no single charge is the answer to everything.
  for (const [power, band] of bands) {
    assert.ok(band.length < (ARENA.maxAngle - ARENA.minAngle), `power ${power} lands at every angle`);
  }
});

test("the hatch blocks a serving coming back, and costs launcher time to use", () => {
  const state = createArcade(12);
  advance(state, 60);
  assert.equal(slamHatch(state), true);
  assert.ok(state.hatchClosedUntil > state.tick);
  // While it is down, nothing can be fired. That is the cost.
  assert.equal(launchFood(state, "metal", -40, 13), false);
  // And it cannot be spammed.
  assert.equal(slamHatch(state), false);

  const blocked = createArcade(12);
  advance(blocked, 60);
  slamHatch(blocked);
  blocked.projectiles.push({
    id: 9, ingredient: "pepper", kind: "spit",
    x: ARENA.launcher.x + 30, y: ARENA.launcher.y, vx: -8, vy: 0,
    age: 0, bounces: 0, hazardBounces: 0, assisted: true, faceHits: 0,
  });
  const jammedBefore = blocked.reloadUntil;
  stepArcade(blocked);
  assert.equal(blocked.reloadUntil, jammedBefore, "a blocked spit must not jam the launcher");
  assert.equal(blocked.hatchSaves, 1);
});

test("an unstopped lunge takes the vent off the wall, permanently", () => {
  const state = createArcade(21);
  let guard = 0;
  while (!state.vent && state.phase === "playing" && guard++ < 40000) stepArcade(state);
  assert.ok(state.vent, "no lunge ever landed");
  assert.ok(getHazard(state.vent, state.tick + 400), "the vent should now be a hazard");
  const at = state.vent.since;
  advance(state, state.tick + 600);
  assert.equal(state.vent.since, at, "kitchen damage does not repair itself");
});

test("the ending escalates with how big it got", () => {
  assert.equal(endingFor(1), 0);
  assert.equal(endingFor(TUNING.sizeMax), 3);
  const seen = new Set([endingFor(1), endingFor(1.5), endingFor(2), endingFor(TUNING.sizeMax)]);
  assert.ok(seen.size >= 3, "the four endings must not collapse into one");
});
