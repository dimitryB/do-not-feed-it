/**
 * Draws the creature for a pose.
 *
 * Order: warped picture, then the muzzle rebuilt as skin, then the authored
 * mouth, then the eyes, then skin colour. Every part is placed through the
 * same displacement field, so nothing slides off the face when the body moves.
 */
import { EYE, EYE_SIDES, MOUTH } from "./anatomy";
import type { CreaturePose } from "./pose";
import { LID_SOLID, type CreatureRig } from "./rig";
import { buildField, drawWarped, localTransform, WARP_REGION, type WarpField } from "./warp";

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

interface Aperture {
  leftX: number; leftY: number; rightX: number; rightY: number;
  upperControl: number; lowerControl: number;
  upperApex: number; lowerApex: number; centerX: number;
}

/** Control point that puts a quadratic's apex exactly on `apex`. */
const controlFor = (startY: number, endY: number, apex: number) => 2 * apex - 0.5 * (startY + endY);

function aperture(pose: CreaturePose): Aperture {
  const lift = pose.cornerLift;
  const press = pose.lipPress;
  const pull = (1 - pose.mouthWidth) * 18 + press * 10 + (1 - pose.jawOpen) * 15;
  const leftX = MOUTH.cornerLeft.x + pull;
  const rightX = MOUTH.cornerRight.x - pull;
  const leftY = MOUTH.cornerLeft.y - lift * 21;
  const rightY = MOUTH.cornerRight.y - lift * 21;
  const upperApex = mix(MOUTH.upperClosed, MOUTH.upperOpen, pose.jawOpen) - lift * 3 + press * 2;
  const lowerApex = mix(MOUTH.lowerClosed, MOUTH.lowerOpen, pose.jawOpen) - lift * 2 - press * 2;
  return {
    leftX, leftY, rightX, rightY, centerX: MOUTH.center,
    upperApex, lowerApex,
    upperControl: controlFor(leftY, rightY, upperApex),
    lowerControl: controlFor(leftY, rightY, lowerApex),
  };
}

function aperturePath(context: CanvasRenderingContext2D, shape: Aperture, grow = 0) {
  context.beginPath();
  context.moveTo(shape.leftX - grow, shape.leftY);
  context.quadraticCurveTo(shape.centerX, shape.upperControl - grow * 1.9, shape.rightX + grow, shape.rightY);
  context.quadraticCurveTo(shape.centerX, shape.lowerControl + grow * 1.9, shape.leftX - grow, shape.leftY);
  context.closePath();
}

/** Point and tangent angle on one of the two lip curves. */
function onCurve(shape: Aperture, t: number, upper: boolean) {
  const x0 = upper ? shape.leftX : shape.rightX;
  const y0 = upper ? shape.leftY : shape.rightY;
  const x1 = upper ? shape.rightX : shape.leftX;
  const y1 = upper ? shape.rightY : shape.leftY;
  const cy = upper ? shape.upperControl : shape.lowerControl;
  const inverse = 1 - t;
  const x = inverse * inverse * x0 + 2 * inverse * t * shape.centerX + t * t * x1;
  const y = inverse * inverse * y0 + 2 * inverse * t * cy + t * t * y1;
  const tx = 2 * (inverse * (shape.centerX - x0) + t * (x1 - shape.centerX));
  const ty = 2 * (inverse * (cy - y0) + t * (y1 - cy));
  return { x, y, angle: Math.atan2(ty, tx) };
}

/** Tooth placement along each lip: position along the curve, relative size. */
const UPPER_TEETH: readonly (readonly [number, number])[] = [
  [0.055, 0.5], [0.13, 0.62], [0.205, 0.98], [0.285, 0.58], [0.365, 0.7], [0.45, 0.6],
  [0.535, 0.66], [0.62, 0.56], [0.7, 1], [0.785, 0.62], [0.87, 0.52], [0.945, 0.44],
];
const LOWER_TEETH: readonly (readonly [number, number])[] = [
  [0.06, 0.46], [0.135, 0.98], [0.215, 0.62], [0.295, 0.86], [0.375, 0.56], [0.455, 0.68],
  [0.54, 0.58], [0.62, 0.9], [0.7, 0.6], [0.78, 0.96], [0.86, 0.58], [0.94, 0.44],
];

