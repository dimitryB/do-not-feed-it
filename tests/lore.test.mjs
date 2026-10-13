import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ENDINGS, createArcade, endingFor, launchFood, slamHatch, stepArcade } from "../lib/game/arcade.ts";
import {
  CAPTIONS, CAUSES, CRAVING_LINES, ENDING_JOKES, HEADLINES, TOKEN_TRAITS, WALLET_TIERS, tokenCopy,
} from "../lib/render/lore.ts";

/**
 * The lore is presentation only (`docs/LORE.md`): the rules keep their kitchen
 * words and the screen translates them. These pin the translation, check that
 * nothing the rules can say reaches the screen untranslated, and hold every
 * caption to the width of the caption slot.
 */

/** Kitchen-only words the rules use that must never reach the screen as they are. */
const UNTRANSLATED = [
  "MAGNET MOUTH", "BALLOON BELLY", "FIRE BREATH", "DOUBLE BANK", "TRIPLE BANK", "UTENSIL",
  "FORK IN THE WORKS", "BITTEN", "IT ATE THE VENT", "THE LAST SERVING",
];

test("rule labels translate to lore copy, and the rest passes through", () => {
  assert.equal(tokenCopy("MAGNET MOUTH ×2"), "HODL JAWS ×2");
  assert.equal(tokenCopy("BALLOON BELLY ×1"), "GAS BELLY ×1");
  assert.equal(tokenCopy("FIRE BREATH ×3"), "TURBO BREATH ×3");
  assert.equal(tokenCopy("OFF THE BELLY ×2"), "OFF THE GAS BELLY ×2");
  assert.equal(tokenCopy("DOUBLE BANK ×3"), "MULTI-HOP ×3");
  assert.equal(tokenCopy("TRIPLE BANK ×4"), "TRIPLE HOP ×4");
  assert.equal(tokenCopy("UTENSIL +500"), "COLD STORAGE +500");
  assert.equal(tokenCopy("FORK IN THE WORKS"), "FORKED.");
  assert.equal(tokenCopy("BITTEN"), "FRONT-RUN");
  assert.equal(tokenCopy("TANTRUM"), "MAXI TANTRUM");
  assert.equal(tokenCopy("IT ATE THE VENT"), "EXTRACTOR: EATEN");
  assert.equal(tokenCopy("THE LAST SERVING"), "ONE TX PENDING");
  // Already right: the props, the chain, the jams that say what they are.
  assert.equal(tokenCopy("OFF THE PAN ×2"), "OFF THE PAN ×2");
  assert.equal(tokenCopy("OFF THE CHAIN ×2"), "OFF THE CHAIN ×2");
  assert.equal(tokenCopy("SINGED"), "SINGED");
  assert.equal(tokenCopy("IT TOOK THE TRAY"), "IT TOOK THE TRAY");
});

test("nothing the rules say in three frozen shifts reaches the screen in kitchen words", () => {
  const { traces } = JSON.parse(readFileSync(new URL("./fixtures/loop-traces.json", import.meta.url), "utf8"));
  // The event types whose label the renderer puts on screen through tokenCopy.
  const shown = new Set(["bank", "jam", "mutation", "beat"]);
  const seen = new Map();
  for (const trace of traces) {
    const state = createArcade(trace.seed);
    let last = 0;
    const collect = () => {
      for (const e of state.events) {
        if (e.id <= last) continue;
        last = e.id;
        if (shown.has(e.type)) seen.set(`${e.type}:${e.label.replace(/[×+]\d+$/, "")}`, e.label);
      }
    };
    for (const command of trace.commands) {
      while (state.tick < command.tick && state.phase === "playing") { stepArcade(state); collect(); }
      if (command.kind === "hatch") slamHatch(state);
      else launchFood(state, command.ingredient, command.angle, command.power);
      collect();
    }
    while (state.tick < trace.endTick && state.phase === "playing") { stepArcade(state); collect(); }
  }
  assert.ok(seen.size >= 8, `the shifts exercise a spread of labels (saw ${[...seen.keys()].join(", ")})`);
  for (const label of seen.values()) {
    const out = tokenCopy(label);
    for (const word of UNTRANSLATED) assert.ok(!out.includes(word), `"${label}" reaches the screen as "${out}"`);
  }
});

test("every ending has a cause, a joke and a wallet tier, smallest to largest", () => {
  assert.equal(ENDING_JOKES.length, ENDINGS.length);
  assert.equal(WALLET_TIERS.length, ENDINGS.length);
  assert.deepEqual(WALLET_TIERS.map((w) => w.tier), ["Shrimp", "Dolphin", "Shark", "Whale"]);
  for (const w of WALLET_TIERS) assert.ok(w.line.toLowerCase().startsWith(`wallet tier: ${w.tier.toLowerCase()}.`));
  // The tier tracks size: the smallest creature is a shrimp, the largest a whale.
  assert.equal(WALLET_TIERS[endingFor(1)].tier, "Shrimp");
  assert.equal(WALLET_TIERS[endingFor(99)].tier, "Whale");
  assert.deepEqual(Object.keys(CAUSES).sort(), ["empty-belly", "kitchen-destroyed", "outgrew-the-kitchen"]);
  assert.equal(CAUSES["empty-belly"], "OUT OF GAS.");
  assert.deepEqual([...HEADLINES.over, ...HEADLINES.back], ["IT’S SO", "OVER.", "WE’RE SO", "BACK."]);
});

test("captions fit the caption slot, and say no prices", () => {
  // The slot is centred 300 px in from the left edge, so a line has 600 px; at
  // the sizes the renderer uses that is about 24 characters of the display
  // face, and 18 for the boxed cards (larger type plus the box).
  const cards = [CAPTIONS.scaling, CAPTIONS.noRoom, ...Object.values(TOKEN_TRAITS).map((t) => `${t.toUpperCase()} ×3`)];
  const lines = [
    ...Object.values(CAPTIONS).map((c) => (typeof c === "function" ? c(500) : c)),
    ...Object.values(CRAVING_LINES),
    ...["MULTI-HOP ×3", "TRIPLE HOP ×4", "OFF THE GAS BELLY ×2", "FORKED.", "FRONT-RUN", "EXTRACTOR: EATEN.", "ONE TX PENDING."],
  ];
  for (const c of cards) assert.ok(c.length <= 18, `card "${c}" is ${c.length} characters`);
  for (const c of lines) assert.ok(c.length <= 24, `caption "${c}" is ${c.length} characters`);
  const everything = [...lines, ...cards, ...ENDING_JOKES, ...WALLET_TIERS.map((w) => w.line), ...Object.values(CAUSES)].join(" ");
  assert.doesNotMatch(everything, /\$|price|pump|dump|crash|rug|hack|exploit|scam|liquidat|treasury|foundation|bags|seed phrase/i);
});
