#!/usr/bin/env node
/**
 * Saves one piece of the built creature rig as a PNG, so a sprite can be looked
 * at on its own rather than guessed at from the frame it appears in.
 *
 * Usage: node --experimental-strip-types scripts/rig-part.mjs tongue out.png
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { CHROMIUM, HEIGHT, WIDTH, settle, startDevServer, stopServer, waitForScene } from "./shot-kit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const part = process.argv[2] ?? "tongue";
const out = process.argv[3] ?? `/tmp/${part}.png`;

const server = await startDevServer(ROOT, 4417);
const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
try {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(server.url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__dnfi && window.__dnfi.rigDump), null, { timeout: 60_000 });
  await waitForScene(page);
  await settle(page, 5);
  const url = await page.evaluate((name) => window.__dnfi.rigDump(name), part);
  if (!url) throw new Error(`no rig part named "${part}"`);
  await writeFile(out, Buffer.from(url.split(",")[1], "base64"));
  console.log(`wrote ${out}`);
} finally {
  await browser.close();
  await stopServer(server.child);
}
