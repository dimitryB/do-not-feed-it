#!/usr/bin/env node
/**
 * Stage 6 review harness: the cannon.
 *
 * Films the moments the aim work is about, each one set up in the pure rules
 * first and then replayed tick-for-tick in a real browser through the
 * development play hook, so every frame is a state the rules really reach:
 *
 *   lances        the barrel loaded with each coin at the same angle and charge:
 *                 the lance bends the way that coin flies
 *   flights       all three coins in the air at once: a heavy lob, a float, a
 *                 straight line
 *   block         a block on the chain under the ceiling
 *   block-hit     its own coin breaks it open and the coins pour into the mouth
 *   wrong-token   another coin glances off it
 *   late          a big, mutated creature with a block going past its face
 *
 *   docs/qa/aim/iter-N/<scene>.png (+ -stream.png at 960 px) and
 *   docs/qa/aim/iter-N/<scene>/frame-NN.jpg, manifest.json
 *
 * Usage: node --experimental-strip-types scripts/aim-shots.mjs --iter 1
 *        [--seed 20261015] [--port 4331] [--only block-hit,flights]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import * as arcade from "../lib/game/arcade.ts";
import {
  CHROMIUM, WIDTH, buildStrip, makeStreamCopies, settle, startDevServer, stopServer, waitForScene, wait,
} from "./shot-kit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { ARENA, FOODS, createArcade, launchFood, probeFlight, stepArcade } = arcade;
const TICKS = 60;
const SHELL_HEIGHT = 1320;
const FRAME_PAGE = `
  .masthead,.underbar{display:none!important}
  main{max-width:none!important;min-width:0!important;padding:0!important;margin:0!important;gap:0!important}
  .game-shell{border:0!important;border-radius:0!important;box-shadow:none!important;margin:0!important}
  html,body{background:#000!important;overflow:hidden!important;margin:0!important}
`;

function parseArgs(argv) {
  const args = { iter: 1, seed: 20261015, port: 4331, only: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--iter") args.iter = Number(argv[++i]);
    else if (argv[i] === "--seed") args.seed = Number(argv[++i]);
    else if (argv[i] === "--port") args.port = Number(argv[++i]);
    else if (argv[i] === "--only") args.only = argv[++i].split(",");
  }
  return args;
}

/* ---------------- the rules side: find the shots ---------------- */

/** A state at `tick` after replaying `commands` from `seed`, with the belly kept up so nothing ends early. */
function stateAt(seed, commands, tick) {
  const state = createArcade(seed);
  let index = 0;
  while (state.tick < tick && state.phase === "playing") {
    while (index < commands.length && commands[index].tick === state.tick) {
      const c = commands[index++];
      if (!launchFood(state, c.ingredient, c.angle, c.power)) throw new Error(`launch rejected at ${c.tick}`);
    }
    state.hunger = Math.max(state.hunger, 60);
    stepArcade(state);
  }
  return state;
}

/** The first tick at or after `from` when a crate has been on the rail for `age` ticks. */
function crateTick(seed, from, age) {
  const state = createArcade(seed);
  while (state.phase === "playing" && state.tick < 20_000) {
    state.hunger = Math.max(state.hunger, 60);
    stepArcade(state);
    const c = state.crates[0];
    if (c && state.tick >= from && state.tick - c.born >= age) return { tick: state.tick, crate: { ...c } };
  }
  throw new Error("no crate");
}

/** The centre of the widest run of angles whose shot does `want` at `power`. */
function bestShot(state, ingredient, want, powers = [16, 15, 14, 13, 12, 11]) {
  let best = null;
  for (const power of powers) {
    let run = [];
    for (let angle = ARENA.minAngle; angle <= ARENA.maxAngle + 1; angle += 1) {
      const ok = angle <= ARENA.maxAngle && want(probeFlight(state, ingredient, angle, power, 200));
      if (ok) run.push(angle);
      else if (run.length) {
        if (!best || run.length > best.width) best = { angle: run[Math.floor(run.length / 2)], power, width: run.length };
        run = [];
      }
    }
  }
  return best;
}

