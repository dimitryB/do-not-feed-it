#!/usr/bin/env node
/**
 * Headless balance harness for FEAST.
 *
 * Three deterministic bots play the pure simulation. Nothing here reads a
 * clock, a renderer or `Math.random`: a bot's only randomness is aim noise
 * drawn from its own seeded stream, so a reported table is reproducible from
 * `--seed` alone.
 *
 *   naive     never aims: the default angle and power, fired the instant the
 *             launcher is ready, cycling the three snacks in order. A beginner
 *             who has found the fire button and nothing else.
 *   moderate  aims at the mouth through a 250 ms delay with +/-4 degrees of
 *             noise, does not fire into a chew it can see coming, serves the
 *             craving when there is one, and tries a bank shot now and then.
 *   good      150 ms and +/-1.5 degrees, and goes looking for banks on purpose.
 *
 * Reported per bot: survival-time percentiles, feeds, accuracy, frenzies and
 * banks per run, score, cause of death, deaths per 30-second bucket, and the
 * pacing — when the first mutation level, size ×1.5, size ×2.0, the first
 * ingredient at ×3 and all three at ×3 arrive. A run that never gets there is
 * counted as "never", which sorts after every time, so a pacing median reads
 * "never" when fewer than half the runs reached the mark. The moderate bot
 * additionally reports decision density — how often per minute the best
 * available action actually changes.
 *
 * Usage:
 *   node --experimental-strip-types scripts/loop-bots.mjs [--shifts 200]
 *        [--seed 1] [--density-shifts 8] [--bots naive,moderate,good]
 *        [--json FILE] [--fixtures FILE]
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import * as arcade from "../lib/game/arcade.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { ARENA, FOODS, TUNING, createArcade, launchFood, stepArcade, replayArcade, probeFlight, cooldownFor } = arcade;

const TICKS = ARENA.tickRate;
const MAX_TICKS = ARENA.maxTicks;
const GRAVITY = 0.16;
const PROBE_TICKS = 200;

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

/**
 * The delayed snapshot a bot decides from. Only the fields a decision reads
 * are copied; the projectile list is shared because the bot never writes it.
 */
function viewOf(state) {
  return {
    seed: state.seed, tick: state.tick, phase: state.phase,
    hunger: state.hunger, rage: state.rage, wanted: state.wanted,
    size: state.size, creature: { ...state.creature },
    mutations: state.mutations, craving: state.craving, threat: state.threat,
    servings: state.servings, frenzyUntil: state.frenzyUntil, slickUntil: state.slickUntil,
    vent: state.vent, flame: state.flame,
    lastLaunchTick: state.lastLaunchTick, projectiles: state.projectiles,
    hatchClosedUntil: state.hatchClosedUntil, hatchReadyAt: state.hatchReadyAt, reloadUntil: state.reloadUntil,
  };
}

/* ------------------------------------------------------------------ *
 * Aiming.
 *
 * The ballistic solution to the mouth's centre seeds the candidates; the
 * rules' own `probeFlight` decides. Nothing in here can disagree with the
 * physics because nothing in here is the physics.
 * ------------------------------------------------------------------ */
const POWERS = [];
for (let p = ARENA.maxPower; p >= ARENA.minPower; p -= 1) POWERS.push(p);

/** The two launch angles (degrees, arena convention: negative is up) that put a shot of `power` through (tx, ty). */
function solveAngles(tx, ty, power) {
  const out = [];
  // The barrel moves the start point with the angle; two passes settle it.
  let sx = ARENA.launcher.x + Math.cos(-0.7) * ARENA.barrelLength;
  let sy = ARENA.launcher.y + Math.sin(-0.7) * ARENA.barrelLength;
  for (let pass = 0; pass < 2; pass += 1) {
    out.length = 0;
    const dx = tx - sx;
    const up = sy - ty;
    const v2 = power * power;
    const disc = v2 * v2 - GRAVITY * (GRAVITY * dx * dx + 2 * up * v2);
    if (disc < 0 || dx <= 0) return [];
    const root = Math.sqrt(disc);
    for (const sign of [1, -1]) {
      const tan = (v2 + sign * root) / (GRAVITY * dx);
      const degrees = -Math.atan(tan) * 180 / Math.PI;
      if (degrees >= ARENA.minAngle - 1 && degrees <= ARENA.maxAngle + 1) out.push(degrees);
    }
    if (!out.length) return [];
    const radians = out[out.length - 1] * Math.PI / 180;
    sx = ARENA.launcher.x + Math.cos(radians) * ARENA.barrelLength;
    sy = ARENA.launcher.y + Math.sin(radians) * ARENA.barrelLength;
  }
  return out;
}

