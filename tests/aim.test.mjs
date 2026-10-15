import assert from "node:assert/strict";
import test from "node:test";
import {
  ARENA, FOODS, TUNING, crateAt, createArcade, flightOf, launchFood, previewFlight, probeFlight, replayArcade, stepArcade,
} from "../lib/game/arcade.ts";

/**
 * Stage 6: the cannon. Each coin flies its own way, so one barrel setting is
 * not enough; and a block shuttles on a rail under the ceiling that only its
 * own coin opens.
 */

function advance(state, tick, fed = true) {
  while (state.tick < tick && state.phase === "playing") {
    if (fed) state.hunger = Math.max(state.hunger, 60);
    stepArcade(state);
  }
}

/** A state with a crate that has been on the rail for `age` ticks. */
function withCrate(seed = 1, age = 60) {
  const state = createArcade(seed);
  advance(state, TUNING.crateFirst + age);
  assert.equal(state.crates.length, 1, "a crate on the rail");
  return state;
}

/** The first shot (coin, angle, power) the probe says will do `want`. */
function findShot(state, coins, want) {
  for (const ingredient of coins) {
    for (let power = ARENA.maxPower; power >= ARENA.minPower; power -= 1) {
      for (let angle = ARENA.minAngle; angle <= ARENA.maxAngle; angle += 1) {
        const result = probeFlight(state, ingredient, angle, power, 200);
        if (want(result)) return { ingredient, angle, power, result };
      }
    }
  }
  return null;
}

test("each coin flies its own way: Bitcoin heavy, Ether slow and floaty, HEMI dead straight through its burn", () => {
  const btc = flightOf("metal");
  const eth = flightOf("balloon");
  const hemi = flightOf("pepper");
  assert.ok(btc.gravity > hemi.gravity && hemi.gravity > eth.gravity, "Bitcoin falls hardest, Ether least");
  assert.ok(eth.speed < btc.speed && btc.speed < hemi.speed, "Ether is the slow one, HEMI the fast one");
  assert.ok(hemi.burn > 0 && btc.burn === 0 && eth.burn === 0, "only HEMI has a straight burn");

  const state = createArcade(1);
  state.beatAt = state.crateAt = state.cravingNextAt = 1e9;
  assert.ok(launchFood(state, "pepper", -30, 13));
  const coin = state.projectiles[0];
  const vy = coin.vy;
  for (let i = 0; i < hemi.burn; i += 1) stepArcade(state);
  assert.equal(coin.vy, vy, "a HEMI does not fall at all during its burn");
  stepArcade(state);
  assert.ok(coin.vy > vy, "and falls once the burn is out");
});

test("one barrel setting does not feed every coin: at the same charge the three land at different angles", () => {
  const state = createArcade(1);
  state.beatAt = state.crateAt = state.cravingNextAt = 1e9;
  const direct = (food, power) => {
    const out = new Set();
    for (let angle = ARENA.minAngle; angle <= ARENA.maxAngle; angle += 1) {
      const r = probeFlight(state, food, angle, power, 240);
      if (r.fed && r.bank === 0 && r.bounces === 0) out.add(angle);
    }
    return out;
  };
  for (const power of [ARENA.minPower, 11, 13, 15, ARENA.maxPower]) {
    const lanes = FOODS.map((food) => direct(food, power));
    for (let a = 0; a < 3; a += 1) {
      for (let b = a + 1; b < 3; b += 1) {
        const shared = [...lanes[a]].filter((angle) => lanes[b].has(angle));
        assert.ok(shared.length <= 2, `${FOODS[a]} and ${FOODS[b]} share ${shared.length} direct angles at power ${power}`);
      }
    }
  }
  // Bitcoin is heavy: below a near-full charge it does not reach the mouth at all.
  assert.equal(direct("metal", 13).size, 0, "a Bitcoin at a medium charge falls short");
  assert.ok(direct("metal", ARENA.maxPower).size >= 8, "and a full charge has a wide window");
  // HEMI flies straight, so the charge barely moves where it has to be pointed.
  const low = [...direct("pepper", 11)]; const high = [...direct("pepper", ARENA.maxPower)];
  assert.ok(low.length >= 4 && high.length >= 4);
  assert.ok(Math.abs(low.reduce((a, b) => a + b, 0) / low.length - high.reduce((a, b) => a + b, 0) / high.length) <= 4);
});

test("a crate comes down through the hatch, shuttles along the rail, and is hoisted away if nobody breaks it", () => {
  const state = createArcade(3);
  advance(state, TUNING.crateFirst - 1);
  assert.equal(state.crates.length, 0);
  advance(state, TUNING.crateFirst);
  assert.equal(state.crates.length, 1);
  const crate = state.crates[0];
  assert.ok(state.events.some((e) => e.type === "crate" && e.name === "spawn"));
  assert.ok(FOODS.includes(crate.ingredient));
  // It starts at the hatch, up at the rail, and is lowered to its drop.
  let at = crateAt(crate, crate.born);
  assert.ok(Math.abs(at.hookX - ARENA.rail.from) < 0.01 && Math.abs(at.y - ARENA.rail.y) < 0.01);
  let minX = Infinity; let maxX = -Infinity;
  for (let t = crate.born; t < crate.born + crate.life; t += 1) {
    at = crateAt(crate, t);
    minX = Math.min(minX, at.hookX); maxX = Math.max(maxX, at.hookX);
    assert.ok(at.y >= ARENA.rail.y - 0.01 && at.y <= crate.drop + 0.01, "between the rail and its drop");
  }
  assert.ok(minX >= ARENA.rail.from - 0.01 && maxX <= ARENA.rail.to + 0.01, "it stays on the rail");
  assert.ok(maxX - minX > (ARENA.rail.to - ARENA.rail.from) * 0.9, "and uses the whole of it");
  advance(state, crate.born + crate.life);
  assert.equal(state.crates.length, 0, "hoisted away at the end of its life");
  assert.equal(state.cratesLost, 1);
  assert.ok(state.events.some((e) => e.type === "crate" && e.name === "gone"));
  assert.equal(state.crateAt, crate.born + crate.life + crate.gap, "the next one waits its gap");
});

