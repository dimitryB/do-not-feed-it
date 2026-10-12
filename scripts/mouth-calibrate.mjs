#!/usr/bin/env node
/**
 * Measures the mouth the rig actually draws, at several creature sizes, and
 * prints the rule constants that would make the collision ellipse match it.
 *
 * The lit target ring in `lib/render/scene.ts` is the rules' collision ellipse.
 * If that ellipse and the drawn mouth disagree, the player is told a snack went
 * in when it did not, or the reverse, and no amount of tuning fixes that. This
 * script is how `ARENA.mouth`, `TUNING.leanPerSize`, `TUNING.risePerSize`,
 * `TUNING.mouthGrowX` and `TUNING.mouthGrowY` are chosen.
 *
 * The measured box is the full painted aperture at its widest. The rules' ellipse
 * is deliberately set a little inside it — a snack that visually clips the lip
 * should be a near miss, not a lie — so the printed numbers are scaled by
 * `--inset` (default 0.86).
 *
 * Usage: node --experimental-strip-types scripts/mouth-calibrate.mjs [--port 4405]
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { CHROMIUM, HEIGHT, WIDTH, settle, startDevServer, stopServer, waitForScene } from "./shot-kit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SIZES = [1, 1.35, 1.7, 2.05, 2.4];

function parseArgs(argv) {
  const args = { port: 4405, inset: 0.86, shot: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--port") args.port = Number(argv[++i]);
    else if (argv[i] === "--inset") args.inset = Number(argv[++i]);
    else if (argv[i] === "--shot") args.shot = argv[++i];
  }
  return args;
}

/** Least-squares fit of `y = a + b * (size - 1)` over the samples. */
function fit(samples, pick) {
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const sample of samples) {
    const x = sample.size - 1;
    const y = pick(sample);
    sx += x; sy += y; sxx += x * x; sxy += x * y;
  }
  const n = samples.length;
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const a = (sy - b * sx) / n;
  return { at1: a, per: b };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const server = await startDevServer(ROOT, args.port);
  const browser = await chromium.launch({
    ...(CHROMIUM ? { executablePath: CHROMIUM } : {}),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-device-scale-factor=1"],
  });
  try {
    const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(server.url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.__dnfi && window.__dnfi.play && window.__dnfi.mouthBox), null, { timeout: 60_000 });
    await waitForScene(page);
    await settle(page, 5);

    const samples = [];
    for (const size of SIZES) {
      // Hold the size and run until the mouth is at its widest, then let the
      // springs arrive before reading the box.
      const box = await page.evaluate(async (value) => {
        const play = window.__dnfi.play;
        play.start(4242);
        play.manual(true);
        for (let i = 0; i < 900; i += 1) {
          play.setSize(value);
          play.step(1);
          const state = play.state();
          if (state.creature && state.creature.aperture >= 0.999 && i > 120) break;
        }
        play.setSize(value);
        for (let i = 0; i < 50; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
        return window.__dnfi.mouthBox();
      }, size);
      samples.push({ size, ...box });
      console.log(`size ${size.toFixed(2)}  drawn mouth  x ${box.x.toFixed(1)}  y ${box.y.toFixed(1)}  rx ${box.rx.toFixed(1)}  ry ${box.ry.toFixed(1)}`);
    }

    // The fit above is a bare creature. A shift is not: by a minute in it is
    // carrying mutations, a balloon lift and a clogged mouth, and each of those
    // moves the drawn mouth and the rules' ellipse through different code. A
    // critic reading a real mid-run frame reported the lit ring sitting well
    // below the open mouth, which the bare fit says cannot happen — so the
    // states a shift actually reaches are measured against the rules directly.
    const LIVE = [
      { name: "bare x1.68", size: 1.68, m: { metal: 0, balloon: 0, pepper: 0 }, extra: {} },
      { name: "track +40", size: 1.68, m: { metal: 0, balloon: 0, pepper: 0 }, extra: { track: 40 } },
      { name: "track -40", size: 1.68, m: { metal: 0, balloon: 0, pepper: 0 }, extra: { track: -40 } },
      { name: "lift 10 only", size: 1.68, m: { metal: 0, balloon: 1, pepper: 0 }, extra: { lift: 10 } },
      { name: "lift 20 only", size: 1.68, m: { metal: 0, balloon: 1, pepper: 0 }, extra: { lift: 20 } },
      { name: "metal 3 only", size: 1.68, m: { metal: 3, balloon: 0, pepper: 0 }, extra: { lift: 0 } },
      { name: "pepper 3 only", size: 1.68, m: { metal: 0, balloon: 0, pepper: 3 }, extra: { lift: 0 } },
      { name: "balloon 3 no lift", size: 1.68, m: { metal: 0, balloon: 3, pepper: 0 }, extra: { lift: 0 } },
      { name: "balloon 1 x1.68", size: 1.68, m: { metal: 1, balloon: 1, pepper: 1 }, extra: { lift: 10 } },
      { name: "balloon 2 x2.0", size: 2.0, m: { metal: 2, balloon: 2, pepper: 1 }, extra: { lift: 18 } },
      { name: "balloon 3 x2.4", size: 2.4, m: { metal: 3, balloon: 3, pepper: 3 }, extra: { lift: 11.5 } },
    ];
    console.log("\nDrawn mouth vs the rules' ellipse, in states a shift reaches:");
    for (const live of LIVE) {
      const pair = await page.evaluate(async (st) => {
        const play = window.__dnfi.play;
        play.start(4242);
        play.manual(true);
        for (let i = 0; i < 900; i += 1) {
          play.setSize(st.size);
          play.setMutations(st.m, st.extra);
          play.step(1);
          const state = play.state();
          if (state.creature && state.creature.aperture >= 0.999 && i > 120) break;
        }
        play.setSize(st.size);
        play.setMutations(st.m, st.extra);
        for (let i = 0; i < 50; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
        const c = play.state().creature;
        const drawn = await window.__dnfi.mouthBox();
        const camera = window.__dnfi.camera ? window.__dnfi.camera() : { zoom: 1, ax: 0, ay: 0 };
        return { drawn, rule: { x: c.x, y: c.y, rx: c.rx, ry: c.ry, lift: c.lift, open: c.open }, camera };
      }, live);
      const n = (v) => (typeof v === "number" ? v.toFixed(1) : String(v));
      const d = pair.drawn ?? {}, r = pair.rule ?? {};
      // The rules' vertical half-height is ry scaled by the gap they test
      // against, not raw ry: `dyGap = (y - mouthY) / (ry * max(gapFloor, open))`.
      const effRy = r.ry * Math.max(0.3, r.open ?? 1);
      // The camera scales the ring and the drawn mouth together, so the
      // on-screen disagreement is the arena one times the zoom; it is printed
      // so a pulled-back frame is checked in the pixels the player sees.
      const zoom = pair.camera?.zoom ?? 1;
      console.log(`  ${live.name.padEnd(18)} drawn x ${n(d.x)} y ${n(d.y)} rx ${n(d.rx)} ry ${n(d.ry)}`
        + `   rule x ${n(r.x)} y ${n(r.y)} rx ${n(r.rx)} effRy ${n(effRy)}   open ${n(r.open)}`
        + `   dx ${n(r.x - d.x)} dy ${n(r.y - d.y)}  drx ${n(r.rx - d.rx)} dry ${n(effRy - d.ry)}`
        + `   zoom ${zoom.toFixed(2)} (on screen dx ${n((r.x - d.x) * zoom)} dy ${n((r.y - d.y) * zoom)})`);
    }

    if (args.shot) {
      // A still of the mouth at its widest, which is the one state where the
      // interior is fully visible and therefore the only one worth checking the
      // tongue, the teeth and their draw order against.
      await page.evaluate(async () => {
        const play = window.__dnfi.play;
        play.start(4242);
        play.manual(true);
        for (let i = 0; i < 900; i += 1) {
          play.setSize(1.45);
          play.step(1);
          const state = play.state();
          if (state.creature && state.creature.aperture >= 0.999 && i > 120) break;
        }
        for (let i = 0; i < 40; i += 1) await new Promise((r) => requestAnimationFrame(() => r(null)));
      });
      await page.screenshot({ path: args.shot });
      console.log(`wrote ${args.shot}`);
    }

    const fx = fit(samples, (s) => s.x);
    const fy = fit(samples, (s) => s.y);
    const frx = fit(samples, (s) => s.rx);
    const fry = fit(samples, (s) => s.ry);
    const inset = args.inset;
    console.log("\nSuggested rule constants (inset %s):", inset);
    console.log(`  ARENA.mouth       { x: ${Math.round(fx.at1)}, y: ${Math.round(fy.at1)}, `
      + `rx: ${Math.round(frx.at1 * inset)}, ry: ${Math.round(fry.at1 * inset)} }`);
    console.log(`  TUNING.leanPerSize  ${(-fx.per).toFixed(1)}   (mouth moves ${fx.per > 0 ? "right" : "left"} as it grows)`);
    console.log(`  TUNING.risePerSize  ${(-fy.per).toFixed(1)}   (mouth moves ${fy.per > 0 ? "down" : "up"} as it grows)`);
    console.log(`  TUNING.mouthGrowX   ${(frx.per / frx.at1).toFixed(3)}`);
    console.log(`  TUNING.mouthGrowY   ${(fry.per / fry.at1).toFixed(3)}`);
    console.log("\nResidual of the linear fit (px):");
    for (const sample of samples) {
      const px = fx.at1 + fx.per * (sample.size - 1);
      const py = fy.at1 + fy.per * (sample.size - 1);
      console.log(`  size ${sample.size.toFixed(2)}  dx ${(sample.x - px).toFixed(1)}  dy ${(sample.y - py).toFixed(1)}`);
    }
    await page.close();
  } finally {
    await browser.close();
    await stopServer(server.child);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
