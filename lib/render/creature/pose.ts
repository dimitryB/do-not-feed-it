/**
 * Turns game state into a creature performance.
 *
 * Reads `ArcadeState` and its presentation events and produces the pose the
 * renderer draws. It owns its own clock, springs and noise; nothing here is
 * visible to `lib/game/`, and none of it can change a rule, a score or a
 * replay.
 *
 * The face is authored as whole expressions rather than as a pile of
 * per-channel maximums. Blending *toward* a named expression pulls every
 * channel it names — including the ones it wants at rest — so a strong state
 * overrides a weak one instead of averaging with it. Accumulating maximums was
 * why eight different states all resolved to the same resting smile.
 *
 * Springs on top of that give anticipation and overshoot for free: a target
 * snaps, the body arrives late and settles.
 */
import { ARENA, type ArcadeEvent, type ArcadeState, type Ingredient } from "../../game/arcade";

export interface CreaturePose {
  headX: number; headY: number; headTilt: number; lean: number;
  squashX: number; squashY: number;
  bodyRise: number; bellySwell: number; breath: number;
  jawOpen: number; mouthWidth: number; cornerLift: number; lipPress: number; jawShift: number;
  lidLeft: number; lidRight: number; lowerLid: number; blink: number;
  browAngry: number; browSad: number; browRaise: number; browAsym: number;
  pupilX: number; pupilY: number; pupilScale: number;
  tongueOut: number; drool: number;
  teethBare: number; teethAlign: number; teethLong: number; teethQuiver: number;
  throat: number; throatTravel: number;
  cheekPuff: number; cheekMarks: number;
  flush: number; rageFlush: number; pallor: number; sweat: number; tears: number;
  antennaDroop: number; antennaTwist: number; antennaShake: number;
  exhale: number; magnetism: number;
  shake: number;
}

const FIELDS: (keyof CreaturePose)[] = [
  "headX", "headY", "headTilt", "lean", "squashX", "squashY", "bodyRise", "bellySwell", "breath",
  "jawOpen", "mouthWidth", "cornerLift", "lipPress", "jawShift",
  "lidLeft", "lidRight", "lowerLid", "blink",
  "browAngry", "browSad", "browRaise", "browAsym",
  "pupilX", "pupilY", "pupilScale", "tongueOut", "drool",
  "teethBare", "teethAlign", "teethLong", "teethQuiver", "throat", "throatTravel",
  "cheekPuff", "cheekMarks", "flush", "rageFlush", "pallor", "sweat", "tears",
  "antennaDroop", "antennaTwist", "antennaShake", "exhale", "magnetism", "shake",
];

/**
 * The channels an expression owns. Anything outside this list is layered on
 * afterwards: skin colour, the swallow, the aim of the eyes, breathing.
 */
const FACE: (keyof CreaturePose)[] = [
  "jawOpen", "mouthWidth", "cornerLift", "lipPress", "jawShift",
  "lidLeft", "lidRight", "lowerLid",
  "browAngry", "browSad", "browRaise", "browAsym",
  "tongueOut", "drool", "teethBare", "teethLong",
  "headX", "headY", "headTilt", "lean",
  "antennaDroop", "antennaTwist",
  "squashX", "squashY", "bodyRise", "bellySwell", "cheekPuff", "pupilScale",
];

/** Spring rates per field: low stiffness reads as weight, high as a snap. */
const RATES: Partial<Record<keyof CreaturePose, [number, number]>> = {
  headX: [110, 13], headY: [110, 13], headTilt: [90, 12], lean: [80, 12],
  squashX: [220, 15], squashY: [220, 15],
  jawOpen: [260, 17], mouthWidth: [150, 16], cornerLift: [130, 15], lipPress: [180, 18],
  jawShift: [140, 16],
  lidLeft: [300, 24], lidRight: [300, 24], lowerLid: [200, 20], blink: [420, 30],
  browAngry: [150, 17], browSad: [150, 17], browRaise: [170, 18], browAsym: [150, 17],
  pupilX: [230, 22], pupilY: [230, 22], pupilScale: [180, 20],
  bellySwell: [26, 8], bodyRise: [40, 10], throat: [340, 26],
  cheekPuff: [80, 11], teethLong: [70, 12], teethAlign: [90, 13],
  flush: [95, 17], rageFlush: [60, 14], pallor: [22, 9], antennaDroop: [34, 10], antennaTwist: [40, 11],
  tears: [60, 12],
};
const DEFAULT_RATE: [number, number] = [120, 15];

