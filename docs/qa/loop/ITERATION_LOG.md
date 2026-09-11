# Feeding-loop iteration log

Branch `feat/creature-loop`, cut from `feat/creature-rig`.

The brief: turn the clicker in `lib/game/arcade.ts` into "feed it → it changes →
adapt", in eight stages, measuring first. Diagnosis and target loop are in
`docs/dnfi-loop-redesign.md`. Exit criteria, numeric gates and the critic rubric
are restated at the bottom of this file so an iteration can be judged without
leaving it.

## How an iteration is measured

- `node --experimental-strip-types scripts/loop-bots.mjs --shifts 200
  --density-shifts 8 --json docs/qa/loop/iter-N-bots.json
  --fixtures tests/fixtures/loop-traces.json`
  Three deterministic bots on the pure simulation. Survival percentiles, feeds,
  score, cause of death, deaths per 30-second bucket, and decision density.
- `node --experimental-strip-types scripts/loop-shots.mjs --iter N`
  One real shift in a real browser with the HUD visible, played by the moderate
  bot's own command trace, filmed as 12-frame strips every 20 s and 30-second
  clips around the first mutation, the first stack and the ending.
- `npm run typecheck && npm run lint && npm test && npm run build`, and the
  frozen replay fixtures, which fail loudly whenever a rule changes.
- A fresh-context critic that sees only the bot table, the decision-density
  number, the images and the rubric — never the code and never these notes.

### Two things to know about the measurements

**Decision density is a floor, not a verdict.** The metric counts how often the
best available action materially changes — different ingredient, six degrees or
more of aim, a power band, a reaction verb, or a considered decision to hold
fire. It deliberately does *not* count the launcher's reload as a decision, and
it debounces: a plan has to hold for five ticks before it counts, and it is
compared against the last plan actually counted rather than against the previous
tick, because a plan sitting on a band edge otherwise flips every other tick and
reports a hundred decisions a minute in a game with none. Even so, iteration 0 —
a game with one correct answer — scores 67/min, because a fixed craving cycle
moves the plan on a timer without the player choosing anything. The gate is
worth keeping as a floor. The real test of agency is the critic's first
criterion.

**The critic's average is noise; its faults are signal.** This was the clearest
finding of the rig loop that preceded this one (`docs/qa/creature/ITERATION_LOG.md`),
where a 4.2 → 4.6 drift over thirteen iterations was mostly a change in how
thorough successive critics were. Per-criterion scores are recorded below
because the exit criteria are stated in them, but the fault lists are what each
iteration is steered by.

---

## Iteration 0 — the measurement, before any rule changed

**Changed:** nothing in `lib/game/`. Added `scripts/loop-bots.mjs`,
`scripts/loop-shots.mjs`, `scripts/shot-kit.mjs` (the browser plumbing shared
with the rig harness), `tests/loop-replay.test.mjs` and the first frozen
fixtures. This is the "before" the rest of the log is measured against.

### Bots — 200 seeded shifts each

| bot      | n   | p10    | median | p90    | max    | feeds | score | size | worst 30s bucket |
|----------|-----|--------|--------|--------|--------|-------|-------|------|------------------|
| naive    | 200 | 119.2s | 119.2s | 119.2s | 119.2s | 106   | 33590 | 1    | 100%             |
| moderate | 200 | 120s   | 120s   | 120s   | 120s   | 104   | 33800 | 1    | 99%              |
| good     | 200 | 120s   | 120s   | 120s   | 120s   | 127   | 40800 | 1    | 100%             |

- naive: `too-many-missed-shots` ×200 — at **119.2 s of a 120 s shift**.
- moderate: `survived` ×198, `too-many-missed-shots` ×2.
- good: `survived` ×200.

Decision density (moderate): **67/min**, range 63–70.5 over 8 shifts.

| gate | target | iteration 0 |
|---|---|---|
| naive median survival | ≤ 45 s | **119.2 s — FAIL** |
| moderate median survival | 90–150 s | 120 s — pass |
| moderate death spread | no 30 s bucket > 40 % | **99 % in one bucket — FAIL** |
| good vs naive | ≥ 2.5× | **1.01× — FAIL** |
| decision density | ≥ 6/min | 67/min — pass (see caveat above) |
| replay fixtures | exact | pass |

The naive bot never aims, never reacts, and fires the default angle on cooldown.
It reaches the end of the shift on every one of two hundred seeds and only loses
at 119.2 s because accumulated mutation drift finally tips irritation over 100.
The skilled bot is one percent better than the bot with no skill. That is the
whole diagnosis in one row, and it is the number every later iteration is
compared against.

The "worst 30 s bucket" figure is 99–100 % for all three bots for the same
reason: there is no distribution, because there is no failure. Everyone stops at
the same place — the clock.

### Captures

`docs/qa/loop/iter-0/` — 89 frames in 12 groups from a single 120-second shift
on seed 20260911 (105 feeds, survived). Render cost is recorded in
`manifest.json`.

### Critic — iteration 0 baseline

Recorded below when the baseline critic returns.

### Next decision

Stage 1 and stage 2 together, as the brief's first checkpoint requires: growth,
mouth rhythm, hunger scaling with size, endless shift. Nothing else changes in
the same iteration, so the checkpoint note is about the foundation alone.

---

## Reference — the bar this loop has to clear

**Numeric gates (hard).** naive median survival ≤ 45 s; moderate median 90–150 s
with no 30-second bucket holding more than 40 % of deaths; good median ≥ 2.5 ×
naive; decision density ≥ 6 changes/min for the moderate bot; replay fixtures
exact.

**Critic rubric, scored 0–10.** Agency (a run where the same input repeats
scores ≤ 3); Consequence; Tension; Readability at 960 px; Comedy; Fairness.

**Exit criteria (all).** All eight stages implemented and reachable in real play,
verified by browser capture; numeric gates pass on two consecutive iterations;
every critic criterion ≥ 7 on two consecutive iterations with no open
"cheap death" finding; `npm run check` green; render within budget; replay
exact; `GAME_VERSION` bumped; `docs/GAME_DESIGN.md`, `docs/DECISION_REGISTER.md`
and `docs/HANDOFF.md` describing the game that exists.

**Caps.** 16 iterations or 10 hours, then a final report at the top of this file.
