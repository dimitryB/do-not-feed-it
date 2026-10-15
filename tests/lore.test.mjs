import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ENDINGS, createArcade, endingFor, launchFood, slamHatch, stepArcade } from "../lib/game/arcade.ts";
import {
  ALL_VERSES, CAPTIONS, CAUSES, CRAVING_LINES, ENDING_JOKES, HALLOWEEN, HEADLINES, PRESS_E, TOKEN_TRAITS, VERSES, WALLET_TIERS, forkCaption, missCaption, pressELine, tokenCopy, verseAt,
} from "../lib/render/lore.ts";
import { FLICKER_DARKEST, flickerAt, seasonFor } from "../lib/render/season.ts";
import { PRESS_E_EVERY, PRESS_E_FIRST, PRESS_E_FLIGHT, PRESS_E_OPEN, pressEPhase } from "../lib/render/pressE.ts";

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

test("the page says nothing about claims, drains, exploits or prices", () => {
  // Sept 9 office hours: the judges had just answered questions about an
  // exploited claim contract (docs/LORE.md, D131). "Unaudited" on the specimen
  // card is kept by the user's call; nothing else goes near it.
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const copy = [...page.matchAll(/>([^<>{}]{3,})</g), ...page.matchAll(/'([^'\n]{6,})'/g)].map((m) => m[1]).join(" ");
  assert.doesNotMatch(copy.replace(/Friendly disposition\. Unaudited\.|UNAUDITED BUT FRIENDLY/g, ""), /audit|re-?entran|airdrop|drain|exploit|hack|rug|price|pump|dump/i);
  // "Unaudited" only ever appears next to "friendly", about the creature.
  assert.match(copy, /Friendly disposition\. Unaudited\./);
  assert.match(copy, /UNAUDITED BUT FRIENDLY/);
  assert.match(copy, /veHEMI/);
});

test("press E says a little more each time, then repeats its last line", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 40].map(pressELine), ["YOU PRESSED E.", "NOTHING HAPPENED.", "E IS NOT A TOKEN.", "WAIT FOR IT.", "WAIT FOR IT.", "WAIT FOR IT."]);
  assert.equal(pressELine(0), PRESS_E[0]);
  for (const line of PRESS_E) assert.ok(line.length <= 24 && line === line.toUpperCase() && line.endsWith("."), line);
});

test("Halloween runs October 15 to November 2 in local time, and the URL can force it either way", () => {
  const on = (m, d) => seasonFor(new Date(2026, m - 1, d, 12));
  assert.equal(on(10, 12), null);
  assert.equal(on(10, 14), null);
  assert.equal(on(10, 15), "halloween");
  assert.equal(on(10, 29), "halloween"); // the judging stream
  assert.equal(on(11, 2), "halloween");
  assert.equal(on(11, 3), null);
  assert.equal(seasonFor(new Date(2026, 5, 1), "?season=halloween"), "halloween");
  assert.equal(seasonFor(new Date(2026, 9, 29), "?season=none"), null);
  assert.equal(HALLOWEEN.tag, "TRICK OR TOKEN");
  assert.match(HALLOWEEN.costume, /whale/);
});

test("the Halloween flicker only darkens, and never more than three dips in any second", () => {
  const step = 1 / 120;
  const samples = [];
  for (let t = 0; t < 600; t += step) samples.push(flickerAt(t));
  assert.ok(samples.every((f) => f >= 0 && f <= 1), "a dip is between steady and the darkest");
  assert.ok(samples.some((f) => f > 0.9), "it does dip");
  assert.ok(FLICKER_DARKEST <= 0.3, "and never by much");
  const starts = [];
  for (let i = 1; i < samples.length; i += 1) if (samples[i - 1] === 0 && samples[i] > 0) starts.push(i * step);
  for (let i = 0; i < starts.length; i += 1) {
    const inSecond = starts.filter((t) => t >= starts[i] && t < starts[i] + 1).length;
    assert.ok(inSecond <= 3, `${inSecond} dips in the second from ${starts[i].toFixed(2)} s`);
  }
  assert.ok(starts.length >= 600 / 8 - 1, "a burst every eight seconds or so");
});

