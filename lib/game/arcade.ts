/**
 * The feeding loop.
 *
 * This file is the whole rule set and the only authority on a result. It is
 * pure: a fixed 1/60-second tick, no wall clock, no `Math.random`, no renderer,
 * and every value quantized, so a command trace replays to a byte-identical
 * final state on any machine.
 *
 * The loop is "feed it, it changes, adapt". You have to feed the creature to
 * survive, and every accepted serving makes it bigger: a bigger mouth, but a
 * shorter window to put something in it and a faster-emptying belly. The shift
 * is endless and the creature always wins; the score is how long you kept it
 * fed and how well.
 */
export type Ingredient = "metal" | "balloon" | "pepper";
export const FOODS: readonly Ingredient[] = ["metal", "balloon", "pepper"];

/**
 * The creature grows toward `sizeMax` and stays there. Ending the shift when it
 * arrives was tried and inverted the skill order — the better the player, the
 * sooner they reached the cap and the shorter their run. Size is the difficulty
 * curve; what ends a shift is failing to keep up with it.
 */
/** Bumped whenever a rule, the trace format or the scoring changes. */
export const GAME_VERSION = 1;

export const ARENA = Object.freeze({
  width: 1200, height: 700, barrelLength: 70, launcher: { x: 210, y: 540 },
  /**
   * The resting mouth, at size 1.
   *
   * Calibrated against the mouth the rig actually draws rather than chosen:
   * the lit target ring is this ellipse, so if the two disagree the player is
   * told a snack went in when it did not, or the reverse.
   */
  mouth: { x: 840, y: 280, rx: 113, ry: 68 }, floor: 620,
  tickRate: 60,
  /** Endless in practice; the cap exists so a replay is bounded. Twelve minutes. */
  maxTicks: 43200,
  minAngle: -65, maxAngle: -5, defaultAngle: -52,
  cooldownTicks: 30, maxProjectiles: 8,
});

/**
 * Every number the balance depends on, in one place, so an iteration changes a
 * rule rather than hunting a constant through the file.
 */
export const TUNING = Object.freeze({
  /** Growth. The creature is the difficulty curve. */
  sizeMax: 2.4,
  /** Front-loaded: the first servings visibly change it, the last ones creep. */
  growthPerFeed: 0.05,
  growthEarlyBoost: 0.9,
  growthPauseTicks: 180,

  /** Appetite. Drain scales with size; a serving does not. */
  hungerStart: 56,
  graceTicks: 240,
  drainBase: 0.0195,
  drainPerSize: 0.045,
  /**
   * Appetite never stops growing, even after the body does.
   *
   * With only a size-driven drain and a size cap, a player with perfect aim
   * plateaus: the creature reaches full size, the appetite stops rising, and
   * the shift becomes survivable forever. Every serving therefore also adds
   * permanently to what it takes to keep it fed, which is the rule the title
   * is actually about — and the reason a player who rations outlives one who
   * feeds on cooldown even when both never miss.
   */
  appetitePerFeed: 0.01,
  restore: 10,
  restoreCraved: 14,
  /**
   * Feeding a creature that is not hungry. It swallows anyway — it always
   * swallows — but it gets almost nothing out of it and grows twice as fast on
   * it. This is the title as a rule: the safe-feeling move, taken often enough,
   * is what kills you.
   */
  gorgeFrom: 82,
  gorgeRestore: 0.08,
  gorgeGrowth: 4,

  /** The mouth's rhythm: the open window is the timing skill. */
  openTicksBase: 46, openTicksMin: 10,
  shutTicksBase: 34, shutTicksMax: 95,
  rampTicks: 6,
  /** How far open the mouth has to be to take a serving. */
  openMin: 0.5,
  /** The gap never collapses to nothing while the mouth counts as open. */
  gapFloor: 0.3,
  /** A snub — food off a shut face — costs less composure than a floor miss. */
  snubRage: 2.5,
  missRage: 5,
  feedRage: 8,
  /** Irritation is a rate, not a ratchet: it cools while you are landing shots. */
  rageCool: 0.01,

  /**
   * The chest and belly, at size 1.
   *
   * Only the part of the creature *below* the mouth is a blocker. Food arrives
   * at the mouth almost level, crossing the cheek on the way in, so a silhouette
   * that included the face would stop every shot before it ever reached the
   * target. What the player sees — and what used to be wrong — is a snack that
   * falls short and sails straight through the creature's chest on its way to
   * the floor.
   */
  belly: { x: 838, y: 372, rx: 236, ry: 150 },
  bellyFloor: 462,
  blockRage: 1.4,

  /** Where the mouth sits, as a function of size. */
  /**
   * How far the mouth moves as the creature grows.
   *
   * Not chosen: measured. `scripts/mouth-calibrate.mjs` reads the mouth the rig
   * actually drew at five sizes and fits these, so the lit target ring and the
   * painted mouth are the same object at every size. Re-run it after any change
   * to the pose's growth channels or to the warp.
   */
  leanPerSize: 5,
  risePerSize: 33,
  /**
   * How much the mouth grows, per axis.
   *
   * These are not free numbers: the rig draws the mouth from the painted face,
   * and the corners already span nearly its whole width, so the gap can open a
   * long way but the corners can barely move. The collision ellipse is held to
   * what the picture can actually show, because a target ring larger than the
   * mouth under it is a lie the player pays for.
   */
  mouthGrowX: 0.229,
  mouthGrowY: 0.454,
  /** How much the body itself swells, matching the rig's warp. */
  bodyGrow: 0.085,

  /** Hungry tracking: it leans toward incoming food when the belly is low. */
  trackFrom: 46,
  trackRange: 46,
  trackRate: 0.09,
});