const clampAngle = (angle) => Math.round(Math.max(ARENA.minAngle, Math.min(ARENA.maxAngle, angle)));

/**
 * Whether a shot arriving at `arrival` would meet a mouth still chewing one
 * of this bot's own earlier shots. The probe knows the chew that is already
 * happening; this is the one it cannot know about yet.
 */
function intoOwnChew(pending, arrival, view) {
  if (arrival < view.frenzyUntil) return false;
  for (const landing of pending) {
    if (arrival >= landing && arrival < landing + TUNING.chewTicks) return true;
  }
  return false;
}

/** Which snack to serve: the craving, else whichever it has eaten least of. */
function pickIngredient(view) {
  if (view.craving) return view.craving.ingredient;
  let best = FOODS[0];
  for (const food of FOODS) if (view.servings[food] < view.servings[best]) best = food;
  return best;
}

/**
 * The best shot available from `view`.
 *
 * Direct shots first: the analytic solution at every power, with a degree of
 * slack either side for the rounding. Then, if the bot is the kind that looks
 * for them, a coarse sweep for bank shots. A bank is preferred when it lands
 * and the belly is not urgent; otherwise the shot that lands soonest wins.
 */
function bestAction(view, config, pending, wantBank, now = view.tick) {
  if (view.phase !== "playing") return null;
  const ingredient = pickIngredient(view);
  const mouth = view.creature;
  const frenzy = view.tick < view.frenzyUntil;
  const urgent = view.hunger < 40;
  // A shot is only as good as it is under the bot's own hand: the window of
  // angles around it that also land is what the noise will be drawn from.
  const spread = Math.ceil(config.noise) + 1;
  // The snapshot is stale by the bot's latency, but the shot leaves the
  // launcher now: the probe is run from the present tick so the creature's
  // visible rhythm (the bob) is led rather than lagged, the way a player
  // leads a target. Everything else about the snapshot stays stale.
  const base = now === view.tick ? view : { ...view, tick: now };
  const cache = new Map();
  const probe = (angle, power) => {
    const key = angle * 100 + power;
    let result = cache.get(key);
    if (result === undefined) {
      result = probeFlight(base, ingredient, angle, power, PROBE_TICKS);
      if (result.fed && intoOwnChew(pending, now + result.ticks, view)) result = { ...result, fed: false };
      cache.set(key, result);
    }
    return result;
  };
  let best = null;
  const offer = (angle, power, robustness) => {
    const result = probe(angle, power);
    if (!result.fed) return;
    // A serving that pinballs round the kitchen for two seconds is not a plan
    // a hungry player makes; only a bank-hunter takes the slow road.
    if (result.ticks > 90 && (!wantBank || urgent)) return;
    const bank = result.bank > 0 ? arcade.bankMultiplier(result.bank, result.bounces) : 1;
    const value = robustness * 30 + (wantBank && !urgent && bank > 1 ? bank * 60 : 0) - result.ticks * (urgent ? 2 : 1);
    if (!best || value > best.value) best = { verb: "launch", ingredient, angle, power, ticks: result.ticks, bank, robustness, value };
  };
  /** The centre of the widest run of landing angles in a window around `centre`. */
  const widest = (centre, power) => {
    let runStart = null;
    let bestRun = null;
    for (let angle = centre - spread; angle <= centre + spread + 1; angle += 1) {
      const lands = angle <= centre + spread && angle >= ARENA.minAngle && angle <= ARENA.maxAngle && probe(angle, power).fed;
      if (lands && runStart === null) runStart = angle;
      if (!lands && runStart !== null) {
        const length = angle - runStart;
        if (!bestRun || length > bestRun.length) bestRun = { start: runStart, length };
        runStart = null;
      }
    }
    return bestRun;
  };
  for (const power of POWERS) {
    for (const degrees of solveAngles(mouth.x, mouth.y, power)) {
      const run = widest(clampAngle(degrees), power);
      if (run) offer(Math.round(run.start + (run.length - 1) / 2), power, run.length);
    }
    // The fastest shot whose whole window lands is the shot; the slower powers
    // only matter when the fast ones are blocked or into a chew.
    if (best && !wantBank && best.robustness >= 2 * spread + 1) break;
  }
  if (wantBank && !frenzy) {
    for (const power of [16, 15, 14]) {
      for (let angle = ARENA.minAngle; angle <= ARENA.maxAngle; angle += 3) {
        const result = probe(angle, power);
        if (!result.fed || result.bank === 0) continue;
        const run = widest(angle, power);
        if (run) offer(Math.round(run.start + (run.length - 1) / 2), power, run.length);
      }
    }
  }
  if (!best) return { verb: "wait" };
  // A shot whose window is mostly misses is a shot a player holds. Unless the
  // belly is nearly empty, in which case anything is better than nothing.
  const needed = frenzy ? spread : spread + 1;
  if (best.robustness < needed && !urgent) return { verb: "wait" };
  return best;
}