test("the Hemi callbacks land on what is on screen, and never name anyone", () => {
  assert.equal(missCaption("metal"), "BITCOIN BEING BITCOIN.");
  assert.equal(missCaption("balloon"), "TX DROPPED.");
  assert.equal(missCaption("pepper"), "TX DROPPED.");
  assert.equal(missCaption(null), "TX DROPPED.");
  const forks = Array.from({ length: 30 }, (_, i) => forkCaption(i, 500));
  assert.equal(forks.filter((c) => c === "GLAMSTERDAM +500").length, 10, "one fork in three is Glamsterdam");
  assert.ok(forks.every((c) => c === "GLAMSTERDAM +500" || c === "HARD FORK +500"));
  assert.equal(forkCaption(7, 500), forkCaption(7, 500), "a replay says the same thing");
  assert.equal(CAPTIONS.weapon, "veHEMI IS A WEAPON.");
  assert.equal(CAPTIONS.lunge, "IT IS STILL COMING.");
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  for (const line of ["Ding, ding, ding.", "hand-eye coordination of a sloth", "Maximum commitment.", "Press E"]) {
    assert.ok(page.includes(line), line);
  }
  // Names only ever come from the verses' citations, never from the page or a caption; and it is never "season two".
  const everything = [page, ...Object.values(CAPTIONS).map((c) => (typeof c === "function" ? c(500) : c))].join(" ");
  assert.doesNotMatch(everything, /\b(Rick|Max|Jeremy|Joshua|JCV|John|Marco|Alpha|Alex)\b/);
  assert.doesNotMatch(everything, /season (two|2)/i);
});

test("the verses are real citations: a book, chapter:verse, a show and a date, nothing religious, nothing in a caption", () => {
  const books = new Set(["Max", "John", "Rick", "Jeremy", "Marco", "Office Hours"]);
  for (const v of ALL_VERSES) {
    assert.ok(books.has(v.who), `${v.who} is a known speaker or the show`);
    assert.match(v.at, /^\d{1,2}:\d{2}$/, `${v.who} ${v.at} reads as chapter:verse`);
    assert.ok(v.show === "Midweek with Max" || v.show === "Office Hours");
    assert.match(v.date, /^(Sept|Oct) \d{1,2}$/);
    assert.ok(v.text.length >= 12 && v.text.length <= 110, v.text);
    assert.doesNotMatch(v.text, /\b(God|Jesus|Christ|Lord|amen)\b/i);
    assert.doesNotMatch(v.text, /price|pump|dump|rug|hack|exploit|airdrop|fat|stairs/i);
  }
  const captions = Object.values(CAPTIONS).map((c) => (typeof c === "function" ? c(500) : c)).join(" ");
  for (const v of ALL_VERSES) assert.ok(!captions.includes(v.text), "a verse is never a caption");
  assert.equal(`${VERSES.pause[0].who} ${VERSES.pause[0].at}`, "Max 13:06");
  assert.equal(verseAt(VERSES.title, 0), VERSES.title[0]);
  assert.equal(verseAt(VERSES.title, VERSES.title.length + 1), VERSES.title[1]);
  assert.equal(verseAt(VERSES.pause, -1), VERSES.pause[VERSES.pause.length - 1]);
});

test("the PRESS E sign: first at 20 s, then every 75 s, flying then open, and gone in between", () => {
  assert.equal(pressEPhase(0), null);
  assert.equal(pressEPhase(PRESS_E_FIRST - 1), null);
  assert.deepEqual(pressEPhase(PRESS_E_FIRST), { index: 0, phase: "flying", t: 0 });
  assert.equal(pressEPhase(PRESS_E_FIRST + PRESS_E_FLIGHT).phase, "open");
  assert.equal(pressEPhase(PRESS_E_FIRST + PRESS_E_FLIGHT + PRESS_E_OPEN - 1).phase, "open");
  assert.equal(pressEPhase(PRESS_E_FIRST + PRESS_E_FLIGHT + PRESS_E_OPEN), null, "it goes");
  assert.equal(pressEPhase(PRESS_E_FIRST + PRESS_E_EVERY).index, 1, "and comes back");
  assert.equal(pressEPhase(PRESS_E_FIRST + 3 * PRESS_E_EVERY + 10).index, 3);
  assert.ok(PRESS_E_FIRST / 60 <= 30, "a judge sees it in the first half minute");
  assert.ok((PRESS_E_FLIGHT + PRESS_E_OPEN) / 60 >= 2.5, "long enough to react on a stream");
  let up = 0;
  for (let tick = 0; tick < 12 * 3600; tick += 1) if (pressEPhase(tick)) up += 1;
  assert.ok(up / (12 * 3600) < 0.06, "it is up less than 6 % of a shift, so it never crowds out the captions");
});
