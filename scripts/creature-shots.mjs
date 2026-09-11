#!/usr/bin/env node
/**
 * Creature review harness.
 *
 * Boots the dev server, forces every authored creature state through the
 * development pose hook, and captures a reviewable image set:
 *
 *   docs/qa/creature/iter-N/
 *     <state>.png            1920x1080 still
 *     <state>-stream.png     960-wide copy, i.e. what a compressed stream shows
 *     strip-<name>.png       six frames 100 ms apart, side by side
 *     reduced-<state>.png    reduced-motion pass
 *     hud-<view>.png         normal layout with HUD, for the screen comparison
 *     sheet.png              contact sheet of every stream-resolution image
 *     manifest.json          capture list, render timing, real-play trace result
 *
 * Usage: node scripts/creature-shots.mjs --iter 3 [--port 4319] [--headed]
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Prefer an explicitly configured browser, then the preinstalled one used by
// the cloud workspace, and otherwise let Playwright resolve whatever
// `npx playwright install chromium` put in its own cache — which is what
// happens on a developer machine.
const CHROMIUM = process.env.DNFI_CHROMIUM
  ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const WIDTH = 1920;
const HEIGHT = 1080;
const STREAM_WIDTH = 960;
const STRIP_FRAMES = 6;
const STRIP_STEP = 0.1;
const SLOW_STRIP_STEP = 0.22;
const HIDE_HUD = `
  .masthead,.underbar,.control-deck,.preflight,.hud,.craving,.mutation-banner,
  .live-caption,.start-copy,.scene-caption,.stage-vignette,.modal-scrim{display:none!important}
  main{max-width:none!important;min-width:0!important;padding:0!important;margin:0!important}
  .game-shell{border:0!important;border-radius:0!important;box-shadow:none!important;background:#000!important}
  .stage{aspect-ratio:auto!important;width:${WIDTH}px!important;height:${HEIGHT}px!important}
  html,body{background:#000!important;overflow:hidden!important;margin:0!important}
`;

/** Motion strips: the states where cause-and-effect has to be legible over time. */
const STRIPS = [
  { name: "gulp-metal", state: "gulp-metal", from: -0.2 },
  { name: "gulp-balloon", state: "gulp-balloon", from: -0.2, step: 0.15 },
  { name: "gulp-pepper", state: "gulp-pepper", from: -0.2, step: 0.2 },
  { name: "miss-floor", state: "miss-floor", from: -0.05, step: 0.16 },
  // Each onset strip straddles the moment the mutation lands (the warning build
  // ends at t = 1.5), so the strip shows anticipation, the snap, and the settle
  // rather than six samples of one ramp.
  { name: "onset-metal", state: "warn-metal", from: 0.7, step: SLOW_STRIP_STEP },
  { name: "onset-balloon", state: "warn-balloon", from: 0.7, step: SLOW_STRIP_STEP },
  { name: "onset-pepper", state: "warn-pepper", from: 0.7, step: SLOW_STRIP_STEP },
    // Inside the gust itself. Starting before it meant two opening frames in
  // the warning window, which are the same image.
  { name: "pepper-exhale", state: "active-pepper", from: 0.16, step: 0.14 },
];

/**
 * When to sample each state. A mutation warning is a 90-tick build-up, so
 * sampling it at 0.4 s catches almost nothing; a gulp is over in half a second.
 */
const STATE_TIME = {
  "warn-metal": 1.38, "warn-balloon": 1.38, "warn-pepper": 1.38,
  "gulp-metal": 0.07, "gulp-balloon": 0.42, "gulp-pepper": 0.58,
  "craving-satisfied": 0.88, "off-menu": 0.88,
  "miss-floor": 0.46, "miss-vent": 0.46,
  "recovery": 0.95,
};
const DEFAULT_TIME = 0.62;

/**
 * Reduced motion damps the springs hard, so a beat sampled at its contact frame
 * has not arrived yet. These states are sampled at their held pose instead.
 */
const REDUCED_TIME = { "gulp-metal": 0.26 };

const REDUCED_STATES = [
  "hungry-severe", "irritation-3", "gulp-metal",
  "active-metal", "active-balloon", "active-pepper", "end-survived",
];