/**
 * Whether two plans are different decisions rather than the same decision
 * expressed a degree apart.
 */
function differs(a, b) {
  if (!a || !b) return a !== b;
  if (a.verb !== b.verb) return true;
  if (a.verb !== "launch") return false;
  if (a.ingredient !== b.ingredient) return true;
  if (Math.abs(a.angle - b.angle) >= 6) return true;
  if (Math.abs(a.power - b.power) >= 3) return true;
  return false;
}

/** A plan has to hold for this many ticks before it counts as a decision. */
const SETTLE_TICKS = 5;

function canLaunch(state) {
  if (state.phase !== "playing") return false;
  if (state.tick - state.lastLaunchTick < cooldownFor(state)) return false;
  if (state.projectiles.filter((item) => item.kind === "food").length >= ARENA.maxProjectiles) return false;
  if (state.hatchClosedUntil > state.tick) return false;
  if (state.reloadUntil > state.tick) return false;
  return true;
}

/* ------------------------------------------------------------------ *
 * The bots.
 * ------------------------------------------------------------------ */
/**
 * `feedBelow` is where a bot starts serving. FEAST wants constant feeding, so
 * the thresholds are high; what separates the tiers is aim, chew-reading and
 * bank-seeking, not rationing.
 */
const BOTS = {
  naive: { blind: true, latency: 0, noise: 0 },
  moderate: { latency: Math.round(0.25 * TICKS), noise: 4, feedBelow: 80, bankChance: 0.25 },
  good: { latency: Math.round(0.15 * TICKS), noise: 1.5, feedBelow: 78, bankChance: 1 },
};

function mutationCount(state) {
  return FOODS.filter((food) => (state.mutations[food] ?? 0) > 0).length;
}

/**
 * Plays one shift. `trackDensity` turns on the every-tick evaluation of the
 * best action, which is too slow to leave on for every run.
 */
