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
export const GAME_VERSION = 3;

export const ARENA = Object.freeze({
  width: 1200, height: 700, barrelLength: 70, launcher: { x: 210, y: 540 },
  /**
   * The resting mouth, at size 1.
   *
   * Calibrated against the mouth the rig actually draws rather than chosen:
   * the lit target ring is this ellipse, so if the two disagree the player is
   * told a snack went in when it did not, or the reverse.
   */
  mouth: { x: 840, y: 279, rx: 113, ry: 69 }, floor: 620,
  tickRate: 60,
  /** Endless in practice; the cap exists so a replay is bounded. Twelve minutes. */
  maxTicks: 43200,
  minAngle: -65, maxAngle: -5, defaultAngle: -52,
  /**
   * One shot every one and a third seconds.
   *
   * It was half a second, which is about three shots per open window, and a
   * twelve-frame strip of play showed the same snack fired at the same angle
   * three times — a spectator reading that sees a stream of inputs, not a
   * decision. At this rate a shot is roughly one attempt per window and has to
   * be committed to.
   */
  cooldownTicks: 80, maxProjectiles: 8,
  /** Launch speed. Holding the key charges from `minPower` to `maxPower`. */
  minPower: 9 as number, maxPower: 16 as number, defaultPower: 13 as number, chargeTicks: 40 as number,
  /** The hatch: how long it stays shut, and how long before it can be used again. */
  hatchTicks: 84, hatchCooldown: 210,
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
  leanPerSize: 5.4,
  risePerSize: 33.1,
  /**
   * How much the mouth grows, per axis.
   *
   * These are not free numbers: the rig draws the mouth from the painted face,
   * and the corners already span nearly its whole width, so the gap can open a
   * long way but the corners can barely move. The collision ellipse is held to
   * what the picture can actually show, because a target ring larger than the
   * mouth under it is a lie the player pays for.
   */
  mouthGrowX: 0.237,
  mouthGrowY: 0.456,
  /** How much the body itself swells, matching the rig's warp. */
  bodyGrow: 0.085,

  /**
   * Mutations. Three servings of an ingredient is one level, three levels is
   * the cap, and nothing ever wears off.
   *
   * Each pair has exactly one escape, and each escape is a serving of the other
   * ingredient, so the way out of a problem is always another decision about
   * what to feed it:
   *   metal + balloon  — a metal serving is ballast and drops it back down.
   *   metal + pepper   — a pepper serving makes it sneeze the clog out.
   *   balloon + pepper — every serving it spits back vents pressure and lowers it.
   */
  servingsPerLevel: 3,
  maxLevel: 3,

  /** Metal: a magnetic mouth that drags the kitchen into itself. */
  magnetPerLevel: 0.075,
  magnetRange: 360,
  magnetRangePerLevel: 70,
  junkEvery: 390,
  junkEveryPerLevel: 70,
  clogPerJunk: 0.1,
  clogPerClang: 0.09,
  clogMax: 0.72,
  /** A metal shot arriving this flat is caught by the teeth instead of going in. */
  clangSlope: 0.42,
  sneezeClears: 0.45,

  /**
   * Balloon: it inflates and floats, and the target goes up with it.
   *
   * The ceiling is small — forty-six pixels at three levels — and it is a rig
   * limit, not a design one. The warp may only touch a rectangle that stops
   * just short of the ceiling beam, and the growth rise already spends most of
   * that headroom, so a mouth that floated a hundred and forty pixels would
   * leave the creature behind and the target ring with it.
   */
  liftPerLevel: 0.011,
  liftMax: 16,
  liftMaxPerLevel: 10,
  liftCrowding: 0.75,
  pressurePerLevel: 0.00085,
  burpKeeps: 0.28,
  ballastDrops: 20,

  /** Pepper: it spits servings back at the launcher. */
  spitEvery: 530,
  spitEveryPerLevel: 95,
  spitSpeed: 9.4,
  spitSpeedPerLevel: 0.9,
  spitTell: 40,
  spitJams: 72,
  spitRage: 9,
  spitVents: 10,

  /**
   * Cravings, with a clock.
   *
   * Satisfying one in time is the biggest single reward in the game and it
   * buys a pause in the creature's growth. Ignoring one costs composure and
   * gets a tantrum. Off-menu food is eaten anyway and still counts toward that
   * ingredient's mutation — which is the temptation: it wants pepper, pepper is
   * worth three hundred right now, and pepper is what makes it spit.
   */
  cravingTicks: 780,
  cravingTicksMin: 430,
  cravingGap: 80,
  cravingBonus: 260,
  cravingCombo: 80,
  cravingCalm: 13,
  cravingFeed: 5,
  /**
   * What a good decision buys, compounding.
   *
   * The growth pause was three seconds flat, which meant skill could only ever
   * fail more slowly — every run needed about the same number of servings, so
   * runs of equal quality ended in the same place and the deaths never spread.
   * Cravings read correctly *in a row* pause the growth for longer, and from
   * the second onward each one takes something back off the appetite — the only
   * thing in the game that ever falls. The streak is on cravings rather than on
   * landed servings because a feed streak of four is rare and a read of two in
   * a row is a decision a player can actually set out to make.
   */
  pausePerStreak: 0.55,
  appetiteReliefFrom: 2,
  appetiteRelief: 0.05,
  tantrumRage: 12,
  tantrumJams: 40,

  /** Autonomous beats: what it does between shots, on its own. */
  beatEvery: 620,
  beatEveryPerSize: 150,
  beatJitter: 0.55,
  lungeTell: 54,
  lungeRage: 7,
  lungeHunger: 9,
  lungeJams: 66,
  sneezeJams: 26,
  droolTicks: 660,

  /** Hungry tracking: it leans toward incoming food when the belly is low. */
  trackFrom: 46,
  trackRange: 46,
  trackRate: 0.09,
});

/**
 * One player input. The trace is the whole record of a run: a launch carries
 * the two things the player chose, and the hatch is the one reaction verb.
 */
export type ArcadeCommand =
  | { tick: number; kind: "launch"; ingredient: Ingredient; angle: number; power: number }
  | { tick: number; kind: "hatch" };

