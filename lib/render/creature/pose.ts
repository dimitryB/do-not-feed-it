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
    headX: 16, headY: -13, headTilt: -3, lean: 0.05,
    squashX: 1.08, squashY: 0.95, antennaDroop: -0.6, antennaTwist: -0.15,
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
  return pose;
};

interface Gaze { x: number; y: number; weight: number }

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
    const creatureNow = state?.creature;
    const clog = clamp01(creatureNow?.clog ?? 0);
    const pressure = clamp01(creatureNow?.pressure ?? 0);
    const clock = time - this.started;

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

    // 4. What it has become.
    //
    // Three permanent levels that stack, so the expressions are blended by
    // weight rather than switched between: a creature that is magnetic and
    // floating and full of pepper wears all three at once, which is the whole
    // point of stacking them.
    this.wear("activeMetal", metal * 0.9);
    this.wear("activeBalloon", balloon * 0.9);
    this.wear("holdPepper", pepper * 0.9);
    // The pressure that is about to become a burp, and the spit that is about
    // to leave, are the two moments worth anticipating.
    const spitting = latest(state, ["spit"], 0.55);
    if (spitting) this.wear("blowPepper", 1);
    else if (pepper > 0 && pressure > 0.7) this.wear("warnPepper", pressure);
    if (balloon > 0 && pressure > 0.8) this.wear("warnBalloon", (pressure - 0.8) * 5);

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
    const clogged = latest(state, ["clog"], 0.8);
    if (clogged) {
      const pop = Math.exp(-clogged.age * 5);
      target.jawShift += pop * 0.5;
      target.teethQuiver = Math.max(target.teethQuiver, pop);
    }
    const burped = latest(state, ["burp"], 0.9);
    if (burped) {
      const pop = Math.exp(-burped.age * 4.4);
      target.cheekPuff += pop * 0.9;
      target.exhale = Math.max(target.exhale, pop);
      target.squashY -= pop * 0.08;
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
    const miss = latest(state, ["miss", "bounce"], 1.2);
    const recovery = latest(state, ["sneeze", "burp"], 1.9);
    if (recovery) gaze = this.applyRecovery(recovery);
    if (feed && (!miss || feed.age <= miss.age)) gaze = this.applyGulp(target, feed, reduced) ?? gaze;
    else if (miss) this.applyFlinch(target, miss, reduced);

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
      if (spitting) target.exhale = 1;
      if (pressure > 0.7) target.cheekPuff = Math.max(target.cheekPuff, (pressure - 0.7) * 2.4);
    }
    // Stretched-skin sheen, balloon only, and it tightens as the pressure
    // builds toward the burp.
    if (balloon > 0) {
      target.taut = Math.max(target.taut, 0.35 + balloon * 0.65);
      // Halved. Folded into the uniform scale, a large swell on top of a
      // full-grown creature slams into the warp's ×1.14 ceiling, and the grid
      // clamp that stops a cell inverting then shows up as hard-edged
      // rectangular tearing across the belly. The lift and the sheen carry the
      // balloon; the swell only has to support them.
      target.bellySwell = Math.max(target.bellySwell, balloon * (0.2 + pressure * 0.28));
    }
    if (metal > 0) {
      target.magnetism = Math.max(target.magnetism, 0.4 + metal * 0.6);
      target.teethAlign = Math.max(target.teethAlign, 0.5 + metal * 0.5);
      target.teethLong = Math.max(target.teethLong, metal * 0.55);
      // A mouth full of cutlery does not close cleanly.
      // A mouth full of cutlery does not close cleanly. It also must not move:
      // the jaw shift raised the drawn mouth 22 px at a clog of 0.6, and the
      // rules' ellipse does not move with clog at all, so every pixel of it was
      // the ring drifting off the mouth.
      if (clog > 0.1) {
        target.teethQuiver = Math.max(target.teethQuiver, clog);
        target.jawShift += clog * 0.08;
      }
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
      // The gap after the clog: what the rules test is what has to be drawn.
      const open = clamp01(creature.open ?? creature.aperture);
      target.jawOpen = mix(target.jawOpen, open, playing ? 0.88 : 0.35);
      target.mouthWidth = mix(target.mouthWidth, 0.9 + open * 0.34, playing ? 0.7 : 0.3);
      target.lipPress = mix(target.lipPress, open > 0.1 ? 0.1 : 0.75, playing ? 0.7 : 0.3);
      if (open > 0.5) target.teethBare = Math.max(target.teethBare, 0.4);
      // The mouth carries most of the growth, because the mouth is drawn rather
      // than warped: it costs nothing, it stays crisp at any size, and it is
      // the part the rules actually measure. These two follow `mouthGrowX` and
      // `mouthGrowY` in the rules exactly, so the lit target ring is always the
      // mouth the player can see.
      target.mouthScaleX = 1 + grow * 0.2;
      target.mouthScaleY = 1 + grow * 0.3;
      // The body scale is deliberately small. Every warp cell the body kernel
      // touches has to be redrawn once it is displaced at all, and the creature
      // is now displaced for the whole shift rather than during a mutation —
      // which took the draw from 4.0 ms to 5.6 ms at full size. Rise and lean
      // are the same cost as scale here, so they are kept small too and the
      // growth is spent where it is free.
      // The body carries the growth now, not only the mouth.
      //
      // The previous split put most of it on the mouth because the mouth is
      // drawn rather than warped and costs nothing at any size. That was true
      // and it was the wrong answer: at full size the mouth is open about a
      // sixth of the time, so five frames in six showed no growth at all, and
      // the critic reading those frames said so. Scale is capped further down
      // at ×1.14 by the warp's texture budget; rise and lean are translations,
      // which resample nothing, so they take as much of the remaining headroom
      // as the warp region has.
      target.squashX *= 1 + grow * 0.115;
      target.squashY *= 1 + grow * 0.105;
      // Trimmed from 46/42. At the previous rise a full-grown creature's eyes
      // were above the top of the frame and the head read as cut off by a bug
      // rather than as looming. It still fills the serving hatch; it keeps its
      // face while doing it.
      target.bodyRise += grow * 32;
      target.headX -= grow * 26;
      target.headY -= grow * 28;
      target.lean += grow * 0.12;
      // The balloon. The rules move the mouth up by exactly `lift` pixels, and
      // the picture has to move by the same amount — not by a similar amount.
      //
      // At 1.05 and 0.95 it moved by three and a half times as much: measured,
      // ten units of lift raised the drawn mouth 34 px while the rules raised
      // theirs 10, so by mid-shift the lit target ring was sitting 70 px below
      // an open mouth and the game was drawing a target that was not the target.
      // The coefficients below are the measured ones, divided by that factor;
      // `scripts/mouth-calibrate.mjs` now checks the agreement in the states a
      // shift actually reaches rather than only on a bare creature.
      const lift = creature.lift ?? 0;
      if (lift > 0) {
        target.bodyRise += lift * 0.31;
        target.headY -= lift * 0.28;
      }
      // And the tracking, which is the same thing in the other direction and is
      // much larger: a hungry creature reaches for a snack in the air, and the
      // rules move its mouth by up to forty-six pixels to do it. The picture
      // followed that with nine pixels of head travel in the tracking
      // expressions and nothing else, so on every frame with a snack in flight —
      // which is most of the frames a player is aiming on — the ring was
      // descending while the painted mouth was not. Same two channels as the
      // lift, same calibrated coefficients, opposite sign.
      // Measured, not guessed: at 0.31/0.28 — the lift's coefficients — forty
      // units of track moved the painted mouth eleven pixels against the rules'
      // thirty-six. Downward displacement through the body kernel meets the
      // floor gate on its way and costs about three times as much to buy.
      const track = creature.track ?? 0;
      target.bodyRise -= track * 1.0;
      target.headY += track * 0.9;
      target.teethLong = Math.max(target.teethLong, clamp01(grow / 1.4) * 0.55);
      // A shut mouth on a big creature is the thing the player is waiting out,
      // so it tightens rather than simply closing.
      if (open < 0.05) target.cornerLift = mix(target.cornerLift, -0.35, 0.4 * clamp01(grow / 0.7));

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

  /** Deflating: the body sags past its resting size, then comes back. */
  private applyRecovery(recovery: Reaction): Gaze {
    const sag = Math.sin(clamp01(recovery.age / 1.5) * Math.PI) ** 0.7;
    this.wear("deflate", sag);
    // A residue of whatever it just was, draining away. "Wearing off" is not a
    // pose on its own — it is the previous state at a fraction of strength, and
    // without that fraction on screen the state is just a tired face.
    const leaving = (1 - clamp01(recovery.age / 1.5)) ** 1.4;
    if (recovery.ingredient === "metal") {
      this.target.teethAlign = Math.max(this.target.teethAlign, leaving * 0.7);
      this.target.teethLong = Math.max(this.target.teethLong, leaving * 0.55);
      this.target.magnetism = Math.max(this.target.magnetism, leaving * 0.5);
    } else if (recovery.ingredient === "balloon") {
      this.target.taut = Math.max(this.target.taut, leaving * 0.6);
      this.target.bellySwell = Math.max(this.target.bellySwell, leaving * 0.5);
    } else {
      this.target.flush = Math.max(this.target.flush, leaving * 0.5);
      this.target.sweat = Math.max(this.target.sweat, leaving * 0.6);
    }
    // Deliberately no `exhale`: that plume belongs to the pepper gust, and
    // borrowing it here left a puff of pepper smoke hanging on the cheek of a
    // creature that had just finished being a balloon.
    return { x: -0.2, y: 0.55, weight: sag * 0.8 };
  }
}
