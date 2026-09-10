/**
 * Where the creature's features actually sit in the painting.
 *
 * Every number is in the 1200x700 arena space the renderer draws in, measured
 * off `public/art/kitchen.png`. The rig and the pose code both read from here,
 * so a landmark is corrected in one place.
 */

/** Source art is 1536x1024; the rig works at twice arena resolution. */
export const ART_WIDTH = 1536;
export const ART_HEIGHT = 1024;
export const ARENA_WIDTH = 1200;
export const ARENA_HEIGHT = 700;
export const HI = 2;

export const HEAD = { x: 848, y: 190 };
export const NOSE = { x: 839, y: 150 };
export const BELLY = { x: 840, y: 424 };
/** Roughly where the jaw would hinge, behind the mouth corners. */
export const JAW_PIVOT = { x: 840, y: 250 };
/** The counter line. Nothing below this may be displaced. */
export const COUNTER_Y = 470;

export const EYE = {
  // Re-measured off the painting at 4x. The previous figures put the socket a
  // few pixels up and left of the painted eyeball and made it three pixels too
  // wide in every direction, so everything clipped to it — lids above all — sat
  // on the skin around the eye instead of on the eye. The pupil radius was out
  // by half again, which is why a dilated pupil filled the socket edge to edge
  // and read as a dark slot.
  left: { x: 769, y: 154, rx: 23, ry: 19, pupil: { x: 777, y: 156, r: 11 } },
  right: { x: 920, y: 158, rx: 25, ry: 19.5, pupil: { x: 909, y: 159, r: 11 } },
} as const;

export type EyeSide = keyof typeof EYE;
export const EYE_SIDES: readonly EyeSide[] = ["left", "right"];

/**
 * The painted mouth, which is the widest the aperture ever gets.
 * `open` 1 reproduces it; `open` 0 is a closed lip line.
 */
export const MOUTH = {
  cornerLeft: { x: 718, y: 211 },
  cornerRight: { x: 966, y: 225 },
  center: 840,
  upperOpen: 184,
  upperClosed: 276,
  lowerOpen: 366,
  lowerClosed: 296,
} as const;

/**
 * Outer boundary of everything painted as mouth: lips, teeth, tongue, cavity.
 * Traced off the painting; this whole region is rebuilt as skin.
 */
export const MOUTH_OUTLINE: readonly (readonly [number, number])[] = [
  [712, 214], [732, 192], [770, 182], [816, 179], [864, 181], [910, 187],
  [946, 200], [970, 226], [968, 268], [952, 318], [918, 354], [872, 376],
  [828, 380], [788, 370], [750, 346], [726, 306], [714, 258],
];

/** Region rebuilt as skin so the authored mouth is the only mouth on the face. */
export const MOUTH_PATCH = { x: 672, y: 132, width: 340, height: 292 };

/** Clean skin below the mouth, the source for the rebuilt muzzle. */
export const CHIN_SOURCE = { x: 730, y: 384, width: 220, height: 54 };

export const TONGUE = { x: 833, y: 313, rx: 53, ry: 25 };

/** Soft silhouette used only for colour grading, never for cutting. */
export const BODY_OUTLINE: readonly (readonly [number, number])[] = [
  [545, 486], [551, 424], [566, 366], [588, 310], [612, 268], [640, 232],
  [668, 208], [700, 184], [730, 156], [756, 130], [774, 110], [790, 92],
  [806, 82], [822, 86], [834, 96], [846, 80], [860, 82], [874, 96],
  [888, 78], [904, 78], [918, 90], [928, 108], [946, 120], [968, 138],
  [990, 158], [1010, 182], [1026, 212], [1038, 246], [1048, 288],
  [1058, 336], [1068, 388], [1074, 434], [1078, 486],
];
