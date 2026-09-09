import assert from "node:assert/strict";
import test from "node:test";
import { ARENA, FOODS, getHazard, createArcade, launchFood, stepArcade, trajectoryPreview, replayArcade } from "../lib/game/arcade.ts";

function advance(state, tick) {
  while (state.tick < tick && state.phase === "playing") stepArcade(state);
}
function activate(state, ingredient, start = 0) {
  state.mutation = { ingredient, phase: "active", startsAt: start, endsAt: start + 480, gustWarning: false, gustActive: false };
}
function shot(ingredient, angle, mutation = null) {
  const state = createArcade(42);
  if (mutation) activate(state, mutation);
  launchFood(state, ingredient, angle);
  advance(state, 36);
  return state;
}

test("default aim visibly travels before all three foods are accepted once", () => {
  for (const food of FOODS) {
    const state = createArcade(12);
    assert.equal(launchFood(state, food, ARENA.defaultAngle), true);
    assert.equal(state.totalFeeds, 0);
    advance(state, 35);
    assert.equal(state.totalFeeds, 0);
    assert.ok(state.projectiles[0].x > ARENA.launcher.x);
    advance(state, 100);
    assert.equal(state.totalFeeds, 1);
    assert.equal(state.servings[food], 1);
    assert.equal(state.projectiles.length, 0);
    advance(state, 300);
    assert.equal(state.totalFeeds, 1);
  }
});

test("each mutation changes physical flight and magnetic teeth only affect metal", () => {
  const baseline = shot("metal", -40);
  const magnetic = shot("metal", -40, "metal");
  assert.notEqual(magnetic.projectiles[0].x, baseline.projectiles[0].x);
  assert.equal(magnetic.projectiles[0].assisted, true);
  assert.deepEqual(shot("pepper", -40, "metal").projectiles, shot("pepper", -40).projectiles);
  for (const food of FOODS) {
    assert.ok(shot(food, -40, "balloon").projectiles[0].y < shot(food, -40).projectiles[0].y - 60);
    assert.ok(shot(food, -40, "pepper").projectiles[0].vx < shot(food, -40).projectiles[0].vx);
  }
});

test("third serving warns for 90 ticks, activates for 480, then recovers without stacking", () => {
  const state = createArcade(2);
  for (let i = 0; i < 3; i++) {
    launchFood(state, "metal", -40);
    advance(state, state.tick + 100);
  }
  assert.equal(state.mutationEvents, 1);
  assert.equal(state.mutation.ingredient, "metal");
  assert.equal(state.mutation.phase, "warning");
  const { startsAt, endsAt } = state.mutation;
  advance(state, startsAt - 1);
  assert.equal(state.mutation.phase, "warning");
  stepArcade(state);
  assert.equal(state.mutation.phase, "active");
  assert.equal(endsAt - startsAt, 480);
  advance(state, endsAt);
  assert.equal(state.mutation, null);
  assert.match(state.announcement, /back to normal/);
  assert.ok(state.events.some((item) => item.type === "recovery"));
});

test("pepper gust has a clear warning interval before every force pulse", () => {
  const state = createArcade(2);
  activate(state, "pepper", 1);
  stepArcade(state);
  assert.equal(state.mutation.gustWarning, true);
  assert.equal(state.mutation.gustActive, false);
  advance(state, 30);
  assert.equal(state.mutation.gustWarning, true);
  stepArcade(state);
  assert.equal(state.mutation.gustWarning, false);
  assert.equal(state.mutation.gustActive, true);
  advance(state, 73);
  assert.equal(state.mutation.gustActive, false);
  advance(state, 181);
  assert.equal(state.mutation.gustWarning, true);
});

test("trajectory guide uses exact flight physics without mutating its source", () => {
  for (const mutation of [null, ...FOODS]) {
    const state = createArcade(25);
    if (mutation) activate(state, mutation);
    const before = structuredClone(state);
    const guide = trajectoryPreview(state, "metal", -40);
    assert.deepEqual(state, before);
    launchFood(state, "metal", -40);
    assert.deepEqual(guide[0], { x: state.projectiles[0].x, y: state.projectiles[0].y });
    assert.ok(Math.abs(Math.hypot(guide[0].x - ARENA.launcher.x, guide[0].y - ARENA.launcher.y) - ARENA.barrelLength) < 0.001);
    for (let i = 1; i <= 36; i++) {
      stepArcade(state);
      if (i % 3 === 0) assert.deepEqual(guide[i / 3], { x: state.projectiles[0].x, y: state.projectiles[0].y });
    }
  }
});