type Expression = Partial<Record<keyof CreaturePose, number>>;

/** Everything a face channel does when nothing is happening. */
const REST: Expression = {
  jawOpen: 0.16, mouthWidth: 1, cornerLift: 0.3, lipPress: 0, jawShift: 0,
  lidLeft: 0.06, lidRight: 0.06, lowerLid: 0.08,
  browAngry: 0, browSad: 0, browRaise: 0.1, browAsym: 0,
  tongueOut: 0, drool: 0, teethBare: 0, teethLong: 0,
  headX: 0, headY: 0, headTilt: 0, lean: 0,
  antennaDroop: 0, antennaTwist: 0,
  squashX: 1, squashY: 1, bodyRise: 0, bellySwell: 0, cheekPuff: 0, pupilScale: 1,
};

/**
 * The authored expressions. Values are deliberately far apart: at 960 px, a
 * difference smaller than the compression noise is no difference at all.
 */
const EXPRESSIONS = {
  /** Title screen. Curious, wide awake, watching the launcher. */
  attract: {
    jawOpen: 0.32, cornerLift: 0.6, lidLeft: 0.02, lidRight: 0.02, lowerLid: 0.14,
    browRaise: 0.4, drool: 0.2, headTilt: -3.5, headX: -7,
    antennaDroop: -0.55, antennaTwist: 0.3, pupilScale: 1.06,
  },
  /** Getting hungry: impatient rather than dying. */
  peckish: {
    jawOpen: 0.2, mouthWidth: 0.94, cornerLift: -0.55, lipPress: 0.2,
    lidLeft: 0.32, lidRight: 0.38, lowerLid: 0.06,
    browSad: 0.6, browRaise: 0.25, tongueOut: 0.35, drool: 0.55,
    headY: 13, headTilt: 3.2, antennaDroop: 0.6, antennaTwist: -0.2,
    squashY: 0.985, bodyRise: -7,
  },
  /** Running on empty. */
  starving: {
    jawOpen: 0.3, mouthWidth: 0.88, cornerLift: -1.4, lipPress: 0,
    lidLeft: 0.5, lidRight: 0.44, lowerLid: 0.04,
    browSad: 1, browRaise: 0.1, tongueOut: 1, drool: 0.9,
    headY: 26, headTilt: 5.5, antennaDroop: 1.05, antennaTwist: 0.15,
    squashY: 0.94, squashX: 1.045, bodyRise: -17, cheekPuff: -0.5,
  },
  /** Snack in the air, still a long way off. */
  trackFar: {
    jawOpen: 0.42, mouthWidth: 0.9, cornerLift: -0.1, lipPress: 0.15,
    lidLeft: 0, lidRight: 0, lowerLid: 0, browRaise: 0.85, browAsym: 0.5,
    drool: 0.35, headTilt: -7, headY: 4, antennaDroop: -0.9, antennaTwist: 0.6,
    pupilScale: 1.14,
  },
  /** Snack about to arrive. */
  trackNear: {
    jawOpen: 1, mouthWidth: 1.07, cornerLift: 0.2, lidLeft: 0, lidRight: 0,
    browRaise: 0.95, drool: 0.65, tongueOut: 0.2, headY: -9, lean: 0.05,
    antennaDroop: -1.05, antennaTwist: 0.12, pupilScale: 1.16,
  },
  /** Contact: jaws shut, everything squashed. */
  snap: {
    jawOpen: 0.02, mouthWidth: 0.88, cornerLift: 0.1, lipPress: 1,
    lidLeft: 0.9, lidRight: 0.9, lowerLid: 0.3, browRaise: 0.2,
    headY: 15, squashY: 0.87, squashX: 1.11, antennaDroop: -0.9,
  },
  /** Metal: a hard clank that jolts the head sideways. */
  clank: {
    jawOpen: 0.02, mouthWidth: 0.9, cornerLift: 0.05, lipPress: 1, teethBare: 0.35,
    lidLeft: 0.85, lidRight: 0.85, lowerLid: 0.3, browAngry: 0.35,
    headX: 22, headTilt: 5.5, headY: 12, squashY: 0.88, squashX: 1.12,
    antennaDroop: -0.85, antennaTwist: 0.85, pupilScale: 0.66,
  },
  /** Balloon: a light puff that lifts it. */
  puff: {
    jawOpen: 0.06, mouthWidth: 0.82, cornerLift: 0.65, lipPress: 0.8, cheekPuff: 1.15,
    lidLeft: 0.08, lidRight: 0.08, lowerLid: 0.35, browRaise: 1,
    headY: -13, bodyRise: 20, bellySwell: 0.55, squashY: 1.08, squashX: 0.99,
    antennaDroop: -1.1, antennaTwist: 0.2, pupilScale: 1.32,
  },
  /** Pepper: the face screws itself up. */
  burn: {
    jawOpen: 0.26, mouthWidth: 0.66, cornerLift: -1.25, lipPress: 0.35, tongueOut: 0.95,
    lidLeft: 0.66, lidRight: 0.66, lowerLid: 0.6, browSad: 0.75, browAngry: 0.45,
    headY: -8, squashY: 0.97, squashX: 1.03,
    antennaDroop: 0.35, antennaTwist: 0.65,
  },
  /** Exactly what it was craving. */
  delight: {
    jawOpen: 0.24, mouthWidth: 1.06, cornerLift: 1.3, lipPress: 0,
    lidLeft: 0.62, lidRight: 0.62, lowerLid: 0.88, browRaise: 0.65,
    headTilt: 6.5, headY: -11, bellySwell: 0.2, squashY: 1.03,
    antennaDroop: -1.15, antennaTwist: 0.35, pupilScale: 1.1,
  },
  /** Edible. Not what it asked for. */
  shrug: {
    jawOpen: 0.09, mouthWidth: 0.86, cornerLift: 0.02, lipPress: 0.55, jawShift: 0.6,
    lidLeft: 0.52, lidRight: 0.06, lowerLid: 0.15, browAsym: 0.95, browRaise: 0.15,
    headTilt: -5.5, headX: -6, antennaDroop: 0.5, antennaTwist: -0.8,
  },
  /** A snack off the vent: startled, and still following it. */
  startle: {
    jawOpen: 0.62, mouthWidth: 0.52, cornerLift: -0.15, lipPress: 0,
    lidLeft: 0, lidRight: 0, lowerLid: 0, browRaise: 1, browAsym: 0.3,
    headY: -20, headTilt: -8, headX: -14, squashY: 1.07, squashX: 0.95,
    antennaDroop: -1.3, antennaTwist: 0.8, pupilScale: 1.4,
  },
  /** The instant a snack hits the floor. */
  flinch: {
    jawOpen: 0.06, mouthWidth: 0.82, cornerLift: 0.05, lipPress: 0.85,
    lidLeft: 0.95, lidRight: 0.6, browRaise: 1,
    headY: -15, squashX: 0.95, squashY: 1.05,
    antennaDroop: -0.65, antennaTwist: 0.55,
  },
  /** And the flat look at the mess afterwards. */
  sideEye: {
    jawOpen: 0.03, mouthWidth: 0.72, cornerLift: -1.2, lipPress: 0.95, jawShift: -0.85,
    lidLeft: 0.62, lidRight: 0.04, lowerLid: 0.72, browAngry: 0.5, browAsym: 0.95,
    headTilt: 5.5, headY: 6, antennaDroop: 0.6, antennaTwist: -0.75,
  },
  /** Irritation, step one: a scowl and a shut mouth. */
  annoy1: {
    jawOpen: 0, mouthWidth: 0.8, cornerLift: -1.05, lipPress: 1,
    lidLeft: 0.22, lidRight: 0.22, lowerLid: 0.38, browAngry: 0.8, browRaise: 0,
    headTilt: 1.6, antennaDroop: -0.3, antennaTwist: -0.25,
  },
  /** Step two: leaning in, hard stare. */
  annoy2: {
    jawOpen: 0.04, mouthWidth: 0.84, cornerLift: -1.25, lipPress: 0.8,
    lidLeft: 0.1, lidRight: 0.1, lowerLid: 0.65, browAngry: 0.95,
    headX: 13, headY: -7, lean: 0.035, antennaDroop: -0.55, antennaTwist: -0.1,
    pupilScale: 0.78,
  },
  /** Step three: teeth out, whole body forward. */
  annoy3: {
    jawOpen: 0.2, mouthWidth: 1.02, cornerLift: -1.45, lipPress: 0, teethBare: 1,
    lidLeft: 0.05, lidRight: 0.05, lowerLid: 0.82, browAngry: 1,
    headX: 25, headY: -15, lean: 0.075, squashX: 1.06, squashY: 0.96,
    antennaDroop: -1, antennaTwist: 0.4, pupilScale: 0.62,
  },
  /** Metal building: teeth pushing through, eyes wide. */
  warnMetal: {
    jawOpen: 0.3, mouthWidth: 0.96, cornerLift: -0.25, teethBare: 0.85, teethLong: 0.35,
    lidLeft: 0, lidRight: 0, lowerLid: 0.1, browRaise: 0.85, browAngry: 0.25,
    headY: 5, antennaDroop: -0.85, antennaTwist: 0.45, pupilScale: 0.6,
  },
  /** Metal live: the jaw is a trap. */
  activeMetal: {
    jawOpen: 0.74, mouthWidth: 1.06, cornerLift: -0.35, teethBare: 1, teethLong: 1,
    lidLeft: 0.04, lidRight: 0.04, lowerLid: 0.42, browAngry: 0.65,
    headX: 9, lean: 0.04, antennaDroop: -0.95, pupilScale: 0.58,
  },
  /** Balloon building: filling up, lips sealed. */
  warnBalloon: {
    jawOpen: 0, mouthWidth: 0.74, cornerLift: 0.25, lipPress: 1, cheekPuff: 1.15,
    lidLeft: 0, lidRight: 0, lowerLid: 0.05, browRaise: 1,
    headY: -5, bellySwell: 0.7, bodyRise: 12, squashY: 1.06, squashX: 1.03,
    antennaDroop: -0.95, antennaTwist: 0.25, pupilScale: 1.24,
  },
  /** Balloon live: round, light, pleased with itself. */
  activeBalloon: {
    jawOpen: 0.12, mouthWidth: 0.8, cornerLift: 0.9, lipPress: 0.3, cheekPuff: 0.95,
    lidLeft: 0.04, lidRight: 0.04, lowerLid: 0.55, browRaise: 0.95,
    headY: -20, bellySwell: 1.25, bodyRise: 34, squashY: 1.09, squashX: 1.05,
    antennaDroop: -1.15, antennaTwist: 0.15, pupilScale: 1.3,
  },
  /** Pepper building: holding it in. */
  warnPepper: {
    jawOpen: 0, mouthWidth: 0.7, cornerLift: -0.65, lipPress: 1, cheekPuff: 1.35,
    lidLeft: 0.64, lidRight: 0.64, lowerLid: 0.45, browAngry: 0.75, browSad: 0.25,
    headY: 6, squashX: 1.05, squashY: 0.975,
    antennaDroop: 0.25, antennaTwist: 0.35,
  },
  /** Pepper live, between gusts: still under pressure. */
  holdPepper: {
    jawOpen: 0.14, mouthWidth: 0.82, cornerLift: -0.5, lipPress: 0.6, cheekPuff: 0.6,
    lidLeft: 0.4, lidRight: 0.4, lowerLid: 0.4, browAngry: 0.55,
    headY: 3, antennaDroop: 0.1, antennaTwist: 0.25,
  },
  /** Pepper live, the exhale itself. */
  blowPepper: {
    jawOpen: 0.86, mouthWidth: 0.92, cornerLift: -0.1, cheekPuff: -0.6, tongueOut: 0.9,
    lidLeft: 0.66, lidRight: 0.66, lowerLid: 0.35, browRaise: 1, browSad: 0.4,
    headX: -17, headY: -11, headTilt: -6.5, squashY: 0.95, squashX: 1.04,
    antennaDroop: -1.25, antennaTwist: 0.2,
  },
  /** Deflating: everything sags past rest before it comes back. */
  deflate: {
    jawOpen: 0.3, mouthWidth: 0.9, cornerLift: -0.75, lipPress: 0.1, tongueOut: 0.35,
    lidLeft: 0.62, lidRight: 0.56, lowerLid: 0.2, browSad: 0.65,
    headY: 15, bodyRise: -13, bellySwell: -0.5, cheekPuff: -0.5,
    squashY: 0.93, squashX: 1.05, antennaDroop: 0.85, antennaTwist: -0.2,
  },
  /** Shift survived: full, smug, in no hurry. */
  smug: {
    jawOpen: 0.04, mouthWidth: 0.96, cornerLift: 1.15, lipPress: 0.4,
    lidLeft: 0.56, lidRight: 0.46, lowerLid: 0.66, browRaise: 0.3, browAngry: 0.2,
    browAsym: 0.55, headTilt: 4.5, headY: -5, bellySwell: 0.7, squashY: 1.03,
    antennaDroop: -0.45, antennaTwist: 0.6,
  },
  /** Shift lost to an empty belly. */
  collapse: {
    jawOpen: 0.14, mouthWidth: 0.8, cornerLift: -1.55, tongueOut: 1, drool: 0.35,
    lidLeft: 0.66, lidRight: 0.66, lowerLid: 0, browSad: 1,
    headY: 46, headTilt: 9, bodyRise: -34, squashY: 0.87, squashX: 1.08,
    cheekPuff: -0.85, antennaDroop: 1.35, antennaTwist: 0.35, pupilScale: 0.85,
  },
  /** Shift lost to irritation. */
  rageEnd: {
    jawOpen: 0.95, mouthWidth: 1.14, cornerLift: -0.9, teethBare: 1, teethLong: 0.45,
    lidLeft: 0.04, lidRight: 0.04, lowerLid: 0.85, browAngry: 1,
    headX: 33, headY: -23, lean: 0.12, squashX: 1.12, squashY: 0.94, bodyRise: 17,
    antennaDroop: -1.25, antennaTwist: 0.5, pupilScale: 0.55,
  },
} as const satisfies Record<string, Expression>;

