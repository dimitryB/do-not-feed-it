#!/usr/bin/env node
/**
 * Reads the pose the animator actually settled on, at a given state.
 *
 * Three captures in a row failed to move the creature's mouth at high
 * irritation and each one cost sixteen minutes to find that out. A capture
 * shows you the frame; it does not tell you which channel is winning. This
 * prints the channels.
 *
 * Usage: node --experimental-strip-types scripts/pose-probe.mjs [--rage 87]
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { CHROMIUM, HEIGHT, WIDTH, settle, startDevServer, stopServer, waitForScene } from "./shot-kit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = { port: 4411, rage: 87, size: 1.75 };
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === "--port") args.port = Number(process.argv[++i]);
  else if (process.argv[i] === "--rage") args.rage = Number(process.argv[++i]);
  else if (process.argv[i] === "--size") args.size = Number(process.argv[++i]);
}

const WATCH = ["cornerLift", "mouthWidth", "jawOpen", "lipPress", "teethBare",
  "browAngry", "browRaise", "lowerLid", "lidLeft", "rageFlush", "headY", "bodyRise"];

const server = await startDevServer(ROOT, args.port);
const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
try {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(server.url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__dnfi && window.__dnfi.play && window.__dnfi.poseNow), null, { timeout: 60_000 });
  await waitForScene(page);
  await settle(page, 5);

  // Each case is a state a shift reaches, and the interesting comparison is
  // between calm and furious with the same reaction playing over the top.
  const CASES = [
    { name: "calm", rage: 4, burp: false },
    { name: `rage ${args.rage}`, rage: args.rage, burp: false },
    { name: `rage ${args.rage} + burp`, rage: args.rage, burp: true },
  ];
  for (const item of CASES) {
    const pose = await page.evaluate(async (c) => {
      const play = window.__dnfi.play;
      play.start(4242);
      play.manual(true);
      play.setSize(c.size);
      play.setMutations({ metal: 2, balloon: 2, pepper: 2 }, { clog: 0.2 });
      for (let i = 0; i < 200; i += 1) { play.setRage(c.rage); play.step(1); }
      if (c.burp) {
        // Drive the pressure to the top and let the rules fire the burp, so the
        // reaction under test is the real one and not a hand-built pose.
        for (let i = 0; i < 400; i += 1) {
          play.setRage(c.rage);
          play.setMutations({ metal: 2, balloon: 2, pepper: 2 }, { clog: 0.2, pressure: 0.99 });
          play.step(1);
          const events = play.state().events ?? [];
          if (events.some((e) => e.type === "burp" && play.state().tick - e.tick < 30)) break;
        }
      }
      play.setRage(c.rage);
      for (let i = 0; i < 40; i += 1) await new Promise((r) => requestAnimationFrame(() => r(null)));
      return window.__dnfi.poseNow();
    }, { ...item, size: args.size });
    const shown = WATCH.map((k) => `${k} ${Number(pose[k] ?? 0).toFixed(2)}`).join("  ");
    console.log(`${item.name.padEnd(18)} ${shown}`);
  }
} finally {
  await browser.close();
  await stopServer(server.child);
}