export interface Projectile {
  id: number; ingredient: Ingredient;
  /**
   * `food` is a serving. `junk` is loose kitchen metal the magnet has picked
   * up, which clogs the mouth instead of feeding it. `spit` is a serving coming
   * back at the launcher.
   */
  kind: "food" | "junk" | "spit";
  x: number; y: number; vx: number; vy: number;
  age: number; bounces: number; hazardBounces: number; assisted: boolean;
  /** How many times this snack has hit a shut mouth. Only the first costs. */
  faceHits: number;
}

/**
 * A mutation is a change to the creature, not a weather effect on the kitchen,
 * and it never wears off.
 *
 * Three servings of an ingredient raise its level by one, to a maximum of
 * three, and every level it has is live for the rest of the shift. They stack:
 * a floating, magnetic, spitting creature at minute three is the whole point.
 */
export interface MutationLevels { metal: number; balloon: number; pepper: number }

/** Something the creature has telegraphed and the player can still answer. */
export interface Threat { kind: "spit" | "lunge"; tick: number; x: number; y: number }

/** A craving, with the clock the player is deciding against. */
export interface Craving { ingredient: Ingredient; startedAt: number; endsAt: number }

/** The kitchen damage the creature has done, which does not repair itself. */
export interface Vent { since: number }

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
  /** How far the balloon has floated it off the counter, in pixels. */
  lift: number;
  /** Balloon pressure, 0 to 1. At 1 it burps and drops. */
  pressure: number;
  /** Kitchen metal stuck in its teeth, 0 to 1. Narrows the gap. */
  clog: number;
  /** The gap the rules actually test: aperture after the clog. */
  open: number;
  /** Rhythm bookkeeping. */
  cycle: number; cycleTick: number; openTicks: number; shutTicks: number;
}

export interface ArcadeEvent {
  id: number; tick: number;
  type: "launch" | "feed" | "miss" | "snub" | "bounce" | "mutation" | "clog"
  | "sneeze" | "spit" | "hit" | "burp" | "gust" | "grow" | "craving" | "tantrum"
  | "beat" | "hatch" | "block" | "end";
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
  /** Permanent, stacking. Zero means the creature has not eaten three yet. */
  mutations: MutationLevels;
  /** Ticks the launcher is jammed for, after taking a serving in the face. */
  reloadUntil: number;
  /** Next seeded spit, piece of loose metal, and autonomous beat. */
  spitAt: number; junkAt: number; beatAt: number;
  threat: Threat | null;
  /** What it wants, and how long you have. Null during the gap between two. */
  craving: Craving | null;
  /** The tick a new craving may start; a short gap after one resolves. */
  cravingNextAt: number;
  cravingsMet: number; cravingsMissed: number;
  /** Cravings satisfied in a row. Reading it right repeatedly is the skill the
   *  compounding reward pays for; a single landed serving is not. */
  cravingStreak: number;
  /** The hatch. Shut until `hatchClosedUntil`, unusable until `hatchReadyAt`. */
  hatchClosedUntil: number; hatchReadyAt: number; hatchSaves: number;
  /** Drain owed from a shut hatch, paid back once the player can serve again. */
  hungerDebt: number;
  /** Drool on the floor: snacks slide and bounce differently until this tick. */
  slickUntil: number;
  /** The vent it bit off, once it has. */
  vent: Vent | null;
  /** Which of the escalating fail screens this run earned. */
  ending: number;
  announcement: string;
  /** Seeded draw counters. One stream per subsystem, so adding a draw in one
   *  place cannot shift the sequence in another. */
  rolls: { rhythm: number; craving: number; beat: number; spit: number; junk: number };
  /** Presentation-only: the launcher's charge, mirrored for the HUD. */
  charge: number;
  projectiles: Projectile[]; events: ArcadeEvent[]; nextEventId: number; nextProjectileId: number;
}

const MAX_EVENTS = 48;
const LIFE_TICKS = 240;
const MAX_COMMANDS = Math.ceil(ARENA.maxTicks / ARENA.cooldownTicks)
  + Math.ceil(ARENA.maxTicks / ARENA.hatchCooldown) + 2;
/**
 * How the shift ends, by how big it got.
 *
 * Under an endless ramp every run ends with the creature winning, so the fail
 * screen is the reward rather than the punishment, and it escalates with what
 * the player let it become. The size thresholds are the quarters of the growth
 * curve; the copy is the handbook's.
 */
// None of these may name a cause of death. "It has eaten the kitchen" was in
// this list on size alone, so a shift that ended on an empty belly announced
// "Empty belly. It has eaten the kitchen." — the other failure state's own
// name, in the same sentence, contradicting the meters the player had been
// watching. These describe the size it reached and nothing else.
export const ENDINGS: readonly string[] = [
  "It has eaten the employee handbook.",
  "It has eaten the shift supervisor.",
  "It no longer fits behind the counter.",
  "It no longer fits through the door. It has been promoted.",
];
export function endingFor(size: number): number {
  const t = clamp01((size - 1) / (TUNING.sizeMax - 1));
  if (t < 0.3) return 0;
  if (t < 0.6) return 1;
  if (t < 0.88) return 2;
  return 3;
}

