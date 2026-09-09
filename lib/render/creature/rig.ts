/**
 * Builds the creature rig out of the existing painting.
 *
 * Nothing here generates new art. Parts are either cut from `kitchen.png`
 * (pupils, tongue, a fang, two bands of eyelid skin) or removed from it and
 * the gap filled in from the surrounding skin (the open mouth, the painted
 * pupils). The filled version is baked back into the working copy of the
 * picture, so the renderer warps one image and draws the authored mouth and
 * eyes on top of it.
 *
 * Built once, lazily, on the first frame after the art decodes.
 */
import {
  ARENA_HEIGHT, ARENA_WIDTH, BODY_OUTLINE, CHIN_SOURCE, EYE, EYE_SIDES, HI,
  MOUTH_OUTLINE, MOUTH_PATCH, TONGUE, type EyeSide,
} from "./anatomy";

export interface Patch {
  canvas: HTMLCanvasElement;
  /** Placement rectangle in arena space. */
  x: number; y: number; width: number; height: number;
}

export interface CreatureRig {
  /** The painting at twice arena resolution, muzzle and pupils removed. */
  art: HTMLCanvasElement;
  pupil: Record<EyeSide, Patch>;
  lidUpper: Record<EyeSide, Patch>;
  lidLower: Record<EyeSide, Patch>;
  tongue: Patch;
  tooth: Patch;
  /** Soft creature silhouette, low resolution, for colour grading only. */
  bodyMask: HTMLCanvasElement;
  /** Scratch surface for grading, so a tint can be masked to the creature. */
  grade: HTMLCanvasElement;
  palette: {
    skinLit: string; skinMid: string; skinShadow: string;
    lipRim: string; lipShade: string; cavity: string; cavityDeep: string;
    tongue: string; toothIvory: string; scleraWarm: string;
  };
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function contextOf(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D context unavailable");
  return context;
}

/** The painted mouth's outline, in the coordinates of a patch canvas. */
function mouthPath(context: CanvasRenderingContext2D, originX: number, originY: number) {
  context.beginPath();
  MOUTH_OUTLINE.forEach(([x, y], index) => {
    const px = (x - originX) * HI;
    const py = (y - originY) * HI;
    if (index) context.lineTo(px, py); else context.moveTo(px, py);
  });
  context.closePath();
}

/**
 * Fills transparent pixels from their surroundings with a pull-push pyramid:
 * repeated halving smears neighbouring colour across the gap, and compositing
 * the coarse levels back underneath fills it without a visible edge.
 */
function pullPushFill(canvas: HTMLCanvasElement, fallback: string) {
  const levels: HTMLCanvasElement[] = [canvas];
  let current = canvas;
  while (current.width > 3 && current.height > 3) {
    const next = canvasOf(Math.max(1, current.width >> 1), Math.max(1, current.height >> 1));
    const context = contextOf(next);
    context.imageSmoothingQuality = "high";
    context.drawImage(current, 0, 0, next.width, next.height);
    levels.push(next);
    current = next;
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let index = levels.length - 1; index > 0; index--) {
      const target = levels[index - 1];
      const context = contextOf(target);
      context.save();
      context.globalCompositeOperation = "destination-over";
      context.imageSmoothingQuality = "high";
      context.drawImage(levels[index], 0, 0, target.width, target.height);
      context.restore();
    }
  }
  const context = contextOf(canvas);
  context.save();
  context.globalCompositeOperation = "destination-over";
  context.fillStyle = fallback;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();
}

function sample(context: CanvasRenderingContext2D, x: number, y: number, radius = 3) {
  const size = radius * 2 + 1;
  const data = context.getImageData(Math.round(x - radius), Math.round(y - radius), size, size).data;
  let r = 0, g = 0, b = 0;
  for (let index = 0; index < data.length; index += 4) { r += data[index]; g += data[index + 1]; b += data[index + 2]; }
  const count = data.length / 4;
  return `rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`;
}

