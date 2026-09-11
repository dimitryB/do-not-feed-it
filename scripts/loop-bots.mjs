#!/usr/bin/env node
/**
 * Headless balance harness for the feeding loop.
 *
 * Three deterministic bots play the pure simulation. Nothing here reads a
 * clock, a renderer or `Math.random`: a bot's only randomness is aim noise
 * drawn from its own seeded stream, so a reported table is reproducible from
 * `--seed` alone.
 *
 *   naive     never aims (the default angle, mid power), fires on cooldown,
 *             never reacts. This is the current build's winning strategy and
 *             the gate that says the clicker is gone.
 *   moderate  reads the craving and the mouth rhythm through a 250 ms delay,
 *             with +/-4 degrees of aim noise.
 *   good      the same policy at 150 ms and +/-1.5 degrees.
 *
 * Reported per bot: survival-time percentiles, feeds, score, and the cause of
 * death. The moderate bot additionally reports decision density — how often
 * per minute the best available action actually changes, which is the closest
 * measurable proxy for "the player is deciding something".
 *
 * Usage:
 *   node --experimental-strip-types scripts/loop-bots.mjs [--shifts 200]
 *        [--seed 1] [--density-shifts 12] [--json FILE] [--fixtures FILE]
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import * as arcade from "../lib/game/arcade.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { ARENA, FOODS, createArcade, launchFood, stepArcade, replayArcade } = arcade;

/* ------------------------------------------------------------------ *
 * Capability detection.
 *
 * The harness is written once and has to keep running while the rules grow
 * underneath it, so every feature added after iteration 0 — launch power, the
 * reaction verb, the cheap flight probe — is detected rather than assumed.
 * ------------------------------------------------------------------ */
const HAS_POWER = Number.isFinite(ARENA.minPower) && Number.isFinite(ARENA.maxPower);
const HAS_HATCH = typeof arcade.slamHatch === "function";
const HAS_PROBE = typeof arcade.probeFlight === "function";
const TICKS = ARENA.tickRate ?? 60;
const MAX_TICKS = ARENA.maxTicks ?? ARENA.roundTicks ?? 7200;
const DEFAULT_POWER = HAS_POWER ? Math.round((ARENA.minPower + ARENA.maxPower) / 2) : null;

/** Coarse enough to evaluate at 60 Hz, fine enough that the bands are real. */
const ANGLE_STEP = 3;
const POWER_STEP = 2;
const ANGLES = [];
for (let a = ARENA.minAngle; a <= ARENA.maxAngle; a += ANGLE_STEP) ANGLES.push(a);
const POWERS = HAS_POWER
  ? (() => { const out = []; for (let p = ARENA.minPower; p <= ARENA.maxPower; p += POWER_STEP) out.push(p); return out; })()
  : [null];

/* ------------------------------------------------------------------ *
 * Deterministic noise, owned by the bot rather than by the rules.
 * ------------------------------------------------------------------ */
