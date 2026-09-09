/**
 * Turns game state into a creature performance.
 *
 * Reads `ArcadeState` and its presentation events and produces the pose the
 * renderer draws. It owns its own clock, springs and noise; nothing here is
 * visible to `lib/game/`, and none of it can change a rule, a score or a
 * replay. Springs give anticipation and overshoot for free: a target snaps,
 * the body arrives late and settles.
 */
import { ARENA, type ArcadeEvent, type ArcadeState, type Ingredient } from "../../game/arcade";

export interface CreaturePose {
  headX: number; headY: number; headTilt: number;
  squashX: number; squashY: number;
  bodyRise: number; bellySwell: number; breath: number;
  jawOpen: number; mouthWidth: number; cornerLift: number; lipPress: number;
  lidLeft: number; lidRight: number; lowerLid: number;
  browAngry: number; browSad: number; browRaise: number;
  pupilX: number; pupilY: number; pupilScale: number;
  tongueOut: number; drool: number;
  teethBare: number; teethAlign: number; teethLong: number; teethQuiver: number;
  throat: number; throatTravel: number;
  cheekPuff: number; cheekMarks: number;
  flush: number; pallor: number; sweat: number;
  antennaDroop: number; antennaShake: number;
  exhale: number; magnetism: number;
  shake: number;
}

const FIELDS: (keyof CreaturePose)[] = [
  "headX", "headY", "headTilt", "squashX", "squashY", "bodyRise", "bellySwell", "breath",
  "jawOpen", "mouthWidth", "cornerLift", "lipPress",
  "lidLeft", "lidRight", "lowerLid", "browAngry", "browSad", "browRaise",
  "pupilX", "pupilY", "pupilScale", "tongueOut", "drool",
  "teethBare", "teethAlign", "teethLong", "teethQuiver", "throat", "throatTravel",
  "cheekPuff", "cheekMarks", "flush", "pallor", "sweat",
  "antennaDroop", "antennaShake", "exhale", "magnetism", "shake",
];

/** Spring rates per field: low stiffness reads as weight, high as a snap. */
const RATES: Partial<Record<keyof CreaturePose, [number, number]>> = {
  headX: [110, 13], headY: [110, 13], headTilt: [90, 12],
  squashX: [220, 15], squashY: [220, 15],
  jawOpen: [260, 17], mouthWidth: [150, 16], cornerLift: [130, 15], lipPress: [180, 18],
  lidLeft: [300, 24], lidRight: [300, 24], lowerLid: [200, 20],
  browAngry: [150, 17], browSad: [150, 17], browRaise: [170, 18],
  pupilX: [230, 22], pupilY: [230, 22], pupilScale: [180, 20],
  bellySwell: [26, 8], bodyRise: [40, 10], throat: [340, 26],
  cheekPuff: [80, 11], teethLong: [70, 12], teethAlign: [90, 13],
  flush: [26, 9], pallor: [16, 8], antennaDroop: [30, 9],
};
const DEFAULT_RATE: [number, number] = [120, 15];

