#!/usr/bin/env node
/**
 * Lore review harness: every screen and caption the lore pass changed, filmed
 * once, at 1920 and at stream width (960).
 *
 *   docs/qa/lore/iter-N/
 *     title.png, help.png, pause.png      the DOM screens
 *     cap-<event>.png                     the first time each captioned event happens in a real shift
 *     end-<cause>-<tier>.png              the post-mortem, one per cause, across the tiers
 *     *-stream.png                        the same at 960 px
 *     manifest.json                       what was filmed, at which tick, and the caption widths
 *
 * The shift is the moderate bot's (`loop-bots.mjs`), replayed tick for tick
 * through the development play hook; the post-mortems that a shift does not
 * reach are set up with the same hooks (size, vitals, rage). Measures every
 * caption in the canvas's own display face and flags any wider than the slot.
 *
 * Usage: node --experimental-strip-types scripts/lore-shots.mjs --iter 1 [--seed 20260911] [--port 4331]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { playShift } from "./loop-bots.mjs";
import { ARENA, createArcade, launchFood, slamHatch, stepArcade } from "../lib/game/arcade.ts";
import { CAPTIONS, CRAVING_LINES, TOKEN_TRAITS } from "../lib/render/lore.ts";
import { flickerAt } from "../lib/render/season.ts";
import { PRESS_E_FIRST, PRESS_E_FLIGHT } from "../lib/render/pressE.ts";
import { CHROMIUM, WIDTH, makeStreamCopies, settle, startDevServer, stopServer, waitForScene } from "./shot-kit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHELL_HEIGHT = 1320;
const FRAME_PAGE = `
  .masthead,.underbar{display:none!important}
  main{max-width:none!important;min-width:0!important;padding:0!important;margin:0!important;gap:0!important}
  .game-shell{border:0!important;border-radius:0!important;box-shadow:none!important;margin:0!important}
  html,body{background:#000!important;overflow:hidden!important;margin:0!important}
`;

/** The events worth a frame, keyed by what the caption should say. */
const TARGETS = [
  { key: "based", match: (e) => e.type === "feed" && /^CRAVING/.test(e.label) },
  { key: "reverted", match: (e) => e.type === "clank" },
  { key: "tx-dropped", match: (e) => e.type === "miss" && e.ingredient !== "metal" },
  { key: "btc-miss", match: (e) => e.type === "miss" && e.ingredient === "metal" },
  { key: "still-coming", match: (e) => e.type === "beat" && e.name === "lunge" },
  { key: "vehemi-weapon", match: (e) => e.type === "flame" && e.name === "breath", lag: 12 },
  { key: "gas-spike", match: (e) => e.type === "bounce" && e.name === "belly" },
  { key: "multi-hop", match: (e) => e.type === "bank" && /^(DOUBLE|TRIPLE) BANK/.test(e.label) },
  { key: "scaling", match: (e) => e.type === "grow" },
  { key: "mutation", match: (e) => e.type === "mutation" },
  { key: "fomo", match: (e) => e.type === "frenzy" && e.name === "start", lag: 30 },
  { key: "fork-or-wallet", match: (e) => e.type === "utensil" && e.name === "caught" },
  { key: "forked", match: (e) => e.type === "jam" && e.name === "utensil" },
  { key: "front-run", match: (e) => e.type === "jam" && e.name === "lunge" },
  { key: "token-burn", match: (e) => e.type === "fire" && e.name === "start" },
  { key: "slippage", match: (e) => e.type === "beat" && e.name === "drool" },
  { key: "mev-bot", match: (e) => e.type === "beat" && e.name === "bite" && /VENT/.test(e.label) },
  { key: "tx-pending", match: (e) => e.type === "beat" && e.name === "last-serving" },
];