/** Every scene: the seed, the commands, and the ticks to film. */
function buildScenes(seed) {
  const scenes = [];

  // Three coins in the air at once.
  {
    const t0 = 330;
    const commands = [];
    const plan = [["balloon", 0], ["metal", 31], ["pepper", 62]];
    for (const [food, dt] of plan) {
      const state = stateAt(seed, commands, t0 + dt);
      const shot = bestShot(state, food, (r) => r.fed && !r.bank);
      if (shot) commands.push({ tick: t0 + dt, kind: "launch", ingredient: food, angle: shot.angle, power: shot.power });
    }
    const frames = [t0 + 64, t0 + 70, t0 + 76, t0 + 82, t0 + 88, t0 + 94];
    scenes.push({ name: "flights", seed, commands, frames, select: "pepper" });
  }

  // A block on the chain, mid-rail, and the hit.
  {
    const { tick, crate } = crateTick(seed, 0, 70);
    scenes.push({ name: "block", seed, commands: [], frames: [tick - 50, tick - 25, tick], select: crate.ingredient });
    const state = stateAt(seed, [], tick);
    const shot = bestShot(state, crate.ingredient, (r) => r.crate === true);
    if (shot) {
      const commands = [{ tick, kind: "launch", ingredient: crate.ingredient, angle: shot.angle, power: shot.power }];
      const hit = probeFlight(state, crate.ingredient, shot.angle, shot.power, 200).ticks;
      const at = tick + hit;
      scenes.push({ name: "block-hit", seed, commands, frames: [tick - 4, at - 6, at + 1, at + 8, at + 20, at + 34, at + 50, at + 70], select: crate.ingredient });
    }
  }

  // Wrong token: another coin, on a line that crosses the block.
  {
    const { tick, crate } = crateTick(seed, 0, 40);
    let found = null;
    for (const food of FOODS.filter((item) => item !== crate.ingredient)) {
      for (let delay = 0; delay <= 90 && !found; delay += 15) {
        for (let power = 16; power >= 10 && !found; power -= 2) {
          for (let angle = ARENA.minAngle; angle <= ARENA.maxAngle && !found; angle += 1) {
            const s = stateAt(seed, [], tick + delay);
            if (!s.crates.length || !launchFood(s, food, angle, power)) continue;
            for (let i = 0; i < 100; i += 1) {
              stepArcade(s);
              if (s.events.some((e) => e.tick === s.tick && e.type === "bounce" && e.name === "crate")) {
                found = { food, launch: tick + delay, angle, power, at: s.tick };
                break;
              }
            }
          }
        }
      }
      if (found) break;
    }
    if (found) {
      scenes.push({ name: "wrong-token", seed, commands: [{ tick: found.launch, kind: "launch", ingredient: found.food, angle: found.angle, power: found.power }],
        frames: [found.at - 8, found.at - 2, found.at + 2, found.at + 8, found.at + 16, found.at + 26], select: found.food });
    } else console.warn("[aim-shots] no wrong-token shot found");
  }

  // Each coin loaded, same angle, same charge: the lance bends its own way.
  scenes.push({ name: "lances", seed, commands: [], frames: [200, 200, 200], lances: ["metal", "balloon", "pepper"], angle: -42 });

  // Late: a big, mutated creature with a block going past its face.
  {
    const { tick } = crateTick(seed, 1500, 150);
    scenes.push({ name: "late", seed, commands: [], frames: [tick - 30, tick], late: true, select: "pepper" });
  }
  return scenes;
}

/* ---------------- the browser side: replay and film ---------------- */