function stream(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ *
 * Flight probe.
 *
 * `probeFlight` is the sim's own pure predictor and is used when the rules
 * offer it. Before it exists the harness falls back to cloning the state and
 * running the real rules forward, which is slower but cannot disagree with
 * them.
 * ------------------------------------------------------------------ */
function probe(state, ingredient, angle, power) {
  if (HAS_PROBE) return arcade.probeFlight(state, ingredient, angle, power, 240);
  const copy = structuredClone(state);
  copy.events = [];
  // The probe answers "would this shot land", not "may I fire now": readiness
  // is a separate question and folding the two together turns every reload
  // into a decision change. Food already in the air is cleared for the same
  // reason — another snack landing mid-probe would otherwise be read as this
  // shot succeeding, which makes the plan flip at random.
  copy.projectiles = [];
  copy.lastLaunchTick = copy.tick - ARENA.cooldownTicks;
  if (!(power === null ? launchFood(copy, ingredient, angle) : launchFood(copy, ingredient, angle, power))) {
    return { fed: false, ticks: 0, bounces: 0 };
  }
  const id = copy.projectiles[copy.projectiles.length - 1].id;
  const feeds = copy.totalFeeds;
  for (let i = 1; i <= 240; i += 1) {
    stepArcade(copy);
    const live = copy.projectiles.find((item) => item.id === id);
    if (copy.totalFeeds > feeds) return { fed: true, ticks: i, bounces: 0 };
    if (!live || copy.phase !== "playing") return { fed: false, ticks: i, bounces: 0 };
  }
  return { fed: false, ticks: 240, bounces: 0 };
}

/** Which of `FOODS` the bot would rather be holding, before aiming at all. */
function ingredientOrder(view) {
  const wanted = view.wanted;
  const rest = FOODS.filter((food) => food !== wanted);
  return [wanted, ...rest];
}

/**
 * The best action available from `view`, as a coarse band rather than an exact
 * number: two shots a degree apart are the same decision, and counting them as
 * different would inflate decision density into meaninglessness.
 *
 * This is the player's *plan*, not their permission to fire. Reloading is not a
 * decision, so the launcher's cooldown is deliberately not consulted here;
 * "wait" is returned only when no shot on the grid would land, which is a real
 * choice to hold fire because the mouth is shut or out of reach.
 */
function bestAction(view) {
  if (view.phase !== "playing") return null;
  if (wantsHatch(view)) return { verb: "hatch" };
  let best = null;
  for (const ingredient of ingredientOrder(view)) {
    const craved = ingredient === view.wanted;
    for (const angle of ANGLES) {
      for (const power of POWERS) {
        const result = probe(view, ingredient, angle, power);
        if (!result.fed) continue;
        // Prefer the craving, then the shot that arrives soonest: a bot that
        // waits for a marginally better angle is not a player.
        const value = (craved ? 1000 : 0) + (result.bounces ? 120 : 0) - result.ticks;
        if (!best || value > best.value) {
          best = { verb: "launch", ingredient, angle, power, value, ticks: result.ticks };
        }
      }
    }
    if (best && best.ingredient === view.wanted) break;
  }
  if (!best) return { verb: "wait" };
  return best;
}

/**
 * Whether two plans are different decisions rather than the same decision
 * expressed a degree apart.
 *
 * Fixed bands were the first attempt and were wrong: a plan sitting on a band
 * edge flips every other tick and reports a hundred "decisions" a minute in a
 * game with none. Comparing plans to each other by a material threshold, and
 * only against the last plan actually counted, removes that entirely.
 */
function differs(a, b) {
  if (!a || !b) return a !== b;
  if (a.verb !== b.verb) return true;
  if (a.verb !== "launch") return false;
  if (a.ingredient !== b.ingredient) return true;
  if (Math.abs(a.angle - b.angle) >= 6) return true;
  if (a.power !== null && b.power !== null && Math.abs(a.power - b.power) >= 3) return true;
  return false;
}

/** A plan has to hold for this many ticks before it counts as a decision. */
const SETTLE_TICKS = 5;

function canLaunch(view) {
  if (view.phase !== "playing") return false;
  if (view.tick - view.lastLaunchTick < ARENA.cooldownTicks) return false;
  if (view.projectiles.length >= ARENA.maxProjectiles) return false;
  if (HAS_HATCH && view.hatchClosedUntil > view.tick) return false;
  if (view.reloadUntil > view.tick) return false;
  return true;
}

/**
 * The one reaction verb. A threat the rules have telegraphed is the only
 * reason to spend the hatch; pressing it on nothing costs the lockout anyway,
 * which is what makes it a decision.
 */
function wantsHatch(view) {
  if (!HAS_HATCH || view.phase !== "playing") return false;
  if (view.hatchClosedUntil > view.tick) return false;
  const threat = view.threat;
  if (!threat) return false;
  return threat.tick - view.tick <= 24 && threat.tick > view.tick;
}

/* ------------------------------------------------------------------ *
 * The bots.
 * ------------------------------------------------------------------ */
const BOTS = {
  naive: { latency: 0, noise: 0, blind: true },
  moderate: { latency: Math.round(0.25 * TICKS), noise: 4 },
  good: { latency: Math.round(0.15 * TICKS), noise: 1.5 },
};

/** How many mutations are live, across both the old and the rewritten rules. */
function mutationCount(state) {
  if (Array.isArray(state.mutations)) return state.mutations.filter((item) => item.level > 0).length;
  return state.mutation ? 1 : 0;
}

function recordCommand(commands, state, ingredient, angle, power) {
  if (HAS_POWER) commands.push({ tick: state.tick, kind: "launch", ingredient, angle, power });
  else commands.push({ tick: state.tick, ingredient, angle });
}

/**
 * Plays one shift. `trackDensity` turns on the every-tick evaluation of the
 * best action, which is far too slow to leave on for every run.
 */
export function playShift(name, seed, { trackDensity = false } = {}) {
  const config = BOTS[name];
  const noise = stream(seed ^ 0x5bf03635);
  const state = createArcade(seed);
  const commands = [];
  const history = [];
  const depth = config.latency + 1;
  let changes = 0;
  let ticksObserved = 0;
  let run = { action: null, count: 0 };
  let counted = null;
  // Ticks the capture harness wants to film. Collected here because the bot is
  // the only thing that knows when this particular shift got interesting.
  const markers = { firstMutation: null, firstStack: null, end: null };

  while (state.phase === "playing" && state.tick < MAX_TICKS) {
    history.push(structuredClone(state));
    if (history.length > depth) history.shift();
    const view = history[0];

    if (trackDensity) {
      const action = bestAction(view);
      ticksObserved += 1;
      if (run.action && !differs(action, run.action)) run.count += 1;
      else run = { action, count: 1 };
      if (run.count === SETTLE_TICKS) {
        if (counted !== null && differs(run.action, counted)) changes += 1;
        if (counted === null || differs(run.action, counted)) counted = run.action;
      }
    }

    if (config.blind) {
      // Never aims, never reacts, fires the instant the launcher is ready.
      if (canLaunch(state)) {
        const ingredient = FOODS[0];
        if (HAS_POWER ? launchFood(state, ingredient, ARENA.defaultAngle, DEFAULT_POWER)
          : launchFood(state, ingredient, ARENA.defaultAngle)) {
          recordCommand(commands, state, ingredient, ARENA.defaultAngle, DEFAULT_POWER);
        }
      }
    } else {
      if (wantsHatch(view) && HAS_HATCH && arcade.slamHatch(state)) {
        commands.push({ tick: state.tick, kind: "hatch" });
      } else if (canLaunch(state)) {
        const action = bestAction(view);
        if (action && action.verb === "launch") {
          const jitter = (noise() * 2 - 1) * config.noise;
          const angle = Math.round(Math.max(ARENA.minAngle, Math.min(ARENA.maxAngle, action.angle + jitter)));
          const fired = HAS_POWER
            ? launchFood(state, action.ingredient, angle, action.power)
            : launchFood(state, action.ingredient, angle);
          if (fired) recordCommand(commands, state, action.ingredient, angle, action.power);
        }
      }
    }
    stepArcade(state);
    const live = mutationCount(state);
    if (live >= 1 && markers.firstMutation === null) markers.firstMutation = state.tick;
    if (live >= 2 && markers.firstStack === null) markers.firstStack = state.tick;
  }
  markers.end = state.tick;

  return {
    seed,
    markers,
    ticks: state.tick,
    seconds: state.tick / TICKS,
    score: state.score,
    feeds: state.totalFeeds,
    shots: state.shots,
    size: state.size ?? 1,
    phase: state.phase,
    cause: state.failureReason ?? (state.phase === "playing" ? "hit-tick-cap" : state.phase),
    commands,
    density: trackDensity && ticksObserved > 0 ? changes / (ticksObserved / TICKS / 60) : null,
  };
}

/* ------------------------------------------------------------------ *
 * Reporting.
 * ------------------------------------------------------------------ */
const percentile = (sorted, p) => {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[index];
};
const round = (value, places = 1) => Math.round(value * 10 ** places) / 10 ** places;

/** Deaths per 30-second bucket, which is the spread gate. */
function buckets(runs) {
  const out = new Map();
  for (const run of runs) {
    const key = Math.floor(run.seconds / 30) * 30;
    out.set(key, (out.get(key) ?? 0) + 1);
  }
  return [...out.entries()].sort((a, b) => a[0] - b[0])
    .map(([from, count]) => ({ bucket: `${from}-${from + 30}s`, count, share: round(count / runs.length * 100) }));
}

function summarise(name, runs) {
  const seconds = runs.map((run) => run.seconds).sort((a, b) => a - b);
  const causes = {};
  for (const run of runs) causes[run.cause] = (causes[run.cause] ?? 0) + 1;
  const share = buckets(runs);
  return {
    bot: name,
    shifts: runs.length,
    survival: {
      p10: round(percentile(seconds, 0.1)),
      median: round(percentile(seconds, 0.5)),
      p90: round(percentile(seconds, 0.9)),
      max: round(seconds[seconds.length - 1]),
    },
    feeds: { median: round(percentile(runs.map((r) => r.feeds).sort((a, b) => a - b), 0.5)) },
    score: { median: round(percentile(runs.map((r) => r.score).sort((a, b) => a - b), 0.5)) },
    size: { median: round(percentile(runs.map((r) => r.size).sort((a, b) => a - b), 0.5), 2) },
    causes,
    deathSpread: share,
    worstBucketShare: share.length ? Math.max(...share.map((item) => item.share)) : 0,
  };
}

function table(rows) {
  const head = ["bot", "n", "p10", "median", "p90", "max", "feeds", "score", "size", "worst 30s bucket"];
  const body = rows.map((row) => [
    row.bot, String(row.shifts), `${row.survival.p10}s`, `${row.survival.median}s`,
    `${row.survival.p90}s`, `${row.survival.max}s`, String(row.feeds.median),
    String(row.score.median), String(row.size.median), `${row.worstBucketShare}%`,
  ]);
  const widths = head.map((_, index) => Math.max(head[index].length, ...body.map((row) => row[index].length)));
  const line = (cells) => `| ${cells.map((cell, index) => cell.padEnd(widths[index])).join(" | ")} |`;
  return [line(head), `|${widths.map((width) => "-".repeat(width + 2)).join("|")}|`, ...body.map(line)].join("\n");
}

function parseArgs(argv) {
  const args = { shifts: 200, seed: 1, densityShifts: 12, json: null, fixtures: null };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--shifts") args.shifts = Number(argv[++i]);
    else if (item === "--seed") args.seed = Number(argv[++i]);
    else if (item === "--density-shifts") args.densityShifts = Number(argv[++i]);
    else if (item === "--json") args.json = argv[++i];
    else if (item === "--fixtures") args.fixtures = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const started = Date.now();
  const report = { generatedAt: new Date().toISOString(), shifts: args.shifts, seedBase: args.seed, capabilities: { HAS_POWER, HAS_HATCH, HAS_PROBE }, bots: [] };

  for (const name of ["naive", "moderate", "good"]) {
    const runs = [];
    for (let i = 0; i < args.shifts; i += 1) runs.push(playShift(name, (args.seed + i * 7919) >>> 0));
    report.bots.push(summarise(name, runs));
    if (name === "moderate") report.sampleRun = runs[0];
  }

  // Decision density, moderate bot only, over a smaller sample because the
  // every-tick evaluation is expensive.
  const density = [];
  for (let i = 0; i < args.densityShifts; i += 1) {
    const run = playShift("moderate", (args.seed + i * 7919) >>> 0, { trackDensity: true });
    if (run.density !== null) density.push(run.density);
  }
  density.sort((a, b) => a - b);
  report.decisionDensity = {
    shifts: density.length,
    median: round(percentile(density, 0.5), 2),
    min: round(density[0] ?? 0, 2),
    max: round(density[density.length - 1] ?? 0, 2),
  };

  // Gates, evaluated here so no report can quietly disagree with the brief.
  const byName = Object.fromEntries(report.bots.map((row) => [row.bot, row]));
  report.gates = {
    naiveMedianAtMost45: byName.naive.survival.median <= 45,
    moderateMedian90to150: byName.moderate.survival.median >= 90 && byName.moderate.survival.median <= 150,
    moderateDeathSpread: byName.moderate.worstBucketShare <= 40,
    goodAtLeast2p5xNaive: byName.good.survival.median >= byName.naive.survival.median * 2.5,
    decisionDensityAtLeast6: report.decisionDensity.median >= 6,
  };
  report.gatesPass = Object.values(report.gates).every(Boolean);
  report.elapsedSeconds = round((Date.now() - started) / 1000);

  console.log(table(report.bots));
  console.log("");
  for (const row of report.bots) console.log(`${row.bot.padEnd(9)} causes: ${JSON.stringify(row.causes)}`);
  console.log("");
  console.log(`decision density (moderate): median ${report.decisionDensity.median}/min over ${report.decisionDensity.shifts} shifts (${report.decisionDensity.min}-${report.decisionDensity.max})`);
  console.log("");
  for (const [gate, ok] of Object.entries(report.gates)) console.log(`${ok ? "PASS" : "FAIL"}  ${gate}`);
  console.log(`\n${report.gatesPass ? "ALL GATES PASS" : "GATES FAILING"}  (${report.elapsedSeconds}s)`);

  if (args.json) {
    await writeFile(path.resolve(ROOT, args.json), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`wrote ${args.json}`);
  }

  // Three frozen traces, one per bot, so the replay test has something real to
  // reproduce rather than a synthetic command list.
  if (args.fixtures) {
    const traces = [];
    for (const [index, name] of ["naive", "moderate", "good"].entries()) {
      const seed = (args.seed + index * 104729) >>> 0;
      const run = playShift(name, seed);
      const final = replayArcade(seed, run.commands, run.ticks);
      traces.push({
        bot: name, seed, endTick: run.ticks, commands: run.commands,
        expect: { score: final.score, totalFeeds: final.totalFeeds, phase: final.phase, failureReason: final.failureReason },
      });
    }
    await writeFile(path.resolve(ROOT, args.fixtures),
      `${JSON.stringify({ gameVersion: arcade.GAME_VERSION ?? null, traces }, null, 2)}\n`);
    console.log(`wrote ${args.fixtures} (${traces.length} traces)`);
  }
}

// Importable by the capture harness, which needs the same bot but not the
// report.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