/** The first tick each target happens on in the bot's shift, replayed in Node. */
function firstTicks(seed, commands) {
  const found = new Map();
  const state = createArcade(seed);
  let last = 0;
  const look = () => {
    for (const e of state.events) {
      if (e.id <= last) continue;
      last = e.id;
      for (const t of TARGETS) if (!found.has(t.key) && t.match(e)) found.set(t.key, { tick: e.tick, type: e.type, name: e.name, label: e.label });
    }
  };
  for (const c of commands) {
    while (state.tick < c.tick && state.phase === "playing") { stepArcade(state); look(); }
    if (c.kind === "hatch") slamHatch(state); else launchFood(state, c.ingredient, c.angle, c.power);
    look();
  }
  while (state.phase === "playing") { stepArcade(state); look(); }
  return found;
}

function parseArgs(argv) {
  const args = { iter: 1, seed: 20260911, port: 4331 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--iter") args.iter = Number(argv[++i]);
    else if (argv[i] === "--seed") args.seed = Number(argv[++i]);
    else if (argv[i] === "--port") args.port = Number(argv[++i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = path.join(ROOT, "docs", "qa", "lore", `iter-${args.iter}`);
  await mkdir(outDir, { recursive: true });
  const run = playShift("moderate", args.seed >>> 0);
  console.log(`[lore-shots] moderate bot, seed ${args.seed}: ${(run.ticks / 60).toFixed(1)} s, ${run.commands.length} commands, ${run.cause}`);

  const server = await startDevServer(ROOT, args.port);
  const browser = await chromium.launch({
    ...(CHROMIUM ? { executablePath: CHROMIUM } : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-device-scale-factor=1", "--hide-scrollbars"],
  });
  const manifest = { seed: args.seed, shots: [], captionWidths: [], errors: [] };
  const files = [];
  try {
    const context = await browser.newContext({ viewport: { width: WIDTH, height: SHELL_HEIGHT }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on("pageerror", (error) => manifest.errors.push(error.message));
    // `?season=none`: the captures do not change with the calendar. Halloween is filmed on purpose, at the end.
    await page.goto(`${server.url}?season=none`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => { try { localStorage.clear(); } catch { /* fine */ } });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.__dnfi && window.__dnfi.play), null, { timeout: 60_000 });
    await waitForScene(page);
    await page.addStyleTag({ content: FRAME_PAGE });
    await settle(page, 8);
    const shell = await page.locator(".game-shell").boundingBox();
    const clip = { x: Math.round(shell.x), y: Math.round(shell.y), width: Math.round(shell.width), height: Math.round(shell.height) };
    const shoot = async (name, note = {}) => {
      await settle(page, 3);
      const file = path.join(outDir, `${name}.png`);
      await page.screenshot({ path: file, clip });
      files.push(file);
      manifest.shots.push({ name, ...note });
    };

    // ---- the caption widths, in the canvas's own display face.
    const lines = [
      ...Object.entries(CAPTIONS).map(([k, c]) => ({ key: k, text: typeof c === "function" ? c(500) : c, size: k === "scaling" ? 70 : k === "noRoom" ? 60 : k === "frenzy" ? 92 : k === "dropped" || k === "btcMiss" ? 36 : k === "lunge" ? 44 : 50, card: k === "scaling" || k === "noRoom" })),
      ...Object.values(TOKEN_TRAITS).map((t) => ({ key: "mutation", text: `${t.toUpperCase()} ×3`, size: 58, card: true })),
      ...Object.values(CRAVING_LINES).map((t) => ({ key: "craving", text: t, size: 42, card: false })),
      ...["MULTI-HOP ×3", "TRIPLE HOP ×4", "OFF THE GAS BELLY ×2", "OFF THE CHAIN ×2"].map((t) => ({ key: "bank", text: t, size: 54, card: false })),
      ...["FORKED.", "FRONT-RUN", "TX STUCK.", "MAXI TANTRUM"].map((t) => ({ key: "jam", text: t, size: 44, card: false })),
      ...["EXTRACTOR: EATEN.", "IT TOOK THE TRAY.", "ONE TX PENDING."].map((t) => ({ key: "beat", text: t, size: 44, card: false })),
    ];
    manifest.captionWidths = await page.evaluate((items) => {
      const DISPLAY = "Impact,'Arial Black','DejaVu Sans Condensed','Helvetica Neue',Arial,sans-serif";
      const ctx = document.createElement("canvas").getContext("2d");
      return items.map((item) => {
        ctx.font = `700 ${item.size}px ${DISPLAY}`;
        const width = Math.round(ctx.measureText(item.text).width + (item.card ? 56 : 16));
        return { ...item, width, fits: width <= 600 };
      });
    }, lines);
    const wide = manifest.captionWidths.filter((c) => !c.fits);
    console.log(`[lore-shots] ${manifest.captionWidths.length} captions measured, ${wide.length} wider than the slot${wide.length ? `: ${wide.map((c) => `${c.text} (${c.width})`).join(", ")}` : ""}`);

    // ---- the DOM screens.
    await shoot("title");
    await page.getByRole("button", { name: "How to play" }).first().click();
    await shoot("help");
    await page.keyboard.press("Escape");
    await settle(page, 3);
    // The sound mix lives in the footer the frame hides; open it from script.
    await page.evaluate(() => [...document.querySelectorAll(".underbar .text-button")].find((b) => b.textContent.includes("Sound mix"))?.click());
    await settle(page, 4);
    await shoot("sound-mix");
    await page.keyboard.press("Escape");
    await settle(page, 3);

    // ---- press E, twice, on the title. The caption's pop is frozen 0.3 s in, so
    // a slow frame cannot film it half faded.
    await page.addStyleTag({ content: ".press-e{animation-delay:-.3s!important;animation-play-state:paused!important}" });
    for (const n of [1, 2]) {
      await page.keyboard.press("e");
      await page.waitForTimeout(260);
      await shoot(`press-e-title-${n}`);
    }
    await page.waitForTimeout(1800);

    // ---- one real shift, stopping on each captioned event the first time it happens.
    await page.evaluate((seed) => { window.__dnfi.play.start(seed >>> 0); window.__dnfi.play.manual(true); window.__dnfi.clock(40); }, args.seed);
    // Where each target first happens, found by replaying the bot's commands in
    // Node; the browser replays the same commands on the same ticks, so the
    // event lands on the same tick there and the run can fast-forward to it.
    const commands = run.commands;
    const planned = firstTicks(args.seed >>> 0, commands);
    const pending = new Set(TARGETS.map((t) => t.key).filter((k) => planned.has(k)));
    const queue = [...pending].map((key) => ({ key, ...planned.get(key) }));
    // The PRESS E sign: mid-flight, hanging in the slot, and the hit when E is pressed.
    queue.push({ key: "sign-flying", tick: PRESS_E_FIRST + 18, lag: 0 }, { key: "sign-open", tick: PRESS_E_FIRST + PRESS_E_FLIGHT + 40, lag: 0, press: true });
    queue.sort((a, b) => a.tick - b.tick);
    let index = 0;
    /** Fires every command whose tick has arrived, then steps up to `span` ticks without passing the next one. */
    const advance = async (span) => {
      let state = await page.evaluate(() => window.__dnfi.play.state());
      while (state && state.phase === "playing" && index < commands.length && commands[index].tick <= state.tick) {
        const c = commands[index++];
        await page.evaluate((cmd) => (cmd.kind === "hatch" ? window.__dnfi.play.hatch() : window.__dnfi.play.launch(cmd.ingredient, cmd.angle, cmd.power)), c);
      }
      if (!state || state.phase !== "playing") return state;
      const next = index < commands.length ? commands[index].tick : Infinity;
      const n = Math.max(1, Math.min(span, next - state.tick));
      state = await page.evaluate((k) => { const s = window.__dnfi.play.step(k); window.__dnfi.clock(40 + s.tick / 60); return s; }, n);
      await settle(page, 1);
      return state;
    };
    let state = await page.evaluate(() => window.__dnfi.play.state());
    for (const target of queue) {
      const lag = target.lag ?? TARGETS.find((t) => t.key === target.key)?.lag ?? 8;
      // Close in fast, then the last few ticks one by one so the renderer sees the event as it happens.
      while (state && state.phase === "playing" && state.tick < target.tick + lag) {
        const gap = target.tick - 6 - state.tick;
        state = await advance(gap > 0 ? gap : 1);
      }
      if (!state || state.phase !== "playing") break;
      pending.delete(target.key);
      await shoot(`cap-${target.key}`, { tick: target.tick, type: target.type, name: target.name ?? null, label: target.label });
      if (target.press) {
        await page.keyboard.press("e");
        for (let i = 0; i < 10 && state && state.phase === "playing"; i += 1) state = await advance(1);
        await shoot("cap-sign-hit", { tick: state?.tick ?? null });
      }
    }
    while (state && state.phase === "playing") state = await advance(600);
    manifest.notReached = [...pending];
    await page.evaluate(() => window.__dnfi.play.manual(false));
    await settle(page, 12);
    const real = await page.evaluate(() => window.__dnfi.play.state());
    await shoot(`end-real-${real.failureReason}-${real.ending}`, { tick: real.tick, cause: real.failureReason, ending: real.ending });

    // ---- the post-mortems a shift does not reach: each cause, across the tiers.
    const setups = [
      { name: "gas-shrimp", size: 1.05, kill: "hunger" },
      { name: "gas-dolphin", size: 1.6, kill: "hunger" },
      { name: "rekt-shark", size: 2.1, kill: "rage" },
      { name: "rekt-whale", size: 2.4, kill: "rage" },
      { name: "superfinality", size: 2.4, kill: "clock" },
    ];
    for (const setup of setups) {
      await page.evaluate(({ size, kill, maxTicks }) => {
        const play = window.__dnfi.play;
        play.start(4242); play.manual(true); play.setSize(size);
        if (kill === "hunger") { play.vitals({ hunger: 0 }); play.step(2); }
        else if (kill === "rage") { play.vitals({ rage: 250 }); play.step(1); }
        else {
          for (let i = 0; i < 1000; i += 1) {
            const s = play.vitals({ hunger: 100, rage: 0 });
            if (!s || s.phase !== "playing" || s.tick >= maxTicks) break;
            play.step(Math.min(60, maxTicks - s.tick));
          }
          play.vitals({ hunger: 100, rage: 0 }); play.step(5);
        }
        play.manual(false);
      }, { ...setup, maxTicks: ARENA.maxTicks });
      await settle(page, 12);
      const s = await page.evaluate(() => window.__dnfi.play.state());
      await shoot(`end-${setup.name}`, { tick: s.tick, cause: s.failureReason, ending: s.ending });
    }

    // ---- pause, last: it needs a live shift.
    await page.evaluate(() => { window.__dnfi.play.start(77); window.__dnfi.play.manual(false); });
    await settle(page, 10);
    await page.keyboard.press("e");
    await page.waitForTimeout(260);
    await shoot("press-e-play");
    await page.keyboard.press("Escape");
    await shoot("pause");

    // ---- Halloween: the title steady, and at the bottom of a flicker.
    await page.keyboard.press("Escape");
    await page.goto(`${server.url}?season=halloween`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.__dnfi && window.__dnfi.play), null, { timeout: 60_000 });
    await waitForScene(page);
    await page.addStyleTag({ content: FRAME_PAGE });
    let deepest = 0;
    for (let t = 0; t < 16; t += 1 / 240) if (flickerAt(t) > flickerAt(deepest)) deepest = t;
    await page.evaluate(() => window.__dnfi.clock(0.5));
    await settle(page, 6);
    await shoot("title-halloween", { clock: 0.5, flicker: flickerAt(0.5) });
    await page.evaluate((t) => window.__dnfi.clock(t), deepest);
    await settle(page, 3);
    await shoot("title-halloween-flicker", { clock: deepest, flicker: flickerAt(deepest) });

    await makeStreamCopies(page, files);
  } finally {
    await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    await browser.close();
    await stopServer(server.child);
  }
  console.log(`[lore-shots] ${manifest.shots.length} shots in ${path.relative(ROOT, outDir)}; not reached: ${manifest.notReached?.join(", ") || "none"}; page errors: ${manifest.errors.length}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