test("misses and a floor rebound are bounded, with no endless offscreen food", () => {
  for (const food of FOODS) for (const angle of [-65, -5]) {
    const state = createArcade(1);
    launchFood(state, food, angle);
    advance(state, 240);
    assert.equal(state.projectiles.length, 0);
    assert.equal(state.misses + state.totalFeeds, 1);
    assert.ok(state.events.filter((item) => item.type === "bounce").length <= 1);
  }
  const state = createArcade(1);
  launchFood(state, "metal", -5);
  let bounces = 0;
  for (let i = 0; i < 240; i++) {
    stepArcade(state);
    bounces = Math.max(bounces, state.projectiles[0]?.bounces ?? 0);
  }
  assert.equal(bounces, 1);
});

test("food capacity, cooldown, event history and launch angles are bounded", () => {
  const state = createArcade(1);
  assert.equal(launchFood(state, "metal", -200), true);
  const before = structuredClone(state);
  assert.equal(launchFood(state, "metal", -40), false);
  assert.deepEqual(state, before);
  advance(state, ARENA.cooldownTicks);
  state.projectiles = Array.from({ length: ARENA.maxProjectiles }, (_, id) => ({ id, ingredient: "metal", x: 100, y: 100, vx: 0, vy: 0, age: 0, bounces: 0, hazardBounces: 0, assisted: false }));
  assert.equal(launchFood(state, "metal", -40), false);
  for (let tick = state.tick; tick < 1500 && state.phase === "playing"; tick++) {
    launchFood(state, "metal", -40);
    stepArcade(state);
    assert.ok(state.projectiles.length <= ARENA.maxProjectiles);
    assert.ok(state.events.length <= 48);
  }
  assert.throws(() => launchFood(state, "metal", NaN));
  assert.throws(() => launchFood(state, "other", -40));
});

test("mixed successful launches and misses replay bit-for-bit through mutations", () => {
  const state = createArcade(9876);
  const commands = [];
  for (let tick = 0; tick <= 2500 && state.phase === "playing"; tick += 100) {
    advance(state, tick);
    const ingredient = FOODS[Math.floor(tick / 400) % 3];
    const angle = tick % 700 === 0 ? -5 : state.mutation?.ingredient === "balloon" && state.mutation.phase === "active" ? -26 : -40;
    if (launchFood(state, ingredient, angle)) commands.push({ tick: state.tick, ingredient, angle });
  }
  advance(state, 2700);
  assert.ok(state.mutationEvents > 0);
  assert.ok(state.misses > 0);
  assert.deepEqual(replayArcade(9876, commands, 2700), state);
});

test("replay validates the entire trace and rejects impossible or malformed commands", () => {
  const valid = { tick: 0, ingredient: "metal", angle: -40 };
  for (const commands of [
    [null], [{ ...valid, tick: -1 }], [{ ...valid, tick: 1.5 }],
    [{ ...valid, ingredient: "unknown" }], [{ ...valid, angle: NaN }],
    [{ ...valid, angle: -40.5 }], [{ ...valid, angle: -66 }],
    [valid, { ...valid, tick: 1 }], [valid, valid],
    [{ ...valid, tick: 100 }, valid], [{ ...valid, tick: 201 }],
    Array.from({ length: 10000 }, () => valid),
  ]) assert.throws(() => replayArcade(1, commands, 200));
  assert.throws(() => replayArcade(1, [], -1));
  assert.throws(() => replayArcade(1, [], ARENA.roundTicks + 1));
  assert.throws(() => createArcade(NaN));
  assert.throws(() => replayArcade(1, [{ ...valid, tick: 7100 }], 7200));
});

test("neglect and repeated waste end runs; terminal states are immutable", () => {
  const idle = createArcade(1);
  advance(idle, 900);
  assert.equal(idle.hunger, 78);
  advance(idle, ARENA.roundTicks);
  assert.equal(idle.phase, "lost");
  assert.equal(idle.hunger, 0);
  assert.equal(idle.failureReason, "empty-belly");
  assert.match(idle.announcement, /Empty belly/);
  const waste = createArcade(1);
  for (let tick = 0; tick < 5000 && waste.phase === "playing"; tick++) {
    if (tick % 100 === 0) launchFood(waste, "pepper", -65);
    stepArcade(waste);
  }
  assert.equal(waste.phase, "lost");
  assert.equal(waste.rage, 100);
  assert.equal(waste.failureReason, "too-many-missed-shots");
  assert.match(waste.announcement, /Too many missed shots/);
  for (const state of [idle, waste]) {
    const before = structuredClone(state);
    assert.equal(launchFood(state, "metal", -40), false);
    stepArcade(state);
    assert.deepEqual(state, before);
  }
});

