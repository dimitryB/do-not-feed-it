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
  const args = { port: 4405, inset: 0.86 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--port") args.port = Number(argv[++i]);
    else if (argv[i] === "--inset") args.inset = Number(argv[++i]);
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
