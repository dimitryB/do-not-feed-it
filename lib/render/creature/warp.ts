/**
 * The body warp.
 *
 * The creature is never cut out of the painting. Instead a smooth displacement
 * field, built from the pose, is applied to a patch of the picture around it
 * and decays to nothing before it reaches the counter or the frame — so there
 * is no cut edge anywhere, and the kitchen geometry stays put.
 */
import { BELLY, COUNTER_Y, HEAD, HI } from "./anatomy";
import type { CreaturePose } from "./pose";

/** The rectangle of the picture the field is allowed to touch. */
export const WARP_REGION = { x: 512, y: 52, width: 632, height: 462 };
const CELLS_X = 26;
const CELLS_Y = 19;
/** How far the chin travels between a wide-open and a closed mouth. */
export const JAW_TRAVEL = 46;

const bump = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => {
  const nx = (x - cx) / rx;
  const ny = (y - cy) / ry;
  const d = nx * nx + ny * ny;
  if (d >= 1) return 0;
  const t = 1 - d;
  return t * t;
};

/**
 * Keeps every displacement above the counter line. The ramp is long on
 * purpose: a short one puts a steep gradient in the field, and a steep enough
 * gradient folds a warp cell over itself.
 */
const floorGate = (y: number) => {
  // Zero well above the counter: the arms rest on the sill, and if they move
  // with the body a cut edge opens along it.
  if (y <= COUNTER_Y - 148) return 1;
  if (y >= COUNTER_Y - 34) return 0;
  const t = (COUNTER_Y - 34 - y) / 114;
  return t * t * (3 - 2 * t);
};

export interface WarpField {
  (x: number, y: number, out: { x: number; y: number }): void;
}

export function buildField(pose: CreaturePose, time: number, reduced: boolean): WarpField {
  const tilt = pose.headTilt * Math.PI / 180;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const jaw = (1 - pose.jawOpen) * JAW_TRAVEL;
  const throatY = 300 + pose.throatTravel * 190;
  const tremor = reduced ? 0 : pose.shake * 1.7;
  const tremorX = tremor * Math.sin(time * 47.3);
  const tremorY = tremor * Math.sin(time * 39.1 + 1.7);

  return (x, y, out) => {
    let dx = 0;
    let dy = 0;
    const gate = floorGate(y);
    if (gate <= 0) { out.x = 0; out.y = 0; return; }

    // Head: tilt and offset, strongest over the skull and face.
    const head = bump(x, y, HEAD.x, HEAD.y + 26, 250, 214);
    if (head > 0) {
      const rx = x - HEAD.x;
      const ry = y - (HEAD.y + 170);
      dx += ((rx * cosT - ry * sinT) - rx + pose.headX + tremorX) * head;
      dy += ((rx * sinT + ry * cosT) - ry + pose.headY + tremorY) * head;
    }

    // Body: squash and stretch about the belly, plus the whole rise.
    const body = bump(x, y, BELLY.x, BELLY.y - 44, 292, 264) * gate;
    if (body > 0) {
      dx += (x - BELLY.x) * (pose.squashX - 1) * body;
      dy += (y - BELLY.y) * (pose.squashY - 1) * body - pose.bodyRise * body;
    }

    // Jaw: closing the mouth lifts and compresses the whole lower face. The
    // kernel dies out well above the counter so it never meets the floor gate.
    const chin = bump(x, y, 840, 348, 236, 126) * gate;
    if (chin > 0) dy -= jaw * chin;

    // Belly: inflation pushes out and up, never down into the counter.
    // The push grows with distance from the centre rather than following a
    // normalised direction: a normalised one flips sign through the centre,
    // which is a discontinuity, and a discontinuity folds a warp cell.
    if (pose.bellySwell !== 0) {
      const belly = bump(x, y, BELLY.x, BELLY.y, 296, 244) * gate;
      if (belly > 0) {
        dx += (x - BELLY.x) / 296 * pose.bellySwell * 50 * belly;
        dy += (y - BELLY.y) / 244 * pose.bellySwell * 36 * belly - pose.bellySwell * 20 * belly;
      }
    }

    // Swallow: a travelling bulge from the throat into the belly.
    if (pose.throat > 0.01) {
      const lump = bump(x, y, 840, throatY, 138, 104) * gate;
      if (lump > 0) {
        dx += (x - 840) / 138 * pose.throat * 34 * lump;
        dy += (y - throatY) / 104 * pose.throat * 24 * lump;
      }
    }

    // Cheeks: puffed for pressure, hollow for a hard exhale.
    if (pose.cheekPuff !== 0) {
      const left = bump(x, y, 726, 268, 108, 104);
      const right = bump(x, y, 962, 278, 108, 104);
      dx -= pose.cheekPuff * 17 * left;
      dx += pose.cheekPuff * 17 * right;
      dy += pose.cheekPuff * 5 * (left + right);
    }

    // Antennae: droop outward and down when the belly is empty.
    if (Math.abs(pose.antennaDroop) > 0.01 || pose.antennaShake > 0.01) {
      const stalk = bump(x, y, 848, 78, 142, 60);
      if (stalk > 0) {
        // A smooth fan outward, not Math.sign: a step across the centre line
        // folds the cells there and duplicates the antennae.
        const fan = Math.max(-1, Math.min(1, (x - 848) / 96));
        dy += pose.antennaDroop * 17 * stalk;
        dx += fan * pose.antennaDroop * 11 * stalk;
        if (!reduced) dx += Math.sin(time * 21 + x * 0.05) * pose.antennaShake * 2.6 * stalk;
      }
    }

    out.x = dx;
    out.y = dy;
  };
}