export const MUTATION_LABELS: Record<Ingredient, string> = {
  metal: "MAGNETIC TEETH · it drags the kitchen into its mouth",
  balloon: "BALLOON BELLY · it is floating off the counter",
  pepper: "PRESSURE BURP · it spits them back at you",
};
export const MUTATION_NAMES: Record<Ingredient, string> = {
  metal: "Magnetic teeth", balloon: "Balloon belly", pepper: "Pressure burp",
};
export const MUTATION_RULES: Record<Ingredient, string> = {
  metal: "Metal curves in, and so does the cutlery. Come in steep or it clangs.",
  balloon: "The mouth is rising. Feed it metal for ballast.",
  pepper: "It spits food back. Feed it pepper to clear a clogged mouth.",
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
const STREAM = { rhythm: 1, craving: 2, beat: 3, spit: 4, junk: 5 } as const;

function event(state: ArcadeState, type: ArcadeEvent["type"], x: number, y: number, label: string,
               extra?: { ingredient?: Ingredient; craved?: boolean }) {
  state.events.push({ id: state.nextEventId++, tick: state.tick, type, x, y, label, ...extra });
  if (state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS);
}

/** A new craving, drawn from the seed. Never the one it just had. */
function nextCraving(state: ArcadeState): Craving {
  const counter = state.rolls.craving;
  state.rolls.craving += 1;
  const previous = state.craving?.ingredient ?? state.wanted;
  const pick = Math.floor(roll(state.seed, STREAM.craving, counter * 2) * 2);
  const options = FOODS.filter((food) => food !== previous);
  const ingredient = options[Math.min(options.length - 1, pick)];
  const span = mix(TUNING.cravingTicks, TUNING.cravingTicksMin, sizeT(state.creature.size))
    * (0.82 + 0.36 * roll(state.seed, STREAM.craving, counter * 2 + 1));
  return { ingredient, startedAt: state.tick, endsAt: state.tick + Math.round(span) };
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
    lift: 0, pressure: 0, clog: 0, open: 0,
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
    lastLaunchTick: -ARENA.cooldownTicks, growthPausedUntil: 0,
    mutations: { metal: 0, balloon: 0, pepper: 0 },
    reloadUntil: 0, spitAt: TUNING.spitEvery, junkAt: TUNING.junkEvery,
    beatAt: TUNING.beatEvery, threat: null,
    craving: null, cravingNextAt: 180, cravingsMet: 0, cravingsMissed: 0, cravingStreak: 0,
    hatchClosedUntil: 0, hatchReadyAt: 0, hatchSaves: 0, hungerDebt: 0,
    slickUntil: 0, vent: null, ending: 0, charge: 0,
    announcement: "It only swallows when the mouth is open. Watch the mouth, not the line.",
    rolls: { rhythm: 0, craving: 0, beat: 0, spit: 0, junk: 0 },
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
                      nearest: Projectile | null, levels: MutationLevels): void {
  // Balloon. It inflates all shift and the target goes up with it, until the
  // pressure wins and it burps itself back down. The burp itself is handled in
  // `stepArcade`, which owns the events.
  if (levels.balloon > 0) {
    // The ceiling shrinks as the creature grows, because growth has already
    // spent most of the rig's vertical headroom: a full-grown creature lifted
    // another forty pixels has its face above the top of the frame, and the
    // target ring goes with it.
    const ceiling = (TUNING.liftMax + TUNING.liftMaxPerLevel * levels.balloon)
      * (1 - TUNING.liftCrowding * sizeT(creature.size));
    creature.lift = quantize(Math.min(ceiling, creature.lift + TUNING.liftPerLevel * levels.balloon));
    creature.pressure = quantize(Math.min(1, creature.pressure + TUNING.pressurePerLevel * levels.balloon));
  }
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
  // What the rules actually test. Kitchen metal stuck in the teeth narrows the
  // gap without changing the rhythm, so a clogged creature has the same beat and
  // a smaller hole.
  creature.open = quantize(creature.aperture * (1 - creature.clog));
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
  creature.y = quantize(placed.y + creature.track - creature.lift);
  creature.by = quantize(placed.by + creature.track * 0.4 - creature.lift * 0.7);
}

function makeProjectile(id: number, ingredient: Ingredient, angle: number, power: number): Projectile {
  const radians = angle * Math.PI / 180;
  return {
    id, ingredient, kind: "food",
    x: quantize(ARENA.launcher.x + Math.cos(radians) * ARENA.barrelLength),
    y: quantize(ARENA.launcher.y + Math.sin(radians) * ARENA.barrelLength),
    vx: quantize(Math.cos(radians) * power), vy: quantize(Math.sin(radians) * power),
    age: 0, bounces: 0, hazardBounces: 0, assisted: false, faceHits: 0,
  };
}

const cleanPower = (power: number) =>
  Math.round(clamp(Number.isFinite(power) ? power : ARENA.defaultPower, ARENA.minPower, ARENA.maxPower));

/** Loose kitchen metal, dragged off a shelf by a magnetic mouth. */
function makeJunk(id: number, seed: number, counter: number): Projectile {
  const u = roll(seed, STREAM.junk, counter * 2);
  const v = roll(seed, STREAM.junk, counter * 2 + 1);
  return {
    id, ingredient: "metal", kind: "junk",
    x: quantize(330 + u * 220), y: quantize(470 + v * 90),
    vx: quantize(0.6 + u), vy: quantize(-1.4 - v),
    age: 0, bounces: 0, hazardBounces: 0, assisted: true, faceHits: 0,
  };
}

/** A serving coming back. Aimed at the launcher, with seeded scatter. */
function makeSpit(id: number, ingredient: Ingredient, creature: Creature,
                  seed: number, counter: number, level: number): Projectile {
  const u = roll(seed, STREAM.spit, counter * 2);
  const speed = TUNING.spitSpeed + TUNING.spitSpeedPerLevel * level;
  const dx = ARENA.launcher.x - creature.x;
  const dy = ARENA.launcher.y - creature.y;
  const angle = Math.atan2(dy, dx) + (u - 0.5) * 0.16 - 0.22;
  return {
    id, ingredient, kind: "spit",
    x: quantize(creature.x - creature.rx * 0.4), y: quantize(creature.y),
    vx: quantize(Math.cos(angle) * speed), vy: quantize(Math.sin(angle) * speed),
    age: 0, bounces: 0, hazardBounces: 0, assisted: true, faceHits: 0,
  };
}

/**
 * Angle and power are quantized here; save the same rounded values in a replay
 * command. Power is the launch speed: the aim arc and the charge together are
 * the aiming skill, and neither is enough on its own.
 */
export function launchFood(state: ArcadeState, ingredient: Ingredient, angle: number,
                           power: number = ARENA.defaultPower): boolean {
  if (!FOODS.includes(ingredient)) throw new Error("Unknown ingredient");
  if (!Number.isFinite(angle)) throw new Error("Invalid launch angle");
  if (state.phase !== "playing" || state.tick - state.lastLaunchTick < ARENA.cooldownTicks ||
      state.tick < state.reloadUntil || state.tick < state.hatchClosedUntil ||
      state.projectiles.length >= ARENA.maxProjectiles) return false;
  const food = makeProjectile(state.nextProjectileId++, ingredient,
    Math.round(clamp(angle, ARENA.minAngle, ARENA.maxAngle)), cleanPower(power));
  state.projectiles.push(food);
  state.lastLaunchTick = state.tick;
  state.shots++;
  event(state, "launch", food.x, food.y, ingredient, { ingredient });
  return true;
}

/**
 * The one reaction verb: slam the hatch.
 *
 * It shuts the serving hatch for a second and a half. Nothing can be launched
 * while it is shut — that is the cost, and it is a real one when the belly is
 * low — and in exchange a serving it spits back bounces off the hatch instead
 * of your launcher, and a lunge is stopped before it takes the vent off.
 *
 * Pressing it on nothing still costs the lockout. That is what makes it a
 * decision rather than a button.
 */
export function slamHatch(state: ArcadeState): boolean {
  if (state.phase !== "playing" || state.tick < state.hatchReadyAt) return false;
  state.hatchClosedUntil = state.tick + ARENA.hatchTicks;
  state.hatchReadyAt = state.tick + ARENA.hatchCooldown;
  // A lunge in flight is called off the moment the hatch comes down.
  if (state.threat && state.threat.kind === "lunge") {
    state.threat = null;
    state.announcement = "The hatch comes down. It thinks better of it.";
    event(state, "hatch", ARENA.launcher.x, ARENA.launcher.y - 70, "HATCH — LUNGE STOPPED");
    state.hatchSaves += 1;
    state.score += 150;
  } else {
    event(state, "hatch", ARENA.launcher.x, ARENA.launcher.y - 70, "HATCH");
  }
  return true;
}

export interface KitchenHazard { x: number; y: number; width: number; height: number; warning: boolean }

/**
 * The vent flap.
 *
 * It only exists once the creature has bitten it off the wall, which it does
 * when a lunge is not stopped. It was previously on a schedule — it simply
 * appeared at 38 seconds — which is the opposite of a consequence. Now it is
 * damage, it is permanent, and the player watched it happen.
 */
export function getHazard(vent: Vent | null, tick: number): KitchenHazard | null {
  if (!vent) return null;
  const since = tick - vent.since;
  const phase = Math.max(0, since - 120) % 300 / 300;
  const center = 260 + 115 * (1 - 4 * Math.abs(phase - 0.5));
  return { x: 550, y: quantize(center - 57.5), width: 18, height: 115, warning: since < 120 };
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
  /** Drool on the floor: snacks keep their speed and get a second bounce. */
  slick: boolean;
  vent: Vent | null;
  /** The gap after the clog: what decides whether a serving goes in. */
  aperture: number;
  levels: MutationLevels;
}

function envOf(state: ArcadeState): Env {
  const c = state.creature;
  return {
    tick: state.tick, mouthX: c.x, mouthY: c.y, mouthRx: c.rx, mouthRy: c.ry,
    bellyX: c.bx, bellyY: c.by, bellyRx: c.brx, bellyRy: c.bry,
    slick: state.tick < state.slickUntil, vent: state.vent,
    aperture: c.open, levels: state.mutations,
  };
}

type Outcome = "flying" | "fed" | "snubbed" | "blocked" | "clogged" | "clanged"
  | "struck" | "missed" | "bounced" | "hazard";

/** One physics step, shared by live play, the prediction and the guide. */
function moveFood(food: Projectile, env: Env): Outcome {
  food.age++;
  const previousX = food.x;
  const previousY = food.y;
  let ax = 0;
  let ay = 0.16;
  // Forces are applied in ingredient order — metal, balloon, pepper — so a
  // stack always resolves the same way.
  //
  // Only metal magnetism is a force on the food. The balloon moves the creature
  // rather than the kitchen, and pepper sends a projectile the other way; both
  // are handled where the creature is, not here. That is the whole difference
  // between this and the mutations it replaces, which were three ways of
  // nudging a snack in mid-air.
  if (env.levels.metal > 0 && food.ingredient === "metal" && food.kind !== "spit") {
    const dx = env.mouthX - food.x;
    const dy = env.mouthY - food.y;
    const distance = Math.hypot(dx, dy);
    const range = TUNING.magnetRange + TUNING.magnetRangePerLevel * env.levels.metal;
    if (distance < range && distance > 1) {
      const pull = TUNING.magnetPerLevel * env.levels.metal;
      ax += dx / distance * pull;
      ay += dy / distance * pull;
      food.assisted = true;
    }
  }
  if (food.kind === "junk") ay = 0.04;
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
  if (food.kind !== "spit" && dx * dx + dyFace * dyFace <= 1) {
    // Loose metal does not care whether the mouth is open; it goes into the
    // teeth either way, and stays there.
    if (food.kind === "junk") return "clogged";
    if (food.faceHits >= 3) return "missed";
    if (env.aperture < TUNING.openMin) return "snubbed";
    const dyGap = (food.y - env.mouthY) / (env.mouthRy * Math.max(TUNING.gapFloor, env.aperture));
    if (dx * dx + dyGap * dyGap > 1) return "snubbed";
    // Magnetic teeth catch a metal shot that comes in flat. The way past them
    // is to arrive steeply — a lob, or a bank off the floor — which is the one
    // rule in the game that asks for a specific *shape* of shot.
    if (env.levels.metal > 0 && food.ingredient === "metal"
        && Math.abs(food.vy) < Math.abs(food.vx) * TUNING.clangSlope) return "clanged";
    return "fed";
  }

  // The chest, below the mouth. A snack that falls short hits the creature
  // rather than passing through it on the way to the floor.
  if (food.kind !== "spit" && food.y > env.mouthY + env.mouthRy * 0.9 && food.y < TUNING.bellyFloor) {
    const bx = (food.x - env.bellyX) / env.bellyRx;
    const by = (food.y - env.bellyY) / env.bellyRy;
    if (bx * bx + by * by <= 1) return food.faceHits >= 3 ? "missed" : "blocked";
  }

  const hazard = getHazard(env.vent, env.tick);
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
  if (food.kind === "spit" && Math.hypot(food.x - ARENA.launcher.x, food.y - ARENA.launcher.y) < 54) return "struck";
  if (food.age >= LIFE_TICKS || food.x < 50 || food.x > 1150 || food.y < -100 || food.y > 720) return "missed";
  if (food.y >= ARENA.floor - 12 && food.vy > 0) {
    // Drool. A slick floor keeps more of the speed and allows a second bounce,
    // which makes the bank shot better and the recovery from a short shot real.
    const allowed = env.slick ? 2 : 1;
    if (food.bounces >= allowed) return "missed";
    food.y = ARENA.floor - 12;
    food.vy = quantize(-food.vy * (env.slick ? 0.88 : 0.72));
    food.vx = quantize(food.vx * (env.slick ? 0.97 : 0.86));
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
  const craving = state.craving !== null && food.ingredient === state.craving.ingredient;
  state.totalFeeds++;
  if (craving) state.correctFeeds++;
  state.servings[food.ingredient]++;
  state.combo = Math.min(5, state.combo + 1);
  const precision = Math.abs(food.y - creature.y) < creature.ry * 0.38;
  // The open window is the skill, so landing in a nearly-shut mouth is the
  // thing worth paying for.
  const clutch = creature.aperture < 0.68;
  const gorged = state.hunger >= TUNING.gorgeFrom;
  const points = 100 + (state.combo - 1) * 40 + (craving ? TUNING.cravingBonus + TUNING.cravingCombo * (state.combo - 1) : 0) +
    (precision ? 50 : 0) + (food.bounces || food.hazardBounces ? 120 : 0) +
    (clutch ? 90 : 0) + (food.assisted ? 40 : 0);
  state.score += points;
  const restore = (craving ? TUNING.restoreCraved : TUNING.restore) * (gorged ? TUNING.gorgeRestore : 1);
  state.hunger = quantize(Math.min(100, state.hunger + restore));
  state.rage = Math.max(0, state.rage - (craving ? TUNING.cravingCalm : TUNING.feedRage));
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

  // A craving satisfied in time calms it and pauses the growth, which is the
  // only brake in the game and the reason to chase one.
  if (craving) {
    state.cravingsMet += 1;
    state.craving = null;
    state.cravingStreak += 1;
    const pause = Math.round(TUNING.growthPauseTicks * (1 + TUNING.pausePerStreak * (state.cravingStreak - 1)));
    state.growthPausedUntil = state.tick + pause;
    state.hunger = quantize(Math.min(100, state.hunger + TUNING.cravingFeed));
    state.cravingNextAt = state.tick + TUNING.cravingGap;
    if (state.cravingStreak >= TUNING.appetiteReliefFrom) {
      state.appetite = quantize(Math.max(1, state.appetite - TUNING.appetiteRelief));
      event(state, "sneeze", creature.x, creature.y - creature.ry - 40,
        `IT EASES OFF  ×${state.cravingStreak}`);
    }
  }

  // The escapes. One per pair, each of them a serving of the other ingredient,
  // so the way out of a problem is always another decision about what to feed
  // it — and taking the escape deepens the mutation you escaped with.
  if (food.ingredient === "metal" && creature.lift > 0) {
    creature.lift = quantize(Math.max(0, creature.lift - TUNING.ballastDrops));
    state.announcement = "Ballast. It comes back down to the counter.";
    event(state, "burp", creature.x, creature.y, "BALLAST", { ingredient: "metal" });
  }
  if (food.ingredient === "pepper" && creature.clog > 0) {
    creature.clog = quantize(Math.max(0, creature.clog - TUNING.sneezeClears));
    state.announcement = "It sneezes the cutlery out. Charming.";
    event(state, "sneeze", creature.x, creature.y, "SNEEZE — MOUTH CLEAR", { ingredient: "pepper" });
  }

  // Three servings is a level, and a level never goes away.
  const level = Math.min(TUNING.maxLevel,
    Math.floor(state.servings[food.ingredient] / TUNING.servingsPerLevel));
  if (level > state.mutations[food.ingredient]) {
    state.mutations[food.ingredient] = level;
    state.mutationEvents++;
    state.announcement = MUTATION_LABELS[food.ingredient];
    event(state, "mutation", creature.x, creature.y - creature.ry - 60,
      `${MUTATION_NAMES[food.ingredient].toUpperCase()} ×${level}`, { ingredient: food.ingredient });
  }
}

/** Total mutation levels the creature is carrying. */
export const mutationLoad = (levels: MutationLevels) => levels.metal + levels.balloon + levels.pepper;

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

  const creature = state.creature;
  const levels = state.mutations;

  // Balloon: the pressure it has been building lets go, and it drops.
  if (levels.balloon > 0 && creature.pressure >= 1) {
    creature.pressure = 0;
    creature.lift = quantize(creature.lift * TUNING.burpKeeps);
    state.announcement = "It burps. Everything in the room moves.";
    event(state, "burp", creature.x, creature.y, "BURP", { ingredient: "balloon" });
    // A physics event, not a light show: the downdraft shoves whatever is in
    // the air, so a shot already on its way is part of the joke.
    for (const item of state.projectiles) {
      item.vy = quantize(item.vy + 3.4);
      item.vx = quantize(item.vx * 0.72);
    }
  }

  // The craving clock. Ignoring one is a decision with a consequence, which is
  // the difference between this and the fixed three-of-each cycle it replaces.
  if (state.craving && state.tick >= state.craving.endsAt) {
    const ignored = state.craving.ingredient;
    state.craving = null;
    state.cravingNextAt = state.tick + TUNING.cravingGap;
    state.cravingsMissed += 1;
    state.cravingStreak = 0;
    state.rage = Math.min(100, state.rage + TUNING.tantrumRage);
    state.reloadUntil = Math.max(state.reloadUntil, state.tick + TUNING.tantrumJams);
    state.announcement = "It wanted that. It swipes the shelf instead.";
    event(state, "tantrum", 470, 470, "TANTRUM — SNACKS EVERYWHERE", { ingredient: ignored });
    for (const item of state.projectiles) {
      item.vx = quantize(item.vx * -0.35);
      item.vy = quantize(item.vy - 2.6);
    }
  }
  if (!state.craving && state.tick >= state.cravingNextAt) {
    state.craving = nextCraving(state);
    state.wanted = state.craving.ingredient;
    event(state, "craving", creature.x, creature.y - creature.ry - 40,
      `IT WANTS ${state.craving.ingredient.toUpperCase()}`, { ingredient: state.craving.ingredient });
  }
  if (state.craving) state.wanted = state.craving.ingredient;

  // What it does on its own, between shots. Seeded, so a beat is part of the
  // shift rather than something that happened to you.
  if (state.tick >= state.beatAt) {
    const counter = state.rolls.beat;
    state.rolls.beat += 1;
    const gap = Math.max(220, (TUNING.beatEvery - TUNING.beatEveryPerSize * (creature.size - 1))
      * (1 - TUNING.beatJitter / 2 + TUNING.beatJitter * roll(state.seed, STREAM.beat, counter * 3)));
    state.beatAt = state.tick + Math.round(gap);
    const pick = roll(state.seed, STREAM.beat, counter * 3 + 1);
    if (pick < 0.38) {
      // A sneeze. Everything in the air moves and the bench takes a moment to
      // put back together.
      state.reloadUntil = Math.max(state.reloadUntil, state.tick + TUNING.sneezeJams);
      state.announcement = "It sneezes. Half the bench is on the floor.";
      event(state, "beat", creature.x, creature.y, "SNEEZE");
      for (const item of state.projectiles) {
        item.vx = quantize(item.vx * -0.5 - 2.2);
        item.vy = quantize(item.vy - 1.8);
      }
    } else if (pick < 0.72) {
      // A lunge, telegraphed. The hatch is the answer; nothing else is.
      state.threat = { kind: "lunge", tick: state.tick + TUNING.lungeTell, x: creature.x, y: creature.y };
      state.announcement = "It is leaning out of the hatch.";
      event(state, "beat", creature.x, creature.y, "IT IS COMING OUT");
    } else {
      state.slickUntil = state.tick + TUNING.droolTicks;
      state.announcement = "It drools on the floor. Everything slides now.";
      event(state, "beat", creature.x, creature.y + creature.ry, "DROOL — THE FLOOR IS SLICK");
    }
  }
  // A lunge nobody stopped.
  if (state.threat && state.threat.kind === "lunge" && state.tick >= state.threat.tick) {
    state.threat = null;
    if (!state.vent) {
      state.vent = { since: state.tick };
      state.announcement = "It has bitten the extractor vent off the wall.";
      event(state, "beat", 550, 200, "IT ATE THE VENT");
    } else {
      state.announcement = "It takes the whole tray off the bench.";
      event(state, "beat", ARENA.launcher.x + 60, ARENA.launcher.y - 40, "IT TOOK THE TRAY");
    }
    state.rage = Math.min(100, state.rage + TUNING.lungeRage);
    // It takes a bite and it jams the launcher in the same beat, so the bite
    // itself is not allowed to be the last point of fullness: a loss landing on
    // the tick that removes the player's launcher is the one shape of death
    // nobody reads as their own fault.
    state.hunger = quantize(Math.max(1, state.hunger - TUNING.lungeHunger));
    state.reloadUntil = Math.max(state.reloadUntil, state.tick + TUNING.lungeJams);
  }

  // Metal: it drags loose kitchen metal into its own teeth. Nothing the player
  // did causes this; it is what having a magnetic mouth is.
  if (levels.metal > 0 && state.tick >= state.junkAt) {
    state.junkAt = state.tick + Math.max(90, Math.round(
      (TUNING.junkEvery - TUNING.junkEveryPerLevel * levels.metal)
      * (0.7 + 0.6 * roll(state.seed, STREAM.junk, state.rolls.junk * 3 + 2))));
    if (state.projectiles.length < ARENA.maxProjectiles) {
      state.projectiles.push(makeJunk(state.nextProjectileId++, state.seed, state.rolls.junk));
      event(state, "clog", 440, 500, "THE CUTLERY IS MOVING", { ingredient: "metal" });
    }
    state.rolls.junk += 1;
  }

  // Pepper: it spits a serving back at the launcher, after a tell long enough
  // to answer.
  if (levels.pepper > 0 && state.tick >= state.spitAt && state.totalFeeds > 0) {
    state.spitAt = state.tick + Math.max(120, Math.round(
      (TUNING.spitEvery - TUNING.spitEveryPerLevel * levels.pepper)
      * (0.72 + 0.56 * roll(state.seed, STREAM.spit, state.rolls.spit * 3 + 2))));
    const which = FOODS[Math.floor(roll(state.seed, STREAM.spit, state.rolls.spit * 3 + 1) * 3) % 3];
    const shot = makeSpit(state.nextProjectileId++, which, creature, state.seed, state.rolls.spit, levels.pepper);
    state.rolls.spit += 1;
    if (state.projectiles.length < ARENA.maxProjectiles) {
      state.projectiles.push(shot);
      const travel = Math.max(1, Math.hypot(ARENA.launcher.x - shot.x, ARENA.launcher.y - shot.y)
        / Math.max(1, Math.hypot(shot.vx, shot.vy)));
      state.threat = { kind: "spit", tick: state.tick + Math.round(travel), x: shot.x, y: shot.y };
      state.announcement = "It is giving that one back.";
      event(state, "spit", shot.x, shot.y, "INCOMING", { ingredient: which });
      // Venting pressure is the balloon's escape from a peppered creature.
      if (creature.lift > 0) creature.lift = quantize(Math.max(0, creature.lift - TUNING.spitVents));
    }
  }
  if (state.threat && state.threat.tick < state.tick - TUNING.spitTell) state.threat = null;

  // The body moves before the food does, so a lunge can meet a shot rather
  // than the shot always arriving at where the mouth used to be.
  let nearest: Projectile | null = null;
  for (const item of state.projectiles) if (!nearest || item.x > nearest.x) nearest = item;
  stepCreature(creature, state.seed, state.rage, state.hunger, nearest, levels);

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
        // A rejection does not break the streak. Mistiming one window while
        // still landing the rest is a different mistake from putting a snack on
        // the floor, and a streak counter that reads zero all shift is a
        // decoration rather than a score.
        state.combo = Math.max(0, state.combo - 1);
        state.rage = Math.min(100, state.rage + TUNING.snubRage);
        state.announcement = "Shut. You have to catch the window.";
        event(state, "snub", food.x, food.y, "TOO LATE", { ingredient: food.ingredient });
      }
      food.faceHits++;
      bounceOffFace(food, env);
      remaining.push(food);
    } else if (outcome === "clogged") {
      // Kitchen metal in the teeth. The rhythm is unchanged; the hole is not.
      creature.clog = quantize(Math.min(TUNING.clogMax, creature.clog + TUNING.clogPerJunk));
      state.announcement = "There is a ladle in its teeth now.";
      event(state, "clog", food.x, food.y, "CLOGGED", { ingredient: "metal" });
    } else if (outcome === "clanged") {
      creature.clog = quantize(Math.min(TUNING.clogMax, creature.clog + TUNING.clogPerClang));
      state.combo = 0;
      state.rage = Math.min(100, state.rage + TUNING.snubRage);
      state.snubs++;
      state.announcement = "The teeth caught it. Come in steeper.";
      event(state, "clog", food.x, food.y, "CLANG", { ingredient: food.ingredient });
    } else if (outcome === "struck") {
      if (state.tick < state.hatchClosedUntil) {
        // Off the hatch. This is what the lockout bought.
        state.hatchSaves += 1;
        state.score += 220;
        state.announcement = "Off the hatch. That is what it is for.";
        event(state, "block", ARENA.launcher.x, ARENA.launcher.y - 46, "BLOCKED +220", { ingredient: food.ingredient });
        continue;
      }
      // A serving in the face. The launcher is jammed for a second and a half,
      // which is the most expensive thing that can happen to a player who is
      // already behind.
      state.reloadUntil = state.tick + TUNING.spitJams;
      state.rage = Math.min(100, state.rage + TUNING.spitRage);
      state.combo = 0;
      state.threat = null;
      state.announcement = "It got you. The launcher is a mess.";
      event(state, "hit", ARENA.launcher.x, ARENA.launcher.y - 40, "JAMMED", { ingredient: food.ingredient });
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
        state.announcement = "On the floor. Adjust your aim and try again.";
      }
      event(state, "miss", clamp(food.x, 50, 1150), clamp(food.y, 0, 620),
        charged ? "DROPPED" : "ON THE FLOOR", { ingredient: food.ingredient });
    } else {
      if (outcome === "bounced") event(state, "bounce", food.x, food.y, "ONE MORE CHANCE", { ingredient: food.ingredient });
      if (outcome === "hazard") event(state, "bounce", food.x, food.y, "VENT DEFLECTION", { ingredient: food.ingredient });
      remaining.push(food);
    }
  }
  state.projectiles = remaining;

  // Appetite. A bigger creature empties faster; nothing else about a serving
  // changes, so growth alone is the ramp.
  //
  // The belly does not empty while the hatch is shut — it runs a tab instead.
  //
  // The hatch is the player's own reaction verb, and it takes their launcher
  // away for a second and a half. Running the starvation clock through that
  // produced a loss with no available move: the game told the player to land a
  // snack, removed their ability to land one, and then ended the shift for not
  // landing it. A shift must not end on a tick the player was locked out of.
  //
  // Forgiving that drain outright was measured over two hundred shifts and is
  // not an option: freeing even this much starvation pressure flipped moderate
  // deaths from 82% empty-belly to 69% kitchen-destroyed and bunched them into
  // one thirty-second bucket at 43%, past the spread gate. So nothing is
  // forgiven. What would have drained is owed, and it is taken back at three
  // times the rate the moment the hatch lifts — visibly, with the player
  // holding a loaded launcher. The economy over a shift is unchanged to within
  // the repayment lag; only the tick the loss can land on has moved.
  const held = state.tick < state.hatchClosedUntil;
  if (state.tick > TUNING.graceTicks) {
    const drain = (TUNING.drainBase + (state.creature.size - 1) * TUNING.drainPerSize) * state.appetite;
    if (held) {
      state.hungerDebt = quantize(state.hungerDebt + drain);
    } else {
      const owed = Math.min(state.hungerDebt, drain * 2);
      state.hungerDebt = quantize(state.hungerDebt - owed);
      state.hunger = quantize(Math.max(0, state.hunger - drain - owed));
    }
  }

  // Score is time kept fed plus what you did with it.
  // Time *kept fed*, which is what the score claims to measure. It used to tick
  // up regardless, so the biggest number on screen kept climbing through a run
  // that was visibly falling apart.
  if (state.tick % 10 === 0 && state.hunger > 30) {
    state.score += 1;
  }

  if (state.hunger <= 0) {
    state.phase = "lost";
    state.failureReason = "empty-belly";
  } else if (state.rage >= 100) {
    state.phase = "lost";
    state.failureReason = "kitchen-destroyed";
  } else if (state.tick >= ARENA.maxTicks) {
    state.phase = "lost";
    state.failureReason = "outgrew-the-kitchen";
  }
  if (state.phase !== "playing") {
    state.ending = endingFor(state.creature.size);
    // The ending is chosen by how big it got; the cause of death is a separate
    // fact and the player is owed it. Reporting only the size read as the game
    // naming a cause its own meters contradicted.
    const cause = state.failureReason === "empty-belly"
      ? "Empty belly."
      : state.failureReason === "kitchen-destroyed"
        ? "Too many missed shots."
        : "Twelve minutes.";
    state.announcement = `${cause} ${ENDINGS[state.ending]}`;
    event(state, "end", state.creature.x, state.creature.y, state.announcement);
  }
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
    bx: c.bx, by: c.by, brx: c.brx, bry: c.bry,
    aperture: c.aperture, open: c.open, lift: c.lift, pressure: c.pressure, clog: c.clog,
    untilOpen: c.untilOpen, track: c.track, cycle: c.cycle, cycleTick: c.cycleTick,
    openTicks: c.openTicks, shutTicks: c.shutTicks,
  };
}