function drawTeeth(context: CanvasRenderingContext2D, rig: CreatureRig, pose: CreaturePose,
                   shape: Aperture, time: number, upper: boolean, reduced: boolean) {
  const visible = Math.max(Math.min(1, pose.jawOpen * 2.3), pose.teethBare);
  if (visible <= 0.02) return;
  const row = upper ? UPPER_TEETH : LOWER_TEETH;
  const gap = Math.max(0, shape.lowerApex - shape.upperApex);
  const align = pose.teethAlign;
  const span = shape.rightX - shape.leftX;
  // Roots sit behind the lip, so a tooth is drawn longer than it reads.
  const root = 9;
  const reach = (upper ? 27 : 30) * (0.5 + 0.5 * visible) * (1 + pose.teethLong * 1.1) + pose.teethBare * 5;
  context.save();
  for (let index = 0; index < row.length; index++) {
    const [stop, scale] = row[index];
    const t = mix(stop, 0.055 + index * (0.89 / (row.length - 1)), align);
    const spot = onCurve(shape, t, upper);
    const size = mix(scale, 0.9, align);
    const height = Math.min(reach * size + root, gap * 0.6 + root + pose.teethBare * 14 + pose.teethLong * 22);
    if (height < root + 2) continue;
    const width = span * 0.052 * (0.72 + 0.4 * size) * (1 - align * 0.1);
    const quiver = reduced ? 0 : Math.sin(time * 24 + index * 1.9) * pose.teethQuiver * 2.2;
    const lean = mix((upper ? spot.angle : spot.angle - Math.PI) * 0.42, 0, align);
    context.save();
    context.translate(spot.x + quiver, spot.y);
    context.rotate(lean);
    context.scale(1, upper ? 1 : -1);
    context.translate(0, -root);
    context.drawImage(rig.tooth.canvas, -width / 2, 0, width, height);
    context.restore();
  }
  context.restore();
}

/** The fleshy rim around the aperture, which is what makes it read as a mouth. */
function drawLips(context: CanvasRenderingContext2D, pose: CreaturePose, shape: Aperture) {
  const thickness = 10 + (1 - pose.jawOpen) * 6 + pose.lipPress * 4;
  context.save();
  context.lineJoin = "round";

  // Outer roll of the lip: shaded from above, catching the amber lamp below.
  const roll = context.createLinearGradient(0, shape.upperApex - thickness, 0, shape.lowerApex + thickness);
  roll.addColorStop(0, "rgba(76,56,18,0.34)");
  roll.addColorStop(0.3, "rgba(48,34,8,0.36)");
  roll.addColorStop(0.62, "rgba(88,68,24,0.22)");
  roll.addColorStop(1, "rgba(186,148,64,0.3)");
  context.strokeStyle = roll;
  context.lineWidth = thickness;
  // Sat outward, so the lip frames the opening instead of eating into it.
  aperturePath(context, shape, thickness * 0.52);
  context.stroke();

  // The seam itself.
  context.strokeStyle = "rgba(18,8,2,0.6)";
  context.lineWidth = Math.max(2, thickness * 0.4);
  aperturePath(context, shape, 0.4);
  context.stroke();

  // Wet highlight, only along the lower lip.
  context.save();
  context.beginPath();
  context.rect(shape.leftX - 30, shape.lowerApex - 34, shape.rightX - shape.leftX + 60, 84);
  context.clip();
  context.strokeStyle = "rgba(240,216,150,0.26)";
  context.lineWidth = 2.2;
  context.translate(0, thickness * 0.46);
  aperturePath(context, shape, thickness * 0.5);
  context.stroke();
  context.restore();
  context.restore();
}