type ExpressionName = keyof typeof EXPRESSIONS;

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);
const clamp = (low: number, high: number, value: number) => (value < low ? low : value > high ? high : value);
const mix = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);
/** Smooth 0→1 ramp, used everywhere a value should ease rather than jump. */
const ramp = (value: number, from: number, to: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
/** Deterministic per-index noise; the renderer's own, never the game's. */
const hashed = (index: number) => {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

const zero = (): CreaturePose => {
  const pose = {} as CreaturePose;
  for (const field of FIELDS) pose[field] = 0;
  pose.squashX = 1;
  pose.squashY = 1;
  pose.mouthWidth = 1;
  pose.pupilScale = 1;
  return pose;
};

interface Reaction { type: ArcadeEvent["type"]; ingredient?: Ingredient; craved?: boolean; age: number; x: number; y: number }

function latest(state: ArcadeState | null, types: ArcadeEvent["type"][], within: number): Reaction | null {
  if (!state) return null;
  for (let index = state.events.length - 1; index >= 0; index--) {
    const item = state.events[index];
    if (!types.includes(item.type)) continue;
    const age = (state.tick - item.tick) / 60;
    if (age < 0 || age > within) continue;
    return { type: item.type, ingredient: item.ingredient, craved: item.craved, age, x: item.x, y: item.y };
  }
  return null;
}

export class CreatureAnimator {
  private readonly pose = zero();
  private readonly velocity = zero();
  private readonly target = zero();
  private blinkAt = -1;
  private blinkIndex = 0;
  private blinkUntil = 0;
  private started = -1;

  /** Advances the performance. `time` is the renderer clock in seconds. */
  step(state: ArcadeState | null, playing: boolean, reduced: boolean, time: number, delta: number,
       allowBlink = true): CreaturePose {
    if (this.started < 0) {
      this.started = time;
      this.blinkAt = time + 1.4 + hashed(1) * 2.6;
    }
    this.buildTargets(state, playing, reduced, time, allowBlink);
    const step = Math.min(0.05, Math.max(0.001, delta));
    for (const field of FIELDS) {
      const [stiffness, damping] = RATES[field] ?? DEFAULT_RATE;
      const settle = reduced ? damping * 1.9 : damping;
      const difference = this.target[field] - this.pose[field];
      this.velocity[field] += (difference * stiffness - this.velocity[field] * settle) * step;
      this.pose[field] += this.velocity[field] * step;
    }
    return this.pose;
  }

  /** The pose without spring smoothing, for a still capture that must be exact. */
  snapToTargets() {
    for (const field of FIELDS) { this.pose[field] = this.target[field]; this.velocity[field] = 0; }
  }

  /** Blends the face toward one authored expression. */
  private wear(name: ExpressionName, weight: number) {
    if (weight <= 0.001) return;
    const expression: Expression = EXPRESSIONS[name];
    const target = this.target;
    for (const field of FACE) {
      const to = expression[field] ?? REST[field] ?? 0;
      target[field] = mix(target[field], to, weight);
    }
  }

  private buildTargets(state: ArcadeState | null, playing: boolean, reduced: boolean, time: number,
                       allowBlink: boolean) {
    const target = this.target;
    for (const field of FIELDS) target[field] = 0;
    for (const field of FACE) target[field] = REST[field] ?? 0;

    const fullness = state?.hunger ?? 78;
    const rage = state?.rage ?? 0;
    const peckish = ramp(fullness, 68, 34);
    const hunger = ramp(fullness, 52, 6);
    const ended = state ? state.phase !== "playing" : false;
    const mutation = playing || ended ? state?.mutation ?? null : null;
    const active = mutation?.phase === "active";
    const warning = mutation?.phase === "warning";
    const clock = time - this.started;

    // 1. Baseline. On the title screen it watches the launcher; in play this is
    //    only ever what it looks like between other things happening.
    this.wear("attract", playing ? 0.55 : 1);

    // 2. Appetite. Peckish is impatience; hunger proper is the collapse.
    this.wear("peckish", peckish);
    this.wear("starving", hunger);

    // 3. Irritation, three separate shapes rather than one ramp.
    const step1 = ramp(rage, 18, 34);
    const step2 = ramp(rage, 46, 62);
    const step3 = ramp(rage, 74, 90);
    this.wear("annoy1", step1);
    this.wear("annoy2", step2);
    this.wear("annoy3", step3);

    // 4. Mutation build-up and the live effect.
    let strain = 0;
    if (warning && mutation) {
      const progress = clamp01(1 - (mutation.startsAt - (state?.tick ?? 0)) / 90);
      strain = Math.min(0.9, progress * 1.15) ** 1.2;
      const beat = reduced ? 1 : 0.86 + 0.14 * Math.sin(clock * 7);
      if (mutation.ingredient === "metal") this.wear("warnMetal", strain);
      else if (mutation.ingredient === "balloon") this.wear("warnBalloon", strain * beat);
      else this.wear("warnPepper", strain * beat);
    }
    if (active && mutation) {
      if (mutation.ingredient === "metal") this.wear("activeMetal", 1);
      else if (mutation.ingredient === "balloon") this.wear("activeBalloon", 1);
      else if (mutation.gustActive) this.wear("blowPepper", 1);
      else if (mutation.gustWarning) this.wear("warnPepper", 1);
      else this.wear("holdPepper", 1);
    }

    // 5. Tracking. A snack in the air owns the face until it lands.
    const flight = state?.projectiles ?? [];
    let nearest = flight.length ? flight[0] : null;
    if (playing && nearest) {
      for (const item of flight) if (item.x > nearest.x) nearest = item;
      const distance = Math.hypot(nearest.x - ARENA.mouth.x, nearest.y - ARENA.mouth.y);
      const closeness = 1 - clamp01((distance - 70) / 460);
      this.wear("trackFar", 0.75);
      this.wear("trackNear", closeness * closeness);
    }

    // 6. One-shot reactions, which override whatever mood they land on.
    const feed = latest(state, ["feed"], 1.5);
    const miss = latest(state, ["miss", "bounce"], 1.2);
    const recovery = latest(state, ["recovery"], 1.9);
    if (recovery) this.applyRecovery(recovery);
    if (feed && (!miss || feed.age <= miss.age)) this.applyGulp(target, feed, reduced);
    else if (miss) this.applyFlinch(target, miss, reduced);

    // 7. The whistle.
    if (ended && state) {
      if (state.phase === "survived") this.wear("smug", 1);
      else if (state.failureReason === "empty-belly") this.wear("collapse", 1);
      else this.wear("rageEnd", 1);
    }

    // --- layers that sit on top of the expression, not inside it ---

    // Breathing, faster and shallower when irritated.
    const breathRate = 1.05 + rage / 100 * 0.9 - hunger * 0.25;
    const breath = reduced ? 0 : Math.sin(clock * breathRate);
    target.breath = breath;
    target.squashY *= 1 + breath * 0.006;
    target.squashX *= 1 - breath * 0.004;
    target.headY -= breath * 1.4;

    // Blink. Reduced motion holds the eyes open rather than flashing them.
    if (!reduced && allowBlink) {
      if (time > this.blinkAt) {
        this.blinkIndex++;
        this.blinkUntil = time + 0.13;
        this.blinkAt = time + 1.6 + hashed(this.blinkIndex) * 3.4 - hunger * 0.4;
      }
      if (time < this.blinkUntil) target.blink = 1;
    }

    // Where the eyes point. Idle drifts to the launcher; a snack in the air or a
    // mess on the floor takes priority over that.
    target.pupilX = -0.82 + (reduced ? 0 : Math.sin(clock * 0.42) * 0.12);
    target.pupilY = 0.28 + (reduced ? 0 : Math.sin(clock * 0.31) * 0.1);
    if (peckish > 0.05 && !reduced) {
      const nag = Math.max(0, Math.sin(clock * 1.6)) ** 5;
      target.pupilX -= nag * peckish * 0.25;
      target.headTilt -= nag * peckish * 2;
    }
    if (playing && nearest) {
      target.pupilX = clamp(-1, 1, (nearest.x - 838) / 340);
      target.pupilY = clamp(-1, 1, (nearest.y - 250) / 240);
      target.headTilt += clamp(-9, 9, (nearest.x - ARENA.mouth.x) * 0.022);
      target.headX += clamp(-16, 16, (nearest.x - ARENA.mouth.x) * 0.03);
    }
    if (miss && miss.age > 0.16) {
      const look = clamp01((miss.age - 0.16) / 0.28);
      target.pupilX = mix(target.pupilX, clamp(-1, 1, (miss.x - 838) / 300), look);
      target.pupilY = mix(target.pupilY, clamp(-1, 1, (miss.y - 250) / 240), look);
    }
    if (step2 > 0.2) target.pupilY = mix(target.pupilY, -0.25, step2);
    if (ended && state?.phase === "survived") { target.pupilX = -0.35; target.pupilY = -0.15; }
    if (ended && state?.failureReason === "empty-belly") target.pupilY = 0.65;

    // Skin. These accumulate rather than blend: heat and pallor are conditions,
    // not expressions, and two of them can be true at once.
    target.pallor = hunger * 0.9;
    target.rageFlush = step2 * 0.62 + step3 * 0.38;
    target.sweat = step2 * 0.35 + step3 * 0.5;
    if (warning && mutation?.ingredient === "pepper") {
      target.flush = Math.max(target.flush, strain * 0.95);
      target.cheekMarks = Math.max(target.cheekMarks, strain);
      target.sweat = Math.max(target.sweat, strain);
    }
    if (active && mutation?.ingredient === "pepper") {
      target.flush = Math.max(target.flush, 0.82);
      target.cheekMarks = 1;
      target.sweat = Math.max(target.sweat, 0.7);
      if (mutation.gustActive) target.exhale = 1;
    }
    if (mutation?.ingredient === "metal") {
      const grip = active ? 1 : strain;
      target.magnetism = active ? 1 : strain * 0.45;
      target.teethAlign = active ? 1 : strain * 0.55;
      if (warning) target.teethQuiver = grip > 0 ? 1 : 0;
    }
    if (ended && state?.failureReason === "too-many-missed-shots") {
      target.rageFlush = 1;
      target.sweat = 0.8;
    }
    if (ended && state?.failureReason === "empty-belly") target.pallor = 1;
    if (ended && state?.phase === "survived") { target.pallor = 0; target.flush = 0; target.rageFlush = 0; }

    // Tremors.
    target.antennaShake = Math.max(target.antennaShake, step3);
    if (!reduced) target.shake = step3 * 0.7;
    if (ended && state?.failureReason === "too-many-missed-shots") {
      target.antennaShake = 1;
      target.shake = reduced ? 0 : 0.6;
    }

    // The reaction beats add their own skin on top.
    if (feed) this.gulpSkin(target, feed, reduced);

    target.jawOpen = clamp01(target.jawOpen);
    target.lidLeft = clamp(0, 0.66, target.lidLeft);
    target.lidRight = clamp(0, 0.66, target.lidRight);
    target.lowerLid = clamp01(target.lowerLid);
    target.cornerLift = clamp(-1.6, 1.4, target.cornerLift);
    target.flush = clamp01(target.flush);
    target.rageFlush = clamp01(target.rageFlush);
    target.pallor = clamp01(target.pallor);
  }

  /**
   * The catch, as three different beats.
   *
   * Contact is a hard clamp whatever the ingredient; what follows is not. Metal
   * jolts and rings; balloon floats up and settles slowly; pepper swallows
   * cleanly and only then discovers what it has eaten.
   */
  private applyGulp(target: CreaturePose, feed: Reaction, reduced: boolean) {
    const age = feed.age;
    const contact = Math.exp(-Math.abs(age - 0.05) * 15);
    const shut = Math.exp(-age * 6);

    this.wear("snap", Math.max(contact, shut * 0.7));

    if (feed.ingredient === "metal") {
      // A short, hard, high-frequency beat that is over quickly.
      this.wear("clank", Math.exp(-Math.abs(age - 0.07) * 13));
      const ring = reduced ? 0 : Math.exp(-age * 4.5) * Math.sin(age * 46);
      target.headX += ring * 5;
      target.headTilt += ring * 2.4;
      target.antennaShake = Math.max(target.antennaShake, Math.exp(-age * 3));
    } else if (feed.ingredient === "balloon") {
      // Slow in, floaty, with a rebound that outlasts the other two.
      this.wear("puff", Math.exp(-Math.abs(age - 0.3) * 4.2));
      const float = reduced ? 0 : Math.exp(-age * 1.9) * Math.sin(age * 7.5 - 0.6);
      target.bodyRise += float * 7;
      target.headY -= float * 4;
      target.headTilt += float * 2;
    } else if (feed.ingredient === "pepper") {
      // Nothing for a beat, then the heat arrives and takes over the face.
      const onset = clamp01((age - 0.34) / 0.16);
      const fade = 1 - clamp01((age - 1.05) / 0.4);
      this.wear("burn", onset * fade);
      if (!reduced) {
        target.antennaShake = Math.max(target.antennaShake, onset * fade);
        target.shake = Math.max(target.shake, onset * fade * 0.6);
      }
    }

    // The swallow travels: a bulge from the throat down into the belly.
    const travel = clamp01((age - 0.1) / 0.78);
    if (travel > 0 && travel < 1) {
      target.throat = Math.sin(travel * Math.PI) ** 0.4;
      target.throatTravel = travel;
    }

    // Then the verdict.
    const settle = clamp01((age - 0.55) / 0.6);
    if (settle > 0) {
      this.wear(feed.craved ? "delight" : "shrug", settle * (feed.ingredient === "pepper" ? 0.35 : 1));
      target.bellySwell = Math.max(target.bellySwell, settle * 0.14);
    }
  }

  /** Skin changes belonging to a catch, layered after the mood's own. */
  private gulpSkin(target: CreaturePose, feed: Reaction, reduced: boolean) {
    if (feed.ingredient !== "pepper") return;
    const heat = clamp01((feed.age - 0.32) / 0.18) * (1 - clamp01((feed.age - 1.05) / 0.4));
    target.flush = Math.max(target.flush, heat);
    target.cheekMarks = Math.max(target.cheekMarks, heat * 0.8);
    target.sweat = Math.max(target.sweat, heat);
    target.tears = Math.max(target.tears, heat * (reduced ? 0.8 : 1));
  }

  /** A snack on the floor: a flinch away, then a flat side-eye at the mess. */
  private applyFlinch(target: CreaturePose, miss: Reaction, reduced: boolean) {
    const age = miss.age;
    const jolt = Math.exp(-Math.abs(age - 0.04) * 14);
    const look = clamp01((age - 0.18) / 0.26) * (1 - clamp01((age - 0.95) / 0.4));
    const side = miss.x < ARENA.mouth.x ? -1 : 1;

    this.wear("flinch", jolt);
    // A deflection is not a loss — the snack is still in play — so it startles
    // rather than disappoints, which also stops the two misses looking alike.
    this.wear(miss.type === "bounce" ? "startle" : "sideEye", look);
    target.headX -= side * jolt * (reduced ? 5 : 24);
    target.headTilt -= side * jolt * (reduced ? 2 : 7);
    target.headX += side * look * 7;
    if (!reduced) target.antennaShake = Math.max(target.antennaShake, jolt);
  }

  /** Deflating: the body sags past its resting size, then comes back. */
  private applyRecovery(recovery: Reaction) {
    const sag = Math.sin(clamp01(recovery.age / 1.5) * Math.PI) ** 0.7;
    this.wear("deflate", sag);
    this.target.exhale = Math.max(this.target.exhale, sag);
  }
}