export function playShift(name, seed, { trackDensity = false, timeline = false } = {}) {
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
  let pending = [];
  let cycle = 0;
  const samples = [];
  const markers = {
    firstMutation: null, firstStack: null, firstFrenzy: null, end: null,
    // Pacing: the tick each mark was reached, or null if the run never got there.
    firstLevel: null, size15: null, size20: null, firstMax: null, allMax: null,
  };

  while (state.phase === "playing" && state.tick < MAX_TICKS) {
    history.push(viewOf(state));
    if (history.length > depth) history.shift();
    const view = history[0];
    pending = pending.filter((landing) => landing + TUNING.chewTicks > state.tick);

    if (trackDensity && !config.blind) {
      const action = bestAction(view, config, pending, false, state.tick);
      ticksObserved += 1;
      if (run.action && !differs(action, run.action)) run.count += 1;
      else run = { action, count: 1 };
      if (run.count === SETTLE_TICKS) {
        if (counted !== null && differs(run.action, counted)) changes += 1;
        if (counted === null || differs(run.action, counted)) counted = run.action;
      }
    }

    if (config.blind) {
      if (canLaunch(state)) {
        const ingredient = FOODS[cycle % FOODS.length];
        if (launchFood(state, ingredient, ARENA.defaultAngle, ARENA.defaultPower)) {
          cycle += 1;
          commands.push({ tick: state.tick, kind: "launch", ingredient, angle: ARENA.defaultAngle, power: ARENA.defaultPower });
        }
      }
    } else if (canLaunch(state)) {
      const frenzy = view.tick < view.frenzyUntil;
      const urgentCraving = view.craving && view.craving.endsAt - view.tick < 180;
      if (view.hunger < config.feedBelow || urgentCraving || frenzy) {
        // Trick shots are for a full belly. Below the line, the fast shot.
        const wantBank = view.hunger > 60 && (config.bankChance >= 1 || (config.bankChance > 0 && noise() < config.bankChance));
        const action = bestAction(view, config, pending, wantBank, state.tick);
        if (action && action.verb === "launch") {
          const jitter = (noise() * 2 - 1) * config.noise;
          const angle = clampAngle(action.angle + jitter);
          if (launchFood(state, action.ingredient, angle, action.power)) {
            commands.push({ tick: state.tick, kind: "launch", ingredient: action.ingredient, angle, power: action.power });
            pending.push(state.tick + action.ticks);
            if (process.env.BOT_DEBUG) console.log(`[bot] t=${state.tick} plan a=${action.angle} p=${action.power} robust=${action.robustness} bank=${action.bank} ticks=${action.ticks} wantBank=${wantBank} fired a=${angle} hunger=${view.hunger.toFixed(0)} frenzy=${frenzy}`);
          }
        }
      }
    }
    stepArcade(state);
    const live = mutationCount(state);
    if (live >= 1 && markers.firstMutation === null) markers.firstMutation = state.tick;
    if (live >= 2 && markers.firstStack === null) markers.firstStack = state.tick;
    if (state.frenzies >= 1 && markers.firstFrenzy === null) markers.firstFrenzy = state.tick;
    if (markers.firstLevel === null && arcade.mutationLoad(state.mutations) >= 1) markers.firstLevel = state.tick;
    if (markers.size15 === null && state.size >= 1.5) markers.size15 = state.tick;
    if (markers.size20 === null && state.size >= 2) markers.size20 = state.tick;
    if (markers.firstMax === null && FOODS.some((food) => state.mutations[food] >= TUNING.maxLevel)) markers.firstMax = state.tick;
    if (markers.allMax === null && FOODS.every((food) => state.mutations[food] >= TUNING.maxLevel)) markers.allMax = state.tick;
    if (timeline && state.tick % TICKS === 0) {
      samples.push({ t: state.tick / TICKS, size: state.size, hunger: Math.round(state.hunger), rage: Math.round(state.rage), feeds: state.totalFeeds,
        appetite: state.appetite, frenzy: state.tick < state.frenzyUntil, levels: arcade.mutationLoad(state.mutations), drain: round(arcade.drainPerTick(state) * TICKS, 2) });
    }
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
    clanks: state.clanks,
    misses: state.misses,
    frenzies: state.frenzies,
    banks: state.banks,
    cooked: state.cooked,
    utensils: state.utensils,
    bestCombo: state.bestCombo,
    size: state.size,
    mutations: { ...state.mutations },
    phase: state.phase,
    cause: state.failureReason ?? (state.phase === "playing" ? "hit-tick-cap" : state.phase),
    commands,
    timeline: timeline ? samples : null,
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
const mean = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const median = (values) => percentile([...values].sort((a, b) => a - b), 0.5);

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

/**
 * Percentiles of a time-to-mark, with the runs that never reached it counted
 * as `Infinity` so that a median of "never" is reported as such rather than
 * as the median of the lucky runs. `reached` is the share of runs that did.
 */
function pacing(runs, key) {
  const times = runs.map((run) => (run.markers[key] === null ? Infinity : run.markers[key] / TICKS)).sort((a, b) => a - b);
  const finite = times.filter(Number.isFinite);
  const pick = (p) => { const value = percentile(times, p); return Number.isFinite(value) ? round(value) : null; };
  return {
    reached: round(finite.length / runs.length * 100),
    p10: pick(0.1), median: pick(0.5), p90: pick(0.9),
    medianOfReached: finite.length ? round(percentile(finite, 0.5)) : null,
  };
}

const PACING_KEYS = ["firstLevel", "size15", "size20", "firstMax", "allMax"];
const PACING_NAMES = { firstLevel: "first level", size15: "size ×1.5", size20: "size ×2.0", firstMax: "first ×3", allMax: "all three ×3" };
const fmtTime = (value) => (value === null ? "never" : `${value}s`);

function summarise(name, runs) {
  const seconds = runs.map((run) => run.seconds).sort((a, b) => a - b);
  const causes = {};
  for (const run of runs) causes[run.cause] = (causes[run.cause] ?? 0) + 1;
  const share = buckets(runs);
  const shots = runs.reduce((a, r) => a + r.shots, 0);
  const feeds = runs.reduce((a, r) => a + r.feeds, 0);
  return {
    bot: name,
    shifts: runs.length,
    survival: {
      p10: round(percentile(seconds, 0.1)),
      median: round(percentile(seconds, 0.5)),
      p90: round(percentile(seconds, 0.9)),
      max: round(seconds[seconds.length - 1]),
    },
    feeds: { median: round(median(runs.map((r) => r.feeds))), mean: round(mean(runs.map((r) => r.feeds))) },
    accuracy: shots ? round(feeds / shots * 100) : 0,
    frenzies: { mean: round(mean(runs.map((r) => r.frenzies)), 2), withAtLeastOne: round(runs.filter((r) => r.frenzies > 0).length / runs.length * 100) },
    banks: { mean: round(mean(runs.map((r) => r.banks)), 2) },
    clanks: { mean: round(mean(runs.map((r) => r.clanks)), 1) },
    cooked: { mean: round(mean(runs.map((r) => r.cooked)), 1) },
    utensils: { mean: round(mean(runs.map((r) => r.utensils)), 2) },
    bestCombo: { median: median(runs.map((r) => r.bestCombo)) },
    score: { median: round(median(runs.map((r) => r.score))) },
    size: { median: round(median(runs.map((r) => r.size)), 2) },
    firstFrenzy: { median: round(median(runs.filter((r) => r.markers.firstFrenzy !== null).map((r) => r.markers.firstFrenzy / TICKS))) },
    pacing: Object.fromEntries(PACING_KEYS.map((key) => [key, pacing(runs, key)])),
    causes,
    deathSpread: share,
    worstBucketShare: share.length ? Math.max(...share.map((item) => item.share)) : 0,
  };
}

function table(rows) {
  const head = ["bot", "n", "p10", "median", "p90", "max", "feeds", "acc", "frenzies", "banks", "score", "size", "worst 30s"];
  const body = rows.map((row) => [
    row.bot, String(row.shifts), `${row.survival.p10}s`, `${row.survival.median}s`,
    `${row.survival.p90}s`, `${row.survival.max}s`, String(row.feeds.median), `${row.accuracy}%`,
    String(row.frenzies.mean), String(row.banks.mean),
    String(row.score.median), String(row.size.median), `${row.worstBucketShare}%`,
  ]);
  const widths = head.map((_, index) => Math.max(head[index].length, ...body.map((row) => row[index].length)));
  const line = (cells) => `| ${cells.map((cell, index) => cell.padEnd(widths[index])).join(" | ")} |`;
  return [line(head), `|${widths.map((width) => "-".repeat(width + 2)).join("|")}|`, ...body.map(line)].join("\n");
}

function pacingTable(rows) {
  const head = ["bot", ...PACING_KEYS.map((key) => PACING_NAMES[key])];
  const body = rows.map((row) => [row.bot, ...PACING_KEYS.map((key) => {
    const p = row.pacing[key];
    return `${fmtTime(p.median)} (p10 ${fmtTime(p.p10)}, p90 ${fmtTime(p.p90)}, ${p.reached}%)`;
  })]);
  const widths = head.map((_, index) => Math.max(head[index].length, ...body.map((row) => row[index].length)));
  const line = (cells) => `| ${cells.map((cell, index) => cell.padEnd(widths[index])).join(" | ")} |`;
  return [line(head), `|${widths.map((width) => "-".repeat(width + 2)).join("|")}|`, ...body.map(line)].join("\n");
}

function parseArgs(argv) {
  const args = { shifts: 200, seed: 1, densityShifts: 8, json: null, fixtures: null, bots: ["naive", "moderate", "good"] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--shifts") args.shifts = Number(argv[++i]);
    else if (item === "--seed") args.seed = Number(argv[++i]);
    else if (item === "--density-shifts") args.densityShifts = Number(argv[++i]);
    else if (item === "--json") args.json = argv[++i];
    else if (item === "--fixtures") args.fixtures = argv[++i];
    else if (item === "--bots") args.bots = argv[++i].split(",");
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const started = Date.now();
  const report = { generatedAt: new Date().toISOString(), gameVersion: arcade.GAME_VERSION, shifts: args.shifts, seedBase: args.seed, bots: [] };

  for (const name of args.bots) {
    const runs = [];
    for (let i = 0; i < args.shifts; i += 1) runs.push(playShift(name, (args.seed + i * 7919) >>> 0));
    report.bots.push(summarise(name, runs));
    if (name === "moderate") report.sampleRun = { ...runs[0], commands: runs[0].commands.length };
  }

  const density = [];
  for (let i = 0; i < (args.bots.includes("moderate") ? args.densityShifts : 0); i += 1) {
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

  // Gates, from docs/FEAST_BRIEF.md and the stage 3 pacing brief, evaluated
  // here so no report can quietly disagree with them. A gate whose bot was not
  // run is left out rather than failed.
  const byName = Object.fromEntries(report.bots.map((row) => [row.bot, row]));
  const { naive, moderate, good } = byName;
  const between = (value, low, high) => value !== null && value >= low && value <= high;
  // "Not before N s" on a median that may be "never": never is after N.
  const notBefore = (value, low) => value === null || value >= low;
  report.gates = {
    ...(naive ? {
      naiveMedian40to80: between(naive.survival.median, 40, 80),
      naiveFeedsAtLeast6: naive.feeds.median >= 6,
    } : {}),
    ...(moderate ? {
      moderateMedian100to180: between(moderate.survival.median, 100, 180),
      moderateAccuracyAtLeast55: moderate.accuracy >= 55,
      moderateFrenziesAtLeast1: moderate.frenzies.mean >= 1,
      moderateDeathSpread: moderate.worstBucketShare <= 40,
      // Pacing (stage 3): the escalation is the whole shift.
      moderateFirstLevel25to45: between(moderate.pacing.firstLevel.median, 25, 45),
      moderateSize15At60to90: between(moderate.pacing.size15.median, 60, 90),
      moderateSize20At120to180: between(moderate.pacing.size20.median, 120, 180),
      moderateFirstMaxNotBefore150: notBefore(moderate.pacing.firstMax.median, 150),
      moderateAllMaxNotBefore240: notBefore(moderate.pacing.allMax.median, 240),
      moderateFirstFrenzyInside40: moderate.firstFrenzy.median <= 40 && moderate.frenzies.withAtLeastOne >= 50,
      decisionDensityAtLeast6: report.decisionDensity.median >= 6,
    } : {}),
    ...(naive && good ? { goodAtLeast1p8xNaive: good.survival.median >= naive.survival.median * 1.8 } : {}),
  };
  report.gatesPass = Object.values(report.gates).every(Boolean);
  report.elapsedSeconds = round((Date.now() - started) / 1000);

  console.log(table(report.bots));
  console.log("");
  for (const row of report.bots) {
    console.log(`${row.bot.padEnd(9)} causes: ${JSON.stringify(row.causes)}  clanks/run ${row.clanks.mean}  cooked/run ${row.cooked.mean}  utensils/run ${row.utensils.mean}  best combo ${row.bestCombo.median}  first frenzy ${row.firstFrenzy.median}s (${row.frenzies.withAtLeastOne}% of runs)`);
    console.log(`${"".padEnd(9)} deaths: ${row.deathSpread.map((b) => `${b.bucket} ${b.share}%`).join(", ")}`);
  }
  console.log("");
  console.log("pacing (median; p10, p90; share of runs that reached it):");
  console.log(pacingTable(report.bots));
  console.log("");
  if (byName.moderate) console.log(`decision density (moderate): median ${report.decisionDensity.median}/min over ${report.decisionDensity.shifts} shifts (${report.decisionDensity.min}-${report.decisionDensity.max})`);
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