function drawMouth(context: CanvasRenderingContext2D, rig: CreatureRig, pose: CreaturePose,
                   shape: Aperture, time: number, reduced: boolean) {
  const gap = shape.lowerApex - shape.upperApex;
  const open = clamp01((gap - 12) / 96);

  if (gap > 6) {
    context.save();
    aperturePath(context, shape);
    context.clip();

    const midY = shape.upperApex + gap * 0.45;
    const throatY = shape.upperApex + gap * 0.34;

    const flesh = context.createRadialGradient(shape.centerX, throatY, 4, shape.centerX, midY, Math.max(70, gap * 1.6));
    flesh.addColorStop(0, "rgb(6,2,2)");
    flesh.addColorStop(0.42, `rgb(${Math.round(8 + 22 * open)},${Math.round(3 + 7 * open)},${Math.round(3 + 6 * open)})`);
    flesh.addColorStop(1, `rgb(${Math.round(16 + 58 * open)},${Math.round(6 + 20 * open)},${Math.round(6 + 18 * open)})`);
    context.fillStyle = flesh;
    context.fillRect(shape.leftX - 24, shape.upperApex - 24, shape.rightX - shape.leftX + 48, gap + 48);

    // Palate: a lighter arc under the top lip, so the roof of the mouth reads.
    const palate = context.createLinearGradient(0, shape.upperApex, 0, shape.upperApex + gap * 0.5);
    palate.addColorStop(0, `rgba(128,64,58,${0.5 * open})`);
    palate.addColorStop(1, "rgba(60,20,20,0)");
    context.fillStyle = palate;
    context.fillRect(shape.leftX - 24, shape.upperApex - 6, shape.rightX - shape.leftX + 48, gap * 0.55);

    // The swallow, while the lump is still inside the mouth.
    if (pose.throat > 0.02 && pose.throatTravel < 0.34) {
      context.fillStyle = `rgba(138,82,66,${0.55 * pose.throat})`;
      context.beginPath();
      context.ellipse(shape.centerX + 3, throatY + gap * (0.08 + pose.throatTravel * 1.4),
        30 * pose.throat, 20 * pose.throat, 0, 0, Math.PI * 2);
      context.fill();
    }

    // Tongue on the floor of the mouth, then the teeth in front of it.
    const tongueWidth = Math.max(46, (shape.rightX - shape.leftX) * 0.46);
    const tongueHeight = Math.max(16, Math.min(40, gap * 0.36));
    context.save();
    context.translate(shape.centerX - 2, shape.lowerApex - tongueHeight * 0.68);
    context.rotate(pose.tongueOut * 0.05);
    context.drawImage(rig.tongue.canvas, -tongueWidth / 2, -tongueHeight, tongueWidth, tongueHeight * 2);
    context.restore();

    drawTeeth(context, rig, pose, shape, time, false, reduced);
    drawTeeth(context, rig, pose, shape, time, true, reduced);

    // Gum ridges, drawn over the tooth roots so the row is seated in flesh
    // instead of ending on the straight edge where the clip cuts it.
    context.save();
    context.lineCap = "round";
    context.strokeStyle = `rgba(96,42,40,${0.7 + 0.2 * open})`;
    context.lineWidth = 11;
    context.filter = "blur(2px)";
    aperturePath(context, shape, -3);
    context.stroke();
    context.strokeStyle = "rgba(150,74,68,0.32)";
    context.lineWidth = 4;
    aperturePath(context, shape, -6.5);
    context.stroke();
    context.restore();

    // The lip has thickness, so the rim falls away into shadow.
    context.save();
    context.strokeStyle = "rgba(12,4,1,0.8)";
    context.lineWidth = 15;
    context.filter = "blur(5px)";
    aperturePath(context, shape);
    context.stroke();
    context.restore();
    context.restore();
  } else if (pose.teethBare > 0.05) {
    // Mouth shut but the teeth are out: they overhang the lip.
    drawTeeth(context, rig, pose, shape, time, true, reduced);
  }

  drawLips(context, pose, shape);

  // Tongue lolling past the lip, for hunger and for heat.
  if (pose.tongueOut > 0.04) {
    const width = Math.max(52, (shape.rightX - shape.leftX) * 0.34);
    const height = 24 + pose.tongueOut * 30;
    context.save();
    context.translate(shape.centerX - 10, shape.lowerApex - 8);
    context.rotate(0.14 + pose.tongueOut * 0.12);
    context.globalAlpha = Math.min(1, pose.tongueOut * 2.4);
    context.drawImage(rig.tongue.canvas, -width / 2, -height * 0.28, width, height);
    context.fillStyle = "rgba(22,7,4,0.4)";
    context.beginPath();
    context.ellipse(0, -height * 0.2, width * 0.46, height * 0.12, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  if (pose.drool > 0.05) {
    const length = pose.drool * 26 + (reduced ? 0 : Math.sin(time * 1.6) * 3);
    context.save();
    context.globalAlpha = Math.min(0.8, pose.drool);
    context.strokeStyle = "rgba(226,232,196,0.7)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(shape.centerX + 54, shape.lowerApex - 8);
    context.lineTo(shape.centerX + 54, shape.lowerApex - 8 + length);
    context.stroke();
    context.fillStyle = "rgba(232,238,206,0.75)";
    context.beginPath();
    context.arc(shape.centerX + 54, shape.lowerApex - 8 + length, 2.8, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

/**
 * Eyes.
 *
 * The lid is a band of the creature's own skin, drawn inside a clip of the eye
 * so it can never end on a straight cut edge, and angled about the outer
 * corner: dropping the inner end reads as anger, lifting it as worry. A wet
 * highlight goes on last, because at stream resolution the catchlight is what
 * makes the eye look alive.
 */
function drawEyes(context: CanvasRenderingContext2D, rig: CreatureRig, pose: CreaturePose, field: WarpField) {
  for (const side of EYE_SIDES) {
    const eye = EYE[side];
    // Positive x is outward for the right eye and inward for the left one.
    const outward = side === "left" ? -1 : 1;
    const inward = -outward;
    const local = localTransform(field, eye.x, eye.y);
    const lid = clamp01(side === "left" ? pose.lidLeft : pose.lidRight);
    const brow = (pose.browAngry * 17 - pose.browSad * 14) * (side === "left" ? 1 : -1);

    context.save();
    context.translate(eye.x + local.dx, eye.y + local.dy);
    context.rotate(pose.headTilt * Math.PI / 180 * 0.6);
    context.translate(-eye.x, -eye.y);

    // Pupil, wherever it is looking.
    const spot = eye.pupil;
    const pupilX = spot.x + pose.pupilX * 10;
    const pupilY = spot.y + pose.pupilY * 7;
    context.save();
    context.beginPath();
    context.ellipse(eye.x, eye.y, eye.rx - 1, eye.ry - 1, 0, 0, Math.PI * 2);
    context.clip();
    context.save();
    context.translate(pupilX, pupilY);
    context.scale(pose.pupilScale, pose.pupilScale);
    context.drawImage(rig.pupil[side].canvas, -spot.r, -spot.r, spot.r * 2, spot.r * 2);
    context.restore();
    // Socket shadow: the brow above the eye keeps its top in shade.
    const socket = context.createLinearGradient(0, eye.y - eye.ry - 3, 0, eye.y + eye.ry);
    socket.addColorStop(0, "rgba(30,22,4,0.5)");
    socket.addColorStop(0.5, "rgba(30,22,4,0.04)");
    socket.addColorStop(1, "rgba(30,22,4,0.2)");
    context.fillStyle = socket;
    context.fillRect(eye.x - eye.rx - 3, eye.y - eye.ry - 4, eye.rx * 2 + 6, eye.ry * 2 + 8);
    context.restore();

    // Lids, clipped to the eye so their edges follow its outline.
    context.save();
    context.beginPath();
    context.ellipse(eye.x, eye.y, eye.rx + 0.6, eye.ry + 0.6, 0, 0, Math.PI * 2);
    context.clip();
    // Brows pivot at the outer corner, so anger drops the inner end and worry
    // lifts it — the same way a real brow moves.
    const pivotX = eye.x + outward * (eye.rx + 12);
    const pivotY = eye.y - eye.ry;
    context.translate(pivotX, pivotY);
    context.rotate(brow * Math.PI / 180);
    context.translate(-pivotX, -pivotY);
    // The lid is drawn as vertical slices whose lengths follow a curve, so its
    // lower edge arcs like a real lid instead of ending on a straight cut.
    const band = rig.lidUpper[side];
    const lidEdge = eye.y - eye.ry - 1 + lid * (eye.ry * 2 + 4) - pose.browRaise * 3.5;
    const slices = 9;
    for (let index = 0; index < slices; index++) {
      const u = index / slices;
      const next = (index + 1) / slices;
      const centre = (u + next) / 2;
      const arc = 1 - (centre * 2 - 1) ** 2;
      const edge = lidEdge + arc * 5.5;
      const stretched = Math.max(6, (edge - band.y) / LID_SOLID);
      context.drawImage(band.canvas,
        u * band.canvas.width, 0, (next - u) * band.canvas.width, band.canvas.height,
        band.x + u * band.width, band.y, (next - u) * band.width + 0.4, stretched);
    }
    context.strokeStyle = "rgba(26,20,4,0.26)";
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(eye.x - eye.rx - 4, lidEdge);
    context.quadraticCurveTo(eye.x, lidEdge + 9, eye.x + eye.rx + 4, lidEdge);
    context.stroke();

    if (pose.lowerLid > 0.03) {
      const lower = rig.lidLower[side];
      const rise = pose.lowerLid * eye.ry * 0.55;
      context.drawImage(lower.canvas, lower.x, lower.y - rise, lower.width, lower.height + rise);
      context.strokeStyle = "rgba(26,20,4,0.24)";
      context.beginPath();
      context.moveTo(eye.x - eye.rx - 4, lower.y - rise + 4);
      context.quadraticCurveTo(eye.x, lower.y - rise - 3, eye.x + eye.rx + 4, lower.y - rise + 4);
      context.stroke();
    }
    context.restore();

    // Brow ridge: a soft shadow above the eye that angles with the mood.
    if (pose.browAngry > 0.04 || pose.browSad > 0.04) {
      context.save();
      context.translate(pivotX, pivotY);
      context.rotate(brow * Math.PI / 180);
      context.translate(-pivotX, -pivotY);
      context.globalAlpha = Math.min(0.55, pose.browAngry * 0.55 + pose.browSad * 0.3);
      context.fillStyle = "rgba(28,22,6,0.85)";
      context.beginPath();
      context.moveTo(eye.x - eye.rx - 7, eye.y - eye.ry - 3);
      context.quadraticCurveTo(eye.x, eye.y - eye.ry - 13, eye.x + eye.rx + 7, eye.y - eye.ry - 3);
      context.quadraticCurveTo(eye.x, eye.y - eye.ry - 6, eye.x - eye.rx - 7, eye.y - eye.ry - 3);
      context.fill();
      context.restore();
    }

    // Catchlight.
    if (lid < 0.7) {
      context.save();
      context.globalAlpha = 0.85 * (1 - lid / 0.7);
      context.fillStyle = "rgba(255,252,236,0.95)";
      context.beginPath();
      context.ellipse(pupilX - inward * 4.5, pupilY - 5.5, 2.4, 1.9, -0.4, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha *= 0.5;
      context.beginPath();
      context.ellipse(pupilX + inward * 5, pupilY + 4.5, 1.5, 1.1, 0.3, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    context.restore();
  }
}

/**
 * Paints a tint through the creature's own soft silhouette.
 *
 * Grading the whole frame made the kitchen change colour, which on a stream
 * reads as a white-balance fault rather than a mood.
 */
function gradeBody(context: CanvasRenderingContext2D, rig: CreatureRig,
                   paint: (scratch: CanvasRenderingContext2D) => void, mode: GlobalCompositeOperation) {
  const scratch = rig.grade;
  const inner = scratch.getContext("2d");
  if (!inner) return;
  inner.setTransform(1, 0, 0, 1, 0, 0);
  inner.clearRect(0, 0, scratch.width, scratch.height);
  inner.save();
  inner.scale(scratch.width / 1200, scratch.height / 700);
  paint(inner);
  inner.restore();
  inner.globalCompositeOperation = "destination-in";
  inner.drawImage(rig.bodyMask, 0, 0, scratch.width, scratch.height);
  inner.globalCompositeOperation = "source-over";
  context.save();
  context.globalCompositeOperation = mode;
  context.drawImage(scratch, 0, 0, 1200, 700);
  context.restore();
}

function drawSkin(context: CanvasRenderingContext2D, rig: CreatureRig, pose: CreaturePose,
                  time: number, reduced: boolean) {
  // Irritation flush: heat rising through the muzzle and cheeks.
  if (pose.flush > 0.03) {
    gradeBody(context, rig, (inner) => {
      // Heat sits in the face and cheeks and falls away down the body, so it
      // reads as a blush rather than as a light change.
      const heat = inner.createRadialGradient(846, 236, 24, 846, 246, 232);
      heat.addColorStop(0, `rgba(255,92,28,${1.05 * pose.flush})`);
      heat.addColorStop(0.46, `rgba(236,66,18,${0.66 * pose.flush})`);
      heat.addColorStop(1, `rgba(210,50,14,${0.08 * pose.flush})`);
      inner.fillStyle = heat;
      inner.fillRect(500, 40, 700, 500);
    }, "overlay");
  }

  // Hunger pallor: colour drains and the light goes cold.
  if (pose.pallor > 0.03) {
    gradeBody(context, rig, (inner) => {
      inner.fillStyle = `rgba(150,168,150,${0.7 * pose.pallor})`;
      inner.fillRect(500, 40, 700, 500);
    }, "saturation");
    gradeBody(context, rig, (inner) => {
      const cold = inner.createRadialGradient(846, 300, 30, 846, 300, 340);
      cold.addColorStop(0, `rgba(150,186,198,${0.55 * pose.pallor})`);
      cold.addColorStop(1, `rgba(150,186,198,${0.2 * pose.pallor})`);
      inner.fillStyle = cold;
      inner.fillRect(500, 40, 700, 500);
    }, "multiply");
  }

  // Pressure marks on the cheeks: the pepper build-up.
  if (pose.cheekMarks > 0.05) {
    context.save();
    context.globalAlpha = pose.cheekMarks * 0.55;
    context.strokeStyle = "rgba(196,58,26,0.9)";
    context.lineWidth = 2.4;
    context.lineCap = "round";
    for (const [cx, cy, direction] of [[722, 262, -1], [968, 272, 1]] as const) {
      for (let index = 0; index < 3; index++) {
        const y = cy - 16 + index * 17;
        context.beginPath();
        context.moveTo(cx - direction * 4, y);
        context.quadraticCurveTo(cx + direction * 14, y + 4, cx + direction * 26, y - 2);
        context.stroke();
      }
    }
    context.restore();
  }

  // Sweat.
  if (pose.sweat > 0.08) {
    context.save();
    context.globalAlpha = Math.min(0.85, pose.sweat);
    for (const [x, y] of [[762, 118], [928, 116], [700, 190]] as const) {
      const drift = reduced ? 0 : (Math.sin(time * 1.3 + x) * 0.5 + 0.5) * 8;
      context.fillStyle = "rgba(226,238,208,0.75)";
      context.beginPath();
      context.ellipse(x, y + drift, 2.6, 4, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "rgba(255,255,255,0.8)";
      context.beginPath();
      context.arc(x - 0.8, y + drift - 1.2, 0.9, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

}

/** Hot air leaving the mouth, anchored to the mouth it comes out of. */
function drawExhale(context: CanvasRenderingContext2D, pose: CreaturePose, shape: Aperture,
                    time: number, reduced: boolean) {
  if (pose.exhale <= 0.05) return;
  const originX = shape.leftX + 10;
  const originY = (shape.upperApex + shape.lowerApex) / 2;
  context.save();
  context.globalCompositeOperation = "screen";
  for (let index = 0; index < 5; index++) {
    const phase = reduced ? 0.28 + index * 0.16 : ((time * 1.35 + index * 0.2) % 1);
    const x = originX - phase * 190;
    const y = originY + (index - 2) * 13 + phase * 22;
    const spread = 16 + phase * 56;
    context.globalAlpha = pose.exhale * 0.42 * (1 - phase) * (1 - phase * 0.4);
    const plume = context.createRadialGradient(x, y, 2, x, y, spread);
    plume.addColorStop(0, "rgba(255,186,118,0.85)");
    plume.addColorStop(0.5, "rgba(226,120,52,0.4)");
    plume.addColorStop(1, "rgba(200,90,40,0)");
    context.fillStyle = plume;
    context.beginPath();
    context.ellipse(x, y, spread, spread * 0.62, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

export function drawCreature(context: CanvasRenderingContext2D, rig: CreatureRig, pose: CreaturePose,
                             time: number, reduced: boolean) {
  const field = buildField(pose, time, reduced);
  // One warp pass: the working copy already has the muzzle rebuilt as skin.
  drawWarped(context, rig.art, field, WARP_REGION);

  const shape = aperture(pose);
  const mouthLocal = localTransform(field, MOUTH.center, 250);
  context.save();
  context.translate(mouthLocal.dx, mouthLocal.dy);
  drawMouth(context, rig, pose, shape, time, reduced);
  context.restore();

  // Skin colour goes on before the eyes: a hungry creature loses colour in the
  // face, but its eyes are wet and stay bright, which is what carries the read.
  drawSkin(context, rig, pose, time, reduced);
  drawEyes(context, rig, pose, field);
  context.save();
  context.translate(mouthLocal.dx, mouthLocal.dy);
  drawExhale(context, pose, shape, time, reduced);
  context.restore();
}