test("an attentive player can complete the whole 120-second shift", () => {
  const state = createArcade(91);
  const commands = [];
  while (state.phase === "playing") {
    if (state.tick % 180 === 0) {
      const angle = state.mutation?.ingredient === "balloon" && state.mutation.phase === "active" ? -26 : -40;
      const ingredient = state.wanted;
      if (launchFood(state, ingredient, angle)) commands.push({ tick: state.tick, ingredient, angle });
    }
    stepArcade(state);
  }
  assert.equal(state.phase, "survived");
  assert.equal(state.failureReason, null);
  assert.equal(state.tick, ARENA.roundTicks);
  assert.ok(state.totalFeeds >= 25);
  assert.ok(state.mutationEvents >= 3);
  assert.deepEqual(replayArcade(91, commands, ARENA.roundTicks), state);
  const before = structuredClone(state);
  stepArcade(state);
  assert.deepEqual(state, before);
});

test("vent flap warns before becoming solid, follows a bounded deterministic cycle", () => {
  assert.equal(getHazard(2279), null);
  assert.deepEqual(getHazard(2280), { x: 550, y: 87.5, width: 18, height: 115, warning: true });
  assert.equal(getHazard(2399).warning, true);
  assert.equal(getHazard(2400).warning, false);
  assert.equal(getHazard(2550).y, 317.5);
  assert.equal(getHazard(2700).y, 87.5);
  for (let tick = 2400; tick < ARENA.roundTicks; tick++) {
    const hazard = getHazard(tick);
    assert.ok(hazard.y >= 87.5 && hazard.y <= 317.5);
    assert.deepEqual(getHazard(tick + 300), hazard);
  }
});

test("vent collision rebounds a shot once; warnings and clear routes never collide", () => {
  function crossing(tick, y) {
    const state = createArcade(1);
    state.tick = tick;
    state.projectiles.push({ id: 1, ingredient: "pepper", x: 530, y, vx: 14, vy: 0, age: 0, bounces: 0, hazardBounces: 0, assisted: false });
    stepArcade(state);
    return state;
  }
  const warning = crossing(2398, 145);
  assert.equal(warning.projectiles[0].hazardBounces, 0);
  const clear = crossing(2399, 300);
  assert.equal(clear.projectiles[0].hazardBounces, 0);
  const hit = crossing(2399, 145);
  assert.equal(hit.projectiles[0].hazardBounces, 1);
  assert.equal(hit.projectiles[0].vx, -8.4);
  assert.equal(hit.projectiles[0].vy, -3);
  assert.equal(hit.events.at(-1).label, "VENT DEFLECTION");
  // Already deflected food cannot rattle indefinitely inside the obstacle.
  hit.projectiles[0].x = 550;
  hit.projectiles[0].vx = 14;
  stepArcade(hit);
  assert.equal(hit.projectiles[0].vx, 14);
  assert.equal(hit.projectiles[0].hazardBounces, 1);
  advance(hit, 2650);
  assert.equal(hit.projectiles.length, 0);
});

test("hazard-aware preview matches the future collision and the guide shows a deflection", () => {
  const state = createArcade(1);
  state.tick = 2460;
  const guide = trajectoryPreview(state, "metal", -40);
  launchFood(state, "metal", -40);
  for (let i = 1; i <= 36; i++) {
    stepArcade(state);
    if (i % 3 === 0) assert.deepEqual(guide[i / 3], { x: state.projectiles[0].x, y: state.projectiles[0].y });
  }
  assert.equal(state.projectiles[0].hazardBounces, 1);
  assert.ok(guide.at(-1).x < guide.at(-2).x);
});

test("craving reward beats an equally precise off-menu shot", () => {
  const wanted = createArcade(1);
  const other = createArcade(1);
  launchFood(wanted, "metal", -40);
  launchFood(other, "pepper", -40);
  advance(wanted, 100);
  advance(other, 100);
  assert.equal(wanted.totalFeeds, 1);
  assert.equal(other.totalFeeds, 1);
  assert.equal(wanted.score - other.score, 150);
});
