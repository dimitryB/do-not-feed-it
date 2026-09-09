/** Local physical practice rules. This version is not a production ranked verifier. */
export type Ingredient = "metal" | "balloon" | "pepper";
export const FOODS: readonly Ingredient[] = ["metal", "balloon", "pepper"];
export const ARENA = Object.freeze({
  width: 1200, height: 700, barrelLength: 70, launcher: { x: 210, y: 540 },
  mouth: { x: 835, y: 280, rx: 85, ry: 62 }, floor: 620,
  tickRate: 60, roundTicks: 7200, minAngle: -65, maxAngle: -5,
  defaultAngle: -40, cooldownTicks: 42, maxProjectiles: 8,
});
export interface ArcadeCommand { tick: number; ingredient: Ingredient; angle: number }
export interface Projectile {
  id: number; ingredient: Ingredient; x: number; y: number; vx: number; vy: number;
  age: number; bounces: number; hazardBounces: number; assisted: boolean;
}
export interface ArcadeMutation {
  ingredient: Ingredient; phase: "warning" | "active"; startsAt: number; endsAt: number;
  gustWarning: boolean; gustActive: boolean;
}
export interface ArcadeEvent {
  id: number; tick: number;
  type: "launch" | "feed" | "miss" | "bounce" | "warning" | "mutation" | "recovery" | "gust" | "end";
  x: number; y: number; label: string;
  /** Presentation-only tag. Never read by the rules, replay or scoring. */
  ingredient?: Ingredient;
  /** Presentation-only tag: the craving matched on an accepted serving. */
  craved?: boolean;
}
export interface ArcadeState {
  seed: number; tick: number; phase: "playing" | "survived" | "lost";
  failureReason: "empty-belly" | "too-many-missed-shots" | null;
  wanted: Ingredient; hunger: number; rage: number; score: number; combo: number;
  totalFeeds: number; correctFeeds: number; shots: number; misses: number;
  servings: Record<Ingredient, number>; mutationEvents: number; lastLaunchTick: number;
  mutation: ArcadeMutation | null; announcement: string;
  projectiles: Projectile[]; events: ArcadeEvent[]; nextEventId: number; nextProjectileId: number;
}
const MAX_EVENTS = 48;
const LIFE_TICKS = 240;
const MAX_COMMANDS = Math.ceil(ARENA.roundTicks / ARENA.cooldownTicks) + 1;
const MUTATION_LABELS: Record<Ingredient, string> = {
  metal: "MAGNETIC TEETH · Metal curves toward its mouth",
  balloon: "BALLOON BELLY · Every snack feels lighter",
  pepper: "PRESSURE BURP · Watch for the next gust",
};
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const quantize = (value: number) => Math.round(value * 10000) / 10000;
function event(state: ArcadeState, type: ArcadeEvent["type"], x: number, y: number, label: string,
               extra?: { ingredient?: Ingredient; craved?: boolean }) {
  state.events.push({ id: state.nextEventId++, tick: state.tick, type, x, y, label, ...extra });
  if (state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS);
}
export function createArcade(seed: number): ArcadeState {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("Invalid arcade seed");
  return {
    seed, tick: 0, phase: "playing", failureReason: null, wanted: "metal", hunger: 78, rage: 0, score: 0, combo: 0,
    totalFeeds: 0, correctFeeds: 0, shots: 0, misses: 0,
    servings: { metal: 0, balloon: 0, pepper: 0 }, mutationEvents: 0,
    lastLaunchTick: -ARENA.cooldownTicks, mutation: null,
    announcement: "Aim for the mouth. Three of a kind changes the kitchen.",
    projectiles: [], events: [], nextEventId: 1, nextProjectileId: 1,
  };
}
function makeProjectile(id: number, ingredient: Ingredient, angle: number): Projectile {
  const radians = angle * Math.PI / 180;
  return { id, ingredient, x: quantize(ARENA.launcher.x + Math.cos(radians) * ARENA.barrelLength),
    y: quantize(ARENA.launcher.y + Math.sin(radians) * ARENA.barrelLength),
    vx: quantize(Math.cos(radians) * 13.6), vy: quantize(Math.sin(radians) * 13.6),
    age: 0, bounces: 0, hazardBounces: 0, assisted: false };
}
/** Angle is quantized here; save the same rounded/clamped angle in a replay command. */
export function launchFood(state: ArcadeState, ingredient: Ingredient, angle: number): boolean {
  if (!FOODS.includes(ingredient)) throw new Error("Unknown ingredient");
  if (!Number.isFinite(angle)) throw new Error("Invalid launch angle");
  if (state.phase !== "playing" || state.tick - state.lastLaunchTick < ARENA.cooldownTicks ||
      state.projectiles.length >= ARENA.maxProjectiles) return false;
  const food = makeProjectile(state.nextProjectileId++, ingredient, Math.round(clamp(angle, ARENA.minAngle, ARENA.maxAngle)));
  state.projectiles.push(food);
  state.lastLaunchTick = state.tick;
  state.shots++;
  event(state, "launch", food.x, food.y, ingredient, { ingredient });
  return true;
}
export interface KitchenHazard { x: number; y: number; width: number; height: number; warning: boolean }
/** The center moves 145 → 375 → 145 over a 300-tick deterministic cycle. */
export function getHazard(tick: number): KitchenHazard | null {
  if (tick < 2280) return null;
  const phase = Math.max(0, tick - 2400) % 300 / 300;
  const center = 260 + 115 * (1 - 4 * Math.abs(phase - 0.5));
  return { x: 550, y: quantize(center - 57.5), width: 18, height: 115, warning: tick < 2400 };
}
function mutationAt(mutation: ArcadeMutation | null, tick: number) {
  if (!mutation || tick < mutation.startsAt || tick >= mutation.endsAt) return null;
  return mutation.ingredient;
}
function gustAt(mutation: ArcadeMutation | null, tick: number) {
  if (mutationAt(mutation, tick) !== "pepper" || !mutation) return false;
  const cycle = (tick - mutation.startsAt) % 180;
  return cycle >= 30 && cycle < 72;
}
/** One physics step, shared by live play and the short, honest trajectory guide. */
function moveFood(food: Projectile, mutation: ArcadeMutation | null, tick: number): "flying" | "fed" | "missed" | "bounced" | "hazard" {
  food.age++;
  const previousX = food.x;
  const previousY = food.y;
  let ax = 0;
  let ay = 0.16;
  const active = mutationAt(mutation, tick);
  if (active === "metal" && food.ingredient === "metal") {
    const dx = ARENA.mouth.x - food.x;
    const dy = ARENA.mouth.y - food.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 510 && distance > 1) {
      ax += dx / distance * 0.3;
      ay += dy / distance * 0.3;
      food.assisted = true;
    }
  }
  if (active === "balloon") { ay = 0.025; food.assisted = true; }
  if (gustAt(mutation, tick) && food.x > 440) { ax -= 0.31; ay -= 0.065; food.assisted = true; }
  food.vx = quantize(clamp(food.vx + ax, -18, 18));
  food.vy = quantize(clamp(food.vy + ay, -16, 16));
  food.x = quantize(food.x + food.vx);
  food.y = quantize(food.y + food.vy);
  // Mouth is resolved first, then arena bounds, then floor. Maximum per-tick
  // speed is well below the target diameter, so a shot cannot tunnel through it.
  const dx = (food.x - ARENA.mouth.x) / ARENA.mouth.rx;
  const dy = (food.y - ARENA.mouth.y) / ARENA.mouth.ry;
  if (dx * dx + dy * dy <= 1) return "fed";
  const hazard = getHazard(tick);
  if (hazard && !hazard.warning && food.hazardBounces === 0) {
    // Swept slab intersection against the flap expanded by the snack radius.
    // This catches fast crossings and never creates an invisible collision
    // when only the segment's bounding box overlaps a corner.
    let enter = 0;
    let leave = 1;
    for (const [origin, delta, min, max] of [
      [previousX, food.x - previousX, hazard.x - 10, hazard.x + hazard.width + 10],
      [previousY, food.y - previousY, hazard.y - 10, hazard.y + hazard.height + 10],
    ]) {
      if (delta === 0) {
        if (origin < min || origin > max) { enter = 2; break; }
      } else {
        const near = (min - origin) / delta;
        const far = (max - origin) / delta;
        enter = Math.max(enter, Math.min(near, far));
        leave = Math.min(leave, Math.max(near, far));
      }
    }
    if (enter <= leave) {
      food.x = quantize(previousX + (food.x - previousX) * enter);
      food.y = quantize(previousY + (food.y - previousY) * enter);
      food.vx = quantize(-Math.abs(food.vx) * 0.6);
      food.vy = -3;
      food.hazardBounces = 1;
      return "hazard";
    }
  }
  if (food.age >= LIFE_TICKS || food.x < 50 || food.x > 1150 || food.y < -100 || food.y > 720) return "missed";
  if (food.y >= ARENA.floor - 12 && food.vy > 0) {
    if (food.bounces >= 1) return "missed";
    food.y = ARENA.floor - 12;
    food.vy = quantize(-food.vy * 0.72);
    food.vx = quantize(food.vx * 0.86);
    food.bounces++;
    return "bounced";
  }
  return "flying";
}
function acceptFood(state: ArcadeState, food: Projectile) {
  const craving = food.ingredient === state.wanted;
  state.totalFeeds++;
  if (craving) state.correctFeeds++;
  state.servings[food.ingredient]++;
  state.combo = Math.min(5, state.combo + 1);
  const precision = Math.abs(food.y - ARENA.mouth.y) < 24;
  const points = 100 + (state.combo - 1) * 40 + (craving ? 150 : 0) +
    (precision ? 50 : 0) + (food.bounces || food.hazardBounces ? 75 : 0) + (food.assisted ? 40 : 0);
  state.score += points;
  state.hunger = quantize(Math.min(100, state.hunger + (craving ? 10 : 7)));
  state.rage = Math.max(0, state.rage - 7);
  state.announcement = food.bounces ? "A bank shot. It respects the technique." :
    food.assisted ? "A little kitchen chemistry." : craving ? "Exactly what it was craving." : "It eats anything. Some things eat back.";
  event(state, "feed", food.x, food.y, `${food.bounces ? "BANK SHOT " : precision ? "PERFECT " : craving ? "CRAVING " : "TASTY "}+${points}`, { ingredient: food.ingredient, craved: craving });
  // Three consecutive cravings of each food teach the mutation threshold.
  state.wanted = FOODS[Math.floor(state.totalFeeds / 3) % FOODS.length];
  // A busy kitchen never stacks or silently replaces a current effect. A
  // threshold reached during a mutation is consumed; the next multiple of 3
  // can activate after recovery. All accepted servings count, not just cravings.
  if (state.servings[food.ingredient] % 3 === 0 && !state.mutation) {
    state.mutation = { ingredient: food.ingredient, phase: "warning", startsAt: state.tick + 90,
      endsAt: state.tick + 570, gustWarning: false, gustActive: false };
    state.mutationEvents++;
    state.announcement = MUTATION_LABELS[food.ingredient];
    event(state, "warning", ARENA.mouth.x, ARENA.mouth.y, MUTATION_LABELS[food.ingredient], { ingredient: food.ingredient });
  }
}
/** Mutates only the owned state; call exactly once per fixed 1/60-second tick. */
export function stepArcade(state: ArcadeState): void {
  if (state.phase !== "playing") return;
  state.tick++;
  state.events = state.events.filter((item) => state.tick - item.tick < 180);
  if (state.mutation) {
    const mutation = state.mutation;
    if (state.tick >= mutation.endsAt) {
      event(state, "recovery", ARENA.mouth.x, ARENA.mouth.y, "KITCHEN BACK TO NORMAL", { ingredient: mutation.ingredient });
      state.mutation = null;
      state.announcement = "Kitchen back to normal. Keep the snacks coming.";
    } else {
      if (state.tick >= mutation.startsAt && mutation.phase === "warning") {
        mutation.phase = "active";
        event(state, "mutation", ARENA.mouth.x, ARENA.mouth.y, MUTATION_LABELS[mutation.ingredient], { ingredient: mutation.ingredient });
      }
      const previousGust = mutation.gustActive;
      mutation.gustActive = gustAt(mutation, state.tick);
      mutation.gustWarning = mutation.phase === "active" && mutation.ingredient === "pepper" &&
        (state.tick - mutation.startsAt) % 180 < 30;
      if (mutation.gustActive && !previousGust) event(state, "gust", ARENA.mouth.x, ARENA.mouth.y, "BURP! HEADWIND", { ingredient: "pepper" });
    }
  }
  const remaining: Projectile[] = [];
  for (const food of state.projectiles) {
    const outcome = moveFood(food, state.mutation, state.tick);
    if (outcome === "fed") acceptFood(state, food);
    else if (outcome === "missed") {
      state.misses++;
      state.combo = 0;
      state.rage = Math.min(100, state.rage + 7);
      state.announcement = "Snack down. Adjust your aim and try again.";
      event(state, "miss", clamp(food.x, 50, 1150), clamp(food.y, 0, 620), "SNACK DOWN", { ingredient: food.ingredient });
    } else {
      if (outcome === "bounced") event(state, "bounce", food.x, food.y, "ONE MORE CHANCE", { ingredient: food.ingredient });
      if (outcome === "hazard") event(state, "bounce", food.x, food.y, "VENT DEFLECTION", { ingredient: food.ingredient });
      remaining.push(food);
    }
  }
  state.projectiles = remaining;
  // Fifteen seconds to learn controls before appetite starts draining. Ramp
  // smoothly by segment; a miss has visible composure cost rather than RNG.
  if (state.tick > 900) state.hunger = quantize(Math.max(0, state.hunger - (state.tick > 5400 ? 0.026 : 0.021)));
  if (state.hunger <= 0 || state.rage >= 100) {
    state.phase = "lost";
    state.failureReason = state.hunger <= 0 ? "empty-belly" : "too-many-missed-shots";
    state.announcement = state.hunger <= 0 ? "Empty belly. It has eaten the employee handbook." : "Too many missed shots. The kitchen has been politely destroyed.";
  } else if (state.tick >= ARENA.roundTicks) {
    state.phase = "survived";
    state.announcement = "Shift complete. Somehow, you are still on the menu.";
  }
  if (state.phase !== "playing") event(state, "end", ARENA.mouth.x, ARENA.mouth.y, state.announcement);
}
/** Partial guide: predicts 36 ticks of the actual rules without changing state. */
export function trajectoryPreview(state: ArcadeState, ingredient: Ingredient, angle: number): { x: number; y: number }[] {
  if (!FOODS.includes(ingredient) || !Number.isFinite(angle)) return [];
  const food = makeProjectile(0, ingredient, Math.round(clamp(angle, ARENA.minAngle, ARENA.maxAngle)));
  const points = [{ x: food.x, y: food.y }];
  for (let i = 1; i <= 36; i++) {
    const outcome = moveFood(food, state.mutation, state.tick + i);
    if (i % 3 === 0) points.push({ x: food.x, y: food.y });
    if (outcome === "fed" || outcome === "missed") break;
  }
  return points;
}
/** Strict local replay. Rejected/cooldown launches must not enter the trace. */
export function replayArcade(seed: number, commands: readonly ArcadeCommand[], endTick: number): ArcadeState {
  if (!Array.isArray(commands) || commands.length > MAX_COMMANDS) throw new Error("Too many arcade commands");
  if (!Number.isSafeInteger(endTick) || endTick < 0 || endTick > ARENA.roundTicks) throw new Error("Invalid arcade end tick");
  let previousTick = -1;
  for (const command of commands) {
    if (!command || !Number.isSafeInteger(command.tick) || command.tick < 0 || command.tick <= previousTick || command.tick > endTick ||
        !FOODS.includes(command.ingredient) || !Number.isInteger(command.angle) || command.angle < ARENA.minAngle || command.angle > ARENA.maxAngle) {
      throw new Error("Invalid arcade command");
    }
    previousTick = command.tick;
  }
  const state = createArcade(seed);
  for (const command of commands) {
    while (state.tick < command.tick && state.phase === "playing") stepArcade(state);
    if (state.tick !== command.tick || !launchFood(state, command.ingredient, command.angle)) throw new Error("Rejected arcade launch");
  }
  while (state.tick < endTick && state.phase === "playing") stepArcade(state);
  return state;
}
