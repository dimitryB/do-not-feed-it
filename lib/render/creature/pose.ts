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
import { ARENA, TUNING, crateAt, inFrenzy, type ArcadeEvent, type ArcadeState, type Ingredient } from "../../game/arcade";

export interface CreaturePose {
  headX: number; headY: number; headTilt: number; lean: number;
  squashX: number; squashY: number;
  bodyRise: number; bellySwell: number; breath: number;
  jawOpen: number; mouthWidth: number; cornerLift: number; lipPress: number; jawShift: number;
  mouthScaleX: number; mouthScaleY: number;
  lidLeft: number; lidRight: number; lowerLid: number; blink: number;
  browAngry: number; browSad: number; browRaise: number; browAsym: number;
  pupilX: number; pupilY: number; pupilScale: number;
  tongueOut: number; drool: number;
  teethBare: number; teethAlign: number; teethLong: number; teethQuiver: number;
  throat: number; throatTravel: number;
  cheekPuff: number; cheekMarks: number;
  flush: number; rageFlush: number; pallor: number; sweat: number; tears: number;
  antennaDroop: number; antennaTwist: number; antennaShake: number;
  exhale: number; magnetism: number; taut: number;
  shake: number;
  /**
   * The body scale and where the mouth is, from the rules. The creature is
   * drawn as a clipped layer scaled by `bodyScale` about its resting mouth and
   * moved so that mouth lands on `(mouthX, mouthY)` — the rules' collision
   * ellipse. Growth, lift, bob and tracking all arrive through these three.
   */
  bodyScaleX: number; bodyScaleY: number; mouthX: number; mouthY: number;
  /** A frenzy: the mouth gapes, the teeth crackle, nothing is chewed. */
  frenzy: number;
  /** Electric crackle on the teeth, metal only. */
  crackle: number;
  /** Fire breath: inhaling (the tell), then the breath itself. */
  inhale: number;
}

const FIELDS: (keyof CreaturePose)[] = [
  "headX", "headY", "headTilt", "lean", "squashX", "squashY", "bodyRise", "bellySwell", "breath",
  "jawOpen", "mouthWidth", "cornerLift", "lipPress", "jawShift", "mouthScaleX", "mouthScaleY",
  "lidLeft", "lidRight", "lowerLid", "blink",
  "browAngry", "browSad", "browRaise", "browAsym",
  "pupilX", "pupilY", "pupilScale", "tongueOut", "drool",
  "teethBare", "teethAlign", "teethLong", "teethQuiver", "throat", "throatTravel",
  "cheekPuff", "cheekMarks", "flush", "rageFlush", "pallor", "sweat", "tears",
  "antennaDroop", "antennaTwist", "antennaShake", "exhale", "magnetism", "taut", "shake",
  "bodyScaleX", "bodyScaleY", "mouthX", "mouthY", "frenzy", "crackle", "inhale",
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
  mouthScaleX: [60, 12], mouthScaleY: [60, 12],
  jawShift: [140, 16],
  lidLeft: [300, 24], lidRight: [300, 24], lowerLid: [200, 20], blink: [420, 30],
  browAngry: [150, 17], browSad: [150, 17], browRaise: [170, 18], browAsym: [150, 17],
  pupilX: [230, 22], pupilY: [230, 22], pupilScale: [180, 20],
  bellySwell: [48, 11], bodyRise: [70, 13], throat: [340, 26],
  cheekPuff: [80, 11], teethLong: [70, 12], teethAlign: [90, 13],
  flush: [95, 17], rageFlush: [60, 14], pallor: [22, 9], antennaDroop: [34, 10], antennaTwist: [40, 11],
  tears: [60, 12],
  // Loose enough that a growth step is a visible pop with an overshoot; the
  // mouth position is stiff, because the rules' ring is drawn where the rules
  // say and the picture has to keep up with it.
  bodyScaleX: [70, 10], bodyScaleY: [70, 10], mouthX: [320, 28], mouthY: [320, 28],
  frenzy: [60, 12], crackle: [120, 14], inhale: [140, 16],
};
const DEFAULT_RATE: [number, number] = [120, 15];

type Expression = Partial<Record<keyof CreaturePose, number>>;

