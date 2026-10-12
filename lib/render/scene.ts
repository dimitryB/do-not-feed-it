import {
  ARENA, FOODS, TUNING, flameCone, getHazard, inFrenzy, previewFlight,
  type ArcadeState, type Bouncer, type Ingredient, type Projectile,
} from '../game/arcade';
import { CreatureAnimator } from './creature/pose';
import { buildRig, type CreatureRig } from './creature/rig';
import { drawCreature } from './creature/draw';
import { DEV_HOOKS, devRender, frameCells } from '../dev/hook';

/**
 * The scene: the kitchen, the creature, the serving in flight, and every piece
 * of juice the brief asks for. Pillars 6 and 7 of `docs/FEAST_BRIEF.md`.
 *
 * The creature is the HUD. On screen during play: score and time (React, in
 * the corners), three mutation chips (React, top centre), the craving ring,
 * one slim belly bar under the creature, a combo counter by the launcher that
 * becomes the FRENZY banner, and at most one caption at a time. Nothing here
 * predicts, instructs or measures.
 *
 * Everything in this file is presentation. It reads `ArcadeState` and its
 * events; it never decides anything, and its own randomness is hashed from
 * event ids and the render clock so a capture of a given tick is reproducible.
 */

const COLORS: Record<Ingredient, string> = { metal: '#ddea9c', balloon: '#9be9df', pepper: '#f6a074' };
const DISPLAY = "Impact,'Arial Black','DejaVu Sans Condensed','Helvetica Neue',Arial,sans-serif";
const MONO = 'ui-monospace,Menlo,monospace';
const clampAlpha = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const HATCH_TOP = ARENA.launcher.y - 46;
/** Deterministic per-index noise; the renderer's own, never the game's. */
const hashed = (index: number) => {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};
const easeOut = (t: number) => 1 - (1 - clampAlpha(t)) ** 3;

/** The caption slot: the empty left third of the kitchen, clear of the creature at every size. */
const CAPTION = { x: 300, y: 238 };
/** Where the combo lives: just above the launcher's barrel, on the counter. */
const COMBO = { x: 332, y: 470 };
/** The belly bar, on the counter's front face directly under the creature. */
const BELLY = { y: 504, w: 330, h: 14 };

interface Particle {
  x: number; y: number; vx: number; vy: number; born: number; life: number;
  size: number; color: string; gravity: number; kind: 'dot' | 'spark' | 'dust' | 'ember';
}
interface Caption { text: string; color: string; born: number; life: number; priority: number; size: number; card: boolean }
interface Pop { x: number; y: number; text: string; color: string; born: number; size: number }
interface Ring { x: number; y: number; born: number; color: string; big: boolean }
interface Wobble { v: number; a: number }

