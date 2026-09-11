#!/usr/bin/env node
/**
 * Gameplay review harness.
 *
 * Plays one real shift in a real browser with the HUD visible and films it.
 * The player is the moderate bot from `loop-bots.mjs`: its command trace is
 * computed in Node first, then replayed tick-for-tick through the development
 * play hook, so the browser run is the same shift the bot table reports rather
 * than a separate scripted demo.
 *
 * The renderer clock is driven from the simulation tick rather than from the
 * wall clock, so a capture is reproducible: the creature's springs are at the
 * same place on every run of the same seed, whatever the machine's frame rate.
 *
 *   docs/qa/loop/iter-N/
 *     strip-<mmss>.png        12 frames 100 ms apart, one every 20 s of play
 *     clip-<name>.png         12 frames over 30 s around a moment that matters
 *     clip-<name>/frame-NN.png  the same frames at 960 px, for a close read
 *     hud-title.png           title screen
 *     hud-<mmss>.png          the mid-run stills, full HUD
 *     hud-end.png             the ending screen
 *     manifest.json           schedule, render timing, bot result
 *
 * Usage: node --experimental-strip-types scripts/loop-shots.mjs --iter 1
 *        [--seed 20260911] [--port 4321] [--headed]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { playShift } from "./loop-bots.mjs";
import {
  CHROMIUM, HEIGHT, WIDTH, buildGrid, buildStrip, makeStreamCopies,
  measureRenderCost, settle, startDevServer, stopServer, waitForScene, wait,
} from "./shot-kit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TICKS = 60;

/** The HUD stays. The page chrome around it does not — it is not the game. */
const FRAME_PAGE = `
  .masthead,.underbar{display:none!important}
  main{max-width:none!important;min-width:0!important;padding:0!important;margin:0!important;gap:0!important}
  .game-shell{border:0!important;border-radius:0!important;box-shadow:none!important;margin:0!important}
  html,body{background:#000!important;overflow:hidden!important;margin:0!important}
`;

/** Tall enough for the canvas, the HUD and the control deck in one frame. */
const SHELL_HEIGHT = 1320;
const STRIP_EVERY = 20 * TICKS;
const MAX_STRIPS = 7;
const STRIP_FRAMES = 12;
const STRIP_GAP = 6;            // 100 ms
/** Canvas filling exactly 1920x1080, which is where the render budget is set. */
const STAGE_FILL = `
  .masthead,.underbar,.control-deck,.preflight,.hud,.craving,.mutation-banner,
  .live-caption,.start-copy,.scene-caption,.stage-vignette,.modal-scrim{display:none!important}
  main{max-width:none!important;min-width:0!important;padding:0!important;margin:0!important}
  .game-shell{border:0!important;border-radius:0!important;box-shadow:none!important;background:#000!important}
  .stage{aspect-ratio:auto!important;width:${WIDTH}px!important;height:${HEIGHT}px!important}
  html,body{background:#000!important;overflow:hidden!important;margin:0!important}
`;
const CLIP_FRAMES = 12;
const CLIP_GAP = Math.round(2.5 * TICKS);  // 30 s across twelve frames
const CLIP_LEAD = 5 * TICKS;
/** Real frames rendered before a capture, so the springs are where play put them. */
const SETTLE_TICKS = 14;