export interface ArcadeCommand { tick: number; ingredient: Ingredient; angle: number }

export interface Projectile {
  id: number; ingredient: Ingredient; x: number; y: number; vx: number; vy: number;
  age: number; bounces: number; hazardBounces: number; assisted: boolean;
  /** How many times this snack has hit a shut mouth. Only the first costs. */
  faceHits: number;
}

export interface ArcadeMutation {
  ingredient: Ingredient; phase: "warning" | "active"; startsAt: number; endsAt: number;
  gustWarning: boolean; gustActive: boolean;
}

/**
 * The creature, as the rules see it. The renderer reads exactly this — scale,
 * position and mouth aperture — rather than being told which face to pull.
 */
export interface Creature {
  size: number;
  /** Mouth centre and half-axes in arena space, after growth and lean. */
  x: number; y: number; rx: number; ry: number;
  /** The chest and belly below the mouth, which stop a shot that falls short. */
  bx: number; by: number; brx: number; bry: number;
  /** 0 shut, 1 as wide as it goes. Food is only accepted above `openMin`. */
  aperture: number;
  /** Ticks until the mouth next opens past `openMin`; negative while it is open. */
  untilOpen: number;
  /** Vertical tracking offset: it leans toward food when it is hungry. */
  track: number;
  /** Rhythm bookkeeping. */
  cycle: number; cycleTick: number; openTicks: number; shutTicks: number;
}

export interface ArcadeEvent {
  id: number; tick: number;
  type: "launch" | "feed" | "miss" | "snub" | "bounce" | "warning" | "mutation"
  | "recovery" | "gust" | "grow" | "end";
  x: number; y: number; label: string;
  /** Presentation-only tag. Never read by the rules, replay or scoring. */
  ingredient?: Ingredient;
  /** Presentation-only tag: the craving matched on an accepted serving. */
  craved?: boolean;
}

export interface ArcadeState {
  seed: number; tick: number; phase: "playing" | "lost";
  failureReason: "empty-belly" | "kitchen-destroyed" | "outgrew-the-kitchen" | null;
  creature: Creature;
  /** Mirror of `creature.size`, kept at the top level for the HUD and harness. */
  size: number;
  /** Multiplier on appetite. Rises with every serving and never falls. */
  appetite: number;
  wanted: Ingredient; hunger: number; rage: number; score: number; combo: number;
  totalFeeds: number; correctFeeds: number; shots: number; misses: number; snubs: number;
  servings: Record<Ingredient, number>; mutationEvents: number; lastLaunchTick: number;
  growthPausedUntil: number;
  mutation: ArcadeMutation | null; announcement: string;
  /** Seeded draw counters. One stream per subsystem, so adding a draw in one
   *  place cannot shift the sequence in another. */
  rolls: { rhythm: number; craving: number; beat: number };
  projectiles: Projectile[]; events: ArcadeEvent[]; nextEventId: number; nextProjectileId: number;
}