const zero = (): CreaturePose => {
  const pose = {} as CreaturePose;
  for (const field of FIELDS) pose[field] = 0;
  pose.squashX = 1;
  pose.squashY = 1;
  pose.mouthWidth = 1;
  pose.pupilScale = 1;
  return pose;
};

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);
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
  step(state: ArcadeState | null, playing: boolean, reduced: boolean, time: number, delta: number): CreaturePose {
    if (this.started < 0) {
      this.started = time;
      this.blinkAt = time + 1.4 + hashed(1) * 2.6;
    }
    this.buildTargets(state, playing, reduced, time);
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

  private buildTargets(state: ArcadeState | null, playing: boolean, reduced: boolean, time: number) {
    const target = this.target;
    for (const field of FIELDS) target[field] = 0;
    target.squashX = 1;
    target.squashY = 1;
    target.mouthWidth = 1;
    target.pupilScale = 1;

    const fullness = state?.hunger ?? 78;
    const rage = state?.rage ?? 0;
    const hunger = ramp(fullness, 58, 6);
    const ended = state ? state.phase !== "playing" : false;
    const mutation = playing || ended ? state?.mutation ?? null : null;
    const active = mutation?.phase === "active";
    const warning = mutation?.phase === "warning";

    // Breathing. Slow and deep when calm, shallow and quick when irritated.
    const breathRate = 1.05 + rage / 100 * 0.9 - hunger * 0.25;
    const breath = reduced ? 0 : Math.sin((time - this.started) * breathRate);
    target.breath = breath;
    target.squashY = 1 + breath * 0.006;
    target.squashX = 1 - breath * 0.004;
    target.headY = -breath * 1.4;

    // Blink. Reduced motion holds the eyes open rather than flashing them.
    if (!reduced) {
      if (time > this.blinkAt) {
        this.blinkIndex++;
        this.blinkUntil = time + 0.13;
        this.blinkAt = time + 1.6 + hashed(this.blinkIndex) * 3.4 - hunger * 0.4;
      }
      if (time < this.blinkUntil) { target.lidLeft = 1; target.lidRight = 1; }
    }

    // Idle attention: eyes drift toward the launcher, so the creature is
    // always looking at where food comes from.
    const idleDrift = reduced ? 0 : Math.sin((time - this.started) * 0.42);
    target.pupilX = -0.55 + idleDrift * 0.16;
    target.pupilY = 0.34 + Math.sin((time - this.started) * 0.31) * 0.1;
    target.headTilt = idleDrift * 0.5;

    // Hunger. Everything sags, the tongue lolls, colour drains.
    if (hunger > 0) {
      target.browSad = Math.max(target.browSad, hunger * 0.85);
      target.lidLeft = Math.max(target.lidLeft, hunger * 0.26);
      target.lidRight = Math.max(target.lidRight, hunger * 0.3);
      target.jawOpen = Math.max(target.jawOpen, 0.1 + hunger * 0.16);
      target.tongueOut = 0.3 + hunger * 0.7;
      target.drool = hunger * 0.7;
      target.cornerLift = -hunger * 1.5;
      target.antennaDroop = hunger;
      target.pallor = hunger * 0.9;
      target.headY += hunger * 21;
      target.headTilt += hunger * 4.5;
      target.squashY -= hunger * 0.055;
      target.squashX += hunger * 0.035;
      target.bodyRise -= hunger * 13;
      // Impatient glances toward the launcher on a slow beat.
      const glance = reduced ? 0 : Math.max(0, Math.sin((time - this.started) * 1.9)) ** 6;
      target.pupilX -= glance * hunger * 0.4;
      target.browRaise += glance * hunger * 0.5;
    }

    // Irritation, in three readable steps.
    const step1 = ramp(rage, 18, 34);
    const step2 = ramp(rage, 46, 62);
    const step3 = ramp(rage, 74, 90);
    const anger = Math.max(step1 * 0.34, step2 * 0.7, step3);
    if (anger > 0) {
      target.browAngry = Math.max(target.browAngry, anger);
      target.browSad *= 1 - anger;
      target.lidLeft = Math.max(target.lidLeft, step1 * 0.2 + step2 * 0.12);
      target.lidRight = Math.max(target.lidRight, step1 * 0.2 + step2 * 0.12);
      target.lowerLid = Math.max(target.lowerLid, step2 * 0.5 + step3 * 0.5);
      target.flush = Math.max(target.flush, step2 * 0.55 + step3 * 0.45);
      target.teethBare = Math.max(target.teethBare, step2 * 0.45 + step3 * 0.55);
      target.jawOpen = Math.max(target.jawOpen, step3 * 0.34);
      target.lipPress = Math.max(target.lipPress, step1 * 0.7 * (1 - step3));
      target.pupilScale = Math.min(target.pupilScale, 1 - anger * 0.3);
      target.headX += step2 * 8 + step3 * 18;
      target.headY -= step3 * 9;
      target.squashX += step3 * 0.05;
      target.antennaShake = step3;
      target.sweat = Math.max(target.sweat, step3 * 0.6);
      if (!reduced) target.shake = step3 * 0.7;
    }

    // Tracking. The nearest snack in flight owns the eyes, and the mouth
    // opens as it closes in — the anticipation before the catch.
    const flight = state?.projectiles ?? [];
    if (playing && flight.length) {
      let nearest = flight[0];
      for (const item of flight) if (item.x > nearest.x) nearest = item;
      const dx = nearest.x - ARENA.mouth.x;
      const dy = nearest.y - ARENA.mouth.y;
      const distance = Math.hypot(dx, dy);
      const closeness = 1 - clamp01((distance - 70) / 460);
      target.pupilX = clamp01((nearest.x - 180) / 700) * 2 - 1;
      target.pupilY = clamp01((nearest.y - 120) / 460) * 2 - 1;
      target.pupilScale = Math.max(target.pupilScale, 1 + closeness * 0.16);
      target.headTilt += (nearest.x - ARENA.mouth.x) * 0.006;
      target.headX += (nearest.x - ARENA.mouth.x) * 0.004;
      target.jawOpen = Math.max(target.jawOpen, 0.16 + closeness * closeness * 0.96);
      target.browRaise = Math.max(target.browRaise, closeness * 0.6);
      target.lidLeft = Math.min(target.lidLeft, 1 - closeness * 0.6);
      target.lidRight = Math.min(target.lidRight, 1 - closeness * 0.6);
      target.tongueOut = Math.max(target.tongueOut * 0.4, closeness * 0.25);
      target.drool = Math.max(target.drool, closeness * 0.5);
    }

    // Mutation build-up, one shape per ingredient.
    if (warning && mutation) {
      const progress = clamp01(1 - (mutation.startsAt - (state?.tick ?? 0)) / 90);
      const strain = progress * progress;
      target.browRaise = Math.max(target.browRaise, strain * 0.5);
      if (mutation.ingredient === "metal") {
        target.jawOpen = Math.max(target.jawOpen, 0.3 + strain * 0.4);
        target.teethQuiver = strain;
        target.teethAlign = strain * 0.55;
        target.teethLong = strain * 0.3;
        target.lidLeft = Math.min(target.lidLeft, 0.1);
        target.lidRight = Math.min(target.lidRight, 0.1);
        target.pupilScale = Math.min(target.pupilScale, 1 - strain * 0.35);
      } else if (mutation.ingredient === "balloon") {
        target.bellySwell = strain * 0.55;
        target.cheekPuff = strain * 0.6;
        target.bodyRise = strain * 5;
        target.lipPress = Math.max(target.lipPress, strain * 0.8);
        target.browSad = Math.max(target.browSad, strain * 0.4);
      } else {
        target.cheekPuff = strain * 0.85;
        target.cheekMarks = strain;
        target.flush = Math.max(target.flush, strain * 0.8);
        target.lipPress = Math.max(target.lipPress, strain);
        target.lidLeft = Math.max(target.lidLeft, strain * 0.45);
        target.lidRight = Math.max(target.lidRight, strain * 0.45);
        target.sweat = Math.max(target.sweat, strain * 0.8);
      }
    }

    // Mutation active silhouettes.
    if (active && mutation) {
      if (mutation.ingredient === "metal") {
        target.teethLong = 1;
        target.teethAlign = 1;
        target.magnetism = 1;
        target.jawOpen = Math.max(target.jawOpen, 0.62);
        target.browAngry = Math.max(target.browAngry, 0.45);
        target.lowerLid = Math.max(target.lowerLid, 0.3);
        target.pupilScale = Math.min(target.pupilScale, 0.72);
      } else if (mutation.ingredient === "balloon") {
        target.bellySwell = 1;
        target.bodyRise = 15 + (reduced ? 0 : Math.sin((time - this.started) * 1.5) * 3);
        target.cheekPuff = 0.75;
        target.browRaise = Math.max(target.browRaise, 0.5);
        target.headTilt += reduced ? 0 : Math.sin((time - this.started) * 0.9) * 2.2;
        target.lidLeft = Math.max(target.lidLeft, 0.12);
        target.lidRight = Math.max(target.lidRight, 0.12);
        target.jawOpen = Math.max(target.jawOpen, 0.18);
        target.cornerLift = Math.max(target.cornerLift, 0.4);
      } else {
        target.flush = Math.max(target.flush, 0.85);
        target.cheekMarks = 1;
        target.sweat = Math.max(target.sweat, 0.7);
        if (mutation.gustWarning) {
          target.cheekPuff = 1;
          target.lipPress = 1;
          target.jawOpen = 0;
          target.lidLeft = Math.max(target.lidLeft, 0.55);
          target.lidRight = Math.max(target.lidRight, 0.55);
          target.browAngry = Math.max(target.browAngry, 0.5);
        } else if (mutation.gustActive) {
          target.exhale = 1;
          target.cheekPuff = -0.35;
          target.jawOpen = Math.max(target.jawOpen, 0.95);
          target.tongueOut = Math.max(target.tongueOut, 0.7);
          target.headTilt -= 3;
          target.headX -= 6;
          target.lidLeft = Math.max(target.lidLeft, 0.7);
          target.lidRight = Math.max(target.lidRight, 0.7);
          target.browRaise = Math.max(target.browRaise, 0.7);
        } else {
          target.cheekPuff = Math.max(target.cheekPuff, 0.3);
          target.jawOpen = Math.max(target.jawOpen, 0.2);
        }
      }
    }

    // One-shot reactions. Each is an authored beat over its own timeline.
    const feed = latest(state, ["feed"], 1.4);
    if (feed) this.applyGulp(target, feed, reduced);

    const miss = latest(state, ["miss", "bounce"], 1.1);
    if (miss && (!feed || miss.age < feed.age)) this.applyFlinch(target, miss, reduced);

    const recovery = latest(state, ["recovery"], 1.6);
    if (recovery) {
      const settle = clamp01(recovery.age / 1.4);
      target.bellySwell *= 1 - settle;
      target.cheekPuff *= 1 - settle;
      target.teethLong *= 1 - settle;
      target.flush *= 1 - settle;
      target.lidLeft = Math.max(target.lidLeft, (1 - settle) * 0.5);
      target.lidRight = Math.max(target.lidRight, (1 - settle) * 0.5);
      target.jawOpen = Math.max(target.jawOpen, (1 - settle) * 0.45);
      target.exhale = Math.max(target.exhale, 1 - settle);
      target.cornerLift = Math.max(target.cornerLift, settle * 0.5);
      target.squashY -= (1 - settle) * 0.03;
    }

    // Shift end. Three different creatures at the whistle.
    if (ended && state) {
      target.shake = 0;
      if (state.phase === "survived") {
        target.cornerLift = 1;
        target.lidLeft = 0.52;
        target.lidRight = 0.52;
        target.lowerLid = 0.6;
        target.browRaise = 0.35;
        target.browAngry = 0.18;
        target.bellySwell = 0.55;
        target.jawOpen = 0.06;
        target.lipPress = 0.35;
        target.pupilX = -0.35;
        target.pupilY = -0.1;
        target.headTilt = 3.2;
        target.tongueOut = 0;
        target.pallor = 0;
        target.antennaDroop = 0;
      } else if (state.failureReason === "empty-belly") {
        target.browSad = 1;
        target.lidLeft = 0.72;
        target.lidRight = 0.66;
        target.jawOpen = 0.52;
        target.tongueOut = 1;
        target.drool = 0.4;
        target.cornerLift = -1;
        target.antennaDroop = 1;
        target.pallor = 1;
        target.headY += 30;
        target.headTilt = 7;
        target.squashY -= 0.08;
        target.bodyRise = -18;
        target.bellySwell = -0.5;
        target.pupilY = 0.6;
        target.pupilScale = 0.8;
      } else {
        target.browAngry = 1;
        target.teethBare = 1;
        target.flush = 1;
        target.jawOpen = 0.72;
        target.lowerLid = 0.8;
        target.lidLeft = 0.12;
        target.lidRight = 0.12;
        target.pupilScale = 0.6;
        target.headX = 28;
        target.headY -= 14;
        target.squashX = 1.09;
        target.bodyRise = 6;
        target.sweat = 0.8;
        target.antennaShake = 1;
        target.cheekMarks = 0.5;
      }
    }

    // Attract screen: calm, curious, alive.
    if (!playing && !ended) {
      target.jawOpen = Math.max(target.jawOpen, 0.24);
      target.cornerLift = Math.max(target.cornerLift, 0.35);
      target.browRaise = Math.max(target.browRaise, 0.2);
      target.drool = Math.max(target.drool, 0.25);
    }

    target.jawOpen = clamp01(target.jawOpen);
    target.lidLeft = clamp01(target.lidLeft);
    target.lidRight = clamp01(target.lidRight);
  }

  /** Snap shut, squash, a bulge down the throat, then a satisfied settle. */
  private applyGulp(target: CreaturePose, feed: Reaction, reduced: boolean) {
    const age = feed.age;
    const bite = Math.exp(-age * 9);
    const settle = clamp01((age - 0.5) / 0.7);
    target.jawOpen = Math.min(target.jawOpen, mix(0.02, 0.2, settle));
    target.lipPress = Math.max(target.lipPress, bite);
    target.squashY *= 1 - bite * (reduced ? 0.05 : 0.16);
    target.squashX *= 1 + bite * (reduced ? 0.04 : 0.13);
    target.headY += bite * (reduced ? 3 : 13);
    target.teethBare = Math.max(target.teethBare, bite * 0.4);
    target.lidLeft = Math.max(target.lidLeft, bite * 0.85);
    target.lidRight = Math.max(target.lidRight, bite * 0.85);
    target.tongueOut = 0;
    target.drool = 0;

    // The swallow travels: a bulge from the throat down into the belly.
    const travel = clamp01((age - 0.14) / 0.62);
    if (travel > 0 && travel < 1) {
      target.throat = Math.sin(travel * Math.PI) ** 0.7;
      target.throatTravel = travel;
    }
    if (age > 0.5) {
      target.cornerLift = Math.max(target.cornerLift, (1 - settle) * 0.2 + settle * (feed.craved ? 1 : 0.25));
      target.lowerLid = Math.max(target.lowerLid, settle * (feed.craved ? 0.75 : 0.15));
      target.browRaise = Math.max(target.browRaise, settle * (feed.craved ? 0.55 : 0.1));
      target.lidLeft = Math.max(target.lidLeft, settle * (feed.craved ? 0.55 : 0.08));
      target.lidRight = Math.max(target.lidRight, settle * (feed.craved ? 0.55 : 0.08));
      target.headTilt += settle * (feed.craved ? 3.4 : 0.4);
      target.bellySwell = Math.max(target.bellySwell, settle * 0.12);
    }

    // Ingredient flavour: a clank, a puff, a wince.
    if (feed.ingredient === "metal") {
      target.headX += bite * (reduced ? 3 : 15);
      target.teethAlign = Math.max(target.teethAlign, bite);
      target.antennaShake = Math.max(target.antennaShake, bite);
      target.pupilScale = Math.min(target.pupilScale, 1 - bite * 0.4);
      target.pupilX += bite * 0.5;
    } else if (feed.ingredient === "balloon") {
      const puff = Math.exp(-Math.abs(age - 0.28) * 7);
      target.cheekPuff = Math.max(target.cheekPuff, puff);
      target.bodyRise = Math.max(target.bodyRise, puff * 8);
      target.squashY *= 1 + puff * 0.05;
      target.browRaise = Math.max(target.browRaise, puff * 0.8);
      target.pupilScale = Math.max(target.pupilScale, 1 + puff * 0.2);
    } else if (feed.ingredient === "pepper") {
      const burn = clamp01((age - 0.2) / 0.35) * (1 - clamp01((age - 0.85) / 0.5));
      target.flush = Math.max(target.flush, burn);
      target.cheekMarks = Math.max(target.cheekMarks, burn);
      target.lidLeft = Math.max(target.lidLeft, burn * 0.95);
      target.lidRight = Math.max(target.lidRight, burn * 0.95);
      target.browAngry = Math.max(target.browAngry, burn * 0.7);
      target.tongueOut = Math.max(target.tongueOut, burn * 0.8);
      target.jawOpen = Math.max(target.jawOpen, burn * 0.55);
      target.sweat = Math.max(target.sweat, burn);
      if (!reduced) target.antennaShake = Math.max(target.antennaShake, burn);
    }
  }

  /** A snack on the floor: a flinch away, then a flat side-eye at the mess. */
  private applyFlinch(target: CreaturePose, miss: Reaction, reduced: boolean) {
    const age = miss.age;
    const jolt = Math.exp(-age * 11);
    const look = clamp01((age - 0.16) / 0.3) * (1 - clamp01((age - 0.75) / 0.4));
    const side = miss.x < ARENA.mouth.x ? -1 : 1;
    target.headX -= side * jolt * (reduced ? 4 : 20);
    target.headY -= jolt * (reduced ? 2 : 9);
    target.headTilt -= side * jolt * (reduced ? 1.5 : 6);
    target.squashX *= 1 - jolt * 0.03;
    target.lidLeft = Math.max(target.lidLeft, jolt * 0.9);
    target.lidRight = Math.max(target.lidRight, jolt * 0.6);
    target.browRaise = Math.max(target.browRaise, jolt * 0.9);
    target.jawOpen = Math.min(target.jawOpen, mix(0.5, 0.14, clamp01(age / 0.3)));
    if (look > 0) {
      target.pupilX = mix(target.pupilX, side * 0.9, look);
      target.pupilY = mix(target.pupilY, 0.85, look);
      target.lidLeft = Math.max(target.lidLeft, look * 0.42);
      target.lidRight = Math.max(target.lidRight, look * 0.2);
      target.lowerLid = Math.max(target.lowerLid, look * 0.55);
      target.browAngry = Math.max(target.browAngry, look * 0.55);
      target.cornerLift = Math.min(target.cornerLift, -look * 0.7);
      target.headTilt += look * 2.6;
    }
  }
}