/**
 * The mouth's future, precomputed.
 *
 * Every candidate shot a planner evaluates re-derives the same creature motion,
 * and the creature is by far the expensive half of a prediction. When the
 * creature is not tracking — which is whenever the belly is at or above
 * `trackFrom`, because the eagerness that drives tracking is then exactly zero
 * for any projectile — its path does not depend on the shot at all, so it can be
 * computed once and shared. `exact` says whether that held; when it is false the
 * timeline must not be used and the caller has to fall back to projecting per
 * shot.
 */
export interface MouthTimeline {
  ticks: number; exact: boolean;
  x: Float64Array; y: Float64Array; by: Float64Array;
  rx: Float64Array; ry: Float64Array; open: Float64Array;
}

export function projectMouth(state: ArcadeState, ticks: number): MouthTimeline {
  const creature = projectCreature(state);
  const line: MouthTimeline = {
    ticks, exact: state.hunger >= TUNING.trackFrom,
    x: new Float64Array(ticks + 1), y: new Float64Array(ticks + 1),
    by: new Float64Array(ticks + 1),
    rx: new Float64Array(ticks + 1), ry: new Float64Array(ticks + 1),
    open: new Float64Array(ticks + 1),
  };
  for (let i = 1; i <= ticks; i += 1) {
    stepCreature(creature, state.seed, state.rage, state.hunger, null, state.mutations);
    line.x[i] = creature.x; line.y[i] = creature.y; line.by[i] = creature.by;
    line.rx[i] = creature.rx; line.ry[i] = creature.ry; line.open[i] = creature.open;
  }
  return line;
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
                            power: number | null, maxTicks = 240,
                            timeline?: MouthTimeline): FlightResult {
  if (!FOODS.includes(ingredient) || !Number.isFinite(angle)) {
    return { fed: false, snubbed: false, ticks: 0, bounces: 0, x: 0, y: 0 };
  }
  const food = makeProjectile(0, ingredient,
    Math.round(clamp(angle, ARENA.minAngle, ARENA.maxAngle)), cleanPower(power ?? ARENA.defaultPower));
  const shared = timeline && timeline.exact && timeline.ticks >= maxTicks ? timeline : null;
  const creature = projectCreature(state);
  const env: Env = {
    tick: state.tick, mouthX: 0, mouthY: 0, mouthRx: 0, mouthRy: 0,
    bellyX: 0, bellyY: 0, bellyRx: 0, bellyRy: 0,
    slick: false, vent: state.vent, aperture: 0, levels: state.mutations,
  };
  let snubbed = false;
  for (let i = 1; i <= maxTicks; i++) {
    if (shared) {
      env.mouthX = shared.x[i]; env.mouthY = shared.y[i];
      env.mouthRx = shared.rx[i]; env.mouthRy = shared.ry[i];
      env.aperture = shared.open[i];
      env.bellyX = creature.bx; env.bellyY = shared.by[i];
      env.bellyRx = creature.brx; env.bellyRy = creature.bry;
    } else {
      stepCreature(creature, state.seed, state.rage, state.hunger, food, state.mutations);
      env.mouthX = creature.x; env.mouthY = creature.y;
      env.mouthRx = creature.rx; env.mouthRy = creature.ry;
      env.bellyX = creature.bx; env.bellyY = creature.by;
      env.bellyRx = creature.brx; env.bellyRy = creature.bry;
      env.aperture = creature.open;
    }
    env.tick = state.tick + i;
    env.slick = state.tick + i < state.slickUntil;
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
                                  power = ARENA.defaultPower, steps = 36): { x: number; y: number }[] {
  if (!FOODS.includes(ingredient) || !Number.isFinite(angle)) return [];
  const food = makeProjectile(0, ingredient,
    Math.round(clamp(angle, ARENA.minAngle, ARENA.maxAngle)), cleanPower(power));
  const creature = projectCreature(state);
  const points = [{ x: food.x, y: food.y }];
  for (let i = 1; i <= steps; i++) {
    stepCreature(creature, state.seed, state.rage, state.hunger, food, state.mutations);
    const env: Env = {
      tick: state.tick + i, mouthX: creature.x, mouthY: creature.y,
      mouthRx: creature.rx, mouthRy: creature.ry,
      bellyX: creature.bx, bellyY: creature.by, bellyRx: creature.brx, bellyRy: creature.bry,
      slick: state.tick + i < state.slickUntil, vent: state.vent,
      aperture: creature.open, levels: state.mutations,
    };
    const outcome = moveFood(food, env);
    if (i % 3 === 0) points.push({ x: food.x, y: food.y });
    if (outcome === "fed" || outcome === "missed") break;
    if (outcome === "snubbed") bounceOffFace(food, env);
    if (outcome === "blocked") bounceOffFace(food, env, true);
  }
  return points;
}

/** Strict local replay. Rejected launches and hatches must not enter the trace. */
export function replayArcade(seed: number, commands: readonly ArcadeCommand[], endTick: number): ArcadeState {
  if (!Array.isArray(commands) || commands.length > MAX_COMMANDS) throw new Error("Too many arcade commands");
  if (!Number.isSafeInteger(endTick) || endTick < 0 || endTick > ARENA.maxTicks) throw new Error("Invalid arcade end tick");
  let previousTick = -1;
  for (const command of commands) {
    if (!command || !Number.isSafeInteger(command.tick) || command.tick < 0 || command.tick <= previousTick
        || command.tick > endTick) {
      throw new Error("Invalid arcade command");
    }
    if (command.kind === "launch") {
      if (!FOODS.includes(command.ingredient) || !Number.isInteger(command.angle)
          || command.angle < ARENA.minAngle || command.angle > ARENA.maxAngle
          || !Number.isInteger(command.power)
          || command.power < ARENA.minPower || command.power > ARENA.maxPower) {
        throw new Error("Invalid arcade command");
      }
    } else if (command.kind !== "hatch") {
      throw new Error("Invalid arcade command");
    }
    previousTick = command.tick;
  }
  const state = createArcade(seed);
  for (const command of commands) {
    while (state.tick < command.tick && state.phase === "playing") stepArcade(state);
    if (state.tick !== command.tick) throw new Error("Rejected arcade launch");
    const applied = command.kind === "hatch"
      ? slamHatch(state)
      : launchFood(state, command.ingredient, command.angle, command.power);
    if (!applied) throw new Error("Rejected arcade launch");
  }
  while (state.tick < endTick && state.phase === "playing") stepArcade(state);
  return state;
}