export function createScene() {
  const kitchen = new Image(); kitchen.src = '/art/kitchen.png';
  const items = new Image(); items.src = '/art/ingredients.png';
  const cannon = new Image(); cannon.src = '/art/launcher.png';
  const masks = new Map<string, HTMLCanvasElement>();
  function masked(source: HTMLImageElement) {
    if (!source.complete || !source.naturalWidth) return null;
    if (masks.has(source.src)) return masks.get(source.src)!;
    const c = document.createElement('canvas'); c.width = source.naturalWidth; c.height = source.naturalHeight;
    const x = c.getContext('2d')!; x.drawImage(source, 0, 0);
    const data = x.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < data.data.length; i += 4) {
      const b = Math.max(data.data[i], data.data[i + 1], data.data[i + 2]);
      data.data[i + 3] = Math.round(Math.min(1, Math.max(0, (b - 34) / 28)) * 255);
    }
    x.putImageData(data, 0, 0); masks.set(source.src, c); return c;
  }

  // The creature rig is cut from the same painting, once, on the first frame
  // after it decodes. It is presentation only and keeps its own clock.
  let rig: CreatureRig | null = null;
  let rigFailed = false;
  const animator = new CreatureAnimator();
  let lastTime = -1;

  // ---- the juice state. All of it is derived from events, keyed on their ids.
  let seenEvent = 0;
  let seenRun = -1;
  let seenTick = -1;
  const particles: Particle[] = [];
  const pops: Pop[] = [];
  const rings: Ring[] = [];
  let caption: Caption | null = null;
  const wobble = new Map<string, Wobble>();
  let shake = 0;
  let freezeUntil = -1;
  let frozenAt = 0;
  let pulseAt = -10;
  let lastWorldTime = -1;

  let previewKey = ''; let guide: { x: number; y: number }[] = [];

  function item(ctx: CanvasRenderingContext2D, ingredient: Ingredient, x: number, y: number, size: number, rotation = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
    if (items.complete && items.naturalWidth) {
      const w = items.naturalWidth / 3; ctx.shadowColor = '#0008'; ctx.shadowBlur = 3;
      ctx.drawImage(masked(items) ?? items, w * FOODS.indexOf(ingredient), 0, w, items.naturalHeight, -size / 2, -size / 2, size, size);
    } else { ctx.fillStyle = COLORS[ingredient]; ctx.beginPath(); ctx.arc(0, 0, size * .2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  function burst(x: number, y: number, n: number, color: string, speed: number, time: number, kind: Particle['kind'] = 'dot', seed = 0, life = 0.7, gravity = 260) {
    for (let i = 0; i < n; i++) {
      const a = hashed(seed * 7 + i) * Math.PI * 2;
      const s = speed * (0.4 + hashed(seed * 11 + i) * 0.8);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.3, born: time, life: life * (0.6 + hashed(seed + i * 3) * 0.6), size: (kind === 'spark' ? 5 : 4) + hashed(seed * 5 + i) * 6, color, gravity, kind });
    }
    if (particles.length > 260) particles.splice(0, particles.length - 260);
  }

  function say(text: string, color: string, priority: number, time: number, size = 46, life = 1.2, card = false) {
    if (caption && time - caption.born < caption.life * 0.55 && caption.priority > priority) return;
    caption = { text, color, born: time, life, priority, size, card };
  }

  function nudge(name: string, amount: number) {
    const w = wobble.get(name) ?? { v: 0, a: 0 };
    w.v += amount; wobble.set(name, w);
  }

  /** Turns the rules' new events into particles, pops, captions and shakes. */
  function ingest(state: ArcadeState, time: number, reduced: boolean) {
    if (state.seed !== seenRun || state.tick < seenTick) {
      // A new run, or one we have never seen: start from here rather than
      // replaying its whole history into the screen.
      seenRun = state.seed; particles.length = 0; pops.length = 0; rings.length = 0; caption = null; shake = 0; wobble.clear();
      seenEvent = Math.max(0, (state.events[state.events.length - 1]?.id ?? 0) - 1);
      if (state.tick < 2) seenEvent = 0;
    }
    seenTick = state.tick;
    for (const e of state.events) {
      if (e.id <= seenEvent) continue;
      seenEvent = e.id;
      // Only what just happened. A late-arriving event (the harness fast
      // forwards) would otherwise fire its burst seconds after the fact.
      if (state.tick - e.tick > 12) continue;
      const tint = e.ingredient ? COLORS[e.ingredient] : '#eef6c8';
      switch (e.type) {
        case 'feed': {
          burst(e.x, e.y, reduced ? 8 : 18, tint, 260, time, 'dot', e.id, 0.8);
          burst(e.x, e.y, reduced ? 4 : 10, '#fff7d6', 300, time, 'spark', e.id + 1, 0.5);
          const value = e.value ?? 0;
          pops.push({ x: e.x, y: e.y - 30, text: `+${value}`, color: e.craved ? '#ffe28a' : '#e7ffb0', born: time, size: clamp(22 + value / 40, 22, 64) });
          const stuffed = e.label.startsWith('STUFFED');
          say(e.craved ? 'THAT ONE. YES.' : stuffed ? 'STUFFED.' : 'NOM.', e.craved ? '#ffe28a' : '#e7ffb0', e.craved ? 3 : 2, time, e.craved ? 48 : 44, 0.9);
          if (!reduced) { freezeUntil = time + 0.05; frozenAt = time; }
          break;
        }
        case 'bank':
          say(e.label, '#ffd36a', 4, time, 54, 1.3);
          burst(e.x, e.y, reduced ? 4 : 10, '#ffd36a', 200, time, 'spark', e.id, 0.6);
          break;
        case 'bounce': {
          const surface = e.name ?? 'floor';
          const credited = (e.value ?? 0) > 0 || surface === 'belly';
          rings.push({ x: e.x, y: e.y, born: time, color: surface === 'belly' ? '#9be9df' : credited ? '#ffd36a' : '#cdd8c4', big: credited });
          if (surface !== 'floor') nudge(surface, surface === 'lamp' ? 0.9 : 0.6);
          if (surface === 'floor') burst(e.x, ARENA.floor - 4, reduced ? 3 : 7, '#b9ae95', 70, time, 'dust', e.id, 0.5, 60);
          else burst(e.x, e.y, reduced ? 3 : 6, '#fff2c0', 150, time, 'spark', e.id, 0.35);
          break;
        }
        case 'clank':
          burst(e.x, e.y, reduced ? 4 : 9, '#dfe8ff', 220, time, 'spark', e.id, 0.35);
          say('CLANK.', '#cfd8e8', 2, time, 40, 0.7);
          if (!reduced) shake = Math.max(shake, 0.25);
          break;
        case 'miss':
          burst(e.x, ARENA.floor - 6, reduced ? 3 : 8, '#a8a08a', 60, time, 'dust', e.id, 0.6, 40);
          say('ON THE FLOOR.', '#d9c9a8', 1, time, 36, 0.8);
          break;
        case 'frenzy':
          if (e.name === 'start') {
            if (!reduced) shake = Math.max(shake, 1);
            burst(e.x, e.y, reduced ? 8 : 24, '#ffd36a', 260, time, 'spark', e.id, 0.8);
            burst(e.x, e.y, reduced ? 6 : 14, '#ff9a4a', 180, time, 'ember', e.id + 2, 1.1, 40);
          }
          break;
        case 'utensil':
          if (e.name === 'caught') {
            say('UTENSIL +500', '#dff2ff', 4, time, 50, 1.2);
            pops.push({ x: e.x, y: e.y - 30, text: `+${e.value ?? TUNING.utensilScore}`, color: '#dff2ff', born: time, size: 40 });
            burst(e.x, e.y, reduced ? 6 : 16, '#e8f4ff', 240, time, 'spark', e.id, 0.5);
            if (!reduced) { freezeUntil = time + 0.05; frozenAt = time; }
          } else burst(e.x, e.y, reduced ? 2 : 5, '#cfe0ea', 90, time, 'spark', e.id, 0.4);
          break;
        case 'cooked':
          say('COOKED', '#ffb060', 3, time, 44, 0.9);
          burst(e.x, e.y, reduced ? 3 : 8, '#ffb060', 120, time, 'ember', e.id, 0.6, -40);
          break;
        case 'fire':
          if (e.name === 'start') { say('IT IS ON FIRE.', '#ff8a4a', 5, time, 52, 1.5); burst(e.x, ARENA.floor, reduced ? 6 : 18, '#ffb060', 180, time, 'ember', e.id, 0.9, -60); }
          break;
        case 'flame':
          if (e.name === 'tell') say('IT INHALES', '#ffb88a', 3, time, 40, 0.8);
          else { say('FIRE BREATH', '#ff9a4a', 4, time, 54, 1.0); if (!reduced) shake = Math.max(shake, 0.4); }
          break;
        case 'jam':
          say(e.label, '#ff8a6a', 4, time, 44, 1.1);
          burst(ARENA.launcher.x, ARENA.launcher.y - 10, reduced ? 4 : 10, e.name === 'singe' ? '#ffa060' : '#dfe8ff', 150, time, 'spark', e.id, 0.5);
          if (!reduced) shake = Math.max(shake, 0.3);
          break;
        case 'grow':
          say('BIGGER.', '#f1ffc8', 6, time, 70, 1.3, true);
          pulseAt = time;
          if (!reduced) shake = Math.max(shake, 0.35);
          break;
        case 'mutation':
          say(e.label, tint, 7, time, 58, 1.7, true);
          burst(e.x, e.y, reduced ? 10 : 28, tint, 260, time, 'dot', e.id, 1.0);
          if (!reduced) shake = Math.max(shake, 0.5);
          break;
        case 'craving':
          if (e.name === 'start' && e.ingredient) say(`IT WANTS ${e.ingredient === 'metal' ? 'TIN' : e.ingredient === 'balloon' ? 'AIR' : 'PEPPER'}.`, tint, 2, time, 42, 1.1);
          break;
        case 'tantrum':
          say('TANTRUM.', '#ff8a6a', 5, time, 56, 1.2);
          if (!reduced) shake = Math.max(shake, 0.8);
          break;
        case 'beat': {
          const text = e.name === 'sneeze' ? 'SNEEZE.' : e.name === 'drool' ? 'DROOL.' : e.name === 'lunge' ? 'IT IS COMING OUT.' : e.label + (e.label.endsWith('.') ? '' : '.');
          say(text, e.name === 'lunge' || e.name === 'bite' ? '#ff9a6a' : '#e7ffb0', e.name === 'bite' ? 5 : 3, time, 44, 1.1);
          if (e.name === 'bite' && !reduced) shake = Math.max(shake, 0.6);
          break;
        }
        case 'launch':
          burst(e.x, e.y, reduced ? 1 : 3, '#fff2c0', 90, time, 'spark', e.id, 0.25);
          break;
        default:
          break;
      }
    }
    if (pops.length > 5) pops.splice(0, pops.length - 5);
  }

  // ---- props: the five kitchen bouncers, where the rules put them.
  function drawProps(ctx: CanvasRenderingContext2D, time: number, reduced: boolean, dt: number) {
    for (const b of ARENA.bouncers) {
      const w = wobble.get(b.name);
      let a = 0;
      if (w) {
        // A damped spring, in radians; reduced motion settles at once.
        if (reduced) { w.v = 0; w.a = 0; }
        else { w.v += (-w.a * 60 - w.v * 4) * dt; w.a += w.v * dt; }
        a = w.a;
        if (Math.abs(w.a) < 0.002 && Math.abs(w.v) < 0.01) wobble.delete(b.name);
      }
      drawProp(ctx, b, a, time, reduced);
    }
  }

  function drawProp(ctx: CanvasRenderingContext2D, b: Bouncer, swing: number, time: number, reduced: boolean) {
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (b.kind === 'circle' && b.name === 'pan') {
      // A frying pan hanging face-on from a cord, swinging about its hook.
      ctx.translate(b.x, 0); ctx.rotate(swing * 0.35); ctx.translate(-b.x, 0);
      ctx.strokeStyle = '#1b2422'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(b.x, 0); ctx.lineTo(b.x, b.y - b.r); ctx.stroke();
      ctx.strokeStyle = '#6c7568'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(b.x, 0); ctx.lineTo(b.x, b.y - b.r); ctx.stroke();
      const steel = ctx.createRadialGradient(b.x - 10, b.y - 12, 4, b.x, b.y, b.r);
      steel.addColorStop(0, '#5d6964'); steel.addColorStop(0.55, '#2b3431'); steel.addColorStop(1, '#141a19');
      ctx.fillStyle = steel; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8f9a90'; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = '#cfd8cc'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 4, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
      // Handle, out to the right.
      ctx.fillStyle = '#1e2624'; ctx.strokeStyle = '#8f9a90'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(b.x + b.r - 2, b.y - 5, 46, 10, 5); ctx.fill(); ctx.stroke();
    } else if (b.kind === 'circle' && b.name === 'lamp') {
      // A caged pendant lamp, lit. It is worth two banks, so it glows.
      ctx.translate(b.x, 0); ctx.rotate(swing * 0.5); ctx.translate(-b.x, 0);
      ctx.strokeStyle = '#1b2422'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x, 0); ctx.lineTo(b.x, b.y - b.r + 4); ctx.stroke();
      const glow = ctx.createRadialGradient(b.x, b.y + 4, 4, b.x, b.y + 4, b.r * 2.6);
      const flick = reduced ? 1 : 0.9 + 0.1 * Math.sin(time * 11);
      glow.addColorStop(0, `rgba(255,214,140,${0.55 * flick})`); glow.addColorStop(0.5, 'rgba(255,170,80,0.18)'); glow.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(b.x, b.y + 4, b.r * 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a3330'; ctx.strokeStyle = '#9aa69c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(b.x - 8, b.y - b.r + 2); ctx.lineTo(b.x + 8, b.y - b.r + 2); ctx.lineTo(b.x + b.r, b.y - 2); ctx.lineTo(b.x - b.r, b.y - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = `rgba(255,232,170,${0.85 * flick})`; ctx.beginPath(); ctx.ellipse(b.x, b.y + 6, b.r * 0.55, b.r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a7b2a6'; ctx.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(b.x + i * 9, b.y - 2); ctx.lineTo(b.x + i * 6, b.y + b.r - 2); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(b.x, b.y + b.r - 2, b.r * 0.52, 4, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (b.kind === 'circle') {
      // The pot on the counter: it rattles rather than swings.
      ctx.translate(b.x, b.y + b.r); ctx.rotate(swing * 0.18); ctx.translate(-b.x, -(b.y + b.r));
      const body = ctx.createLinearGradient(b.x - b.r, 0, b.x + b.r, 0);
      body.addColorStop(0, '#1a2321'); body.addColorStop(0.35, '#50605a'); body.addColorStop(0.6, '#2d3834'); body.addColorStop(1, '#111817');
      ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect(b.x - b.r + 3, b.y - b.r + 8, b.r * 2 - 6, b.r * 2 - 8, [4, 4, 10, 10]); ctx.fill();
      ctx.strokeStyle = '#8f9a90'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#39443f'; ctx.beginPath(); ctx.ellipse(b.x, b.y - b.r + 8, b.r, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#b9c3b8'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.strokeStyle = '#8f9a90'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x - b.r + 1, b.y - 2, 9, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(b.x + b.r - 1, b.y - 2, 9, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    } else if (b.name === 'shelf') {
      // A plank on two brackets. It bounces rather than swings.
      ctx.translate(0, swing * 6);
      ctx.fillStyle = '#2b2a22'; ctx.strokeStyle = '#9a9276'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(b.x1, b.y1 - 2, b.x2 - b.x1, 9, 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#d6cfae'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(b.x1 + 4, b.y1 - 1); ctx.lineTo(b.x2 - 4, b.y1 - 1); ctx.stroke();
      ctx.strokeStyle = '#6c7568'; ctx.lineWidth = 3;
      for (const x of [b.x1 + 22, b.x2 - 22]) { ctx.beginPath(); ctx.moveTo(x, b.y1 + 7); ctx.lineTo(x, b.y1 + 26); ctx.lineTo(x - 14, b.y1 + 7); ctx.stroke(); }
      // Two jars, so the plank reads as a shelf and not a bar.
      ctx.fillStyle = '#3d4a3a'; ctx.strokeStyle = '#9fb08e'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.roundRect(b.x1 + 36, b.y1 - 26, 18, 24, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4a3a2e'; ctx.strokeStyle = '#c9a070';
      ctx.beginPath(); ctx.roundRect(b.x1 + 72, b.y1 - 20, 24, 18, 3); ctx.fill(); ctx.stroke();
    } else {
      // The chain, hanging from the ceiling, a hook on its end.
      ctx.translate(b.x1, 0); ctx.rotate(swing * 0.3); ctx.translate(-b.x1, 0);
      ctx.strokeStyle = '#121917'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      ctx.strokeStyle = '#9aa69c'; ctx.lineWidth = 2;
      for (let y = b.y1 + 6; y < b.y2; y += 14) {
        const wide = Math.round(y / 14) % 2 === 0;
        ctx.beginPath(); ctx.ellipse(b.x1, y, wide ? 5 : 2.5, 7, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.strokeStyle = '#b9c3b8'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(b.x2 + 7, b.y2 + 10, 9, Math.PI * 1.5, Math.PI * 0.75); ctx.stroke();
    }
    ctx.restore();
  }

  // ---- the flame: the tell, then the cone.
  function drawFlame(ctx: CanvasRenderingContext2D, state: ArcadeState, time: number, reduced: boolean) {
    const cone = flameCone(state);
    if (!cone) return;
    const { x, y, angle, half, length, telling } = cone;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle);
    if (telling) {
      // Where it is about to go, faintly, and the air being pulled in.
      const left = Math.max(0, (state.flame!.tellUntil - state.tick) / TUNING.flameTell);
      ctx.globalAlpha = 0.25 + 0.35 * (1 - left);
      ctx.setLineDash([10, 12]); ctx.strokeStyle = '#ff9a4a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(half) * length, Math.sin(half) * length);
      ctx.arc(0, 0, length, half, -half, true); ctx.closePath(); ctx.stroke();
      ctx.setLineDash([]);
      const n = reduced ? 4 : 8;
      for (let i = 0; i < n; i++) {
        const f = ((reduced ? 0.5 : time * 1.6) + i / n) % 1;
        const a = (hashed(i) - 0.5) * half * 1.6;
        const r = length * (1 - f) * 0.9;
        ctx.globalAlpha = 0.5 * f;
        ctx.strokeStyle = '#ffd0a0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a) * (r - 26), Math.sin(a) * (r - 26)); ctx.stroke();
      }
    } else {
      const left = clampAlpha((state.flame!.until - state.tick) / TUNING.flameTicks);
      const strength = Math.min(1, left * 2.5) * Math.min(1, (1 - left) * 6 + 0.35);
      ctx.globalCompositeOperation = 'screen';
      const fire = ctx.createLinearGradient(0, 0, length, 0);
      fire.addColorStop(0, `rgba(255,246,210,${0.95 * strength})`);
      fire.addColorStop(0.22, `rgba(255,190,80,${0.9 * strength})`);
      fire.addColorStop(0.6, `rgba(255,110,30,${0.6 * strength})`);
      fire.addColorStop(1, 'rgba(220,60,10,0)');
      ctx.fillStyle = fire;
      ctx.beginPath(); ctx.moveTo(0, 0);
      // A ragged far edge: tongues, not a geometry diagram.
      const steps = reduced ? 6 : 14;
      for (let i = 0; i <= steps; i++) {
        const a = half - (i / steps) * half * 2;
        const flick = reduced ? 1 : 0.84 + 0.16 * Math.sin(time * 23 + i * 1.7) * Math.sin(time * 13 + i);
        ctx.lineTo(Math.cos(a) * length * flick, Math.sin(a) * length * flick);
      }
      ctx.closePath(); ctx.fill();
      // Hot core.
      ctx.globalAlpha = 0.8 * strength;
      const core = ctx.createLinearGradient(0, 0, length * 0.6, 0);
      core.addColorStop(0, 'rgba(255,255,235,0.9)'); core.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(half * 0.45) * length * 0.6, Math.sin(half * 0.45) * length * 0.6);
      ctx.lineTo(Math.cos(-half * 0.45) * length * 0.6, Math.sin(-half * 0.45) * length * 0.6); ctx.closePath(); ctx.fill();
      // Embers riding the breath.
      ctx.globalAlpha = strength;
      for (let i = 0; i < (reduced ? 3 : 9); i++) {
        const f = ((reduced ? 0.4 : time * 2.4) + i * 0.17) % 1;
        const a = (hashed(i * 3) - 0.5) * half * 1.4;
        ctx.fillStyle = i % 2 ? '#fff0b0' : '#ffb060';
        ctx.beginPath(); ctx.arc(Math.cos(a) * length * f, Math.sin(a) * length * f + Math.sin(time * 9 + i) * 4, 3 - f * 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---- the bench fire along the floor.
  function drawBenchFire(ctx: CanvasRenderingContext2D, state: ArcadeState, time: number, reduced: boolean) {
    const left = state.benchFireUntil - state.tick;
    if (left <= 0) return;
    const life = clampAlpha(left / 40) * clampAlpha((TUNING.benchFireTicks - left) / 20 + 0.2);
    const { from, to } = ARENA.bench; const y = ARENA.floor;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    // The glow on the counter.
    const glow = ctx.createLinearGradient(0, y - 90, 0, y + 10);
    glow.addColorStop(0, 'rgba(255,120,40,0)'); glow.addColorStop(1, `rgba(255,140,50,${0.35 * life})`);
    ctx.fillStyle = glow; ctx.fillRect(from - 30, y - 90, to - from + 60, 100);
    const n = reduced ? 9 : 15;
    for (let i = 0; i < n; i++) {
      const x = from + 20 + (i + 0.5) * (to - from - 40) / n + (reduced ? 0 : Math.sin(time * 5 + i * 2.1) * 6);
      const h = (34 + hashed(i) * 30) * life * (reduced ? 1 : 0.75 + 0.25 * Math.sin(time * 14 + i * 1.3) * Math.sin(time * 7 + i));
      const w = 16 + hashed(i * 5) * 12;
      const flame = ctx.createLinearGradient(0, y, 0, y - h);
      flame.addColorStop(0, 'rgba(255,230,150,0.95)'); flame.addColorStop(0.45, 'rgba(255,140,40,0.85)'); flame.addColorStop(1, 'rgba(255,60,10,0)');
      ctx.fillStyle = flame;
      ctx.beginPath(); ctx.moveTo(x - w / 2, y + 2);
      ctx.quadraticCurveTo(x - w * 0.6, y - h * 0.45, x + (reduced ? 0 : Math.sin(time * 6 + i) * 5), y - h);
      ctx.quadraticCurveTo(x + w * 0.6, y - h * 0.45, x + w / 2, y + 2); ctx.closePath(); ctx.fill();
    }
    // Smoke.
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < (reduced ? 3 : 7); i++) {
      const f = ((reduced ? 0.5 : time * 0.55) + i * 0.14) % 1;
      const x = from + 60 + hashed(i * 9) * (to - from - 120) + f * 30;
      const r = 14 + f * 36;
      ctx.globalAlpha = 0.28 * life * (1 - f);
      ctx.fillStyle = '#3a3b36';
      ctx.beginPath(); ctx.arc(x, y - 40 - f * 150, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawUtensil(ctx: CanvasRenderingContext2D, p: Projectile, time: number, reduced: boolean, mouth: { x: number; y: number }) {
    // Three shapes, chosen by id, so a storm has forks and spoons and knives in
    // it, each with a motion trail so it reads as flying metal and not a smudge.
    const kind = p.id % 3;
    const rot = p.age * 0.11 + p.id;
    ctx.save();
    if (p.assisted) {
      ctx.strokeStyle = 'rgba(221,234,156,0.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 8]);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo((p.x + mouth.x) / 2, Math.min(p.y, mouth.y) - 40, mouth.x, mouth.y); ctx.stroke();
      ctx.setLineDash([]);
    }
    for (let g = reduced ? 0 : 3; g >= 0; g--) {
      const back = g * 2.2;
      ctx.save();
      ctx.globalAlpha = g === 0 ? 1 : 0.22 - g * 0.05;
      ctx.translate(p.x - p.vx * back, p.y - p.vy * back); ctx.rotate(rot - g * 0.12);
      ctx.fillStyle = '#d7e1dc'; ctx.strokeStyle = '#303b38'; ctx.lineWidth = 1.5;
      if (kind === 0) {
        ctx.beginPath(); ctx.roundRect(-22, -2.5, 30, 5, 2.5); ctx.fill(); ctx.stroke();
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.roundRect(6, k * 4.5 - 1.5, 16, 3, 1.5); ctx.fill(); ctx.stroke(); }
      } else if (kind === 1) {
        ctx.beginPath(); ctx.roundRect(-22, -2.5, 30, 5, 2.5); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(14, 0, 9, 6.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.roundRect(-22, -3, 18, 6, 3); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-4, -4.5); ctx.lineTo(22, -2); ctx.lineTo(22, 1.5); ctx.lineTo(-4, 4.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      if (g === 0) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-18, -1); ctx.lineTo(4, -1); ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawFood(ctx: CanvasRenderingContext2D, p: Projectile, time: number, reduced: boolean) {
    const tint = COLORS[p.ingredient];
    ctx.save();
    if (p.spent) ctx.globalAlpha = 0.55;
    // A dark snack crossing the dark half of the room disappears at stream
    // bitrate, so it carries its own light.
    const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 42);
    glow.addColorStop(0, `${tint}66`); glow.addColorStop(.45, `${tint}22`); glow.addColorStop(1, `${tint}00`);
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, 42, 0, Math.PI * 2); ctx.fill();
    if (p.cooked) {
      // On fire: a trail of flame behind it and a halo on it.
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < (reduced ? 3 : 6); i++) {
        const back = (i + 1) * 1.6;
        const r = 16 - i * 2 + (reduced ? 0 : Math.sin(time * 19 + i) * 2);
        const f = ctx.createRadialGradient(p.x - p.vx * back, p.y - p.vy * back, 1, p.x - p.vx * back, p.y - p.vy * back, r);
        f.addColorStop(0, 'rgba(255,240,170,0.9)'); f.addColorStop(0.5, 'rgba(255,140,40,0.55)'); f.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = f; ctx.beginPath(); ctx.arc(p.x - p.vx * back, p.y - p.vy * back, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    // The serving carries a dark halo, a bright tail in its own colour and a ring.
    ctx.strokeStyle = 'rgba(4,12,10,0.5)'; ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x - p.vx * 3.4, p.y - p.vy * 3.4); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.strokeStyle = p.cooked ? '#ffb060' : tint; ctx.globalAlpha *= .6; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(p.x - p.vx * 3.2, p.y - p.vy * 3.2); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.globalAlpha = p.spent ? 0.5 : .95; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x - p.vx * 1.6, p.y - p.vy * 1.6); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.globalAlpha = p.spent ? 0.4 : .85; ctx.lineWidth = 2.5;
    if (p.bank > 0) { ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 3.5; }
    ctx.beginPath(); ctx.arc(p.x, p.y, 25, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    item(ctx, p.ingredient, p.x, p.y, 52, reduced ? 0 : p.age * .065);
  }

  function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, alpha: number, font = DISPLAY, align: CanvasTextAlign = 'center', outline = 6) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${font === DISPLAY ? '700' : '800'} ${size}px ${font}`;
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(4,10,9,0.9)'; ctx.lineWidth = outline;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
    ctx.restore();
  }

  function draw(ctx: CanvasRenderingContext2D, width: number, height: number, state: ArcadeState | null, angle: number, selected: Ingredient, playing: boolean, reduced: boolean, time: number, guideSteps = 0) {
    const charge = state?.charge ?? 0; const power = ARENA.minPower + (ARENA.maxPower - ARENA.minPower) * charge;
    ctx.setTransform(width / 1200, 0, 0, height / 700, 0, 0); ctx.clearRect(0, 0, 1200, 700);
    const delta = lastTime < 0 ? 1 / 60 : Math.min(0.05, Math.max(0.0005, time - lastTime)); lastTime = time;
    const tick = state?.tick ?? 0;
    const shown = playing || (state != null && state.phase !== 'playing');
    const levels = shown ? state?.mutations : null; const creature = shown ? state?.creature : null;
    const frenzy = playing && state ? inFrenzy(state) : false;
    if (playing && state) ingest(state, time, reduced);
    // Hit-stop: the whole picture holds for three frames after a catch. The
    // simulation is held by the page's frame scheduler; this holds the paint.
    const frozen = time < freezeUntil;
    const t = frozen ? frozenAt : time;
    const dt = frozen ? 0 : delta;
    lastWorldTime = t;

    // Rumble: a frenzy, a tantrum, a bite. Never under reduced motion.
    if (!reduced) shake = Math.max(0, shake - dt * 2.2);
    else shake = 0;
    const rumble = frenzy && !reduced ? 0.22 : 0;
    const amp = (shake + rumble) * 9;
    const sx = amp ? Math.sin(t * 61) * amp : 0; const sy = amp ? Math.sin(t * 47 + 1.3) * amp * 0.7 : 0;
    ctx.save();
    ctx.translate(sx, sy);

    if (kitchen.complete && kitchen.naturalWidth) {
      if (!rig && !rigFailed) { try { rig = buildRig(kitchen); } catch { rigFailed = true; } }
      // The kitchen without the creature, then the creature on it.
      ctx.drawImage(rig ? rig.backdrop : kitchen, 0, 0, 1200, 700);
      if (rig) {
        const pose = animator.step(state, playing, reduced, t, dt, !(DEV_HOOKS && devRender.holdBlink));
        if (DEV_HOOKS) { frameCells.count = 0; frameCells.skipped = 0; }
        const rigStart = DEV_HOOKS ? performance.now() : 0;
        drawCreature(ctx, rig, pose, t, reduced);
        if (DEV_HOOKS) devRender.profile.rig += performance.now() - rigStart;
      }
    }
    // The left vignette reaches transparent at x=800.
    const shade = ctx.createLinearGradient(0, 0, 800, 0); shade.addColorStop(0, playing ? '#06121255' : '#061212bb'); shade.addColorStop(1, '#06121200'); ctx.fillStyle = shade; ctx.fillRect(0, 0, 800, 700);
    if (!reduced) { ctx.save(); for (let i = 0; i < 22; i++) { const x = (i * 131.3 + t * (3 + i % 4)) % 1200; const y = 110 + (i * 79.7 - t * (4 + i % 3)) % 510; ctx.fillStyle = i % 3 === 0 ? '#f4c88c35' : '#d6ecd21b'; ctx.beginPath(); ctx.arc(x, y, 1 + i % 2, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }

    // The kitchen's bouncers, there for the whole shift: they are the playground.
    if (playing) drawProps(ctx, t, reduced, dt);

    if (playing && state && guideSteps > 0 && !(DEV_HOOKS && devRender.hideAim)) {
      // The dotted guide is a first-shift aid and then it is gone.
      const key = `${Math.floor(tick / 12)}-${angle}-${selected}-${power}`;
      if (key !== previewKey) { guide = previewFlight(state, selected, angle, power, 96).points; previewKey = key; }
      const dots = guide.slice(0, guideSteps);
      dots.forEach((p, i) => { ctx.fillStyle = `rgba(224,244,190,${.85 - i / Math.max(1, dots.length) * .55})`; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.3, 3 - i * .12), 0, Math.PI * 2); ctx.fill(); });
    }
    // The target ring is the collision ellipse, drawn where it actually is: it
    // grows, leans and rises with the creature, and it is only lit while the
    // mouth is open. In a frenzy it gapes and runs hot.
    if (playing && state && !(DEV_HOOKS && devRender.hideAim)) {
      const c = state.creature; const taking = c.open >= 0.5 || frenzy;
      const gape = c.gape ?? 1;
      ctx.save();
      ctx.lineWidth = 1; ctx.setLineDash([5, 12]); ctx.strokeStyle = '#eff4bd2e';
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx * gape, c.ry * gape, 0, 0, Math.PI * 2); ctx.stroke();
      const gap = frenzy ? 1 : Math.max(.3, c.open);
      ctx.setLineDash([]);
      if (taking) {
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(6,16,14,0.55)';
        ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx * gape, c.ry * gape * gap, 0, 0, Math.PI * 2); ctx.stroke();
      }
      const pulse = reduced ? 0 : Math.abs(Math.sin(t * (frenzy ? 8 : 5)));
      ctx.lineWidth = taking ? (frenzy ? 4.5 : 3) : 1.2;
      ctx.strokeStyle = taking ? (frenzy ? `rgba(255,211,106,${.8 + .2 * pulse})` : `rgba(216,248,150,${.72 + .2 * pulse})`) : '#eff4bd22';
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx * gape, c.ry * gape * gap, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    const hazard = playing && state ? getHazard(state.vent, tick) : null;
    if (hazard) {
      // The vent flap it bit off, swinging under the ceiling: a bank.
      ctx.save(); const { x, y, width: w, height: h, warning } = hazard;
      ctx.globalAlpha = warning ? 0.5 + 0.3 * (reduced ? 0 : Math.abs(Math.sin(t * 6))) : 0.95;
      ctx.fillStyle = '#1a2422'; ctx.strokeStyle = warning ? '#eea66d' : '#9fb0a0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#5c6a62'; ctx.lineWidth = 1; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x + 2, y + i * h / 5); ctx.lineTo(x + w - 2, y + i * h / 5); ctx.stroke(); }
      ctx.restore();
    }

    if (playing && state) { drawFlame(ctx, state, t, reduced); drawBenchFire(ctx, state, t, reduced); }

    if (levels && creature && playing) {
      ctx.save();
      if (levels.metal > 0) {
        // The pull, drawn as field lines reaching back into the room.
        const range = TUNING.magnetRange + TUNING.magnetRangePerLevel * levels.metal;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, creature.x - creature.rx * 0.5, 700); ctx.clip();
        ctx.strokeStyle = COLORS.metal; ctx.lineWidth = 2; ctx.setLineDash([9, 13]);
        const ringsN = reduced ? 2 : 4;
        for (let i = 0; i < ringsN; i++) {
          const r = 110 + ((reduced ? 90 : t * 40) + i * range / ringsN) % range;
          ctx.globalAlpha = .14 * levels.metal / 3 * (1 - (r - 110) / range);
          ctx.beginPath(); ctx.ellipse(creature.x, creature.y, r, r * .68, 0, Math.PI * .6, Math.PI * 1.4); ctx.stroke();
        }
        ctx.restore();
      }
      if (levels.balloon > 0) {
        // Rising air under a creature that is off the counter.
        ctx.strokeStyle = '#9cecdf'; ctx.lineWidth = 1.6;
        for (let i = 0; i < 8; i++) {
          const y = creature.y + 180 - ((reduced ? 110 : t * 64) + i * 40) % 250; const x = creature.x - 160 + i * 44;
          ctx.globalAlpha = .08 + creature.lift / 300; ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.quadraticCurveTo(x + 6, y + 10, x, y); ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Servings and cutlery in the air.
    if (playing && state) {
      const mouth = { x: state.creature.x, y: state.creature.y };
      for (const p of state.projectiles) {
        if (p.kind === 'junk') drawUtensil(ctx, p, t, reduced, mouth);
        else if (p.kind === 'food') drawFood(ctx, p, t, reduced);
      }
    }

    if (playing && state?.threat && state.threat.kind === 'lunge') {
      const th = state.threat; const near = clampAlpha((th.tick - tick) / 60);
      ctx.save(); ctx.globalAlpha = .35 + .4 * (reduced ? .6 : Math.abs(Math.sin(t * 9)));
      ctx.strokeStyle = '#ffb27a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ARENA.launcher.x, ARENA.launcher.y - 6, 50 + near * 22, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }

    if (playing) {
      const { x, y } = ARENA.launcher; const recoil = state ? Math.max(0, 1 - (tick - state.lastLaunchTick) / 12) * 9 : 0;
      ctx.save(); ctx.translate(x, y); ctx.shadowColor = '#0009'; ctx.shadowBlur = 20; ctx.fillStyle = '#071011'; ctx.beginPath(); ctx.ellipse(0, 42, 74, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      const base = ctx.createLinearGradient(0, 10, 0, 43); base.addColorStop(0, '#68776b'); base.addColorStop(.35, '#2b3c37'); base.addColorStop(1, '#10211f'); ctx.fillStyle = base; ctx.beginPath(); ctx.roundRect(-50, 12, 100, 35, 8); ctx.fill(); ctx.strokeStyle = '#465448'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#b6c980'; for (let i = 0; i < 4; i++) ctx.fillRect(-35 + i * 18, 34, 9, 3);
      const pivot = ctx.createRadialGradient(-5, 8, 2, 0, 13, 25); pivot.addColorStop(0, '#8b9275'); pivot.addColorStop(.3, '#4e6353'); pivot.addColorStop(1, '#0c211e'); ctx.fillStyle = pivot; ctx.beginPath(); ctx.arc(0, 13, 24, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#b5aa76'; ctx.beginPath(); ctx.arc(0, 13, 5, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(angle * Math.PI / 180); ctx.translate(-recoil, 0);
      if (cannon.complete && cannon.naturalWidth) { ctx.drawImage(masked(cannon) ?? cannon, 90, 360, 1100, 480, -64, -40, 140, 70); }
      // The charge, drawn along the barrel.
      if (charge > 0.01) {
        const len = 54 + charge * 86;
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = charge > 0.92 ? '#fff0a8' : '#dded92'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.globalAlpha = .35 + charge * .5; ctx.beginPath(); ctx.moveTo(64, 0); ctx.lineTo(64 + len, 0); ctx.stroke();
        ctx.lineWidth = 2; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(64 + len, 0, 5 + charge * 4, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      // The aim: a solid lance out of the muzzle with a crossbar at the power.
      const rad = angle * Math.PI / 180;
      const cooldown = state ? (frenzy ? ARENA.frenzyCooldownTicks : ARENA.cooldownTicks) : ARENA.cooldownTicks;
      const waitEnd = state ? Math.max(state.reloadUntil, state.lastLaunchTick + cooldown) : 0;
      const loaded = !state || tick >= waitEnd;
      const refill = state ? clampAlpha(1 - (waitEnd - tick) / cooldown) : 1;
      const notch = 78 + clampAlpha((power - ARENA.minPower) / (ARENA.maxPower - ARENA.minPower)) * 128;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rad); ctx.lineCap = 'round';
      ctx.globalAlpha = loaded ? .92 : .4; ctx.strokeStyle = loaded ? '#e0f4be' : '#7f8f6e'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(74, 0); ctx.lineTo(notch, 0); ctx.stroke();
      ctx.globalAlpha = loaded ? .4 : .18; ctx.lineWidth = 2; ctx.setLineDash([4, 10]);
      ctx.beginPath(); ctx.moveTo(notch, 0); ctx.lineTo(notch + 62, 0); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = loaded ? 1 : .45; ctx.lineWidth = 4;
      ctx.strokeStyle = charge > 0.92 ? '#fff0a8' : loaded ? '#dded92' : '#7f8f6e';
      ctx.beginPath(); ctx.moveTo(notch, -11); ctx.lineTo(notch, 11); ctx.stroke();
      ctx.restore();
      // The loaded serving sits in the breech whether or not it can be fired.
      const jammed = state ? tick < state.reloadUntil : false;
      ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
      if (!loaded) {
        ctx.fillStyle = '#06100dcc'; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = jammed ? '#6a3a30' : '#33422f'; ctx.lineWidth = 4.5;
        ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = jammed ? '#ff8a6a' : '#dded92'; ctx.globalAlpha = .9;
        ctx.beginPath(); ctx.arc(0, 0, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * refill); ctx.stroke();
      } else if (state && !reduced && tick - waitEnd < 15) {
        const pop = clampAlpha(1 - (tick - waitEnd) / 15);
        ctx.globalAlpha = pop * .85; ctx.strokeStyle = '#dded92'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(0, 0, 34 + (1 - pop) * 18, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      ctx.save(); ctx.globalAlpha = loaded ? 1 : .7;
      item(ctx, selected, x, y, loaded ? 47 : 40, rad);
      ctx.restore();
      if (jammed && state) {
        // What jammed it: a fork through the works, or smoke off a singe.
        const jam = [...state.events].reverse().find(e => e.type === 'jam');
        ctx.save();
        if (jam?.name === 'utensil') {
          ctx.translate(x + 18, y - 26); ctx.rotate(-0.9);
          ctx.fillStyle = '#d7e1dc'; ctx.strokeStyle = '#303b38'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.roundRect(-24, -2.5, 32, 5, 2.5); ctx.fill(); ctx.stroke();
          for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.roundRect(8, k * 4.5 - 1.5, 16, 3, 1.5); ctx.fill(); ctx.stroke(); }
          ctx.rotate(0.9); ctx.translate(-(x + 18), -(y - 26));
        }
        for (let i = 0; i < (reduced ? 2 : 5); i++) {
          const f = ((reduced ? 0.5 : t * 0.9) + i * 0.2) % 1;
          ctx.globalAlpha = 0.35 * (1 - f);
          ctx.fillStyle = jam?.name === 'singe' ? '#2a2420' : '#3a3f3a';
          ctx.beginPath(); ctx.arc(x + 10 + Math.sin(t * 2 + i) * 8, y - 30 - f * 70, 8 + f * 18, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }
    if (playing && state && state.tick < state.hatchClosedUntil) {
      // The hatch, down over the serving window.
      ctx.save(); const hx = ARENA.launcher.x; const tt = Math.min(1, (state.hatchClosedUntil - state.tick) / 10);
      const h = Math.max(0, 116 * tt); const top = HATCH_TOP - h;
      ctx.fillStyle = '#0b1414'; ctx.strokeStyle = '#9db08a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(hx - 104, top, 208, h, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1d2a24'; for (let i = 0; i < 6; i++) ctx.fillRect(hx - 94 + i * 33, top + 8, 24, Math.max(0, h - 16));
      if (h > 34) { ctx.fillStyle = '#dded92'; ctx.font = `700 16px 'Helvetica Neue',sans-serif`; ctx.textAlign = 'center'; ctx.fillText('HATCH SHUT', hx, top + h / 2 + 5); }
      ctx.restore();
    }
    // A missed snack stays on the floor for a moment.
    if (playing && state) {
      for (const e of state.events) {
        if (e.type !== 'miss' || tick - e.tick >= 65) continue; const age = tick - e.tick; const rest = Math.min(ARENA.floor - 4, e.y + age * 1.6);
        if (rest < ARENA.floor - 30) continue;
        ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, (70 - age) / 26));
        ctx.fillStyle = '#040908a0'; ctx.beginPath(); ctx.ellipse(e.x, rest + 12, 34, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.translate(e.x, rest); ctx.rotate(.42); ctx.scale(1, .72);
        item(ctx, e.ingredient ?? selected, 0, 0, 54); ctx.restore();
      }
    }

    // ---- juice. All of it belongs to the shift; the report screen gets none.
    if (!playing) { particles.length = 0; pops.length = 0; rings.length = 0; caption = null; }
    // Particles.
    if (particles.length) {
      ctx.save();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; const age = t - p.born;
        if (age < 0 || age > p.life) { particles.splice(i, 1); continue; }
        const f = age / p.life;
        const x = p.x + p.vx * age; const y = p.y + p.vy * age + p.gravity * age * age * 0.5;
        ctx.globalAlpha = (1 - f) * (p.kind === 'dust' ? 0.5 : 0.95);
        ctx.fillStyle = p.color;
        if (p.kind === 'spark') {
          ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, p.size * 0.6 * (1 - f)); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - p.vx * 0.05, y - (p.vy + p.gravity * age) * 0.05); ctx.stroke();
        } else {
          const r = p.kind === 'dust' ? p.size * (1 + f * 3) : p.kind === 'ember' ? p.size * (1 - f * 0.5) : p.size * (1 - f * 0.6);
          ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }
    // Bounce rings: a flash at the contact point.
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; const age = t - r.born; const life = r.big ? 0.45 : 0.3;
      if (age > life) { rings.splice(i, 1); continue; }
      const f = easeOut(age / life);
      ctx.save(); ctx.globalAlpha = 1 - f;
      ctx.strokeStyle = r.color; ctx.lineWidth = (r.big ? 6 : 4) * (1 - f) + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, (reduced ? 24 : 10 + f * (r.big ? 48 : 30)), 0, Math.PI * 2); ctx.stroke();
      if (r.big) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * (1 - f); ctx.beginPath(); ctx.arc(r.x, r.y, reduced ? 14 : 4 + f * 26, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
    // Score pops, scaled by value.
    if (!(DEV_HOOKS && devRender.hideLabels)) {
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i]; const age = t - p.born; const life = 0.9;
        if (age > life) { pops.splice(i, 1); continue; }
        const f = age / life; const rise = reduced ? 0 : easeOut(f) * 46;
        const grow = reduced ? 1 : 1 + 0.5 * Math.exp(-age * 9);
        drawText(ctx, p.text, clamp(p.x, 60, 1140), Math.max(70, p.y) - rise, p.size * grow, p.color, f < 0.7 ? 1 : (1 - f) / 0.3, MONO, 'center', 5);
      }
    }

    // The craving ring: what it wants, drawn by the creature, with the time
    // left as a shrinking arc. Bigger than before.
    if (playing && state && state.craving) {
      const c = state.creature; const cr = state.craving;
      const span = Math.max(1, cr.endsAt - cr.startedAt);
      const left = Math.max(0, Math.min(1, (cr.endsAt - tick) / span));
      const bx = Math.min(1120, c.x + c.rx * (c.gape ?? 1) * 0.92 + 66); const by = Math.max(118, c.y - c.ry - 76);
      const urgent = left < 0.3;
      ctx.save();
      ctx.globalAlpha = urgent && !reduced ? .82 + .18 * Math.sin(t * 11) : .94;
      ctx.fillStyle = '#08100fe8'; ctx.strokeStyle = urgent ? '#eea66d' : '#b9cf8e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(bx, by, 54, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#1f2a22'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(bx, by, 44, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = urgent ? '#eea66d' : '#dded92'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(bx, by, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.stroke();
      ctx.restore();
      item(ctx, cr.ingredient, bx, by, 58);
      drawText(ctx, 'IT WANTS', bx, by - 66, 15, urgent ? '#ffc698' : '#dfe9cb', 1, MONO, 'center', 4);
    }

    // ONE slim belly bar directly under the creature. No numbers.
    if (playing && state) {
      const c = state.creature;
      const fullness = clampAlpha(state.hunger / 100);
      const x = clamp(c.x, 420 + BELLY.w / 2, 1180 - BELLY.w / 2) - BELLY.w / 2; const y = BELLY.y;
      const low = fullness < 0.25;
      const blink = low ? (reduced ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * 2.5))) : 1;
      ctx.save();
      ctx.fillStyle = '#05090999'; ctx.beginPath(); ctx.roundRect(x - 6, y - 6, BELLY.w + 12, BELLY.h + 12, 10); ctx.fill();
      ctx.fillStyle = '#101a16'; ctx.beginPath(); ctx.roundRect(x, y, BELLY.w, BELLY.h, 7); ctx.fill();
      const fill = low ? `rgba(255,96,70,${blink})` : fullness < 0.45 ? '#eea66d' : '#cdec7a';
      ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, Math.max(8, BELLY.w * fullness), BELLY.h, 7); ctx.fill();
      ctx.strokeStyle = low ? `rgba(255,120,90,${blink})` : '#5d6b5566'; ctx.lineWidth = low ? 2.5 : 1;
      ctx.beginPath(); ctx.roundRect(x, y, BELLY.w, BELLY.h, 7); ctx.stroke();
      ctx.restore();
    }

    // The combo by the launcher, growing with the combo, and the FRENZY banner
    // it turns into.
    if (playing && state && !(DEV_HOOKS && devRender.hideLabels)) {
      if (frenzy) {
        const left = clampAlpha((state.frenzyUntil - tick) / TUNING.frenzyTicks);
        const beat = reduced ? 1 : 1 + 0.06 * Math.sin(t * Math.PI * 2 * 2.6);
        ctx.save();
        ctx.translate(CAPTION.x, 118); ctx.scale(beat, beat);
        ctx.font = `700 92px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(60,14,4,0.95)'; ctx.lineWidth = 12; ctx.strokeText('FRENZY', 0, 0);
        const hot = ctx.createLinearGradient(0, -40, 0, 40); hot.addColorStop(0, '#fff2b0'); hot.addColorStop(0.5, '#ffb347'); hot.addColorStop(1, '#ff6a2a');
        ctx.fillStyle = hot; ctx.fillText('FRENZY', 0, 0);
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#2a1408'; ctx.beginPath(); ctx.roundRect(CAPTION.x - 150, 168, 300, 8, 4); ctx.fill();
        ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.roundRect(CAPTION.x - 150, 168, Math.max(6, 300 * left), 8, 4); ctx.fill();
        ctx.restore();
      } else if (state.combo > 0) {
        const n = state.combo;
        const last = [...state.events].reverse().find(e => e.type === 'feed');
        const since = last ? (tick - last.tick) / 60 : 9;
        const bump = reduced ? 1 : 1 + 0.35 * Math.exp(-since * 7);
        const size = clamp(30 + n * 9, 30, 72) * bump;
        const heat = clampAlpha((n - 1) / (TUNING.frenzyAt - 1));
        const color = n >= TUNING.frenzyAt - 1 ? '#ffd36a' : heat > 0.5 ? '#f1ffa8' : '#d8f896';
        drawText(ctx, `×${n}`, COMBO.x, COMBO.y, size, color, 1, DISPLAY, 'center', 7);
        drawText(ctx, 'COMBO', COMBO.x, COMBO.y - size * 0.62 - 6, 13, '#b9c6ae', 1, MONO, 'center', 4);
      }
    }

    // The one caption.
    if (caption && !(DEV_HOOKS && devRender.hideLabels)) {
      const age = t - caption.born;
      if (age > caption.life) caption = null;
      else {
        const f = age / caption.life;
        const inA = reduced ? 1 : easeOut(age / 0.12);
        const alpha = f > 0.78 ? (1 - f) / 0.22 : 1;
        const scale = reduced ? 1 : 0.6 + 0.4 * inA + (caption.card ? 0.08 * Math.exp(-age * 6) : 0);
        ctx.save();
        ctx.translate(CAPTION.x, CAPTION.y + (caption.card ? -10 : 0)); ctx.scale(scale, scale);
        if (caption.card) {
          ctx.globalAlpha = alpha;
          ctx.font = `700 ${caption.size}px ${DISPLAY}`;
          const w = ctx.measureText(caption.text).width + 56;
          ctx.fillStyle = '#060e0cf0'; ctx.strokeStyle = caption.color; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.roundRect(-w / 2, -caption.size * 0.72, w, caption.size * 1.44, 12); ctx.fill(); ctx.stroke();
        }
        drawText(ctx, caption.text, 0, 0, caption.size, caption.color, alpha, DISPLAY, 'center', caption.card ? 0 : 8);
        ctx.restore();
      }
    }

    ctx.restore(); // shake

    // ---- full-frame overlays, outside the shake.
    // Growth pulse: a ring from the creature to the edges, and a flash.
    if (playing && state) {
      const age = t - pulseAt;
      if (age >= 0 && age < 0.7) {
        const f = easeOut(age / 0.7);
        ctx.save();
        ctx.globalAlpha = (1 - f) * 0.9;
        ctx.strokeStyle = '#f1ffc8'; ctx.lineWidth = 14 * (1 - f) + 2;
        const c = state.creature;
        ctx.beginPath(); ctx.ellipse(c.x, c.y + 60, reduced ? 420 : 120 + f * 900, reduced ? 300 : 80 + f * 640, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = (1 - f) * 0.14;
        ctx.fillStyle = '#f1ffc8'; ctx.fillRect(0, 0, 1200, 700);
        ctx.restore();
      }
      // Irritation: a red vignette above 70. Frenzy: a warm one.
      const rage = clampAlpha((state.rage - 70) / 30);
      if (rage > 0 || frenzy) {
        ctx.save();
        const v = ctx.createRadialGradient(600, 350, 320, 600, 350, 760);
        if (frenzy) { v.addColorStop(0, 'rgba(255,150,50,0)'); v.addColorStop(1, 'rgba(255,120,30,0.42)'); }
        else { v.addColorStop(0, 'rgba(200,20,20,0)'); v.addColorStop(1, `rgba(190,10,16,${0.2 + 0.4 * rage})`); }
        ctx.fillStyle = v; ctx.fillRect(0, 0, 1200, 700);
        ctx.restore();
      }
    }
  }
  const ready = () => [kitchen, items, cannon].every(image => image.complete && image.naturalWidth > 0) && (rig !== null || rigFailed);
  /** Development inspection only: hands back the built rig for review tooling. */
  const debugRig = () => rig;
  /** Development only: advances the performance without drawing, so a capture
   *  harness can settle the springs at a frozen clock. */
  const warm = (state: ArcadeState | null, playing: boolean, reduced: boolean, time: number, delta: number) => { animator.step(state, playing, reduced, time, delta, !(DEV_HOOKS && devRender.holdBlink)); };
  /** Development only: the pose the animator settled on for the last frame. */
  const debugPose = () => ({ ...animator.current });
  /** Development only: the render clock the last frame was drawn at (hit-stop aware). */
  const worldTime = () => lastWorldTime;
  return { draw, ready, debugRig, debugPose, warm, worldTime };
}