test("its own coin breaks a crate open, and the coins inside pour into the mouth whole: no chew, a combo, double pay", () => {
  const state = withCrate(1, 40);
  const crate = state.crates[0];
  const shot = findShot(state, [crate.ingredient], (r) => r.crate === true);
  assert.ok(shot, "a shot the probe says breaks it");
  const preview = previewFlight(state, shot.ingredient, shot.angle, shot.power, 200);
  assert.ok(preview.settled && preview.ticks <= shot.result.ticks, "the guide sees the crate coming");
  const last = preview.points[preview.points.length - 1];
  const block = crateAt(crate, state.tick + shot.result.ticks);
  assert.ok(Math.hypot(last.x - block.x, last.y - block.y) < TUNING.crateRadius + 30, "and stops where it breaks");
  state.combo = 0;
  const feeds = state.totalFeeds;
  const seen = state.nextEventId;
  assert.ok(launchFood(state, shot.ingredient, shot.angle, shot.power));
  const chewBefore = state.creature.chewUntil;
  advance(state, state.tick + shot.result.ticks);
  assert.equal(state.cratesBroken, 1);
  assert.equal(state.crates.length, 0);
  const hit = state.events.find((e) => e.id >= seen && e.type === "crate" && e.name === "hit");
  assert.ok(hit && hit.value === TUNING.crateCoins);
  const pour = state.projectiles.filter((p) => p.kind === "pour");
  assert.equal(pour.length, TUNING.crateCoins);
  assert.ok(pour.every((p) => p.ingredient === crate.ingredient));
  advance(state, state.tick + TUNING.pourMaxAge + 1);
  assert.equal(state.totalFeeds - feeds, TUNING.crateCoins, "every coin inside is swallowed");
  assert.ok(state.combo >= TUNING.crateCoins);
  const crateFeeds = state.events.filter((e) => e.id >= seen && e.type === "feed" && e.label.startsWith("CRATE"));
  assert.equal(crateFeeds.length, TUNING.crateCoins);
  assert.ok(!state.events.some((e) => e.id >= seen && e.type === "chew"), "swallowed whole: no chew");
  assert.equal(state.creature.chewUntil, chewBefore);
  assert.ok(crateFeeds[0].value >= 100 * TUNING.crateMult, "the crate's multiplier is paid");
  assert.equal(state.servings[crate.ingredient] >= TUNING.crateCoins, true, "and they count toward its mutation");
});

test("any other coin glances off a crate and leaves it hanging", () => {
  const state = withCrate(2, 40);
  const crate = state.crates[0];
  const others = FOODS.filter((food) => food !== crate.ingredient);
  // Find a line that breaks it for its own coin, then fire the other coins until one glances off.
  let bounced = false;
  for (const food of others) {
    for (let power = ARENA.maxPower; power >= ARENA.minPower && !bounced; power -= 1) {
      for (let angle = ARENA.minAngle; angle <= ARENA.maxAngle && !bounced; angle += 1) {
        const trial = structuredClone(state);
        if (!launchFood(trial, food, angle, power)) continue;
        const seen = trial.nextEventId;
        for (let i = 0; i < 120 && trial.projectiles.length; i += 1) {
          stepArcade(trial);
          if (trial.events.some((e) => e.id >= seen && e.type === "bounce" && e.name === "crate")) {
            bounced = true;
            assert.equal(trial.crates.length, 1, "the crate is still there");
            assert.equal(trial.cratesBroken, 0);
            break;
          }
        }
      }
    }
    if (bounced) break;
  }
  assert.ok(bounced, "some other coin glances off it");
  // The probe never calls a wrong coin a crate hit.
  for (const food of others) {
    for (let angle = ARENA.minAngle; angle <= ARENA.maxAngle; angle += 3) {
      assert.ok(!probeFlight(state, food, angle, 14, 200).crate);
    }
  }
});

test("crates are seeded: the same seed hangs the same crates, and a trace that breaks one replays exactly", () => {
  const a = withCrate(9, 30);
  const b = withCrate(9, 30);
  assert.deepEqual(a.crates, b.crates);
  const c = withCrate(10, 30);
  assert.notDeepEqual({ ...a.crates[0], id: 0 }, { ...c.crates[0], id: 0 });
  // A live run that breaks a crate, replayed from its commands.
  const seed = 9;
  const live = createArcade(seed);
  const commands = [];
  while (live.tick < TUNING.crateFirst + 200 && live.phase === "playing") {
    if (live.crates.length && commands.length === 0) {
      const shot = findShot(live, [live.crates[0].ingredient], (r) => r.crate === true);
      if (shot && launchFood(live, shot.ingredient, shot.angle, shot.power)) {
        commands.push({ tick: live.tick, kind: "launch", ingredient: shot.ingredient, angle: shot.angle, power: shot.power });
      }
    }
    stepArcade(live);
  }
  assert.equal(live.cratesBroken, 1);
  assert.deepEqual(replayArcade(seed, commands, live.tick), live);
});