const MAX_EVENTS = 48;
const LIFE_TICKS = 240;
const MAX_COMMANDS = Math.ceil(ARENA.maxTicks / ARENA.cooldownTicks) + 1;
const MUTATION_LABELS: Record<Ingredient, string> = {
  metal: "MAGNETIC TEETH · Metal curves toward its mouth",
  balloon: "BALLOON BELLY · Every snack feels lighter",
  pepper: "PRESSURE BURP · Watch for the next gust",
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const clamp01 = (value: number) => clamp(value, 0, 1);
const quantize = (value: number) => Math.round(value * 10000) / 10000;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Seeded draws.
 *
 * A counter-based hash rather than a running generator: a stream's n-th value
 * depends only on the seed, the stream and n, so the order in which subsystems
 * happen to ask cannot change what any of them gets. That makes a rule change
 * in one subsystem a local change to the replay rather than a global one.
 */
function roll(seed: number, stream: number, counter: number): number {
  let x = (seed ^ Math.imul(stream, 0x9e3779b1) ^ Math.imul(counter, 0x85ebca6b)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}
const STREAM = { rhythm: 1, craving: 2, beat: 3 } as const;

function event(state: ArcadeState, type: ArcadeEvent["type"], x: number, y: number, label: string,
               extra?: { ingredient?: Ingredient; craved?: boolean }) {
  state.events.push({ id: state.nextEventId++, tick: state.tick, type, x, y, label, ...extra });
  if (state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS);
}

/** How far along the growth curve the creature is, 0 at birth and 1 at the cap. */
const sizeT = (size: number) => clamp01((size - 1) / (TUNING.sizeMax - 1));

/**
 * The rhythm for one cycle. Both numbers are drawn from the seed, so two
 * players on the same seed face the same rhythm and neither faces a metronome.
 */
/**
 * One number per seed that says what kind of creature you drew: a generous
 * mouth that opens often, or a tight one that makes you wait. It is fixed for
 * the whole shift, so a seed has a character a player can talk about, and it is
 * the main reason two shifts of the same quality last different lengths.
 */
const temperamentOf = (seed: number) => 0.88 + 0.26 * roll(seed, STREAM.rhythm, 7777);

function cycleShape(seed: number, cycle: number, size: number, rage: number) {
  const t = sizeT(size);
  const temper = temperamentOf(seed);
  const u = roll(seed, STREAM.rhythm, cycle * 2);
  const v = roll(seed, STREAM.rhythm, cycle * 2 + 1);
  let open = mix(TUNING.openTicksBase, TUNING.openTicksMin, t) * (0.72 + 0.56 * u) * temper;
  let shut = mix(TUNING.shutTicksBase, TUNING.shutTicksMax, t) * (0.68 + 0.64 * v) * (1.86 - temper);
  // Roughly one cycle in five it simply is not interested, and holds the mouth
  // shut for far longer than the rhythm has trained you to expect. This is
  // where a run goes wrong, and it is seeded rather than random so the same
  // seed catches every player the same way.
  if (roll(seed, STREAM.rhythm, cycle * 2 + 991) < 0.19) shut *= 1.75;
  // Irritation makes it snappy: shorter windows, closer together. This is the
  // one place rage changes the physical problem rather than a meter.
  if (rage >= 60) { open *= 0.76; shut *= 0.74; }
  return { openTicks: Math.max(6, Math.round(open)), shutTicks: Math.max(10, Math.round(shut)) };
}

/** Aperture from a position inside the cycle. Ramps in, holds, ramps out, shuts. */
function apertureAt(cycleTick: number, openTicks: number): number {
  const ramp = TUNING.rampTicks;
  if (cycleTick < ramp) return quantize(cycleTick / ramp);
  if (cycleTick < ramp + openTicks) return 1;
  if (cycleTick < ramp * 2 + openTicks) return quantize(1 - (cycleTick - ramp - openTicks) / ramp);
  return 0;
}

/** Ticks from `cycleTick` until the aperture next passes `openMin`. */
function ticksUntilOpen(creature: Creature): number {
  const ramp = TUNING.rampTicks;
  const openFrom = Math.ceil(ramp * TUNING.openMin);
  const openTo = ramp + creature.openTicks + Math.floor(ramp * (1 - TUNING.openMin));
  if (creature.cycleTick < openFrom) return openFrom - creature.cycleTick;
  if (creature.cycleTick <= openTo) return -(openTo - creature.cycleTick) - 1;
  const total = ramp * 2 + creature.openTicks + creature.shutTicks;
  return total - creature.cycleTick + openFrom;
}

/** Where the mouth sits for a given size, before tracking. */
function mouthFor(size: number) {
  const grow = size - 1;
  const body = 1 + grow * TUNING.bodyGrow;
  return {
    x: quantize(ARENA.mouth.x - grow * TUNING.leanPerSize),
    y: quantize(ARENA.mouth.y - grow * TUNING.risePerSize),
    rx: quantize(ARENA.mouth.rx * (1 + grow * TUNING.mouthGrowX)),
    ry: quantize(ARENA.mouth.ry * (1 + grow * TUNING.mouthGrowY)),
    bx: quantize(TUNING.belly.x - grow * TUNING.leanPerSize * 0.6),
    by: quantize(TUNING.belly.y - grow * TUNING.risePerSize * 0.5),
    brx: quantize(TUNING.belly.rx * body),
    bry: quantize(TUNING.belly.ry * body),
  };
}

function makeCreature(): Creature {
  const placed = mouthFor(1);
  return {
    size: 1, ...placed, aperture: 0, untilOpen: TUNING.rampTicks, track: 0,
    cycle: 0, cycleTick: 0, openTicks: 0, shutTicks: 0,
  };
}

export function createArcade(seed: number): ArcadeState {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("Invalid arcade seed");
  const creature = makeCreature();
  const first = cycleShape(seed, 0, 1, 0);
  creature.openTicks = first.openTicks;
  creature.shutTicks = first.shutTicks;
  creature.untilOpen = ticksUntilOpen(creature);
  return {
    seed, tick: 0, phase: "playing", failureReason: null,
    creature, size: 1, appetite: 1,
    wanted: "metal", hunger: TUNING.hungerStart, rage: 0, score: 0, combo: 0,
    totalFeeds: 0, correctFeeds: 0, shots: 0, misses: 0, snubs: 0,
    servings: { metal: 0, balloon: 0, pepper: 0 }, mutationEvents: 0,
    lastLaunchTick: -ARENA.cooldownTicks, growthPausedUntil: 0, mutation: null,
    announcement: "It only swallows when the mouth is open. Watch the mouth, not the line.",
    rolls: { rhythm: 0, craving: 0, beat: 0 },
    projectiles: [], events: [], nextEventId: 1, nextProjectileId: 1,
  };
}

/**
 * Advances the creature one tick: the rhythm, then the body.
 *
 * `nearest` is the food it would lean toward, or null. Tracking only happens
 * when the belly is low, which makes a desperate creature easier to feed — the
 * one place where losing helps, and the reason a run does not simply fall off
 * a cliff.
 */
function stepCreature(creature: Creature, seed: number, rage: number, hunger: number,
                      nearest: Projectile | null): void {
  const total = TUNING.rampTicks * 2 + creature.openTicks + creature.shutTicks;
  creature.cycleTick += 1;
  if (creature.cycleTick >= total) {
    creature.cycleTick = 0;
    creature.cycle += 1;
    const shape = cycleShape(seed, creature.cycle, creature.size, rage);
    creature.openTicks = shape.openTicks;
    creature.shutTicks = shape.shutTicks;
  }
  creature.aperture = apertureAt(creature.cycleTick, creature.openTicks);
  creature.untilOpen = ticksUntilOpen(creature);

  const placed = mouthFor(creature.size);
  creature.rx = placed.rx;
  creature.ry = placed.ry;
  creature.x = placed.x;
  creature.brx = placed.brx;
  creature.bry = placed.bry;
  creature.bx = placed.bx;

  const eager = clamp01((TUNING.trackFrom - hunger) / TUNING.trackFrom);
  let want = 0;
  if (nearest && eager > 0.02 && nearest.x > 380) {
    want = clamp(nearest.y - placed.y, -TUNING.trackRange, TUNING.trackRange) * eager;
  }
  creature.track = quantize(creature.track + (want - creature.track) * TUNING.trackRate);
  creature.y = quantize(placed.y + creature.track);
  creature.by = quantize(placed.by + creature.track * 0.4);
}

function makeProjectile(id: number, ingredient: Ingredient, angle: number): Projectile {
  const radians = angle * Math.PI / 180;
  return {
    id, ingredient,
    x: quantize(ARENA.launcher.x + Math.cos(radians) * ARENA.barrelLength),
    y: quantize(ARENA.launcher.y + Math.sin(radians) * ARENA.barrelLength),
    vx: quantize(Math.cos(radians) * 13.6), vy: quantize(Math.sin(radians) * 13.6),
    age: 0, bounces: 0, hazardBounces: 0, assisted: false, faceHits: 0,
  };
}

/** Angle is quantized here; save the same rounded/clamped angle in a replay command. */
export function launchFood(state: ArcadeState, ingredient: Ingredient, angle: number): boolean {
  if (!FOODS.includes(ingredient)) throw new Error("Unknown ingredient");
  if (!Number.isFinite(angle)) throw new Error("Invalid launch angle");
  if (state.phase !== "playing" || state.tick - state.lastLaunchTick < ARENA.cooldownTicks ||
      state.projectiles.length >= ARENA.maxProjectiles) return false;
  const food = makeProjectile(state.nextProjectileId++, ingredient,
    Math.round(clamp(angle, ARENA.minAngle, ARENA.maxAngle)));
  state.projectiles.push(food);
  state.lastLaunchTick = state.tick;
  state.shots++;
  event(state, "launch", food.x, food.y, ingredient, { ingredient });
  return true;
}

export interface KitchenHazard { x: number; y: number; width: number; height: number; warning: boolean }

/**
 * The vent flap.
 *
 * Disabled. It was on a schedule — it simply appeared at 38 seconds — which is
 * the opposite of a consequence, and the critic reported "VENT DEFLECTION fires
 * with no visible vent". It returns in stage 7 as damage the creature does to
 * the kitchen when a lunge is not stopped.
 */
export function getHazard(tick: number): KitchenHazard | null {
  if (tick < Number.MAX_SAFE_INTEGER) return null;
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

/**
 * Everything outside a projectile that its flight depends on. Passing this
 * explicitly is what lets the prediction and the live rules share one physics
 * step without the prediction being able to touch the state.
 */
interface Env {
  tick: number;
  mouthX: number; mouthY: number; mouthRx: number; mouthRy: number;
  bellyX: number; bellyY: number; bellyRx: number; bellyRy: number;
  aperture: number;
  mutation: ArcadeMutation | null;
}

function envOf(state: ArcadeState): Env {
  const c = state.creature;
  return {
    tick: state.tick, mouthX: c.x, mouthY: c.y, mouthRx: c.rx, mouthRy: c.ry,
    bellyX: c.bx, bellyY: c.by, bellyRx: c.brx, bellyRy: c.bry,
    aperture: c.aperture, mutation: state.mutation,
  };
}

type Outcome = "flying" | "fed" | "snubbed" | "blocked" | "missed" | "bounced" | "hazard";

/** One physics step, shared by live play, the prediction and the guide. */
function moveFood(food: Projectile, env: Env): Outcome {
  food.age++;
  const previousX = food.x;
  const previousY = food.y;
  let ax = 0;
  let ay = 0.16;
  // Forces are applied in ingredient order — metal, balloon, pepper — so a
  // future stack resolves the same way every time.
  const active = mutationAt(env.mutation, env.tick);
  if (active === "metal" && food.ingredient === "metal") {
    const dx = env.mouthX - food.x;
    const dy = env.mouthY - food.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 510 && distance > 1) {
      ax += dx / distance * 0.3;
      ay += dy / distance * 0.3;
      food.assisted = true;
    }
  }
  if (active === "balloon") { ay = 0.025; food.assisted = true; }
  if (gustAt(env.mutation, env.tick) && food.x > 440) { ax -= 0.31; ay -= 0.065; food.assisted = true; }
  food.vx = quantize(clamp(food.vx + ax, -18, 18));
  food.vy = quantize(clamp(food.vy + ay, -16, 16));
  food.x = quantize(food.x + food.vx);
  food.y = quantize(food.y + food.vy);

  // The mouth is resolved first, then the vent, then the floor. Maximum
  // per-tick speed is well below the target diameter, so a shot cannot tunnel
  // through it.
  //
  // An open mouth is a slot, not a disc: the gap is as wide as the face but
  // only as tall as the mouth is open. Anything inside the face but outside the
  // gap hits lips and teeth. That makes aim and timing the same skill — a shot
  // arriving a moment early meets a slot too narrow to fit through — and it
  // gives the target ring an honest shape to draw.
  const dx = (food.x - env.mouthX) / env.mouthRx;
  const dyFace = (food.y - env.mouthY) / env.mouthRy;
  if (dx * dx + dyFace * dyFace <= 1) {
    // A snack that has already been turned away three times is done: it is on
    // the floor, not still negotiating.
    if (food.faceHits >= 3) return "missed";
    if (env.aperture < TUNING.openMin) return "snubbed";
    const dyGap = (food.y - env.mouthY) / (env.mouthRy * Math.max(TUNING.gapFloor, env.aperture));
    return dx * dx + dyGap * dyGap <= 1 ? "fed" : "snubbed";
  }

  // The chest, below the mouth. A snack that falls short hits the creature
  // rather than passing through it on the way to the floor.
  if (food.y > env.mouthY + env.mouthRy * 0.9 && food.y < TUNING.bellyFloor) {
    const bx = (food.x - env.bellyX) / env.bellyRx;
    const by = (food.y - env.bellyY) / env.bellyRy;
    if (bx * bx + by * by <= 1) return food.faceHits >= 3 ? "missed" : "blocked";
  }

  const hazard = getHazard(env.tick);
  if (hazard && !hazard.warning && food.hazardBounces === 0) {
    // Swept slab intersection against the flap expanded by the snack radius.
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

/**
 * A shut mouth is a wall, not a hole: food off the face drops and can still
 * bank off the floor into the next open window, which is the recovery the
 * timing skill is worth having.
 */
function bounceOffFace(food: Projectile, env: Env, belly = false) {
  const cx = belly ? env.bellyX : env.mouthX;
  const cy = belly ? env.bellyY : env.mouthY;
  const rx = belly ? env.bellyRx : env.mouthRx;
  const ry = belly ? env.bellyRy : env.mouthRy;
  const dx = food.x - cx;
  const dy = food.y - cy;
  const length = Math.max(1, Math.hypot(dx, dy));
  food.x = quantize(cx + dx / length * (rx + 2));
  food.y = quantize(cy + dy / length * (ry + 2));
  // Away from the creature and downward. Off the mouth it pops up a little, so
  // a bank shot back into the next open window is possible; off the chest it
  // simply drops, because a snack that could hover against the belly rattled
  // there forever.
  food.vx = quantize(-Math.abs(food.vx) * 0.52 - 1.4);
  food.vy = quantize(belly ? Math.abs(food.vy) * 0.4 + 1.6 : food.vy * 0.4 - 2.2);
  // Only the first contact buys more time in the air. Refreshing it on every
  // contact is what let one snack bounce against the chest for nine hundred
  // ticks without ever timing out.
  if (food.faceHits === 0) food.age = Math.min(food.age, LIFE_TICKS - 90);
}

function acceptFood(state: ArcadeState, food: Projectile) {
  const creature = state.creature;
  const craving = food.ingredient === state.wanted;
  state.totalFeeds++;
  if (craving) state.correctFeeds++;
  state.servings[food.ingredient]++;
  state.combo = Math.min(5, state.combo + 1);
  const precision = Math.abs(food.y - creature.y) < creature.ry * 0.38;
  // The open window is the skill, so landing in a nearly-shut mouth is the
  // thing worth paying for.
  const clutch = creature.aperture < 0.68;
  const gorged = state.hunger >= TUNING.gorgeFrom;
  const points = 100 + (state.combo - 1) * 40 + (craving ? 150 : 0) +
    (precision ? 50 : 0) + (food.bounces || food.hazardBounces ? 120 : 0) +
    (clutch ? 90 : 0) + (food.assisted ? 40 : 0);
  state.score += points;
  const restore = (craving ? TUNING.restoreCraved : TUNING.restore) * (gorged ? TUNING.gorgeRestore : 1);
  state.hunger = quantize(Math.min(100, state.hunger + restore));
  state.rage = Math.max(0, state.rage - TUNING.feedRage);
  // The body stops growing; the appetite does not.
  state.appetite = quantize(state.appetite + TUNING.appetitePerFeed * (gorged ? TUNING.gorgeGrowth : 1));

  // Growth. This is the whole point: the reward and the problem are the same
  // event.
  if (state.tick >= state.growthPausedUntil) {
    const before = creature.size;
    const step = TUNING.growthPerFeed * (1 + TUNING.growthEarlyBoost * (1 - sizeT(creature.size)))
      * (gorged ? TUNING.gorgeGrowth : 1);
    creature.size = quantize(Math.min(TUNING.sizeMax, creature.size + step));
    state.size = creature.size;
    if (Math.floor(before * 10) !== Math.floor(creature.size * 10)) {
      event(state, "grow", creature.x, creature.y - creature.ry - 96, "IT IS BIGGER NOW");
    }
  }

  state.announcement = gorged ? "It was not even hungry. It got bigger anyway."
    : food.bounces ? "A bank shot. It respects the technique."
    : clutch ? "Straight past the teeth. Do that again."
    : craving ? "Exactly what it was craving."
    : "It eats anything. Some things eat back.";
  event(state, "feed", food.x, food.y,
    `${gorged ? "NOT EVEN HUNGRY " : food.bounces ? "BANK SHOT " : clutch ? "CLUTCH " : precision ? "PERFECT " : craving ? "CRAVING " : "TASTY "}+${points}`,
    { ingredient: food.ingredient, craved: craving });

  state.wanted = FOODS[Math.floor(state.totalFeeds / 3) % FOODS.length];
  if (state.servings[food.ingredient] % 3 === 0 && !state.mutation) {
    state.mutation = {
      ingredient: food.ingredient, phase: "warning", startsAt: state.tick + 90,
      endsAt: state.tick + 570, gustWarning: false, gustActive: false,
    };
    state.mutationEvents++;
    state.announcement = MUTATION_LABELS[food.ingredient];
    event(state, "warning", creature.x, creature.y, MUTATION_LABELS[food.ingredient], { ingredient: food.ingredient });
  }
}

/** Mutates only the owned state; call exactly once per fixed 1/60-second tick. */
export function stepArcade(state: ArcadeState): void {
  if (state.phase !== "playing") return;
  state.tick++;
  state.events = state.events.filter((item) => state.tick - item.tick < 180);

  // Irritation cools on its own, so a single bad minute is recoverable and the
  // meter measures how you are playing now rather than everything you ever did.
  //
  // This happens at the top of the tick, before anything can raise it. Cooling
  // it at the bottom instead made the "kitchen destroyed" ending unreachable:
  // a miss would push the meter to exactly 100 and the same tick would shave it
  // to 99.99 before the check ran, so a player who never landed a single shot
  // starved instead.
  if (state.rage > 0) state.rage = quantize(Math.max(0, state.rage - TUNING.rageCool));

  if (state.mutation) {
    const mutation = state.mutation;
    if (state.tick >= mutation.endsAt) {
      event(state, "recovery", state.creature.x, state.creature.y, "KITCHEN BACK TO NORMAL", { ingredient: mutation.ingredient });
      state.mutation = null;
      state.announcement = "Kitchen back to normal. Keep the snacks coming.";
    } else {
      if (state.tick >= mutation.startsAt && mutation.phase === "warning") {
        mutation.phase = "active";
        event(state, "mutation", state.creature.x, state.creature.y, MUTATION_LABELS[mutation.ingredient], { ingredient: mutation.ingredient });
      }
      const previousGust = mutation.gustActive;
      mutation.gustActive = gustAt(mutation, state.tick);
      mutation.gustWarning = mutation.phase === "active" && mutation.ingredient === "pepper" &&
        (state.tick - mutation.startsAt) % 180 < 30;
      if (mutation.gustActive && !previousGust) event(state, "gust", state.creature.x, state.creature.y, "BURP! HEADWIND", { ingredient: "pepper" });
    }
  }

  // The body moves before the food does, so a lunge can meet a shot rather
  // than the shot always arriving at where the mouth used to be.
  let nearest: Projectile | null = null;
  for (const item of state.projectiles) if (!nearest || item.x > nearest.x) nearest = item;
  stepCreature(state.creature, state.seed, state.rage, state.hunger, nearest);

  const env = envOf(state);
  const remaining: Projectile[] = [];
  for (const food of state.projectiles) {
    const outcome = moveFood(food, env);
    if (outcome === "fed") acceptFood(state, food);
    else if (outcome === "snubbed") {
      // Only the first rejection costs composure: a snack rattling against a
      // shut face must not become a second, invisible failure state.
      if (food.faceHits === 0) {
        state.snubs++;
        state.combo = 0;
        state.rage = Math.min(100, state.rage + TUNING.snubRage);
        state.announcement = "Shut. You have to catch the window.";
        event(state, "snub", food.x, food.y, "TOO LATE", { ingredient: food.ingredient });
      }
      food.faceHits++;
      bounceOffFace(food, env);
      remaining.push(food);
    } else if (outcome === "blocked") {
      // Off the chest. It barely notices; the snack is still on the floor.
      if (food.faceHits === 0) {
        state.snubs++;
        state.combo = 0;
        state.rage = Math.min(100, state.rage + TUNING.blockRage);
        state.announcement = "Off the belly. The mouth is further up.";
        event(state, "snub", food.x, food.y, "OFF THE BELLY", { ingredient: food.ingredient });
      }
      food.faceHits++;
      bounceOffFace(food, env, true);
      remaining.push(food);
    } else if (outcome === "missed") {
      // A snack that already bounced off the creature has been paid for. Before
      // this, a shot that fell short cost the chest contact *and* the floor
      // miss, which is two charges for one mistake and made irritation the only
      // way anyone ever died.
      const charged = food.faceHits > 0;
      state.misses++;
      if (!charged) {
        state.combo = 0;
        state.rage = Math.min(100, state.rage + TUNING.missRage);
        state.announcement = "Snack down. Adjust your aim and try again.";
      }
      event(state, "miss", clamp(food.x, 50, 1150), clamp(food.y, 0, 620),
        charged ? "GONE" : "SNACK DOWN", { ingredient: food.ingredient });
    } else {
      if (outcome === "bounced") event(state, "bounce", food.x, food.y, "ONE MORE CHANCE", { ingredient: food.ingredient });
      if (outcome === "hazard") event(state, "bounce", food.x, food.y, "VENT DEFLECTION", { ingredient: food.ingredient });
      remaining.push(food);
    }
  }
  state.projectiles = remaining;

  // Appetite. A bigger creature empties faster; nothing else about a serving
  // changes, so growth alone is the ramp.
  if (state.tick > TUNING.graceTicks) {
    const drain = (TUNING.drainBase + (state.creature.size - 1) * TUNING.drainPerSize) * state.appetite;
    state.hunger = quantize(Math.max(0, state.hunger - drain));
  }

  // Score is time kept fed plus what you did with it.
  // A slow drip, not a salary: at six points per second, staying alive is worth
  // having and a landed serving is still unmistakably the thing that scored.
  if (state.tick % 10 === 0 && state.hunger > 0) {
    state.score += 1;
  }

  if (state.hunger <= 0) {
    state.phase = "lost";
    state.failureReason = "empty-belly";
    state.announcement = "Empty belly. It has eaten the employee handbook.";
  } else if (state.rage >= 100) {
    state.phase = "lost";
    state.failureReason = "kitchen-destroyed";
    state.announcement = "Too many missed shots. The kitchen has been politely destroyed.";
  } else if (state.tick >= ARENA.maxTicks) {
    state.phase = "lost";
    state.failureReason = "outgrew-the-kitchen";
    state.announcement = "Twelve minutes. It no longer fits through the door. It has been promoted.";
  }
  if (state.phase !== "playing") event(state, "end", state.creature.x, state.creature.y, state.announcement);
}

/**
 * Projects the creature forward without touching the state.
 *
 * The rhythm and the body are deterministic given the current state, so a
 * prediction is exact as long as nothing else lands in between — which is
 * exactly what a player assumes when they take a shot.
 */
function projectCreature(state: ArcadeState): Creature {
  const c = state.creature;
  return {
    size: c.size, x: c.x, y: c.y, rx: c.rx, ry: c.ry,
    bx: c.bx, by: c.by, brx: c.brx, bry: c.bry, aperture: c.aperture,
    untilOpen: c.untilOpen, track: c.track, cycle: c.cycle, cycleTick: c.cycleTick,
    openTicks: c.openTicks, shutTicks: c.shutTicks,
  };
}

export interface FlightResult {
  fed: boolean; snubbed: boolean; ticks: number; bounces: number;
  x: number; y: number;
}

/**
 * What one shot would do, right now, under the rules as they stand.
 *
 * Used by the balance bots and by the trajectory guide, so neither can drift
 * from the rules: this runs the same `moveFood` and the same creature step.
 */
export function probeFlight(state: ArcadeState, ingredient: Ingredient, angle: number,
                            _power: number | null, maxTicks = 240): FlightResult {
  if (!FOODS.includes(ingredient) || !Number.isFinite(angle)) {
    return { fed: false, snubbed: false, ticks: 0, bounces: 0, x: 0, y: 0 };
  }
  const food = makeProjectile(0, ingredient, Math.round(clamp(angle, ARENA.minAngle, ARENA.maxAngle)));
  const creature = projectCreature(state);
  let snubbed = false;
  for (let i = 1; i <= maxTicks; i++) {
    stepCreature(creature, state.seed, state.rage, state.hunger, food);
    const env: Env = {
      tick: state.tick + i, mouthX: creature.x, mouthY: creature.y,
      mouthRx: creature.rx, mouthRy: creature.ry,
      bellyX: creature.bx, bellyY: creature.by, bellyRx: creature.brx, bellyRy: creature.bry,
      aperture: creature.aperture, mutation: state.mutation,
    };
    const outcome = moveFood(food, env);
    if (outcome === "fed") return { fed: true, snubbed, ticks: i, bounces: food.bounces, x: food.x, y: food.y };
    if (outcome === "missed") return { fed: false, snubbed, ticks: i, bounces: food.bounces, x: food.x, y: food.y };
    if (outcome === "snubbed") { snubbed = true; bounceOffFace(food, env); }
    if (outcome === "blocked") { snubbed = true; bounceOffFace(food, env, true); }
  }
  return { fed: false, snubbed, ticks: maxTicks, bounces: food.bounces, x: food.x, y: food.y };
}

/** Partial guide: predicts `steps` ticks of the actual rules without changing state. */
export function trajectoryPreview(state: ArcadeState, ingredient: Ingredient, angle: number,
                                  steps = 36): { x: number; y: number }[] {
  if (!FOODS.includes(ingredient) || !Number.isFinite(angle)) return [];
  const food = makeProjectile(0, ingredient, Math.round(clamp(angle, ARENA.minAngle, ARENA.maxAngle)));
  const creature = projectCreature(state);
  const points = [{ x: food.x, y: food.y }];
  for (let i = 1; i <= steps; i++) {
    stepCreature(creature, state.seed, state.rage, state.hunger, food);
    const env: Env = {
      tick: state.tick + i, mouthX: creature.x, mouthY: creature.y,
      mouthRx: creature.rx, mouthRy: creature.ry,
      bellyX: creature.bx, bellyY: creature.by, bellyRx: creature.brx, bellyRy: creature.bry,
      aperture: creature.aperture, mutation: state.mutation,
    };
    const outcome = moveFood(food, env);
    if (i % 3 === 0) points.push({ x: food.x, y: food.y });
    if (outcome === "fed" || outcome === "missed") break;
    if (outcome === "snubbed") bounceOffFace(food, env);
    if (outcome === "blocked") bounceOffFace(food, env, true);
  }
  return points;
}

/** Strict local replay. Rejected/cooldown launches must not enter the trace. */
export function replayArcade(seed: number, commands: readonly ArcadeCommand[], endTick: number): ArcadeState {
  if (!Array.isArray(commands) || commands.length > MAX_COMMANDS) throw new Error("Too many arcade commands");
  if (!Number.isSafeInteger(endTick) || endTick < 0 || endTick > ARENA.maxTicks) throw new Error("Invalid arcade end tick");
  let previousTick = -1;
  for (const command of commands) {
    if (!command || !Number.isSafeInteger(command.tick) || command.tick < 0 || command.tick <= previousTick ||
        command.tick > endTick || !FOODS.includes(command.ingredient) || !Number.isInteger(command.angle) ||
        command.angle < ARENA.minAngle || command.angle > ARENA.maxAngle) {
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
