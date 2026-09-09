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
  flush: [95, 17], pallor: [22, 9], antennaDroop: [34, 10],
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

    // Idle attention: it is watching the launcher, so the eyes sit hard left
    // and the head leans that way. This is a pose, not a neutral rest.
    const idleDrift = reduced ? 0 : Math.sin((time - this.started) * 0.42);
    target.pupilX = -0.86 + idleDrift * 0.12;
    target.pupilY = 0.3 + Math.sin((time - this.started) * 0.31) * 0.1;
    target.headTilt = -2.2 + idleDrift * 0.7;
    target.headX = -5;

    // Peckish comes first and reads as impatience; hunger proper is the
    // collapse. Keeping them separate stops "a bit hungry" from looking like a
    // faded copy of "starving".
    const peckish = ramp(fullness, 68, 34);
    if (peckish > 0) {
      target.tongueOut = Math.max(target.tongueOut, peckish * 0.34);
      target.drool = Math.max(target.drool, peckish * 0.5);
      target.jawOpen = Math.max(target.jawOpen, 0.12 + peckish * 0.16);
      target.cornerLift = Math.min(target.cornerLift, -peckish * 0.7);
      target.browSad = Math.max(target.browSad, peckish * 0.4);
      target.browRaise = Math.max(target.browRaise, peckish * 0.35);
      target.antennaDroop = Math.max(target.antennaDroop, peckish * 0.45);
      target.headY += peckish * 5;
      // Impatient glances at the launcher, on a slow beat.
      const nag = reduced ? 0 : Math.max(0, Math.sin((time - this.started) * 1.6)) ** 5;
      target.pupilX -= nag * peckish * 0.3;
      target.headTilt -= nag * peckish * 2.4;
    }

    // Hunger. Everything sags, the tongue lolls, colour drains.
    if (hunger > 0) {
      target.browSad = Math.max(target.browSad, hunger * 0.85);
      target.lidLeft = Math.max(target.lidLeft, hunger * 0.26);
      target.lidRight = Math.max(target.lidRight, hunger * 0.3);
      target.jawOpen = Math.max(target.jawOpen, 0.08 + hunger * 0.09);
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
    }

    // Irritation, in three readable steps.
    const step1 = ramp(rage, 18, 34);
    const step2 = ramp(rage, 46, 62);
    const step3 = ramp(rage, 74, 90);
    const anger = Math.max(step1 * 0.34, step2 * 0.7, step3);
    if (anger > 0) {
      // Step 1 is a scowl and a shut mouth. Step 2 adds heat and a hard stare.
      // Step 3 bares the teeth and leans the whole body in.
      target.browAngry = Math.max(target.browAngry, 0.55 * step1 + 0.25 * step2 + 0.2 * step3);
      target.browSad *= 1 - anger;
      target.lidLeft = Math.max(target.lidLeft, step1 * 0.14 + step2 * 0.18);
      target.lidRight = Math.max(target.lidRight, step1 * 0.14 + step2 * 0.18);
      target.lowerLid = Math.max(target.lowerLid, step1 * 0.3 + step2 * 0.35 + step3 * 0.35);
      target.flush = Math.max(target.flush, step2 * 0.6 + step3 * 0.4);
      target.teethBare = Math.max(target.teethBare, step3);
      target.jawOpen = Math.max(target.jawOpen, step3 * 0.46);
      target.cornerLift = Math.min(target.cornerLift, -step1 * 1.1);
      target.lipPress = Math.max(target.lipPress, step1 * (1 - step2));
      target.mouthWidth = Math.min(target.mouthWidth, 1 - step1 * 0.18 + step3 * 0.18);
      target.pupilScale = Math.min(target.pupilScale, 1 - step2 * 0.22 - step3 * 0.2);
      target.pupilY = mix(target.pupilY, -0.25, step2);
      target.headTilt += step1 * 1.6;
      target.headX += step2 * 12 + step3 * 24;
      target.headY -= step3 * 12;
      target.squashX += step3 * 0.06;
      target.squashY -= step3 * 0.03;
      target.antennaShake = step3;
      target.antennaDroop = Math.max(target.antennaDroop, -step1 * 0.35);
      target.sweat = Math.max(target.sweat, step2 * 0.35 + step3 * 0.5);
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
      target.headTilt += clamp(-9, 9, (nearest.x - ARENA.mouth.x) * 0.022);
      target.headX += clamp(-16, 16, (nearest.x - ARENA.mouth.x) * 0.03);
      target.headY += clamp(-10, 10, (nearest.y - ARENA.mouth.y) * 0.03) - closeness * 6;
      target.jawOpen = Math.max(target.jawOpen, 0.24 + closeness * closeness * 0.9);
      target.browRaise = Math.max(target.browRaise, 0.35 + closeness * 0.55);
      target.antennaDroop = Math.min(target.antennaDroop, -0.35 - closeness * 0.4);
      target.cornerLift = Math.max(target.cornerLift, closeness * 0.5);
      target.lidLeft = Math.min(target.lidLeft, 1 - closeness * 0.6);
      target.lidRight = Math.min(target.lidRight, 1 - closeness * 0.6);
      target.tongueOut = Math.max(target.tongueOut * 0.4, closeness * 0.25);
      target.drool = Math.max(target.drool, closeness * 0.5);
    }

    // Mutation build-up, one shape per ingredient.
    if (warning && mutation) {
      const progress = clamp01(1 - (mutation.startsAt - (state?.tick ?? 0)) / 90);
      const strain = Math.min(0.82, progress * 1.1) ** 1.3;
      target.browRaise = Math.max(target.browRaise, strain * 0.5);
      if (mutation.ingredient === "metal") {
        // Chattering teeth that are visibly growing and lining up.
        target.jawOpen = Math.max(target.jawOpen, 0.24 + strain * 0.2);
        target.teethQuiver = 1;
        target.teethAlign = strain * 0.5;
        target.teethLong = strain * 0.4;
        target.lidLeft = Math.min(target.lidLeft, 0.06);
        target.lidRight = Math.min(target.lidRight, 0.06);
        target.pupilScale = Math.min(target.pupilScale, 1 - strain * 0.42);
        target.pupilY = mix(target.pupilY, 0.5, strain * 0.7);
        target.headY -= strain * 5;
        target.antennaShake = Math.max(target.antennaShake, strain * 0.7);
        target.magnetism = Math.max(target.magnetism, strain * 0.45);
      } else if (mutation.ingredient === "balloon") {
        // The belly is filling: the silhouette is the whole message.
        target.bellySwell = strain * 0.8;
        target.cheekPuff = strain * 0.5;
        target.bodyRise = strain * 12;
        target.lipPress = Math.max(target.lipPress, strain);
        target.jawOpen = 0;
        target.browRaise = Math.max(target.browRaise, strain * 0.9);
        target.lidLeft = Math.min(target.lidLeft, 0.02);
        target.lidRight = Math.min(target.lidRight, 0.02);
        target.pupilScale = Math.max(target.pupilScale, 1 + strain * 0.2);
        target.antennaDroop = Math.min(target.antennaDroop, -strain * 0.8);
        target.squashY += strain * 0.05;
      } else {
        // Pressure: cheeks blown out, face reddening, lips clamped shut.
        target.cheekPuff = strain * 1.25;
        target.cheekMarks = strain;
        target.flush = Math.max(target.flush, strain * 0.95);
        target.lipPress = Math.max(target.lipPress, strain);
        target.jawOpen = 0;
        target.lidLeft = Math.max(target.lidLeft, strain * 0.62);
        target.lidRight = Math.max(target.lidRight, strain * 0.62);
        target.browAngry = Math.max(target.browAngry, strain * 0.65);
        target.sweat = Math.max(target.sweat, strain);
        target.headY += strain * 4;
        target.squashX += strain * 0.04;
        target.squashY -= strain * 0.02;
      }
    }

    // Mutation active silhouettes.
    if (active && mutation) {
      if (mutation.ingredient === "metal") {
        target.teethLong = 1;
        target.teethAlign = 1;
        target.magnetism = 1;
        target.jawOpen = Math.max(target.jawOpen, 0.66);
        target.browAngry = Math.max(target.browAngry, 0.5);
        target.lowerLid = Math.max(target.lowerLid, 0.34);
        target.pupilScale = Math.min(target.pupilScale, 0.68);
        target.headX += 8;
        target.antennaDroop = Math.min(target.antennaDroop, -0.6);
      } else if (mutation.ingredient === "balloon") {
        target.bellySwell = 1;
        target.bodyRise = 26 + (reduced ? 0 : Math.sin((time - this.started) * 1.5) * 5);
        target.cheekPuff = 0.85;
        target.browRaise = Math.max(target.browRaise, 0.85);
        target.headTilt += reduced ? 0 : Math.sin((time - this.started) * 0.9) * 3;
        target.headY -= 10;
        target.lidLeft = Math.max(target.lidLeft, 0.06);
        target.lidRight = Math.max(target.lidRight, 0.06);
        target.jawOpen = Math.max(target.jawOpen, 0.14);
        target.cornerLift = Math.max(target.cornerLift, 0.7);
        target.pupilScale = Math.max(target.pupilScale, 1.18);
        target.pupilY = mix(target.pupilY, -0.3, 0.6);
        target.antennaDroop = Math.min(target.antennaDroop, -0.9);
        target.squashY += 0.04;
      } else {
        target.flush = Math.max(target.flush, 0.8);
        target.cheekMarks = 1;
        target.sweat = Math.max(target.sweat, 0.7);
        if (mutation.gustWarning) {
          // Holding it in: cheeks blown right out, lips clamped.
          target.cheekPuff = 1.3;
          target.lipPress = 1;
          target.jawOpen = 0;
          target.lidLeft = Math.max(target.lidLeft, 0.62);
          target.lidRight = Math.max(target.lidRight, 0.62);
          target.browAngry = Math.max(target.browAngry, 0.55);
          target.headY += 4;
          target.squashX += 0.04;
        } else if (mutation.gustActive) {
          // Letting it go: cheeks hollow, head thrown back, hot air out.
          target.exhale = 1;
          target.cheekPuff = -0.5;
          target.jawOpen = Math.max(target.jawOpen, 0.98);
          target.tongueOut = Math.max(target.tongueOut, 0.85);
          target.headTilt -= 5;
          target.headX -= 14;
          target.headY -= 8;
          target.lidLeft = Math.max(target.lidLeft, 0.78);
          target.lidRight = Math.max(target.lidRight, 0.78);
          target.browRaise = Math.max(target.browRaise, 0.9);
          target.squashY -= 0.04;
        } else {
          target.cheekPuff = Math.max(target.cheekPuff, 0.45);
          target.jawOpen = Math.max(target.jawOpen, 0.18);
          target.lipPress = Math.max(target.lipPress, 0.5);
        }
      }
    }

    // One-shot reactions. Each is an authored beat over its own timeline.
    const feed = latest(state, ["feed"], 1.4);
    if (feed) this.applyGulp(target, feed, reduced);

    const miss = latest(state, ["miss", "bounce"], 1.1);
    if (miss && (!feed || miss.age < feed.age)) this.applyFlinch(target, miss, reduced);

    const recovery = latest(state, ["recovery"], 1.8);
    if (recovery) {
      // Deflating: the body sags past its resting size, then comes back.
      const settle = clamp01(recovery.age / 1.5);
      const sag = Math.sin(clamp01(recovery.age / 1.1) * Math.PI);
      target.bellySwell = Math.min(target.bellySwell, -sag * 0.5);
      target.cheekPuff = Math.min(target.cheekPuff, -sag * 0.45);
      target.teethLong *= 1 - settle;
      target.flush *= 1 - settle;
      target.bodyRise -= sag * 12;
      target.squashY -= sag * 0.08;
      target.squashX += sag * 0.05;
      target.headY += sag * 14;
      target.lidLeft = Math.max(target.lidLeft, sag * 0.62);
      target.lidRight = Math.max(target.lidRight, sag * 0.62);
      target.jawOpen = Math.max(target.jawOpen, 0.2 + sag * 0.4);
      target.tongueOut = Math.max(target.tongueOut, sag * 0.5);
      target.exhale = Math.max(target.exhale, sag);
      target.browSad = Math.max(target.browSad, sag * 0.6);
      target.antennaDroop = Math.max(target.antennaDroop, sag * 0.8);
      target.cornerLift = Math.max(target.cornerLift, settle * 0.5 - sag);
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
        target.lidLeft = 0.48;
        target.lidRight = 0.42;
        target.jawOpen = 0.3;
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
        target.headX = 34;
        target.headY -= 22;
        target.squashX = 1.12;
        target.squashY = 0.94;
        target.bodyRise = 16;
        target.mouthWidth = 1.1;
        target.teethLong = 0.4;
        target.antennaDroop = -1;
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
    target.cornerLift = clamp(-1.5, 1.2, target.cornerLift);
  }

  /** Snap shut, squash, a bulge down the throat, then a satisfied settle. */
  private applyGulp(target: CreaturePose, feed: Reaction, reduced: boolean) {
    const age = feed.age;
    const bite = Math.exp(-age * 8);
    const settle = clamp01((age - 0.45) / 0.75);
    const recoil = Math.exp(-Math.abs(age - 0.06) * 16);
    target.jawOpen = Math.min(target.jawOpen, mix(0.02, 0.18, settle));
    target.lipPress = Math.max(target.lipPress, bite);
    target.mouthWidth = Math.min(target.mouthWidth, 1 - bite * 0.12);
    // Contact squash, then the spring carries the overshoot on its own.
    target.squashY *= 1 - recoil * (reduced ? 0.06 : 0.2);
    target.squashX *= 1 + recoil * (reduced ? 0.05 : 0.17);
    target.headY += recoil * (reduced ? 4 : 17);
    target.teethBare = Math.max(target.teethBare, bite * 0.4);
    target.lidLeft = Math.max(target.lidLeft, bite * 0.9);
    target.lidRight = Math.max(target.lidRight, bite * 0.9);
    target.tongueOut = 0;
    target.drool = 0;
    target.antennaDroop = Math.min(target.antennaDroop, -recoil * 0.9);

    // The swallow travels: a bulge from the throat down into the belly.
    const travel = clamp01((age - 0.12) / 0.6);
    if (travel > 0 && travel < 1) {
      target.throat = Math.sin(travel * Math.PI) ** 0.55;
      target.throatTravel = travel;
    }
    if (age > 0.45) {
      const delight = feed.craved ? 1 : 0;
      target.cornerLift = Math.max(target.cornerLift, settle * (0.3 + delight * 0.9));
      target.lowerLid = Math.max(target.lowerLid, settle * (0.15 + delight * 0.7));
      target.browRaise = Math.max(target.browRaise, settle * (0.1 + delight * 0.6));
      target.bellySwell = Math.max(target.bellySwell, settle * 0.14);
      if (delight) {
        // Craving satisfied: eyes squeezed happy, chin up, antennae perked.
        target.lidLeft = Math.max(target.lidLeft, settle * 0.62);
        target.lidRight = Math.max(target.lidRight, settle * 0.62);
        target.headTilt += settle * 5;
        target.headY -= settle * 8;
        target.antennaDroop = Math.min(target.antennaDroop, -settle);
        target.jawOpen = Math.max(target.jawOpen, settle * 0.2);
        target.pupilY = mix(target.pupilY, -0.4, settle);
      } else {
        // Off the menu: a flat shrug. One lid down, mouth to one side.
        target.lidLeft = Math.max(target.lidLeft, settle * 0.46);
        target.lidRight = Math.max(target.lidRight, settle * 0.08);
        target.headTilt -= settle * 3.4;
        target.cornerLift = Math.min(target.cornerLift, settle * 0.16);
        target.mouthWidth = Math.min(target.mouthWidth, 1 - settle * 0.14);
        target.antennaDroop = Math.max(target.antennaDroop, settle * 0.5);
        target.pupilX = mix(target.pupilX, 0.55, settle);
        target.pupilY = mix(target.pupilY, 0.2, settle);
      }
    }

    // Ingredient flavour: a clank, a puff, a wince.
    if (feed.ingredient === "metal") {
      target.headX += recoil * (reduced ? 4 : 22);
      target.headTilt += recoil * (reduced ? 1 : 5);
      target.teethAlign = Math.max(target.teethAlign, bite);
      target.antennaShake = Math.max(target.antennaShake, bite);
      target.pupilScale = Math.min(target.pupilScale, 1 - bite * 0.45);
      target.pupilX += bite * 0.6;
      target.lipPress = Math.max(target.lipPress, bite);
    } else if (feed.ingredient === "balloon") {
      const puff = Math.exp(-Math.abs(age - 0.26) * 6);
      target.cheekPuff = Math.max(target.cheekPuff, puff * 1.15);
      target.bodyRise = Math.max(target.bodyRise, puff * 16);
      target.bellySwell = Math.max(target.bellySwell, puff * 0.4);
      target.squashY *= 1 + puff * 0.08;
      target.squashX *= 1 - puff * 0.02;
      target.browRaise = Math.max(target.browRaise, puff);
      target.pupilScale = Math.max(target.pupilScale, 1 + puff * 0.28);
      target.lidLeft = Math.min(target.lidLeft, 1 - puff * 0.7);
      target.lidRight = Math.min(target.lidRight, 1 - puff * 0.7);
      target.antennaDroop = Math.min(target.antennaDroop, -puff);
    } else if (feed.ingredient === "pepper") {
      const burn = clamp01((age - 0.16) / 0.28) * (1 - clamp01((age - 0.9) / 0.55));
      target.flush = Math.max(target.flush, burn);
      target.cheekMarks = Math.max(target.cheekMarks, burn);
      target.lidLeft = Math.max(target.lidLeft, burn);
      target.lidRight = Math.max(target.lidRight, burn);
      target.browAngry = Math.max(target.browAngry, burn * 0.8);
      target.tongueOut = Math.max(target.tongueOut, burn);
      target.jawOpen = Math.max(target.jawOpen, burn * 0.7);
      target.sweat = Math.max(target.sweat, burn);
      target.headY -= burn * 8;
      target.squashY *= 1 - burn * 0.03;
      if (!reduced) {
        target.antennaShake = Math.max(target.antennaShake, burn);
        target.shake = Math.max(target.shake, burn * 0.5);
      }
    }
  }

  /** A snack on the floor: a flinch away, then a flat side-eye at the mess. */
  private applyFlinch(target: CreaturePose, miss: Reaction, reduced: boolean) {
    const age = miss.age;
    const jolt = Math.exp(-Math.abs(age - 0.05) * 13);
    const look = clamp01((age - 0.16) / 0.3) * (1 - clamp01((age - 0.75) / 0.4));
    const side = miss.x < ARENA.mouth.x ? -1 : 1;
    target.headX -= side * jolt * (reduced ? 5 : 26);
    target.headY -= jolt * (reduced ? 3 : 14);
    target.headTilt -= side * jolt * (reduced ? 2 : 8);
    target.squashX *= 1 - jolt * 0.05;
    target.squashY *= 1 + jolt * 0.04;
    target.antennaShake = Math.max(target.antennaShake, jolt);
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
      target.cornerLift = Math.min(target.cornerLift, -look * 1.2);
      target.headTilt += look * 4.2;
      target.headX += side * look * 8;
      target.antennaDroop = Math.max(target.antennaDroop, look * 0.55);
    }
  }
}