const stamp = (tick) => {
  const seconds = Math.floor(tick / TICKS);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}${String(seconds % 60).padStart(2, "0")}`;
};

function parseArgs(argv) {
  const args = { iter: 0, seed: 20260911, port: 4321, headed: false };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--iter") args.iter = Number(argv[++i]);
    else if (item === "--seed") args.seed = Number(argv[++i]);
    else if (item === "--port") args.port = Number(argv[++i]);
    else if (item === "--headed") args.headed = true;
  }
  if (!Number.isInteger(args.iter) || args.iter < 0) throw new Error("--iter must be a non-negative integer");
  return args;
}

/**
 * Everything to film, in tick order. A shift is played once, forwards, so the
 * schedule has to be decided before it starts.
 */
function buildSchedule(run) {
  const shots = [];
  // Capped so a long shift does not turn into an unreadable wall of frames;
  // the ending clip covers whatever the last strip does not.
  const lastStrip = Math.min(run.ticks, STRIP_EVERY * MAX_STRIPS);
  for (let start = STRIP_EVERY; start + STRIP_FRAMES * STRIP_GAP < lastStrip; start += STRIP_EVERY) {
    for (let i = 0; i < STRIP_FRAMES; i += 1) {
      shots.push({ tick: start + i * STRIP_GAP, group: `strip-${stamp(start)}`, kind: "strip", index: i });
    }
    shots.push({ tick: start + 3 * STRIP_GAP, group: `hud-${stamp(start)}`, kind: "still", index: 0 });
  }
  const clips = [
    { name: "first-mutation", at: run.markers.firstMutation },
    { name: "first-stack", at: run.markers.firstStack },
    { name: "ending", at: run.ticks - CLIP_FRAMES * CLIP_GAP + CLIP_LEAD },
  ];
  for (const clip of clips) {
    if (clip.at === null || clip.at === undefined) continue;
    const start = Math.max(0, Math.min(clip.at - CLIP_LEAD, run.ticks - CLIP_FRAMES * CLIP_GAP));
    for (let i = 0; i < CLIP_FRAMES; i += 1) {
      const tick = start + i * CLIP_GAP;
      if (tick > run.ticks) break;
      shots.push({ tick, group: `clip-${clip.name}`, kind: "clip", index: i });
    }
  }
  shots.sort((a, b) => a.tick - b.tick || a.group.localeCompare(b.group));
  return shots;
}

/**
 * Installs the page-side driver: a command queue and a stepper that keeps the
 * renderer's clock locked to the simulation tick.
 */
const DRIVER = () => {
  const play = window.__dnfi.play;
  const raf = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  const CLOCK0 = 40;
  window.__loop = {
    commands: [], index: 0,
    start(commands, seed) {
      this.commands = commands;
      this.index = 0;
      play.start(seed >>> 0);
      play.manual(true);
      window.__dnfi.clock(CLOCK0);
    },
    /** Fires every command whose tick has arrived. */
    pump() {
      const state = play.state();
      while (this.index < this.commands.length && this.commands[this.index].tick <= state.tick) {
        const command = this.commands[this.index];
        this.index += 1;
        if (command.kind === "hatch") play.hatch?.();
        else play.launch(command.ingredient, command.angle, command.power ?? undefined);
      }
    },
    /**
     * Advances to `tick`. `perFrame` above 1 fast-forwards: the simulation runs
     * in blocks between commands so a command still lands on its exact tick,
     * and only the intermediate pictures are skipped. Stepping one tick per
     * animation frame costs a React render per tick, which is why the whole
     * shift is not played that way.
     */
    async runTo(tick, perFrame) {
      let guard = 0;
      for (;;) {
        const state = play.state();
        if (!state || state.phase !== "playing" || state.tick >= tick || guard > 20000) break;
        this.pump();
        const next = this.commands[this.index] ? this.commands[this.index].tick : Infinity;
        const limit = Math.min(tick, Math.max(next, play.state().tick + 1));
        const span = Math.max(1, Math.min(limit - play.state().tick, perFrame));
        play.step(span);
        window.__dnfi.clock(CLOCK0 + play.state().tick / 60);
        guard += 1;
        await raf();
      }
      this.pump();
      return play.state();
    },
    state() { return play.state(); },
  };
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = path.join(ROOT, "docs", "qa", "loop", `iter-${args.iter}`);
  const frameDir = path.join(outDir, "frames");
  await mkdir(frameDir, { recursive: true });

  console.log(`[loop-shots] running the moderate bot on seed ${args.seed}`);
  const run = playShift("moderate", args.seed >>> 0);
  console.log(`[loop-shots] ${(run.ticks / TICKS).toFixed(1)}s, ${run.feeds} feeds, ${run.commands.length} commands, cause ${run.cause}`);
  const schedule = buildSchedule(run);
  console.log(`[loop-shots] ${schedule.length} frames scheduled across ${new Set(schedule.map((s) => s.group)).size} groups`);

  const server = await startDevServer(ROOT, args.port);
  const browser = await chromium.launch({
    ...(CHROMIUM ? { executablePath: CHROMIUM } : {}),
    headless: !args.headed,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-device-scale-factor=1", "--hide-scrollbars"],
  });

  const groups = new Map();
  const startedAt = Date.now();
  let shotCount = 0;
  let timing = null;
  try {
    // Taller than 1080 so the whole shell — canvas, HUD and control deck — is
    // in frame. Render cost is measured separately at exactly 1920x1080.
    const context = await browser.newContext({ viewport: { width: WIDTH, height: SHELL_HEIGHT }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on("pageerror", (error) => console.error("[page error]", error.message));
    await page.goto(server.url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.__dnfi && window.__dnfi.play), null, { timeout: 60_000 });
    await waitForScene(page);
    await page.addStyleTag({ content: FRAME_PAGE });
    await settle(page, 5);

    // A fixed clip rectangle rather than an element screenshot: Playwright's
    // element capture re-measures and waits for stability on every call, which
    // on a canvas that never stops moving costs more than the frame is worth.
    const shell = page.locator(".game-shell");
    const box = await shell.boundingBox();
    const clip = {
      x: Math.round(box.x), y: Math.round(box.y),
      width: Math.min(WIDTH - Math.round(box.x), Math.round(box.width)),
      height: Math.min(SHELL_HEIGHT - Math.round(box.y), Math.round(box.height)),
    };
    // JPEG rather than PNG: the encode is several times cheaper, there are a
    // hundred of these per iteration, and stream-resolution review is exactly
    // the case where lossy compression is the honest medium anyway.
    const shoot = (file) => page.screenshot({ path: file, clip, type: "jpeg", quality: 92 });
    await shoot(path.join(outDir, "hud-title.jpg"));

    await page.evaluate(DRIVER);
    await page.evaluate(({ commands, seed }) => window.__loop.start(commands, seed),
      { commands: run.commands, seed: args.seed });

    let previous = 0;
    for (const shot of schedule) {
      // Settle the performance for a second of real ticks before a capture
      // that follows a fast-forward; consecutive strip frames need nothing.
      const gap = shot.tick - previous;
      if (gap > SETTLE_TICKS) {
        await page.evaluate((tick) => window.__loop.runTo(tick, 600), Math.max(previous, shot.tick - SETTLE_TICKS));
      }
      await page.evaluate((tick) => window.__loop.runTo(tick, 1), shot.tick);
      previous = shot.tick;
      const state = await page.evaluate(() => window.__loop.state());
      shotCount += 1;
      const file = path.join(frameDir, `${shot.group}-${String(shot.index).padStart(2, "0")}.jpg`);
      await shoot(file);
      if (shot.index === 0) {
        console.log(`[loop-shots] ${shot.group} at ${(shot.tick / TICKS).toFixed(1)}s `
          + `(${shotCount} frames, ${Math.round((Date.now() - startedAt) / 1000)}s elapsed)`);
      }
      const entry = groups.get(shot.group) ?? { kind: shot.kind, frames: [], labels: [] };
      entry.frames.push(file);
      entry.labels.push(`${(shot.tick / TICKS).toFixed(1)}s  score ${state?.score ?? 0}`);
      groups.set(shot.group, entry);
      if (state && state.phase !== "playing") break;
    }

    // Run out whatever is left so the ending screen is the real one.
    await page.evaluate(() => window.__loop.runTo(10_000_000, 60));
    await settle(page, 8);
    await shoot(path.join(outDir, "hud-end.jpg"));
    const finalState = await page.evaluate(() => window.__loop.state());

    // Assemble.
    const created = [path.join(outDir, "hud-title.jpg"), path.join(outDir, "hud-end.jpg")];
    for (const [name, entry] of groups) {
      if (entry.kind === "still") {
        const file = path.join(outDir, `${name}.jpg`);
        await page.evaluate(() => null);
        created.push(file);
        await (async () => {
          const { copyFile } = await import("node:fs/promises");
          await copyFile(entry.frames[0], file);
        })();
        continue;
      }
      const out = path.join(outDir, `${name}.png`);
      if (entry.kind === "strip") await buildStrip(page, entry.frames, out, entry.labels, 400);
      else {
        await buildGrid(page, entry.frames, out, entry.labels, 4, 480);
        const clipDir = path.join(outDir, name);
        await mkdir(clipDir, { recursive: true });
        const { copyFile } = await import("node:fs/promises");
        const copies = [];
        for (const [index, frame] of entry.frames.entries()) {
          const to = path.join(clipDir, `frame-${String(index).padStart(2, "0")}.jpg`);
          await copyFile(frame, to);
          copies.push(to);
        }
        await makeStreamCopies(page, copies);
      }
      created.push(out);
    }
    await makeStreamCopies(page, created);

    // The budget is stated at 1920x1080 with the canvas filling the frame, so
    // it is measured that way rather than on the capture layout.
    const timingContext = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    const timingPage = await timingContext.newPage();
    await timingPage.goto(server.url, { waitUntil: "domcontentloaded" });
    await timingPage.waitForFunction(() => Boolean(window.__dnfi && window.__dnfi.play), null, { timeout: 60_000 });
    await waitForScene(timingPage);
    await timingPage.addStyleTag({ content: STAGE_FILL });
    await settle(timingPage, 5);
    timing = await measureRenderCost(timingPage);
    await timingPage.close();
    console.log(`[loop-shots] render ${timing.median.toFixed(2)} ms median / ${timing.p95.toFixed(2)} ms p95 / `
      + `${timing.average.toFixed(2)} ms mean / ${timing.max.toFixed(2)} ms max over ${timing.samples} frames`);

    const manifest = {
      iteration: args.iter,
      capturedAt: new Date().toISOString(),
      seed: args.seed,
      viewport: { width: WIDTH, height: HEIGHT },
      bot: { name: "moderate", ticks: run.ticks, seconds: run.ticks / TICKS, feeds: run.feeds, score: run.score, cause: run.cause, markers: run.markers },
      browserFinal: finalState,
      groups: [...groups.keys()],
      renderTiming: timing,
    };
    await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`[loop-shots] wrote ${created.length} sheets to ${path.relative(ROOT, outDir)}`);
  } finally {
    await browser.close();
    stopServer(server.child);
    await wait(300);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
