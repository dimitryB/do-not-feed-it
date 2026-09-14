#!/usr/bin/env node
/**
 * Photographs the HUD in a state that takes a hundred seconds of play to reach.
 *
 * The meters and the pay counter are the two places the HUD says something the
 * player has to act on, and both only appear deep into a shift — so checking a
 * change to either used to mean a twenty-five-minute capture run. This sets the
 * vitals directly and shoots one frame each side of a threshold.
 *
 * Usage: node --experimental-strip-types scripts/hud-state.mjs [outDir]
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { CHROMIUM, HEIGHT, WIDTH, settle, startDevServer, stopServer, waitForScene } from "./shot-kit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = process.argv[2] ?? "/tmp";
const STATES = [
  { name: "pay-above", hunger: 55, rage: 40, paidTicks: 4200 },
  { name: "pay-below", hunger: 18, rage: 40, paidTicks: 4200 },
  { name: "pay-edge", hunger: 28, rage: 30, paidTicks: 4200 },
  // Irritation in its dangerous half, so the OTHER consequence line shows.
  { name: "rage-high", hunger: 72, rage: 78, paidTicks: 4200 },
  // Aimed at the mouth and held to full charge, so the arrival marker and the
  // window fuse — the two readouts that only exist while a shot is being set
  // up — are actually on screen to be checked.
  { name: "aim-held", hunger: 70, rage: 20, paidTicks: 1200, aim: -46, hold: true, settle: 40 },
  { name: "aim-held-late", hunger: 70, rage: 20, paidTicks: 1200, aim: -46, hold: true, settle: 62 },
];

const server = await startDevServer(ROOT, 4423);
const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
try {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(server.url, { waitUntil: "domcontentloaded" });
  await waitForScene(page);
  for (const state of STATES) {
    await page.evaluate((s) => {
      const play = window.__dnfi.play;
      play.start();
      play.vitals({ hunger: s.hunger, rage: s.rage, paidTicks: s.paidTicks });
      if (s.aim !== undefined) play.point(s.aim);
      if (s.hold) play.hold(true);
    }, state);
    await settle(page, state.settle ?? 12);
    await page.screenshot({ path: path.join(outDir, `${state.name}.png`) });
    console.log(`wrote ${state.name}.png`);
  }
} finally {
  await browser.close();
  await stopServer(server.child);
}