/** Cuts a soft-edged ellipse out of the painting. */
function cutEllipse(source: HTMLCanvasElement, x: number, y: number, rx: number, ry: number, feather: number): Patch {
  const patch = canvasOf(rx * 2 * HI, ry * 2 * HI);
  const context = contextOf(patch);
  context.drawImage(source, (x - rx) * HI, (y - ry) * HI, rx * 2 * HI, ry * 2 * HI, 0, 0, patch.width, patch.height);
  const mask = canvasOf(patch.width, patch.height);
  const maskContext = contextOf(mask);
  maskContext.save();
  maskContext.translate(patch.width / 2, patch.height / 2);
  maskContext.scale(1, patch.height / patch.width);
  // The gradient is built after the transform, in the same space it is filled
  // in; building it before would centre the soft disc on a corner.
  const gradient = maskContext.createRadialGradient(0, 0, 0, 0, 0, patch.width / 2);
  gradient.addColorStop(Math.max(0, 1 - feather), "#fff");
  gradient.addColorStop(1, "#fff0");
  maskContext.fillStyle = gradient;
  maskContext.fillRect(-patch.width / 2, -patch.width / 2, patch.width, patch.width);
  maskContext.restore();
  context.globalCompositeOperation = "destination-in";
  context.drawImage(mask, 0, 0);
  context.globalCompositeOperation = "source-over";
  return { canvas: patch, x: x - rx, y: y - ry, width: rx * 2, height: ry * 2 };
}

/**
 * One tooth, built to the painting's own ivory.
 *
 * The painted fangs are small, low-contrast and half in shadow, so a cut of one
 * cannot be scaled up into a whole jaw. This paints a cone in the sampled
 * palette instead and rubs a little of the real tooth over it for grain.
 */
function buildTooth(art: HTMLCanvasElement, ivory: string): Patch {
  const width = 30;
  const height = 56;
  const patch = canvasOf(width * HI, height * HI);
  const context = contextOf(patch);
  context.scale(HI, HI);

  context.beginPath();
  context.moveTo(1.5, 0);
  context.lineTo(width - 1.5, 0);
  context.bezierCurveTo(width - 2.5, height * 0.42, width * 0.76, height * 0.86, width / 2, height);
  context.bezierCurveTo(width * 0.24, height * 0.86, 2.5, height * 0.42, 1.5, 0);
  context.closePath();
  context.save();
  context.clip();

  const body = context.createLinearGradient(2, 0, width - 2, height * 0.8);
  body.addColorStop(0, "#efe3bd");
  body.addColorStop(0.34, "#d8c79a");
  body.addColorStop(0.72, "#9c8358");
  body.addColorStop(1, "#6d5934");
  context.fillStyle = body;
  context.fillRect(0, 0, width, height);

  // Root end sits in shadow under the lip; the tip catches the amber light.
  const depth = context.createLinearGradient(0, 0, 0, height);
  depth.addColorStop(0, "rgba(28,18,6,0.75)");
  depth.addColorStop(0.24, "rgba(40,28,10,0.16)");
  depth.addColorStop(0.72, "rgba(255,222,150,0.1)");
  depth.addColorStop(1, "rgba(255,236,186,0.24)");
  context.fillStyle = depth;
  context.fillRect(0, 0, width, height);

  context.globalAlpha = 0.28;
  context.globalCompositeOperation = "overlay";
  context.drawImage(art, 776 * HI, 194 * HI, 20 * HI, 22 * HI, 1, 2, width - 2, height - 4);
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;

  const shine = context.createLinearGradient(width * 0.28, 0, width * 0.46, height);
  shine.addColorStop(0, "rgba(255,250,228,0.6)");
  shine.addColorStop(0.55, "rgba(255,250,228,0.12)");
  shine.addColorStop(1, "rgba(255,250,228,0)");
  context.fillStyle = shine;
  context.fillRect(0, 0, width * 0.55, height);
  context.restore();

  context.strokeStyle = `${ivory.replace("rgb", "rgba").replace(")", ",0.5)")}`;
  context.lineWidth = 0.7;
  context.beginPath();
  context.moveTo(width - 2, height * 0.06);
  context.bezierCurveTo(width - 3, height * 0.42, width * 0.76, height * 0.86, width / 2, height - 0.5);
  context.stroke();
  return { canvas: patch, x: 0, y: 0, width, height };
}