function parseArgs(argv) {
  const args = { iter: 0, port: 4319, headed: false };
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (item === "--iter") args.iter = Number(argv[++i]);
    else if (item === "--port") args.port = Number(argv[++i]);
    else if (item === "--headed") args.headed = true;
  }
  if (!Number.isInteger(args.iter) || args.iter < 0) throw new Error("--iter must be a non-negative integer");
  return args;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function stopServer(child) {
  try { process.kill(-child.pid, "SIGTERM"); } catch { /* already gone */ }
  try { child.kill("SIGTERM"); } catch { /* already gone */ }
}

async function startDevServer(port) {
  // Detached, so the whole process group can be torn down: the dev server
  // spawns a workerd child that survives a plain kill on the npm wrapper.
  const child = spawn("npm", ["run", "dev", "--", "--port", String(port), "--strictPort"], {
    cwd: ROOT,
    env: { ...process.env, BROWSER: "none", FORCE_COLOR: "0" },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let log = "";
  child.stdout.on("data", (chunk) => { log += chunk; });
  child.stderr.on("data", (chunk) => { log += chunk; });
  const url = `http://127.0.0.1:${port}/`;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Dev server exited early:\n${log}`);
    try {
      const response = await fetch(url);
      if (response.ok) { await response.text(); return { child, url }; }
    } catch { /* not listening yet */ }
    await wait(500);
  }
  stopServer(child);
  throw new Error(`Dev server did not start in time:\n${log}`);
}

async function settle(page, frames = 3) {
  await page.evaluate(async (count) => {
    for (let i = 0; i < count; i++) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  }, frames);
}

/** Waits until the scene's source art has decoded, so no capture is half-drawn. */
async function waitForScene(page) {
  await page.waitForFunction(() => {
    const hook = window.__dnfi;
    return Boolean(hook && typeof hook.sceneReady === "function" && hook.sceneReady());
  }, null, { timeout: 60_000 });
}

async function capture(page, file) {
  await settle(page);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
}

/** Downscales a capture to stream width in the browser, where the resampler lives. */
async function makeStreamCopies(page, files) {
  for (const file of files) {
    const source = `data:image/png;base64,${(await readFile(file)).toString("base64")}`;
    const encoded = await page.evaluate(async ({ source, width }) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const scale = width / image.naturalWidth;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext("2d");
      context.imageSmoothingQuality = "medium";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png").split(",")[1];
    }, { source, width: STREAM_WIDTH });
    await writeFile(file.replace(/\.png$/, "-stream.png"), Buffer.from(encoded, "base64"));
  }
}

/** Joins six frames left to right so motion reads as a filmstrip. */
async function buildStrip(page, frames, outFile, stepMs = 100, fromMs = 0) {
  const sources = [];
  for (const frame of frames) sources.push(`data:image/png;base64,${(await readFile(frame)).toString("base64")}`);
  const encoded = await page.evaluate(async ({ sources, cell, stepMs, fromMs }) => {
    const images = [];
    for (const source of sources) {
      const image = new Image();
      image.src = source;
      await image.decode();
      images.push(image);
    }
    const height = Math.round(cell * images[0].naturalHeight / images[0].naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = cell * images.length;
    canvas.height = height + 26;
    const context = canvas.getContext("2d");
    context.fillStyle = "#05100f";
    context.fillRect(0, 0, canvas.width, canvas.height);
    images.forEach((image, index) => {
      context.drawImage(image, index * cell, 26, cell, height);
      context.fillStyle = "#c9d9a8";
      context.font = "600 15px ui-monospace, monospace";
      const at = fromMs + index * stepMs;
      context.fillText(`${at >= 0 ? "+" : ""}${at} ms`, index * cell + 10, 18);
      context.strokeStyle = "#00000088";
      context.strokeRect(index * cell + 0.5, 26.5, cell - 1, height - 1);
    });
    return canvas.toDataURL("image/png").split(",")[1];
  }, { sources, cell: 520, stepMs, fromMs });
  await writeFile(outFile, Buffer.from(encoded, "base64"));
}

async function buildContactSheet(page, dir, outFile) {
  const names = (await readdir(dir))
    .filter((name) => name.endsWith("-stream.png"))
    .sort();
  const sources = [];
  for (const name of names) {
    sources.push({ label: name.replace("-stream.png", ""), data: `data:image/png;base64,${(await readFile(path.join(dir, name))).toString("base64")}` });
  }
  const encoded = await page.evaluate(async ({ sources, columns, cell }) => {
    const loaded = [];
    for (const item of sources) {
      const image = new Image();
      image.src = item.data;
      await image.decode();
      loaded.push({ image, label: item.label });
    }
    const rowHeight = Math.round(cell * 1080 / 1920) + 24;
    const rows = Math.ceil(loaded.length / columns);
    const canvas = document.createElement("canvas");
    canvas.width = columns * cell;
    canvas.height = rows * rowHeight;
    const context = canvas.getContext("2d");
    context.fillStyle = "#07110f";
    context.fillRect(0, 0, canvas.width, canvas.height);
    loaded.forEach((item, index) => {
      const x = (index % columns) * cell;
      const y = Math.floor(index / columns) * rowHeight;
      const scale = cell / item.image.naturalWidth;
      context.drawImage(item.image, x, y + 22, cell, Math.round(item.image.naturalHeight * scale));
      context.fillStyle = "#d6e6b4";
      context.font = "600 14px ui-monospace, monospace";
      context.fillText(item.label, x + 8, y + 16);
    });
    return canvas.toDataURL("image/png").split(",")[1];
  }, { sources, columns: 4, cell: 470 });
  await writeFile(outFile, Buffer.from(encoded, "base64"));
}

/**
 * Drives real play through the dev play hook and records which authored states
 * the run actually passes through. This is the check that every state is
 * reachable without the pose hook.
 */
async function runScriptedTrace(page) {
  return await page.evaluate(async () => {
    const hook = window.__dnfi;
    const play = hook.play;
    const seen = new Set();
    const note = (name) => seen.add(name);
    const snapshot = () => play.state();
    // Angles that reliably reach, and reliably miss, the mouth from the fixed
    // launcher. Both go through launchFood, so both enter the command trace.
    const HIT = -33;
    const MISS = -62;

    const noteFrom = (before, after) => {
      for (const item of after.events) {
        if (before.some((old) => old.tick === item.tick && old.type === item.type && old.label === item.label)) continue;
        if (item.type === "feed") note(`gulp-${item.ingredient}`);
        if (item.type === "feed" && item.label.startsWith("CRAVING")) note("craving-satisfied");
        if (item.type === "feed" && !item.label.startsWith("CRAVING")) note("off-menu");
        if (item.type === "miss") note("miss-floor");
        if (item.type === "bounce" && item.label === "VENT DEFLECTION") note("miss-vent");
        if (item.type === "warning") note(`warn-${item.ingredient}`);
        if (item.type === "mutation") note(`active-${item.ingredient}`);
        if (item.type === "gust") note("active-pepper");
        if (item.type === "recovery") note("recovery");
        if (item.type === "end") {
          const state = snapshot();
          if (state.phase === "survived") note("end-survived");
          if (state.failureReason === "empty-belly") note("end-starved");
          if (state.failureReason === "too-many-missed-shots") note("end-enraged");
        }
      }
    };

    /** Advances one tick at a time so no event is skipped by the observer. */
    const walk = (count) => {
      for (let i = 0; i < count; i++) {
        const before = snapshot().events;
        if (snapshot().phase !== "playing") return;
        play.step(1);
        noteFrom(before, snapshot());
      }
    };

    const serve = (ingredient, angle = HIT) => {
      play.launch(ingredient, angle);
      walk(70);
      walk(44);
    };

    const runs = {};

    // Run 1 — the long exploratory shift: every mutation, every reaction, and
    // a survived shift at the end.
    play.start(20260909);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    note("attract-idle");

    play.launch("metal", HIT);
    walk(14);
    if (snapshot().projectiles > 0) note("tracking-far");
    walk(10);
    if (snapshot().projectiles > 0) note("tracking-near");
    walk(60);

    for (const ingredient of ["metal", "balloon", "pepper"]) {
      for (let i = 0; i < 3; i++) serve(ingredient);
      walk(620);
    }

    // A handful of deliberate misses raises irritation in readable steps.
    for (let i = 0; i < 26 && snapshot().phase === "playing"; i++) {
      serve("metal", MISS);
      const rage = snapshot().rage;
      if (rage >= 25) note("irritation-1");
      if (rage >= 55) note("irritation-2");
      if (rage >= 88) { note("irritation-3"); break; }
    }

    // Let fullness drain to the hungry looks, then feed steadily to the whistle.
    let guard = 0;
    while (snapshot().hunger > 45 && snapshot().phase === "playing" && guard++ < 4000) walk(1);
    if (snapshot().hunger <= 45) note("hungry-mild");
    guard = 0;
    while (snapshot().hunger > 10 && snapshot().phase === "playing" && guard++ < 4000) walk(1);
    if (snapshot().hunger <= 10) note("hungry-severe");

    guard = 0;
    while (snapshot().phase === "playing" && guard++ < 200) {
      serve(snapshot().wanted);
      if (snapshot().tick > 5000 && snapshot().tick < 6200) {
        // The vent flap is solid here; a flat shot deflects off it.
        play.launch("metal", -12);
        walk(90);
      }
    }
    runs.survived = snapshot();

    // Run 2 — nothing but misses, to end on irritation.
    play.start(31415926);
    guard = 0;
    while (snapshot().phase === "playing" && guard++ < 60) serve("balloon", MISS);
    runs.enraged = snapshot();

    // Run 3 — an unattended shift, to end on an empty belly.
    play.start(27182818);
    guard = 0;
    while (snapshot().phase === "playing" && guard++ < 200) walk(60);
    runs.starved = snapshot();

    play.stop();
    return {
      reached: [...seen].sort(),
      runs: {
        survived: { phase: runs.survived.phase, tick: runs.survived.tick, score: runs.survived.score },
        enraged: { phase: runs.enraged.phase, failureReason: runs.enraged.failureReason, tick: runs.enraged.tick },
        starved: { phase: runs.starved.phase, failureReason: runs.starved.failureReason, tick: runs.starved.tick },
      },
    };
  });
}

async function measureRenderCost(page) {
  await page.evaluate(() => {
    window.__dnfi.clearPose();
    window.__dnfi.clock(null);
    window.__dnfi.play.start(4242);
    window.__dnfi.play.manual(false);
    window.__dnfi.resetTiming();
  });
  await wait(4000);
  const timing = await page.evaluate(() => {
    const value = window.__dnfi.timing();
    window.__dnfi.play.stop();
    return value;
  });
  const size = await page.evaluate(() => window.__dnfi.canvasSize());
  return { ...timing, canvas: size };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = path.join(ROOT, "docs", "qa", "creature", `iter-${args.iter}`);
  const frameDir = path.join(outDir, "frames");
  await mkdir(frameDir, { recursive: true });

  console.log(`[harness] starting dev server on port ${args.port}`);
  const server = await startDevServer(args.port);
  const browser = await chromium.launch({
    ...(CHROMIUM ? { executablePath: CHROMIUM } : {}),
    headless: !args.headed,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-device-scale-factor=1", "--hide-scrollbars"],
  });

  const created = [];
  try {
    const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on("pageerror", (error) => console.error("[page error]", error.message));
    await page.goto(server.url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.__dnfi && window.__dnfi.pose), null, { timeout: 60_000 });
    await waitForScene(page);
    await page.addStyleTag({ content: HIDE_HUD });
    await page.evaluate(() => { window.__dnfi.hideAim(true);
      window.__dnfi.hideLabels(true); window.__dnfi.holdBlink(true); });
    await settle(page, 5);

    const states = await page.evaluate(() => window.__dnfi.states());
    console.log(`[harness] ${states.length} states`);

    // 1. Stills.
    for (const state of states) {
      await page.evaluate(async ({ state, at }) => {
        await window.__dnfi.settle(state, at, 1.5);
      }, { state, at: STATE_TIME[state] ?? DEFAULT_TIME });
      const file = path.join(outDir, `${state}.png`);
      await capture(page, file);
      created.push(file);
    }

    // 2. Motion strips.
    for (const strip of STRIPS) {
      const frames = [];
      for (let index = 0; index < STRIP_FRAMES; index++) {
        const t = (strip.from ?? 0) + index * (strip.step ?? STRIP_STEP);
        await page.evaluate(async ({ state, t }) => {
          await window.__dnfi.settle(state, t, 1.4);
        }, { state: strip.state, t });
        const file = path.join(frameDir, `${strip.name}-${index}.png`);
        await capture(page, file);
        frames.push(file);
      }
      const stripFile = path.join(outDir, `strip-${strip.name}.png`);
      await buildStrip(page, frames, stripFile,
        Math.round((strip.step ?? STRIP_STEP) * 1000), Math.round((strip.from ?? 0) * 1000));
      created.push(stripFile);
    }

    // 3. Reduced motion.
    await page.evaluate(() => window.__dnfi.reduced(true));
    for (const state of REDUCED_STATES) {
      await page.evaluate(async ({ state, at }) => {
        await window.__dnfi.settle(state, at, 1.5);
      }, { state, at: REDUCED_TIME[state] ?? STATE_TIME[state] ?? DEFAULT_TIME });
      const file = path.join(outDir, `reduced-${state}.png`);
      await capture(page, file);
      created.push(file);
    }
    await page.evaluate(() => window.__dnfi.reduced(null));

    // 4. Stream-resolution copies and the contact sheet.
    await makeStreamCopies(page, created);
    await buildContactSheet(page, outDir, path.join(outDir, "sheet.png"));

    // 5. Real play: the scripted trace and the render cost.
    await page.evaluate(() => { window.__dnfi.clearPose(); window.__dnfi.clock(null); window.__dnfi.hideAim(false); window.__dnfi.holdBlink(false); });
    const trace = await runScriptedTrace(page);
    const timing = await measureRenderCost(page);
      console.log(`[harness] render ${timing.median.toFixed(2)} ms median / ${timing.p95.toFixed(2)} ms p95 / `
    + `${timing.average.toFixed(2)} ms mean / ${timing.max.toFixed(2)} ms max over ${timing.samples} frames`);

    const missing = states.filter((state) => !trace.reached.includes(state));
    await page.close();

    // 6. HUD-visible screens, in the normal page layout.
    const hudPage = await context.newPage();
    await hudPage.goto(server.url, { waitUntil: "domcontentloaded" });
    await hudPage.waitForFunction(() => Boolean(window.__dnfi && window.__dnfi.play), null, { timeout: 60_000 });
    await waitForScene(hudPage);
    await settle(hudPage, 5);
    const hudShots = [];
    const stage = hudPage.locator(".game-shell");
    await stage.screenshot({ path: path.join(outDir, "hud-title.png") });
    hudShots.push(path.join(outDir, "hud-title.png"));

    await hudPage.evaluate(async () => {
      const play = window.__dnfi.play;
      play.start(20260909);
      const HIT = -33;
      for (let round = 0; round < 3; round++) {
        play.launch("balloon", HIT);
        for (let i = 0; i < 60 && play.state().projectiles > 0; i++) play.step(1);
        play.step(44);
      }
      for (let i = 0; i < 140; i++) play.step(1);
      play.launch("balloon", HIT);
      for (let i = 0; i < 20; i++) play.step(1);
    });
    await settle(hudPage, 5);
    await stage.screenshot({ path: path.join(outDir, "hud-midplay.png") });
    hudShots.push(path.join(outDir, "hud-midplay.png"));

    await hudPage.evaluate(async () => {
      const play = window.__dnfi.play;
      while (play.state().phase === "playing") play.step(240);
      play.stop();
    });
    await settle(hudPage, 8);
    await stage.screenshot({ path: path.join(outDir, "hud-result.png") });
    hudShots.push(path.join(outDir, "hud-result.png"));
    await makeStreamCopies(hudPage, hudShots);
    await hudPage.close();

    const manifest = {
      iteration: args.iter,
      capturedAt: new Date().toISOString(),
      viewport: { width: WIDTH, height: HEIGHT },
      streamWidth: STREAM_WIDTH,
      states,
      strips: STRIPS.map((strip) => strip.name),
      reducedStates: REDUCED_STATES,
      hudShots: hudShots.map((file) => path.basename(file)),
      renderTiming: timing,
      trace: { reached: trace.reached, missing, runs: trace.runs },
    };
    await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`[harness] wrote ${created.length + hudShots.length} captures to ${path.relative(ROOT, outDir)}`);
    if (missing.length) console.log(`[harness] states not reached by the scripted trace: ${missing.join(", ")}`);
  } finally {
    await browser.close();
    stopServer(server.child);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