const DRIVER = () => {
  const play = window.__dnfi.play;
  const raf = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  const CLOCK0 = 40;
  window.__aim = {
    commands: [], index: 0,
    start(seed, commands, late) {
      this.commands = commands; this.index = 0;
      play.start(seed >>> 0);
      play.manual(true);
      if (late) {
        play.setSize(2.1);
        play.setMutations({ metal: 2, balloon: 1, pepper: 2 }, { lift: 12 });
      }
      window.__dnfi.clock(CLOCK0);
    },
    async runTo(tick, keepFed) {
      let guard = 0;
      for (;;) {
        const state = play.state();
        if (!state || state.phase !== "playing" || state.tick >= tick || guard > 40000) break;
        while (this.index < this.commands.length && this.commands[this.index].tick <= state.tick) {
          const c = this.commands[this.index++];
          play.launch(c.ingredient, c.angle, c.power);
        }
        if (keepFed) play.vitals({ hunger: Math.max(state.hunger, 60) });
        const left = tick - state.tick;
        const next = this.index < this.commands.length ? this.commands[this.index].tick - state.tick : Infinity;
        // Never step past a command: it has to fire on its own tick.
        const span = Math.max(1, Math.min(left > 70 ? Math.min(left - 70, 240) : 1, next));
        play.step(span);
        window.__dnfi.clock(CLOCK0 + play.state().tick / 60);
        guard += 1;
        if (span === 1) await raf();
      }
      while (this.index < this.commands.length && this.commands[this.index].tick <= play.state().tick) {
        const c = this.commands[this.index++];
        play.launch(c.ingredient, c.angle, c.power);
      }
      return play.state();
    },
  };
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = path.join(ROOT, "docs", "qa", "aim", `iter-${args.iter}`);
  await mkdir(outDir, { recursive: true });
  let scenes = buildScenes(args.seed >>> 0);
  if (args.only) scenes = scenes.filter((scene) => args.only.includes(scene.name));
  console.log(`[aim-shots] ${scenes.length} scenes: ${scenes.map((s) => s.name).join(", ")}`);

  const server = await startDevServer(ROOT, args.port);
  const browser = await chromium.launch({
    ...(CHROMIUM ? { executablePath: CHROMIUM } : {}),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-device-scale-factor=1", "--hide-scrollbars"],
  });
  const manifest = { iteration: args.iter, seed: args.seed, capturedAt: new Date().toISOString(), scenes: [] };
  try {
    const context = await browser.newContext({ viewport: { width: WIDTH, height: SHELL_HEIGHT }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on("pageerror", (error) => console.error("[page error]", error.message));
    await page.goto(server.url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.__dnfi && window.__dnfi.play), null, { timeout: 60_000 });
    await waitForScene(page);
    await page.addStyleTag({ content: FRAME_PAGE });
    await settle(page, 5);
    const box = await page.locator(".game-shell").boundingBox();
    const clip = { x: Math.round(box.x), y: Math.round(box.y), width: Math.min(WIDTH, Math.round(box.width)), height: Math.min(SHELL_HEIGHT - Math.round(box.y), Math.round(box.height)) };
    await page.evaluate(DRIVER);

    for (const scene of scenes) {
      const dir = path.join(outDir, scene.name);
      await mkdir(dir, { recursive: true });
      const frames = [];
      const labels = [];
      if (scene.lances) {
        for (const [i, food] of scene.lances.entries()) {
          await page.evaluate(({ seed }) => window.__aim.start(seed, [], false), { seed: scene.seed });
          await page.evaluate((tick) => window.__aim.runTo(tick, true), scene.frames[i]);
          await page.evaluate(({ food: f, angle }) => {
            window.__dnfi.play.select(f); window.__dnfi.play.point(angle);
            const tick = window.__dnfi.play.state().tick;
            window.__dnfi.play.hold(true, tick - 24);
            window.__dnfi.play.step(1);
          }, { food, angle: scene.angle });
          await settle(page, 6);
          const file = path.join(dir, `frame-${String(i).padStart(2, "0")}.jpg`);
          await page.screenshot({ path: file, clip, type: "jpeg", quality: 92 });
          frames.push(file); labels.push(`${food} at ${scene.angle}°, 60% charge`);
          await page.evaluate(() => window.__dnfi.play.hold(false));
        }
      } else {
        await page.evaluate(({ seed, commands, late }) => window.__aim.start(seed, commands, late), { seed: scene.seed, commands: scene.commands, late: !!scene.late });
        if (scene.select) await page.evaluate((f) => window.__dnfi.play.select(f), scene.select);
        for (const [i, tick] of scene.frames.entries()) {
          const state = await page.evaluate((t) => window.__aim.runTo(t, true), tick);
          await settle(page, 2);
          const file = path.join(dir, `frame-${String(i).padStart(2, "0")}.jpg`);
          await page.screenshot({ path: file, clip, type: "jpeg", quality: 92 });
          frames.push(file);
          labels.push(`${(state.tick / TICKS).toFixed(2)}s  ${state.score}pts  crates ${state.crates.length}`);
        }
      }
      const sheet = path.join(outDir, `${scene.name}.png`);
      await buildStrip(page, frames, sheet, labels, frames.length > 4 ? 480 : 640);
      await makeStreamCopies(page, [sheet, ...frames]);
      manifest.scenes.push({ name: scene.name, seed: scene.seed, commands: scene.commands, frames: scene.frames });
      console.log(`[aim-shots] ${scene.name}: ${frames.length} frames`);
    }
    await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  } finally {
    await browser.close();
    await stopServer(server.child);
    await wait(300);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
