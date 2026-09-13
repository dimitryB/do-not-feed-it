#!/usr/bin/env node
/**
 * Render budget check, measured on its own.
 *
 * The capture harness already reports a draw cost, but it measures it on a dev
 * server that is still compiling routes, in a container that has usually just
 * finished a two-hundred-shift bot run. That number is honest about the worst
 * case and useless for deciding whether a change made the draw cheaper, because
 * its noise is larger than any change worth making.
 *
 * This runs the same measurement with nothing else happening, three times, on
 * the state that costs the most: full size with every mutation at its cap.
 *
 * Usage: node --experimental-strip-types scripts/render-budget.mjs [--runs 3] [--seconds 12]
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import {
  CHROMIUM, HEIGHT, WIDTH, measureRenderCost, settle, startDevServer, stopServer, waitForScene,
} from "./shot-kit.mjs";

const STAGE_FILL = `
  .masthead,.underbar,.control-deck,.preflight,.hud,.craving,.mutation-banner,
  .live-caption,.start-copy,.scene-caption,.stage-vignette,.modal-scrim{display:none!important}
  main{max-width:none!important;min-width:0!important;padding:0!important;margin:0!important}
  .game-shell{border:0!important;border-radius:0!important;box-shadow:none!important;background:#000!important}
  .stage{aspect-ratio:auto!important;width:${WIDTH}px!important;height:${HEIGHT}px!important}
  html,body{background:#000!important;overflow:hidden!important;margin:0!important}
`;

const args = { runs: 3, seconds: 12, port: 4399, only: null, shots: null };
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === "--runs") args.runs = Number(process.argv[++i]);
  else if (process.argv[i] === "--seconds") args.seconds = Number(process.argv[++i]);
  else if (process.argv[i] === "--port") args.port = Number(process.argv[++i]);
  else if (process.argv[i] === "--only") args.only = process.argv[++i];
  else if (process.argv[i] === "--shots") args.shots = process.argv[++i];
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (args.shots) await mkdir(args.shots, { recursive: true });
const server = await startDevServer(ROOT, args.port);
const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
try {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(server.url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__dnfi && window.__dnfi.play), null, { timeout: 60_000 });
  await waitForScene(page);
  await page.addStyleTag({ content: STAGE_FILL });
  await settle(page, 5);

  // Measured state by state, because a single worst-case number says the draw
  // is too expensive without saying which part of it is.
  const STATES = [
    { name: "bare x2.4", size: 2.4, m: { metal: 0, balloon: 0, pepper: 0 }, extra: {} },
    { name: "metal 3", size: 2.4, m: { metal: 3, balloon: 0, pepper: 0 }, extra: { clog: 0.72 } },
    // Lift is clamped in the rules by a ceiling that shrinks as it grows:
    // (liftMax + liftMaxPerLevel * level) * (1 - liftCrowding * sizeT). These
    // are the values that ceiling actually allows, because a state the game
    // cannot reach is not worth optimising or judging.
    { name: "balloon 3", size: 2.4, m: { metal: 0, balloon: 3, pepper: 0 }, extra: { lift: 11.5, pressure: 0.9 } },
    { name: "balloon 3 x2.0 lift", size: 2.0, m: { metal: 0, balloon: 3, pepper: 0 }, extra: { lift: 21.4, pressure: 0.9 } },
    { name: "pepper 3", size: 2.4, m: { metal: 0, balloon: 0, pepper: 3 }, extra: {} },
    { name: "typical 2/2/1 x2.0", size: 2.0, m: { metal: 2, balloon: 2, pepper: 1 }, extra: { clog: 0.4, lift: 9, pressure: 0.5 } },
    { name: "worst 3/3/3 x2.4", size: 2.4, m: { metal: 3, balloon: 3, pepper: 3 }, extra: { clog: 0.72, lift: 11.5, pressure: 0.9 } },
  ];
  let worst = 0;
  for (const state of STATES.filter((s) => !args.only || s.name.includes(args.only))) {
    // One warm-up pass per state, thrown away: the first measurement after a
    // state change carries a compile spike that is not a frame cost.
    const rows = [];
    for (let run = -1; run < args.runs; run += 1) {
      const timing = await measureRenderCost(page, 4242 + run, args.seconds, (p) => p.evaluate((s) => {
        window.__dnfi.play.setSize(s.size);
        window.__dnfi.play.setMutations(s.m, s.extra);
      }, state));
      const profile = await page.evaluate(() => (window.__dnfi.profile ? window.__dnfi.profile() : null));
      timing.profile = profile;
      if (run >= 0) rows.push(timing);
      console.log(`  ${state.name} ${run < 0 ? "warm-up" : `run ${run + 1}`}: mean ${timing.average.toFixed(2)}`
        + ` median ${timing.median.toFixed(2)} (${timing.samples} samples)`
        + (profile ? `  cells ${Math.round(profile.cellsPerFrame)} (clipped ${profile.clippedCells})  rig ${profile.rigMs.toFixed(2)}`
          + `  [field ${profile.field.toFixed(2)} warp ${profile.warp.toFixed(2)} skin ${profile.skin.toFixed(2)}`
          + ` mouth ${profile.mouth.toFixed(2)} face ${profile.face.toFixed(2)}]`
          + (profile.modes ? `  (ov ${profile.modes.overlay.toFixed(2)} sat ${profile.modes.saturation.toFixed(2)}`
            + ` mul ${profile.modes.multiply.toFixed(2)} scr ${profile.modes.screen.toFixed(2)})` : "")
          + `  rest ${profile.sceneMs.toFixed(2)}` : ""));
    }
    if (args.shots) {
      // A still of the state that was just timed, so a cheaper draw can be
      // checked for what it cost in fidelity rather than only in milliseconds.
      await page.evaluate((st) => {
        window.__dnfi.clock(40);
        window.__dnfi.play.start(4242);
        window.__dnfi.play.manual(true);
        window.__dnfi.play.setSize(st.size);
        window.__dnfi.play.setMutations(st.m, st.extra);
        window.__dnfi.play.step(140);
      }, state);
      await settle(page, 40);
      const file = path.join(args.shots, `${state.name.replace(/[^a-z0-9]+/gi, "-")}.png`);
      await page.screenshot({ path: file });
    }
    const mean = rows.reduce((sum, r) => sum + r.average, 0) / rows.length;
    const median = rows.reduce((sum, r) => sum + r.median, 0) / rows.length;
    const p95 = Math.max(...rows.map((r) => r.p95));
    worst = Math.max(worst, mean);
    const cells = rows.reduce((sum, r) => sum + (r.profile?.cellsPerFrame ?? 0), 0) / rows.length;
    const rig = rows.reduce((sum, r) => sum + (r.profile?.rigMs ?? 0), 0) / rows.length;
    console.log(`${state.name.padEnd(20)} mean ${mean.toFixed(2)} ms   median ${median.toFixed(2)} ms`
      + `   worst p95 ${p95.toFixed(2)} ms   cells/frame ${Math.round(cells)}   rig ${rig.toFixed(2)} ms`);
  }
  console.log(`\n${args.runs}x${args.seconds}s per state at ${WIDTH}x${HEIGHT}`);
  console.log(worst <= 4 ? "PASS  every state within the 4 ms budget" : `FAIL  worst state ${worst.toFixed(2)} ms, over the 4 ms budget`);
  process.exitCode = worst <= 4 ? 0 : 1;
} finally {
  await browser.close();
  await stopServer(server.child);
}