/** Everything a face channel does when nothing is happening. */
const REST: Expression = {
  jawOpen: 0.06, mouthWidth: 1, cornerLift: 0.3, lipPress: 0.3, jawShift: 0,
  mouthScaleX: 1, mouthScaleY: 1,
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
  /**
   * Title screen. Curious, wide awake, watching the launcher.
   *
   * Lips together. An open, toothy grin here was the single worst thing in the
   * set: it is also what delight, off-menu, both mutation warnings and a
   * finished swallow look like, so eight states collapsed onto one silhouette.
   * Teeth are now something the creature only shows for a reason.
   */
  attract: {
    jawOpen: 0.02, mouthWidth: 0.9, cornerLift: 0.62, lipPress: 0.7,
    lidLeft: 0.02, lidRight: 0.02, lowerLid: 0.14,
    // One antenna up and the other down, on a head cocked the other way. Every
    // expression that does not name `antennaTwist` pulls it back to zero, so a
    // strong twist here belongs to idle alone — and at stream resolution a
    // silhouette cue survives compression better than anything on the face.
    browRaise: 0.45, browAsym: 0.35, headTilt: -6.5, headX: -9,
    antennaDroop: -0.7, antennaTwist: 1, pupilScale: 1.06,
  },
  /** Getting hungry: impatient rather than dying. */
  peckish: {
    // Wanting, not laughing. An open mouth with the tongue out and the corners
    // down is a grin at stream resolution; the read is a barely-parted mouth,
    // a licked lip and a face that has slumped forward onto the counter.
    jawOpen: 0.12, mouthWidth: 0.72, cornerLift: -1.3, lipPress: 0.35,
    lidLeft: 0.5, lidRight: 0.58, lowerLid: 0.06,
    browSad: 1, browRaise: 0.15, tongueOut: 0.8, drool: 0.95, browAsym: 0.35,
    headY: 26, headTilt: 4.6, lean: 0.03, antennaDroop: 1, antennaTwist: -0.35,
    squashY: 0.96, squashX: 1.035, bodyRise: -16,
  },
  /** Running on empty. */
  starving: {
    // Slack, not wide. A big open mouth with the tongue out is a laugh at
    // stream resolution whatever the corners are doing; the read is a jaw that
    // has given up holding itself shut, hollow cheeks and unfocused eyes.
    jawOpen: 0.2, mouthWidth: 0.68, cornerLift: -1.5, lipPress: 0,
    lidLeft: 0.58, lidRight: 0.5, lowerLid: 0,
    browSad: 1, browRaise: 0.1, tongueOut: 1, drool: 0.9,
    headY: 24, headTilt: 6.5, antennaDroop: 1.15, antennaTwist: 0.1,
    squashY: 0.92, squashX: 1.05, bodyRise: -22, cheekPuff: -1,
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
    // Not just a shut mouth: a shut mouth is what idle looks like. The snack is
    // in there — cheeks bulging, teeth gritted, eyes screwed up.
    jawOpen: 0.05, mouthWidth: 0.7, cornerLift: 0.1, lipPress: 1, teethBare: 0.75,
    lidLeft: 0.9, lidRight: 0.9, lowerLid: 0.85, browRaise: 0.2, browAngry: 0.4,
    headY: 15, squashY: 0.87, squashX: 1.11, cheekPuff: 1.1, antennaDroop: -0.9,
  },
  /** Metal: a hard clank that jolts the head sideways. */
  clank: {
    jawOpen: 0.04, mouthWidth: 0.66, cornerLift: -0.35, lipPress: 1, teethBare: 1,
    lidLeft: 0.9, lidRight: 0.55, lowerLid: 0.9, browAngry: 0.9, browAsym: 0.6,
    headX: 30, headTilt: 8, headY: 12, squashY: 0.86, squashX: 1.15,
    cheekPuff: 1.3, jawShift: 0.5,
    antennaDroop: -0.85, antennaTwist: 0.95, pupilScale: 0.66,
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
    // The only state that grins with its whole face. Now that idle keeps its
    // lips together, an open toothy smile means exactly one thing.
    // Crescents. The lid budget in `drawEyes` scales the pair, so what matters
    // is the ratio: a dominant *lower* lid closes the eye from underneath and
    // reads as a happy squint, where a dominant upper one reads as sleepy.
    // Nothing else in the set is allowed this shape.
    jawOpen: 0.46, mouthWidth: 1.1, cornerLift: 1.4, lipPress: 0, teethBare: 0.55,
    lidLeft: 0.22, lidRight: 0.22, lowerLid: 1, browRaise: 0.85,
    headTilt: 7.5, headY: -16, bellySwell: 0.35, squashY: 1.05, bodyRise: 10,
    antennaDroop: -1.25, antennaTwist: 0.35, pupilScale: 1.1,
  },
  /** Edible. Not what it asked for. */
  shrug: {
    // Flat. No teeth, corners level, eyes somewhere else — the opposite of
    // delight rather than a quieter version of it.
    // The painted mouth curves upward on its own, so "level" still reads as a
    // smile: the corners have to be pulled well past neutral to look unmoved.
    jawOpen: 0, mouthWidth: 0.5, cornerLift: -0.95, lipPress: 1, jawShift: 1.4,
    lidLeft: 0.6, lidRight: 0.18, lowerLid: 0.45, browAsym: 1, browRaise: 0.25,
    // Turned away. Indifference is a look-away, and a head square to camera
    // reads as pleased however the mouth is drawn.
    headTilt: -10, headX: -26, headY: 12, lean: -0.045,
    antennaDroop: 0.95, antennaTwist: -1.15,
  },
  /** A snack off the vent: startled, and still following it. */
  startle: {
    jawOpen: 0.66, mouthWidth: 0.34, cornerLift: -0.55, lipPress: 0,
    lidLeft: 0, lidRight: 0, lowerLid: 0, browRaise: 1, browAsym: 0.3,
    headY: -20, headTilt: -8, headX: -14, squashY: 1.07, squashX: 0.95,
    antennaDroop: -1.3, antennaTwist: 0.8, pupilScale: 1.4,
  },
  /** The instant a snack hits the floor. */
  flinch: {
    jawOpen: 0.06, mouthWidth: 0.82, cornerLift: 0.05, lipPress: 0.85,
    lidLeft: 0.66, lidRight: 0.5, browRaise: 1,
    // Down, after the snack: the head snaps toward the floor it just went to.
    // A flinch upward was indistinguishable from the vent startle, which is the
    // one miss where the snack is still in the air.
    headY: 22, headTilt: 4, squashX: 1.05, squashY: 0.95,
    antennaDroop: 0.4, antennaTwist: 0.55,
  },
  /** A snack on the floor: head down, looking at it. */
  mope: {
    jawOpen: 0.02, mouthWidth: 0.6, cornerLift: -1.5, lipPress: 1, jawShift: -0.3,
    lidLeft: 0.4, lidRight: 0.44, lowerLid: 0.1, browSad: 1, browRaise: 0.1,
    headY: 36, headTilt: 5, lean: 0.02, squashY: 0.92, squashX: 1.06, bodyRise: -26,
    antennaDroop: 1.15, antennaTwist: -0.2,
  },
  /** And the flat look at the mess afterwards. */
  sideEye: {
    jawOpen: 0.03, mouthWidth: 0.72, cornerLift: -1.2, lipPress: 0.95, jawShift: -0.85,
    // Not shut: one eye hooded and the other wide is a look, two shut eyes is a
    // hole in the render. The lid pair is clamped in `drawEyes` as well.
    lidLeft: 0.5, lidRight: 0.02, lowerLid: 0.4, browAngry: 0.5, browAsym: 0.95,
    headTilt: 5.5, headY: 6, antennaDroop: 0.6, antennaTwist: -0.75,
  },
  /** Irritation, step one: a scowl and a shut mouth. */
  annoy1: {
    // Asymmetric on purpose. A symmetrical scowl is what a flat mouth plus
    // heavy lids looks like in three other states; one brow down, one lid
    // higher than the other and one antenna kicked back is a tell that belongs
    // to nothing else in the set.
    jawOpen: 0, mouthWidth: 0.6, cornerLift: -1.5, lipPress: 1, jawShift: -0.5,
    lidLeft: 0.12, lidRight: 0.48, lowerLid: 0.55,
    browAngry: 1, browAsym: 0.85, browRaise: 0,
    headTilt: 4.5, headY: 3, antennaDroop: -0.3, antennaTwist: -0.95,
    pupilScale: 0.86,
  },
  /** Step two: leaning in, hard stare. */
  annoy2: {
    // Step two is the jaw. Step one is the brow and step three is the snarl, so
    // the middle beat has to be a shape of its own — chin up, lower lip pushed
    // out, the bottom teeth just showing — and not step one with the red turned
    // up, which is what it was.
    jawOpen: 0.1, mouthWidth: 0.78, cornerLift: -1.1, lipPress: 1, teethBare: 0.4,
    lidLeft: 0.08, lidRight: 0.08, lowerLid: 0.7, browAngry: 0.95,
    // No headY or squashY: irritation is a face and a lean, not a change of
    // head height, and the lit target ring is drawn where the rules put the
    // mouth. Leaning in is `headX` and `lean`, which cost the ring nothing.
    headX: 16, headTilt: -3, lean: 0.05,
    squashX: 1.08, antennaDroop: -0.6, antennaTwist: -0.15,
    pupilScale: 0.78,
  },
  /** Step three: teeth out, whole body forward. */
  annoy3: {
    jawOpen: 0.2, mouthWidth: 1.02, cornerLift: -1.45, lipPress: 0, teethBare: 1,
    lidLeft: 0.05, lidRight: 0.05, lowerLid: 0.82, browAngry: 1,
    headX: 25, lean: 0.075, squashX: 1.06,
    antennaDroop: -1, antennaTwist: 0.4, pupilScale: 0.62,
  },
  /** Metal building: teeth pushing through, eyes wide. */
  warnMetal: {
    // A grimace, not a grin. Teeth showing through a narrow, pulled-back mouth
    // with the corners down: an open toothy smile here was indistinguishable
    // from every other state that happens to show teeth.
    jawOpen: 0.3, mouthWidth: 0.62, cornerLift: -1.35, lipPress: 0.5,
    teethBare: 1, teethLong: 0.75,
    lidLeft: 0, lidRight: 0, lowerLid: 0.5, browRaise: 0.5, browAngry: 0.9,
    headY: 14, headTilt: -3, lean: -0.05, squashX: 1.05, squashY: 0.96,
    antennaDroop: -1, antennaTwist: 0.8, pupilScale: 0.5,
  },
  /** Metal live: the jaw is a trap. */
  activeMetal: {
    jawOpen: 0.74, mouthWidth: 1.06, cornerLift: -0.35, teethBare: 1, teethLong: 1,
    lidLeft: 0.04, lidRight: 0.04, lowerLid: 0.42, browAngry: 0.65,
    headX: 9, lean: 0.04, antennaDroop: -0.95, pupilScale: 0.58,
  },
  /** Balloon building: filling up, lips sealed. */
  warnBalloon: {
    // Filling up against a sealed mouth. The whole point of the warning is that
    // the belly is already going, so it has to be more than a face.
    jawOpen: 0, mouthWidth: 0.56, cornerLift: -0.45, lipPress: 1, cheekPuff: 1.6,
    lidLeft: 0, lidRight: 0, lowerLid: 0.1, browRaise: 1, browSad: 0.55,
    // No vertical, for the same reason as `activeBalloon` below: the rules'
    // mouth does not move when the pressure builds, so the painted one must not.
    bellySwell: 1.05, squashX: 1.09,
    antennaDroop: -1.2, antennaTwist: 0.3, pupilScale: 1.34,
  },
  /** Balloon live: round, light, pleased with itself. */
  activeBalloon: {
    jawOpen: 0.12, mouthWidth: 0.8, cornerLift: 0.9, lipPress: 0.3, cheekPuff: 0.95,
    lidLeft: 0.04, lidRight: 0.04, lowerLid: 0.55, browRaise: 0.95,
    // Most of "inflated" now comes from the uniform body scale rather than the
    // local belly kernel: a smooth global scale is something the mouth's affine
    // can follow, a steep local one is not.
    //
    // And none of it moves the head. Worn at nine tenths on a full balloon, the
    // `headY: -20, bodyRise: 30` this used to carry raised the painted mouth 32
    // px that the rules' collision ellipse knew nothing about — measured, the
    // single largest remaining source of the lit ring sitting off the mouth.
    // The volume went into width instead, where it costs nothing that is not
    // already in the rules.
    bellySwell: 1.9, squashX: 1.11,
    antennaDroop: -1.15, antennaTwist: 0.15, pupilScale: 1.3,
  },
  /** Pepper building: holding it in. */
  warnPepper: {
    // Holding it in, and losing. Two soft blush ellipses on an otherwise calm
    // face read as bashful; the tell is the pressure — cheeks out, lips clamped,
    // eyes screwed up, head pulled back off the counter.
    jawOpen: 0, mouthWidth: 0.5, cornerLift: -1.1, lipPress: 1, cheekPuff: 1.7,
    lidLeft: 0.62, lidRight: 0.66, lowerLid: 0.7, browAngry: 0.9, browSad: 0.45,
    headY: 12, headTilt: -4, lean: -0.05, squashX: 1.08, squashY: 0.95,
    antennaDroop: 0.4, antennaTwist: 0.5,
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
    // A pant: narrow and tall, which is a mouth shape no other state uses — the
    // rest of the set is either shut or wide. Plus the body sagging past its own
    // resting size, which is the actual information: it was bigger a moment ago.
    jawOpen: 0.52, mouthWidth: 0.46, cornerLift: -0.7, lipPress: 0, tongueOut: 0.85,
    lidLeft: 0.1, lidRight: 0.06, lowerLid: 0.1, browSad: 0.9, browRaise: 0.5,
    headY: 26, headTilt: 2, bodyRise: -26, bellySwell: -0.9, cheekPuff: -0.95,
    squashY: 0.88, squashX: 1.09, antennaDroop: 1.35, antennaTwist: -0.5,
    pupilScale: 1.28,
  },
  /** Shift survived: full, smug, in no hurry. */
  smug: {
    // Full. The belly is the point: a contented face alone was indistinguishable
    // from idle, and the whole state is meant to say the shift is survived.
    jawOpen: 0.03, mouthWidth: 1.02, cornerLift: 1.3, lipPress: 0.5,
    // Eyes shut, leaning back, and visibly bigger than it started. Contentment
    // on the face alone was indistinguishable from idle; the win screen has to
    // be a silhouette.
    lidLeft: 0.66, lidRight: 0.6, lowerLid: 0.85, browRaise: 0.35, browAngry: 0.2,
    browAsym: 0.6, headTilt: 7.5, headY: -20, lean: -0.075,
    bellySwell: 1.5, bodyRise: 10, squashY: 1.04, squashX: 1.03,
    antennaDroop: -0.5, antennaTwist: 0.7,
  },
  /** Shift lost to an empty belly. */
  collapse: {
    jawOpen: 0.14, mouthWidth: 0.8, cornerLift: -1.55, tongueOut: 1, drool: 0.35,
    // The lower lid is not optional here: with the eye drained of colour, the
    // painted eyeball's own lower edge shows under the drawn one and reads as a
    // second iris sitting behind the first.
    lidLeft: 0.46, lidRight: 0.5, lowerLid: 0.22, browSad: 1,
    headY: 24, headTilt: 8, bodyRise: -42, squashY: 0.86, squashX: 1.09,
    cheekPuff: -0.85, antennaDroop: 1.15, antennaTwist: 0.15, pupilScale: 0.85,
  },
  /** Shift lost to irritation. */
  rageEnd: {
    jawOpen: 0.82, mouthWidth: 1.1, cornerLift: -0.8, teethBare: 1, teethLong: 0.45,
    lidLeft: 0, lidRight: 0, lowerLid: 0.42, browAngry: 1,
    // Restrained on purpose. With part placement corrected the lean scales the
    // head about a point below it, and at 0.12 the top of the skull left the
    // frame: the eyes ended up riding the rim of the mouth with no cranium
    // above them, which reads as a broken composite rather than as fury.
    headX: 28, headY: -14, lean: 0.055, squashX: 1.1, squashY: 0.95, bodyRise: 14,
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
  pose.mouthScaleX = 1;
  pose.mouthScaleY = 1;
  pose.bodyScaleX = 1;
  pose.bodyScaleY = 1;
  pose.mouthX = ARENA.mouth.x;
  pose.mouthY = ARENA.mouth.y;
  return pose;
};

/**
 * How much bigger the body is drawn, per unit of size, on each axis.
 *
 * The rules raise the mouth 48 px a size and widen it 24 %; the warp cannot
 * stretch the painting past about 14 % without the skin dissolving, which is
 * why growth was invisible on a stream. The body is now scaled as a whole,
 * about its resting mouth, and the mouth's own scale is divided by this so the
 * drawn aperture still matches the rules' ellipse exactly.
 *
 * Wider than tall, on purpose. The mouth is the anchor and the rules keep it
 * low, so everything above it — the eyes — leaves the top of the frame as the
 * vertical scale rises: 0.06 keeps the eyes on screen at the size cap even
 * with a full balloon lift and bob under them. Width has no such limit, and a
 * thing that is fed gets fat.
 */
export const BODY_SCALE_PER_SIZE = { x: 0.36, y: 0.06 };
/** How much the balloon inflates the body, per level, on top of growth: mostly sideways. */
const INFLATE_PER_LEVEL = { x: 0.035, y: 0.01 };

interface Gaze { x: number; y: number; weight: number }

interface Reaction { type: ArcadeEvent["type"]; name?: string; ingredient?: Ingredient; craved?: boolean; age: number; x: number; y: number }

function latest(state: ArcadeState | null, types: ArcadeEvent["type"][], within: number, name?: string): Reaction | null {
  if (!state) return null;
  for (let index = state.events.length - 1; index >= 0; index--) {
    const item = state.events[index];
    if (!types.includes(item.type)) continue;
    if (name !== undefined && item.name !== name) continue;
    const age = (state.tick - item.tick) / 60;
    if (age < 0 || age > within) continue;
    return { type: item.type, name: item.name, ingredient: item.ingredient, craved: item.craved, age, x: item.x, y: item.y };
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

  /** Development only: the pose as it currently stands. */
  get current(): CreaturePose { return this.pose; }

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
    // Where a reaction wants the eyes. The aim layer further down assigns
    // `pupilX`/`pupilY` outright, so a reaction that simply wrote them would be
    // overwritten; it hands its request up instead.
    let gaze: Gaze | null = null;

    const fullness = state?.hunger ?? 78;
    const rage = state?.rage ?? 0;
    const peckish = ramp(fullness, 68, 34);
    const hunger = ramp(fullness, 52, 6);
    const ended = state ? state.phase !== "playing" : false;
    // Mutations are permanent and they stack, so they are levels the creature
    // carries rather than a weather state the kitchen is in.
    const levels = (playing || ended ? state?.mutations : null) ?? { metal: 0, balloon: 0, pepper: 0 };
    const metal = clamp01(levels.metal / 3);
    const balloon = clamp01(levels.balloon / 3);
    const pepper = clamp01(levels.pepper / 3);
    const clock = time - this.started;
    const frenzied = playing && state ? inFrenzy(state) : false;

    // 1. Baseline. On the title screen it watches the launcher; in play this is
    //    only ever what it looks like between other things happening.
    // A low baseline in play. At 0.55 every state that did not override the
    // whole face resolved back toward the resting smile, which is how six
    // different states ended up sharing one silhouette.
    this.wear("attract", playing ? 0.3 : 1);

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

    // 3b. Irritation outranks what it has become.
    //
    // The three shapes above are worn before the mutations, and a blend is won
    // by whoever wears last, so a creature three misses from wrecking the
    // kitchen was showing a balloon's placid smile. A critic shown the
    // kitchen-destroyed ending for the first time put it plainly: the same face
    // at 8 % irritation and at 93 %, so the meter that ends every unskilled run
    // has no presence outside the HUD. It is re-worn after the mutations, and
    // from step two it wins.
    //
    // Deliberately after the mutation block and deliberately before tracking and
    // the one-shot reactions: a snack in the air and a serving landing should
    // still read, because those are the player's own doing.
    //
    // 4. What it has become.
    //
    // Three permanent levels that stack, so the expressions are blended by
    // weight rather than switched between: a creature that is magnetic and
    // floating and full of pepper wears all three at once, which is the whole
    // point of stacking them.
    this.wear("activeMetal", metal * 0.9);
    this.wear("activeBalloon", balloon * 0.9);
    this.wear("holdPepper", pepper * 0.9);
    if (step3 > 0.01) this.wear("annoy3", step3);
    else if (step2 > 0.01) this.wear("annoy2", step2 * 0.8);

    // Fire breath. The tell is the creature holding it in — cheeks out, lips
    // clamped, eyes screwed up — and the breath is the exhale that follows.
    // Both are read off `state.flame`, which is the rules' own clock for it.
    const flame = playing && state?.flame ? state.flame : null;
    const tick = state?.tick ?? 0;
    if (flame && tick < flame.until) {
      if (tick < flame.tellUntil) {
        const held = clamp01(1 - (flame.tellUntil - tick) / TUNING.flameTell);
        this.wear("warnPepper", 0.4 + 0.6 * held);
        target.inhale = Math.max(target.inhale, 0.3 + 0.7 * held);
      } else {
        this.wear("blowPepper", 1);
        target.exhale = 1;
        target.inhale = 0;
      }
    }

    const landed = latest(state, ["mutation"], 0.7);
    if (landed) {
      // The moment a level lands gets an overshoot. A change that eases in and
      // then simply arrives is a ramp, and a ramp is the one thing a twelve
      // frame strip cannot make look like animation.
      const pop = Math.exp(-landed.age * 6.5);
      target.squashX += pop * 0.09;
      target.squashY -= pop * 0.07;
      target.bodyRise += pop * 16;
      target.teethLong += pop * 0.45;
      target.bellySwell += pop * 0.35;
      if (!reduced) target.antennaShake = Math.max(target.antennaShake, pop);
    }
    // A snack off the teeth: a hard jolt sideways, mouth clamped.
    const clanked = latest(state, ["clank"], 0.5);
    if (clanked) {
      const pop = Math.exp(-clanked.age * 7);
      this.wear("clank", pop);
      target.teethQuiver = Math.max(target.teethQuiver, pop);
      if (!reduced) target.shake = Math.max(target.shake, pop * 0.5);
    }
    // A tantrum: the snarl, the whole body shaking.
    const tantrum = latest(state, ["tantrum"], 1.2);
    if (tantrum) {
      const fit = Math.sin(clamp01(tantrum.age / 1.2) * Math.PI);
      this.wear("annoy3", fit);
      target.antennaShake = Math.max(target.antennaShake, fit);
      if (!reduced) target.shake = Math.max(target.shake, fit);
    }
    // A sneeze: the deflate-and-recover beat, borrowed whole.
    const sneezed = latest(state, ["beat"], 1.6, "sneeze");
    if (sneezed) {
      const sag = Math.sin(clamp01(sneezed.age / 1.6) * Math.PI) ** 0.7;
      this.wear("deflate", sag);
      target.exhale = Math.max(target.exhale, Math.exp(-sneezed.age * 5));
    }
    // A lunge coming: it gathers itself, teeth out, leaning in.
    const lunging = latest(state, ["beat"], 1.0, "lunge");
    if (lunging) {
      const gather = clamp01(lunging.age / 0.9);
      this.wear("activeMetal", gather * 0.6);
      target.lean += gather * 0.06;
      target.headX += gather * 18;
    }
    // A growth step: a pop with an overshoot, so the size change reads as an
    // event rather than a drift.
    const grew = latest(state, ["grow"], 0.7);
    if (grew) {
      const pop = Math.exp(-grew.age * 5);
      target.squashX += pop * 0.07;
      target.squashY += pop * 0.05;
      target.bodyRise += pop * 10;
      if (!reduced) target.antennaShake = Math.max(target.antennaShake, pop);
    }

    // 5. Tracking. A snack in the air owns the face until it lands.
    const flight = state?.projectiles ?? [];
    let nearest = flight.length ? flight[0] : null;
    if (playing && nearest) {
      for (const item of flight) if (item.x > nearest.x) nearest = item;
      const mouth = state?.creature ?? { x: ARENA.mouth.x, y: ARENA.mouth.y };
      const distance = Math.hypot(nearest.x - mouth.x, nearest.y - mouth.y);
      const closeness = 1 - clamp01((distance - 70) / 460);
      this.wear("trackFar", 0.75);
      this.wear("trackNear", closeness * closeness);
    }

    // 6. One-shot reactions, which override whatever mood they land on.
    const feed = latest(state, ["feed"], 1.5);
    const miss = latest(state, ["miss"], 1.2);
    // Only a bounce off its own belly is the creature's business. One off a
    // pan is the kitchen's.
    const belly = latest(state, ["bounce"], 0.6, "belly");
    if (feed && (!miss || feed.age <= miss.age)) gaze = this.applyGulp(target, feed, reduced) ?? gaze;
    else if (miss) this.applyFlinch(target, miss, reduced);
    // The last coin out of a block: a bigger swallow than any ordinary feed.
    const lastPour = state ? [...state.events].reverse().find((e) => e.type === "feed" && e.label.startsWith("CRATE")) : undefined;
    const pourAge = lastPour && state ? (state.tick - lastPour.tick) / 60 : 9;
    if (state && pourAge <= 0.45 && state.projectiles.every((p) => p.kind !== "pour")) {
      const k = Math.exp(-pourAge * 6);
      target.squashX += 0.1 * k; target.squashY -= 0.06 * k;
      target.cheekPuff = Math.max(target.cheekPuff, 0.9 * k); target.bellySwell += 0.3 * k;
      target.pupilScale = Math.max(target.pupilScale, 1 + 0.5 * k);
      target.browRaise = Math.max(target.browRaise, k);
      this.wear("startle", 0.9 * k);
    }
    // A block broken open: eyes wide, brows up, up on its toes for what is coming.
    const block = latest(state, ["crate"], 1.0, "hit");
    if (block) {
      const k = Math.exp(-block.age * 2.6);
      target.pupilScale = Math.max(target.pupilScale, 1 + 0.65 * k);
      target.browRaise = Math.max(target.browRaise, k);
      target.bodyRise += 22 * k;
      this.wear("startle", 0.8 * k);
    }
    if (belly) {
      const boing = Math.exp(-belly.age * 6) * Math.cos(belly.age * 22);
      target.squashY -= boing * 0.08;
      target.squashX += boing * 0.06;
      this.wear("startle", Math.exp(-belly.age * 4) * 0.6);
    }
    // A frenzy: the mouth gapes, the eyes go wide, and the whole animal is up.
    if (frenzied) {
      this.wear("trackNear", 0.5);
      target.pupilScale = Math.max(target.pupilScale, 1.3);
      target.teethBare = Math.max(target.teethBare, 0.6);
      target.browRaise = Math.max(target.browRaise, 0.8);
      target.bodyRise += 8;
      if (!reduced) target.shake = Math.max(target.shake, 0.35);
    }
    target.frenzy = frenzied ? 1 : 0;

    // 6b. And above the top step, nothing outranks the temper.
    //
    // A one-shot reaction is allowed to win a blend, because a reaction is the
    // player's own doing and it is the feedback they need. But a creature at
    // ninety per cent irritation that a burp turns back into a smiling frog is
    // the exact failure a critic named: the meter that ends every unskilled run
    // having no presence on the animal.
    //
    // Blending it underneath was tried first and measured on a real capture. It
    // bought the brow and the eyes — heavy lids and brows down, where they had
    // been raised — and it did not buy the mouth, because a reaction owns
    // `cornerLift` and `mouthWidth` outright and half a weight underneath does
    // not invert a grin.
    //
    // So above the top step those two channels are taken rather than blended.
    // Two channels, not the expression: the burp still opens the jaw, puffs the
    // cheeks and vents steam, so the reaction still reads as the reaction. What
    // it can no longer do is put a smile on a creature that is about to take the
    // kitchen apart.
    if (step3 > 0.35) {
      const temper = clamp01((step3 - 0.35) * 1.6);
      this.wear("annoy3", temper);
      // The painted mouth curves upward on its own, so pulling the corners to
      // level still reads as a smile — which is why a blend toward the snarl's
      // own -1.45 did nothing visible. The corners have to go past level, and
      // this is the one place in the rig allowed to say so outright.
      target.cornerLift = Math.min(target.cornerLift, -0.35 - 1.15 * temper);
      target.mouthWidth = Math.min(target.mouthWidth, 1.02);
      target.teethBare = Math.max(target.teethBare, temper);
      target.browAngry = Math.max(target.browAngry, temper);
      target.lowerLid = Math.max(target.lowerLid, 0.82 * temper);
      target.lipPress = Math.min(target.lipPress, 1 - temper);
    }

    // 7. The whistle. There is no surviving the shift any more — the run ends
    //    when the creature wins — so the smug look belongs to the ending where
    //    it simply outgrew the kitchen and got promoted.
    const promoted = state?.failureReason === "outgrew-the-kitchen";
    const enraged = state?.failureReason === "kitchen-destroyed";
    if (ended && state) {
      if (promoted) this.wear("smug", 1);
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
      const at = state?.creature ?? ARENA.mouth;
      target.headTilt += clamp(-9, 9, (nearest.x - at.x) * 0.022);
      target.headX += clamp(-16, 16, (nearest.x - at.x) * 0.03);
    } else if (playing && state && state.crates && state.crates.length) {
      // Nothing in the air: it watches the block on the chain go by.
      const block = crateAt(state.crates[0], state.tick);
      target.pupilX = clamp(-1, 1, (block.x - 838) / 340);
      target.pupilY = clamp(-1, 1, (block.y - 250) / 240);
    }
    // A block breaking: the eyes snap to it for half a second.
    const broke = latest(state, ["crate"], 0.6, "hit");
    if (broke) {
      const look = 1 - clamp01((broke.age - 0.4) / 0.2);
      target.pupilX = mix(target.pupilX, clamp(-1, 1, (broke.x - 838) / 300), look);
      target.pupilY = mix(target.pupilY, clamp(-1, 1, (broke.y - 250) / 240), look);
    }
    if (miss && miss.age > 0.06) {
      const look = clamp01((miss.age - 0.06) / 0.2);
      target.pupilX = mix(target.pupilX, clamp(-1, 1, (miss.x - 838) / 300), look);
      target.pupilY = mix(target.pupilY, clamp(-1, 1, (miss.y - 250) / 240), look);
    }
    if (gaze) {
      target.pupilX = mix(target.pupilX, gaze.x, gaze.weight);
      target.pupilY = mix(target.pupilY, gaze.y, gaze.weight);
    }
    if (step2 > 0.2) target.pupilY = mix(target.pupilY, -0.25, step2);
    if (ended && promoted) { target.pupilX = -0.35; target.pupilY = -0.15; }
    // Down, but not so far down that the lids and the gaze between them push
    // the pupil out of the socket: a drained eye with no pupil in it reads as a
    // missing texture, and this is the frame the results screen holds.
    if (ended && state?.failureReason === "empty-belly") target.pupilY = 0.3;

    // Skin. These accumulate rather than blend: heat and pallor are conditions,
    // not expressions, and two of them can be true at once.
    target.pallor = hunger * 0.9;
    // Weighted late on purpose: when the colour arrived with step two, steps one
    // and two were the same drawing with the red turned up.
    target.rageFlush = step2 * 0.3 + step3 * 0.7;
    target.sweat = step2 * 0.35 + step3 * 0.5;
    if (pepper > 0) {
      // Heat that deepens with the level rather than switching on. The blotches
      // are the tell that something is about to come back at you.
      target.flush = Math.max(target.flush, 0.3 + pepper * 0.55);
      target.cheekMarks = Math.max(target.cheekMarks, 0.4 + pepper * 0.6);
      target.sweat = Math.max(target.sweat, 0.25 + pepper * 0.45);
      // The tell runs hot: the cheeks glow before the breath comes.
      if (target.inhale > 0.05) {
        target.flush = Math.max(target.flush, 0.5 + target.inhale * 0.5);
        target.cheekMarks = Math.max(target.cheekMarks, 0.6 + target.inhale * 0.4);
        target.cheekPuff = Math.max(target.cheekPuff, target.inhale * 1.6);
      }
    }
    // Stretched-skin sheen, balloon only, and the swell that goes with it.
    if (balloon > 0) {
      target.taut = Math.max(target.taut, 0.35 + balloon * 0.65);
      // Most of "inflated" is the whole-body scale below; the swell only has
      // to support it, and a large one tears the warp.
      target.bellySwell = Math.max(target.bellySwell, balloon * 0.35);
    }
    if (metal > 0) {
      target.magnetism = Math.max(target.magnetism, 0.4 + metal * 0.6);
      target.teethAlign = Math.max(target.teethAlign, 0.5 + metal * 0.5);
      target.teethLong = Math.max(target.teethLong, metal * 0.55);
      target.crackle = Math.max(target.crackle, 0.35 + metal * 0.65);
    }
    if (ended && enraged) {
      target.rageFlush = 1;
      target.sweat = 0.8;
    }
    if (ended && state?.failureReason === "empty-belly") target.pallor = 1;
    if (ended && promoted) { target.pallor = 0; target.flush = 0; target.rageFlush = 0; }

    // Tremors.
    target.antennaShake = Math.max(target.antennaShake, step3);
    if (!reduced) target.shake = step3 * 0.7;
    if (ended && enraged) {
      target.antennaShake = 1;
      target.shake = reduced ? 0 : 0.6;
    }

    // The reaction beats add their own skin on top.
    if (feed) this.gulpSkin(target, feed, reduced);

    // --- the body is a mechanic, not a mood ---
    //
    // Growth, lean and the mouth's aperture come straight out of `ArcadeState`.
    // No new faces were authored for any of this: the rules move the same
    // channels the expressions use, and win where they disagree, because the
    // aperture on screen is the aperture the collision is using. If the picture
    // and the rule disagree the player is being lied to.
    const creature = state?.creature;
    if (creature && (playing || ended)) {
      const grow = creature.size - 1;
      // What the rules test is what has to be drawn.
      const open = clamp01(creature.open ?? creature.aperture);
      target.jawOpen = mix(target.jawOpen, open, playing ? 0.88 : 0.35);
      target.mouthWidth = mix(target.mouthWidth, 0.9 + open * 0.34, playing ? 0.7 : 0.3);
      target.lipPress = mix(target.lipPress, open > 0.1 ? 0.1 : 0.75, playing ? 0.7 : 0.3);
      if (open > 0.5) target.teethBare = Math.max(target.teethBare, 0.4);
      // The whole body scales, about its resting mouth, and the balloon
      // inflates it further. The drawn creature is then moved so its mouth
      // lands on the rules' ellipse: growth, lift, bob and tracking are all
      // the same operation, and none of them needs a calibrated coefficient.
      const balloonLevel = levels.balloon ?? 0;
      const scaleX = (1 + grow * BODY_SCALE_PER_SIZE.x) * (1 + INFLATE_PER_LEVEL.x * balloonLevel);
      const scaleY = (1 + grow * BODY_SCALE_PER_SIZE.y) * (1 + INFLATE_PER_LEVEL.y * balloonLevel);
      target.bodyScaleX = scaleX;
      target.bodyScaleY = scaleY;
      target.mouthX = creature.x;
      target.mouthY = creature.y;
      // The mouth's own scale follows the rules' `mouthGrowX` / `mouthGrowY`
      // exactly, divided by the body scale it is already riding; in a frenzy
      // it gapes with the rules' collision ellipse.
      const gape = creature.gape ?? 1;
      target.mouthScaleX = (1 + grow * TUNING.mouthGrowX) / scaleX * (1 + (gape - 1) * 0.55);
      target.mouthScaleY = (1 + grow * TUNING.mouthGrowY) / scaleY * gape;
      // The head still leads a reach: a little of the tracking in the face, on
      // top of the whole-body move, so leaning in reads as leaning.
      const track = creature.track ?? 0;
      target.headY += track * 0.12;
      target.headTilt += track * 0.05;
      target.teethLong = Math.max(target.teethLong, clamp01(grow / 1.4) * 0.55);
      // A shut mouth on a big creature is the thing the player is waiting out,
      // so it tightens rather than simply closing.
      if (open < 0.05) target.cornerLift = mix(target.cornerLift, -0.35, 0.4 * clamp01(grow / 0.7));
    } else {
      target.bodyScaleX = 1;
      target.bodyScaleY = 1;
      target.mouthX = ARENA.mouth.x;
      target.mouthY = ARENA.mouth.y;
    }

    // Inflation rides the uniform body scale rather than a deformer of its own:
    // a local kernel big enough to read is also steep enough to tear the paint.
    // Wider than it is tall, and lifting, so it still reads as a balloon rather
    // than as the camera moving closer.
    if (target.bellySwell !== 0) {
      // Inflation makes it WIDER, not taller, and it does not raise the head.
      //
      // The vertical half of this was moving the painted mouth up by 84 px on a
      // full balloon while the rules' collision ellipse stayed where it was, so
      // the lit target ring — which is that ellipse — was hanging below an open
      // mouth on exactly the frames a player has the most to lose. The rules
      // already own the vertical: `creature.lift` is the number that moves the
      // mouth up, it is clamped to what the rig can show, and the pose follows
      // it above. Two mechanisms for one movement, disagreeing, is the bug.
      target.squashX *= 1 + target.bellySwell * 0.14;
    }
    // Hard ceiling on how far the painting may be stretched. Scale magnifies
    // the source, and past about fourteen percent the skin's bump detail
    // dissolves into mush — which is a texture problem no grid density fixes,
    // because the detail is simply not in the source at that magnification.
    // Lift is free by comparison: a translation resamples nothing.
    const widest = Math.max(target.squashX, target.squashY);
    if (widest > 1.14) {
      const trim = 1.14 / widest;
      target.squashX *= trim;
      target.squashY *= trim;
      target.bodyRise += (widest - 1.14) * 150;
    }

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
  private applyGulp(target: CreaturePose, feed: Reaction, reduced: boolean): Gaze | null {
    const age = feed.age;

    // Each ingredient gets its own curve, not its own tint on one curve. The
    // three strips were frame-for-frame identical with the projectile
    // recoloured, and all three spent their last three frames on a held pose.
    if (feed.ingredient === "metal") {
      // Hard and fast: clamp on contact, then a recoil that overshoots open
      // again before it settles. Over in half a second.
      const contact = Math.exp(-Math.abs(age - 0.04) * 20);
      this.wear("snap", Math.max(contact, Math.exp(-age * 5)));
      this.wear("clank", Math.exp(-Math.abs(age - 0.06) * 15));
      const ring = reduced ? 0 : Math.exp(-age * 4.5) * Math.sin(age * 46);
      target.headX += ring * 5;
      target.headTilt += ring * 2.4;
      // The recoil: the jaw rebounds past shut and the body unsquashes through
      // its rest size rather than easing back to it.
      const recoil = Math.exp(-Math.abs(age - 0.26) * 7);
      target.jawOpen += recoil * 0.3;
      target.squashY += recoil * 0.05;
      target.squashX -= recoil * 0.05;
      target.headY -= recoil * 9;
      target.antennaShake = Math.max(target.antennaShake, Math.exp(-age * 3));
    } else if (feed.ingredient === "balloon") {
      // Slow and soft: a long squish in, a held compression, then a release
      // that floats. Deliberately half the frequency of the metal beat.
      const contact = Math.exp(-Math.abs(age - 0.12) * 7);
      this.wear("snap", Math.max(contact, Math.exp(-age * 2.2)) * 0.85);
      this.wear("puff", Math.exp(-Math.abs(age - 0.42) * 2.6));
      const float = reduced ? 0 : Math.exp(-age * 1.5) * Math.sin(age * 5.2 - 0.6);
      target.bodyRise += float * 11;
      target.headY -= float * 6;
      target.headTilt += float * 2;
      target.cheekPuff += Math.exp(-Math.abs(age - 0.5) * 2.2) * 0.5;
    } else if (feed.ingredient === "pepper") {
      const contact = Math.exp(-Math.abs(age - 0.05) * 15);
      this.wear("snap", Math.max(contact, Math.exp(-age * 3)));
      // Nothing for a beat, then the heat arrives and takes over the face.
      // Started earlier and ramped over longer. At the old timing the strip
      // spent three frames on a held closed smile and then the heat arrived
      // between one frame and the next, which reads as a cut, not a reaction.
      const onset = clamp01((age - 0.16) / 0.34) ** 0.7;
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
    // Earlier and faster. At the old ramp the verdict was still only half worn
    // when the beat was over, so both delight and indifference resolved back
    // toward the resting face and became each other.
    const settle = clamp01((age - 0.4) / 0.34);
    if (settle <= 0) return null;
    const verdict = settle * (feed.ingredient === "pepper" ? 0.35 : 1);
    this.wear(feed.craved ? "delight" : "shrug", verdict);
    target.bellySwell = Math.max(target.bellySwell, settle * 0.14);
    // Delight looks straight out; indifference looks anywhere else. Without
    // this the two verdicts differ only in the corners of the mouth.
    return feed.craved
      ? { x: -0.1, y: -0.5, weight: verdict }
      : { x: 1, y: 0.62, weight: verdict };
  }

  /** Skin changes belonging to a catch, layered after the mood's own. */
  private gulpSkin(target: CreaturePose, feed: Reaction, reduced: boolean) {
    if (feed.ingredient !== "pepper") return;
    const heat = clamp01((feed.age - 0.16) / 0.34) ** 0.7 * (1 - clamp01((feed.age - 1.05) / 0.4));
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
    if (miss.type === "bounce") this.wear("startle", look);
    else {
      // A dropped snack is a head-down sulk that outlasts the jolt, then a flat
      // look at the mess. Without the sulk the whole reaction was over in a
      // fifth of a second and what remained was indistinguishable from mild
      // irritation.
      this.wear("mope", look);
      this.wear("sideEye", clamp01((age - 0.62) / 0.3) * 0.75);
    }
    target.headX -= side * jolt * (reduced ? 5 : 24);
    target.headTilt -= side * jolt * (reduced ? 2 : 7);
    target.headX += side * look * 7;
    if (!reduced) target.antennaShake = Math.max(target.antennaShake, jolt);
  }

}