const probe = { x: 0, y: 0 };

/** Local translation and scale of the field at a point, for placing a part. */
export function localTransform(field: WarpField, x: number, y: number) {
  field(x, y, probe);
  const dx = probe.x;
  const dy = probe.y;
  field(x + 12, y, probe);
  const scaleX = 1 + (probe.x - dx) / 12;
  field(x, y + 12, probe);
  const scaleY = 1 + (probe.y - dy) / 12;
  return { dx, dy, scaleX, scaleY };
}

/**
 * Redraws the warped region as a grid of cells.
 *
 * Each cell is drawn under its own affine transform fitted to the cell's three
 * displaced corners, so the mapping stays continuous across cell borders. A
 * per-cell axis-aligned rectangle would turn a smoothly varying displacement
 * into a visible staircase.
 */
export function drawWarped(context: CanvasRenderingContext2D, source: HTMLCanvasElement,
                           field: WarpField, region = WARP_REGION,
                           origin = { x: 0, y: 0 }, cellsX = CELLS_X, cellsY = CELLS_Y) {
  const stepX = region.width / cellsX;
  const stepY = region.height / cellsY;
  const point = { x: 0, y: 0 };
  const gridX = new Float64Array((cellsX + 1) * (cellsY + 1));
  const gridY = new Float64Array((cellsX + 1) * (cellsY + 1));
  for (let row = 0; row <= cellsY; row++) {
    const y = region.y + row * stepY;
    for (let column = 0; column <= cellsX; column++) {
      const x = region.x + column * stepX;
      field(x, y, point);
      const index = row * (cellsX + 1) + column;
      gridX[index] = x - point.x;
      gridY[index] = y - point.y;
    }
  }
  // Cell transforms compose with whatever transform the scene already set.
  const base = context.getTransform();
  const A = base.a, B = base.b, C = base.c, D = base.d, E = base.e, F = base.f;
  // Keep the sampled grid monotone. A displacement gradient steeper than the
  // grid spacing would invert a cell, and an inverted cell smears its source
  // across the frame; clamping here removes the failure at its source.
  const minX = stepX * 0.22;
  const minYStep = stepY * 0.22;
  for (let row = 0; row <= cellsY; row++) {
    const base0 = row * (cellsX + 1);
    for (let column = 1; column <= cellsX; column++) {
      const at = base0 + column;
      if (gridX[at] < gridX[at - 1] + minX) gridX[at] = gridX[at - 1] + minX;
    }
  }
  for (let column = 0; column <= cellsX; column++) {
    for (let row = 1; row <= cellsY; row++) {
      const at = row * (cellsX + 1) + column;
      const above = at - (cellsX + 1);
      if (gridY[at] < gridY[above] + minYStep) gridY[at] = gridY[above] + minYStep;
    }
  }

  const bleed = 0.8;
  for (let row = 0; row < cellsY; row++) {
    for (let column = 0; column < cellsX; column++) {
      const at = row * (cellsX + 1) + column;
      const right = at + 1;
      const below = at + cellsX + 1;
      const ux = gridX[right] - gridX[at];
      const uy = gridY[right] - gridY[at];
      const vx = gridX[below] - gridX[at];
      const vy = gridY[below] - gridY[at];
      const det = ux * vy - uy * vx;
      if (det <= 0) continue;
      const m11 = stepX * vy / det;
      const m21 = -stepX * vx / det;
      const m12 = -stepY * uy / det;
      const m22 = stepY * ux / det;
      const x0 = region.x + column * stepX;
      const y0 = region.y + row * stepY;
      // Back to the scene transform before every cell: the clip rectangle is
      // expressed in arena coordinates.
      context.setTransform(base);
      const tx = x0 - (m11 * gridX[at] + m21 * gridY[at]);
      const ty = y0 - (m12 * gridX[at] + m22 * gridY[at]);
      const opposite = below + 1;
      const minX = Math.min(gridX[at], gridX[right], gridX[below], gridX[opposite]) - bleed;
      const maxX = Math.max(gridX[at], gridX[right], gridX[below], gridX[opposite]) + bleed;
      const minY = Math.min(gridY[at], gridY[right], gridY[below], gridY[opposite]) - bleed;
      const maxY = Math.max(gridY[at], gridY[right], gridY[below], gridY[opposite]) + bleed;
      // A skewed cell's source rectangle is much larger than the cell itself,
      // and its image under the transform spills across the frame. Clip those
      // to their own cell; the common near-identity cells need no clip.
      const skewed = (maxX - minX) * (maxY - minY) > Math.abs(det) * 2.2;
      if (skewed) {
        context.save();
        context.beginPath();
        context.rect(x0 - 0.5, y0 - 0.5, stepX + 1, stepY + 1);
        context.clip();
      }
      context.setTransform(
        A * m11 + C * m12, B * m11 + D * m12,
        A * m21 + C * m22, B * m21 + D * m22,
        A * tx + C * ty + E, B * tx + D * ty + F);
      context.drawImage(source,
        (minX - origin.x) * HI, (minY - origin.y) * HI, (maxX - minX) * HI, (maxY - minY) * HI,
        minX, minY, maxX - minX, maxY - minY);
      if (skewed) context.restore();
    }
  }
  context.setTransform(base);
}