/** Fraction of an eyelid band that stays fully opaque before it feathers. */
export const LID_SOLID = 0.84;

/** A band of real skin, feathered on one edge, used as a moving eyelid. */
function cutSkinBand(source: HTMLCanvasElement, rect: { x: number; y: number; width: number; height: number },
                     fadeFrom: "top" | "bottom"): Patch {
  const patch = canvasOf(rect.width * HI, rect.height * HI);
  const context = contextOf(patch);
  context.drawImage(source, rect.x * HI, rect.y * HI, rect.width * HI, rect.height * HI, 0, 0, patch.width, patch.height);
  const fade = context.createLinearGradient(0, 0, 0, patch.height);
  // Opaque for most of the band and feathered only at the very end: a long
  // fade leaves a half-transparent veil over whatever the lid is covering.
  if (fadeFrom === "bottom") {
    fade.addColorStop(0, "#fff");
    fade.addColorStop(LID_SOLID, "#fff");
    fade.addColorStop(1, "#fff0");
  } else {
    fade.addColorStop(0, "#fff0");
    fade.addColorStop(1 - LID_SOLID, "#fff");
    fade.addColorStop(1, "#fff");
  }
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = fade;
  context.fillRect(0, 0, patch.width, patch.height);
  context.globalCompositeOperation = "source-over";
  return { canvas: patch, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

/**
 * Rebuilds the muzzle as closed skin.
 *
 * The mouth is cut out along its traced outline and replaced with the
 * creature's own chin skin, tiled and flipped so the wrinkles keep running the
 * right way, then relit with the painting's own top-down falloff. Real skin
 * beats an interpolated fill: it brings grain and wrinkles with it.
 */
function buildMouthSkin(art: HTMLCanvasElement, artContext: CanvasRenderingContext2D): Patch {
  const rect = MOUTH_PATCH;
  const patch = canvasOf(rect.width * HI, rect.height * HI);
  const context = contextOf(patch);
  context.drawImage(art, rect.x * HI, rect.y * HI, rect.width * HI, rect.height * HI, 0, 0, patch.width, patch.height);

  context.save();
  context.globalCompositeOperation = "destination-out";
  context.filter = "blur(9px)";
  context.lineJoin = "round";
  context.lineWidth = 5 * HI;
  context.strokeStyle = "#000";
  context.fillStyle = "#000";
  mouthPath(context, rect.x, rect.y);
  context.fill();
  context.stroke();
  context.restore();

  // Rebuild with the creature's own chin, in two overlapping flipped bands.
  const fill = canvasOf(patch.width, patch.height);
  const fillContext = contextOf(fill);
  const bandHeight = 132;
  for (let index = 0; index < 3; index++) {
    const top = 150 + index * (bandHeight - 24);
    const strip = canvasOf(CHIN_SOURCE.width * HI, bandHeight * HI);
    const stripContext = contextOf(strip);
    stripContext.save();
    if (index % 2 === 1) {
      stripContext.translate(strip.width, strip.height);
      stripContext.scale(-1, -1);
    }
    const shift = index * 17;
    stripContext.drawImage(art, (CHIN_SOURCE.x + shift) * HI, CHIN_SOURCE.y * HI,
      (CHIN_SOURCE.width - shift) * HI, CHIN_SOURCE.height * HI, 0, 0, strip.width, strip.height);
    stripContext.restore();
    const fade = stripContext.createLinearGradient(0, 0, 0, strip.height);
    fade.addColorStop(0, index === 0 ? "#fff" : "#fff0");
    fade.addColorStop(0.22, "#fff");
    fade.addColorStop(0.8, "#fff");
    fade.addColorStop(1, index === 2 ? "#fff" : "#fff0");
    stripContext.globalCompositeOperation = "destination-in";
    stripContext.fillStyle = fade;
    stripContext.fillRect(0, 0, strip.width, strip.height);
    fillContext.drawImage(strip, (700 - rect.x) * HI, (top - rect.y) * HI, 300 * HI, bandHeight * HI);
  }
  context.save();
  context.globalCompositeOperation = "destination-over";
  context.drawImage(fill, 0, 0);
  context.restore();
  pullPushFill(patch, sample(artContext, 840 * HI, 402 * HI, 6));

  // Relight through a soft-edged mask of the same outline, so the rebuilt skin
  // fades into the painting instead of ending on a hard polygon edge.
  const light = canvasOf(patch.width, patch.height);
  const lightContext = contextOf(light);
  const shade = lightContext.createLinearGradient(0, (168 - rect.y) * HI, 0, (394 - rect.y) * HI);
  shade.addColorStop(0, "rgba(20,12,2,0.66)");
  shade.addColorStop(0.3, "rgba(44,30,6,0.34)");
  shade.addColorStop(0.66, "rgba(96,76,26,0.14)");
  shade.addColorStop(1, "rgba(188,150,60,0.2)");
  lightContext.fillStyle = shade;
  lightContext.fillRect(0, 0, light.width, light.height);
  const sideLight = lightContext.createLinearGradient((706 - rect.x) * HI, 0, (976 - rect.x) * HI, 0);
  sideLight.addColorStop(0, "rgba(12,22,18,0.4)");
  sideLight.addColorStop(0.45, "rgba(12,22,18,0.06)");
  sideLight.addColorStop(1, "rgba(224,164,72,0.22)");
  lightContext.fillStyle = sideLight;
  lightContext.fillRect(0, 0, light.width, light.height);
  lightContext.globalCompositeOperation = "destination-in";
  lightContext.filter = "blur(13px)";
  lightContext.fillStyle = "#fff";
  mouthPath(lightContext, rect.x, rect.y);
  lightContext.fill();
  lightContext.filter = "none";
  context.drawImage(light, 0, 0);

  // The nose casts a shadow onto the muzzle; without it the rebuilt skin sits
  // too bright right under it.
  const noseShadow = context.createRadialGradient(
    (840 - rect.x) * HI, (184 - rect.y) * HI, 4,
    (840 - rect.x) * HI, (184 - rect.y) * HI, 96 * HI);
  noseShadow.addColorStop(0, "rgba(14,9,2,0.5)");
  noseShadow.addColorStop(0.45, "rgba(14,9,2,0.26)");
  noseShadow.addColorStop(1, "rgba(14,9,2,0)");
  context.save();
  context.translate((840 - rect.x) * HI, (184 - rect.y) * HI);
  context.scale(1, 0.34);
  context.translate(-(840 - rect.x) * HI, -(184 - rect.y) * HI);
  context.fillStyle = noseShadow;
  context.fillRect(0, 0, patch.width, patch.height / 0.34);
  context.restore();

  return { canvas: patch, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

/** The eye with the painted pupil filled in, so a new pupil can look around. */
function buildScleraPatch(art: HTMLCanvasElement, side: EyeSide): Patch {
  const eye = EYE[side];
  const pad = 9;
  const rect = { x: eye.x - eye.rx - pad, y: eye.y - eye.ry - pad, width: (eye.rx + pad) * 2, height: (eye.ry + pad) * 2 };
  const patch = canvasOf(rect.width * HI, rect.height * HI);
  const context = contextOf(patch);
  context.drawImage(art, rect.x * HI, rect.y * HI, rect.width * HI, rect.height * HI, 0, 0, patch.width, patch.height);
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.filter = "blur(3px)";
  context.beginPath();
  context.arc((eye.pupil.x - rect.x) * HI, (eye.pupil.y - rect.y) * HI, (eye.pupil.r + 2) * HI, 0, Math.PI * 2);
  context.fillStyle = "#000";
  context.fill();
  context.restore();
  pullPushFill(patch, "rgb(196,146,26)");
  // Feather the patch to an ellipse before it goes back onto the painting: a
  // rectangular paste shows its own corners once anything else shifts.
  context.save();
  context.globalCompositeOperation = "destination-in";
  context.filter = "blur(4px)";
  context.fillStyle = "#fff";
  context.beginPath();
  context.ellipse((eye.x - rect.x) * HI, (eye.y - rect.y) * HI, (eye.rx + 4) * HI, (eye.ry + 4) * HI, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
  return { canvas: patch, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

function buildBodyMask(): HTMLCanvasElement {
  const mask = canvasOf(ARENA_WIDTH / 4, ARENA_HEIGHT / 4);
  const context = contextOf(mask);
  context.save();
  context.scale(0.25, 0.25);
  context.filter = "blur(15px)";
  context.fillStyle = "#fff";
  context.beginPath();
  BODY_OUTLINE.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)));
  context.lineTo(BODY_OUTLINE[BODY_OUTLINE.length - 1][0], 520);
  context.lineTo(BODY_OUTLINE[0][0], 520);
  context.closePath();
  context.fill();
  context.restore();
  return mask;
}

export function buildRig(image: HTMLImageElement): CreatureRig {
  const art = canvasOf(ARENA_WIDTH * HI, ARENA_HEIGHT * HI);
  const artContext = art.getContext("2d", { willReadFrequently: true });
  if (!artContext) throw new Error("2D context unavailable");
  artContext.imageSmoothingQuality = "high";
  artContext.drawImage(image, 0, 0, art.width, art.height);

  const palette = {
    skinLit: sample(artContext, 900 * HI, 392 * HI, 5),
    skinMid: sample(artContext, 700 * HI, 300 * HI, 5),
    skinShadow: sample(artContext, 640 * HI, 330 * HI, 5),
    lipRim: sample(artContext, 840 * HI, 176 * HI, 3),
    lipShade: sample(artContext, 840 * HI, 386 * HI, 3),
    cavity: "rgb(46,16,14)",
    cavityDeep: "rgb(9,3,3)",
    tongue: sample(artContext, 833 * HI, 312 * HI, 4),
    toothIvory: sample(artContext, 786 * HI, 200 * HI, 2),
    scleraWarm: sample(artContext, 760 * HI, 150 * HI, 3),
  };

  // Cut every moving part from the untouched painting first.
  const pupil = {} as Record<EyeSide, Patch>;
  const lidUpper = {} as Record<EyeSide, Patch>;
  const lidLower = {} as Record<EyeSide, Patch>;
  for (const side of EYE_SIDES) {
    const eye = EYE[side];
    pupil[side] = cutEllipse(art, eye.pupil.x, eye.pupil.y, eye.pupil.r, eye.pupil.r, 0.18);
    lidUpper[side] = cutSkinBand(art,
      { x: eye.x - eye.rx - 11, y: eye.y - eye.ry - 22, width: (eye.rx + 11) * 2, height: 28 }, "bottom");
    lidLower[side] = cutSkinBand(art,
      { x: eye.x - eye.rx - 11, y: eye.y + eye.ry - 6, width: (eye.rx + 11) * 2, height: 24 }, "top");
  }
  const tongue = cutEllipse(art, TONGUE.x, TONGUE.y, TONGUE.rx, TONGUE.ry, 0.32);
  const tooth = buildTooth(art, sample(artContext, 786 * HI, 200 * HI, 2));

  // Then bake the removals into the working copy the warp draws from.
  const mouthSkin = buildMouthSkin(art, artContext);
  const sclera = EYE_SIDES.map((side) => buildScleraPatch(art, side));
  artContext.drawImage(mouthSkin.canvas, mouthSkin.x * HI, mouthSkin.y * HI);
  for (const patch of sclera) artContext.drawImage(patch.canvas, patch.x * HI, patch.y * HI);

  return {
    art, pupil, lidUpper, lidLower, tongue, tooth,
    bodyMask: buildBodyMask(), grade: canvasOf(ARENA_WIDTH / 2, ARENA_HEIGHT / 2), palette,
  };
}
