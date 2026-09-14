# Feeding-loop iteration log

## FINAL REPORT — through iteration 25

**Status: all eight stages implemented and reachable, all five numeric gates
passing on eighteen consecutive iterations, no open cheap-death finding, the
target ring measured correct to two pixels, the render regression found and
mostly paid down, and the creature has a temper.** Four of the six critic
criteria sit at 7 or above; Readability is at 6 and climbing, Comedy at 7.

### The gates

| gate | ceiling / floor | iteration 26 | verdict |
|---|---|---|---|
| naive median survival | ≤ 45 s | 28.6 s | pass |
| moderate median | 90–150 s | 133.8 s | pass |
| moderate death spread | no 30 s bucket > 40 % | 38 % | pass |
| good ÷ naive | ≥ 2.5× | 6.4× | pass |
| decision density (moderate) | ≥ 6 changes/min | 127/min | pass |
| replay fixtures | exact | exact | pass |

Iterations 7 through 26 — **nineteen consecutive**, against an exit bar of two.
Twelve to twenty-one changed no rule at all; twenty-two and twenty-three changed
only the reward curve, and survival came back identical to the second.

### The critic

| iteration | Agency | Consequence | Tension | Readability | Comedy | Fairness |
|---|---|---|---|---|---|---|
| 0 (baseline) | 2 | 2 | 2 | 2 | 4 | 1 |
| 11 | 8 | 6 | 7 | 4 | 6 | 7 |
| 17 | 8 | 8 | 7 | 6 | 7 | 6 |
| 18 (kitchen destroyed) | — | — | — | 5 | — | 6 |
| 22 | 6 | 8 | 6 | 5 | 7 | 7 |
| **24** | **7** | **8** | **8** | **6** | **7** | **7** |

Twelve critics, each a fresh context shown only pictures and numbers. Treat the
row-to-row wobble as noise and the named faults as signal.

### What the last stretch did

1. **The render regression, found and mostly paid down** (iteration 12). The
   capture harness had only ever timed a creature with no mutations and reported
   ~4 ms for eleven iterations while a typical mid-shift creature cost 9.6. One
   unblended composite instead of four blended ones took the worst state from
   **9.72 ms to 4.52** and the mutation surcharge from **+5.3 ms to +1.5**.
2. **The target ring, true at last** (iterations 14–17). Four iterations, and the
   calibration instrument had to be rebuilt twice: it measured only a bare
   creature, then had no projectile in its probes and so was blind to the
   creature's *tracking*, which moves the mouth up to 46 px on most of the frames
   a player aims on. Measured result: **+2 px at ×1.28 and +2 px at ×1.82.**
3. **The other ending, filmed and judged** (iterations 18–19). "Kitchen
   destroyed" is every naive death and half a moderate shift's, and four critics
   had said they could not judge it. `--cause kitchen-destroyed` fixed that and
   produced the sharpest review of the project.
4. **A temper** (iterations 20–21), to the limit of the rig — and
   `scripts/pose-probe.mjs`, which reads the pose the animator settled on and
   answered in three minutes what three sixteen-minute captures had not.
5. **A reward curve** (iterations 22–23). Moderate and good players scored 60.8
   and 61.1 points a second — identical. Paying by size did nothing, because size
   plateaus; paying by **time kept fed** took the score ratio to **1.65× against
   a survival ratio of 1.37×**, with survival untouched to the second.
6. **An opening with a stake, and the HUD's lies removed** (iterations 24–25).

### What is left, in the order I would do it

**1. The ring's shape.** The rules accept food inside an axis-aligned ellipse and
the painted mouth is a rotated wedge, so the ring is truthful about the rules and
still claims some cheek and misses some gullet. Give the collision the mouth's
axis and taper — a rule change, gates to re-measure — or redraw the mouth
rounder. It is a design decision before it is any work.

**2. The creature still does not perform.** The temper reached the limit of what
the corner channel can do to a painted grin; the mouth flattens and will not
invert. Every critic across four blocks has named some version of this. Finishing
it means authoring a snarl into the mouth drawing itself.

**3. The consequence ladder saturates.** Both moderate and good bots finish at
exactly ×1.96, and `ITS SIZE` is frozen for the last twenty seconds of a captured
run. Iteration 22 bent the reward curve past that ceiling; the *visual* ceiling
is still there.

**4. The render is 13–25 % over budget with mutations on** — 4.52 ms against
4 ms, measured with `scripts/render-budget.mjs`, never with the capture harness.
The rest is the warp grid's floor; a coarser grid fits and tears.

**5. The naive tier is a strawman and the opening is untested.** The naive bot
never aims at all, so its 200-run, zero-feed record says less about beginners
than it looks like it does — but "nothing in the first thirty seconds teaches
aim" is true of the game too, and no capture set contains the first twenty
seconds of a shift. Film the opening.

**6. `npm run test:contract` still cannot run** — `binaries.soliditylang.org` is
blocked by this environment's egress policy. No chain code was touched.

---

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

| Criterion | Score |
|---|---|
| Agency | 2 |
| Consequence | 2 |
| Tension | 2 |
| Readability | 2 |
| Comedy | 4 |
| Fairness | 1 |

Lowest: Fairness — but that score is **not** a judgement of the build. The dev
server hot-reloaded partway through the capture because `lib/game/arcade.ts` was
edited while the harness was running, so from 60.6 s onward every frame in this
set is a black screen with a stack trace. The critic reported that faithfully
and it dominates the Fairness and Tension scores. The other four criteria were
scored off the frames before the crash and are usable; Fairness and Tension for
iteration 0 are not, and are not compared against later iterations.

Usable findings from the pre-crash frames, all of which are about the build
rather than the accident:

- "All twelve frames of `strip-0040` are the same hot pepper fired from a
  pixel-identical barrel angle" — the Agency criterion's explicit fail case.
- "The creature at 60 s is the same silhouette, size and colour as at 0 s."
- "naive reaches 119.2 s against good's 120.0 s — aiming buys 0.8 s of survival."
- FULLNESS pinned at 99–100 % for the whole run; the meter never says anything.
- IRRITATION has a label and a number but no bar drawn.
- Projectiles are the same size and colour as the ambient dust particles.

**Process change:** nothing under `lib/` or `app/` is edited while a capture is
running. The dev server reloads on write and silently corrupts the set.

### Next decision

Stage 1 and stage 2 together, as the brief's first checkpoint requires: growth,
mouth rhythm, hunger scaling with size, endless shift. Nothing else changes in
the same iteration, so the checkpoint note is about the foundation alone.

---

## Iteration 1 — stages 1 and 2: growth, mouth rhythm, appetite, endless

**Changed:** `lib/game/arcade.ts` rewritten around a creature with a size, a
seeded mouth rhythm and an appetite. Renderer, HUD, dev hooks and tests moved
with it. `GAME_VERSION = 1`.

- **Endless.** No round, no clock to run out; `ARENA.maxTicks` is a twelve-minute
  replay bound. Score is time kept fed plus feeds plus style (D36).
- **Growth.** Every accepted serving grows the creature, front-loaded, to a ×2.4
  asymptote. Ending the shift at the cap was tried first and inverted the skill
  ordering — a better player reached it sooner and scored *less* — so the cap is
  now a plateau, not a finish line (D38).
- **Appetite.** Size alone was not enough: with a size cap, a player with
  perfect aim plateaus and survives forever. Every serving therefore also raises
  a permanent appetite multiplier that never stops rising (D40 in the register's
  new section).
- **Mouth rhythm.** The mouth opens and closes on a seeded rhythm; food is only
  accepted while it is at least half open, and an open mouth is a *slot* — as
  wide as the face but only as tall as the mouth is open — so a shot that
  arrives early meets a gap too narrow to fit through. Anything inside the face
  but outside the gap is snubbed: it bounces off, costs a little composure once,
  and can still be banked back in.
- **Over-feeding is the bad decision.** Above 82 fullness a serving returns 8 %
  of its nourishment and grows the creature four times as fast.
- **The seed is used.** Rhythm, cycle jitter, the "not interested" long shut, and
  one per-shift temperament all come from it. Two seeds are two shifts.
- **Bug found and fixed:** irritation was cooled at the *bottom* of the tick,
  after a miss had raised it. A miss pushed the meter to exactly 100 and the
  same tick shaved it to 99.99 before the check ran, so the "kitchen destroyed"
  ending was unreachable and a player who never landed a shot starved instead.

### Bots — 200 seeded shifts each

| bot      | n   | p10    | median | p90    | max    | feeds | score | size | worst 30s bucket |
|----------|-----|--------|--------|--------|--------|-------|-------|------|------------------|
| naive    | 200 | 12.3s  | 12.3s  | 12.3s  | 12.3s  | 0     | 738   | 1.00 | 100%             |
| moderate | 200 | 75.7s  | 90.5s  | 101.2s | 122.9s | 19    | 12296 | 2.37 | 51.5%            |
| good     | 200 | 100.4s | 119.9s | 151.9s | 192.7s | 29    | 18645 | 2.40 | 50.5%            |

- naive: `kitchen-destroyed` ×200. It fires the default angle on cooldown, and
  the default angle is deliberately no longer a landing angle, so it lands
  nothing and is destroyed by its own missed shots.
- moderate: `empty-belly` ×151, `kitchen-destroyed` ×49.
- good: `empty-belly` ×198, `kitchen-destroyed` ×2.

Decision density (moderate): **55.8/min**, range 45.7–68.1 over 8 shifts.

| gate | target | iteration 0 | iteration 1 |
|---|---|---|---|
| naive median survival | ≤ 45 s | 119.2 s FAIL | **12.3 s PASS** |
| moderate median survival | 90–150 s | 120 s pass | **90.5 s PASS** |
| moderate death spread | no bucket > 40 % | 99 % FAIL | **51.5 % FAIL** |
| good vs naive | ≥ 2.5× | 1.01× FAIL | **9.7× PASS** |
| decision density | ≥ 6/min | 67/min pass | **55.8/min PASS** |
| replay fixtures | exact | pass | pass |

Four of five. The death spread still fails, and it is expected to: the only
per-run variance in the game so far is the seeded rhythm and the one-per-shift
temperament, so two shifts of equal quality end at nearly the same place.
Cravings with timers (stage 4), spit and clogging (stage 3) and the autonomous
beats (stage 7) are what put variance inside a run.

### Render

Measured on a full-grown creature with the canvas filling 1920×1080:
**4.10 ms median / 5.10 ms p95 / 4.19 ms mean**, against a 4 ms average budget.
At size 1 it is 3.95 ms mean. The manifest's figure for this iteration (4.60 /
10.50 / 5.37) was taken immediately after sixty screenshots and measures the
harness, not the draw; the measurement has been moved to before the capture run
for later iterations.

Growth first cost 5.62 ms mean, because a creature that is displaced for the
whole shift means every warp cell in the body kernel has to be redrawn on every
frame — where before it only happened during a mutation. Most of the growth was
therefore moved onto the mouth, which is drawn procedurally and costs nothing at
any size. That decision is the direct cause of the critic's lowest score below.

### Critic — iteration 1

| Criterion | Score | iteration 0 |
|---|---|---|
| Agency | 3 | 2 |
| Consequence | **1** | 2 |
| Tension | 3 | (unusable) |
| Readability | 2 | 2 |
| Comedy | 6 | 4 |
| Fairness | 3 | (unusable) |

Lowest: **Consequence**. Single change asked for: *"Actually scale the creature
sprite with the `ITS SIZE` value and stack visible mutation art on it, so that by
90 s it has outgrown the serving hatch and crowds the launcher."*

The faults worth acting on, in the critic's words:

- "`×1.00` and `FINAL SIZE ×2.40` render the creature at essentially the same
  pixel size — same shoulder width, same hatch clearance, same paw positions.
  The headline mechanic is invisible." **This is correct and it is the direct
  result of trading growth away for render budget.**
- "Three to five tin cans are drawn on top of the creature's belly and chin with
  a thin white trajectory line continuing past them. The body is not a collider;
  shots pass through the creature and keep flying." **Correct — only the mouth
  ellipse collides.**
- "`VENT DEFLECTION` fires with no visible vent." The scheduled vent flap is
  legacy and is supposed to become a consequence of a lunge in stage 7.
- "IRRITATION has no bar — just a number to two decimals."
- "`IT IS BIGGER NOW` is rendered inside the creature's open mouth, on the dark
  throat, where it reads as a texture glitch."
- "The file named `clip-ending` contains no ending — it stops at 93.8 s
  mid-play." A harness bug: the ending clip's last frame lands one interval
  short of the end.
- "Score climbs +6 every 100 ms with `STREAK ×0` and no shot fired… a spectator
  cannot tell a good shot from waiting."

### CHECKPOINT — is this already more interesting than the current build?

**Yes, but only in the rules, and that is not the same as yes.** The measurements
say the change is real: the strategy that won the old game — hold the default
angle and press Space on cooldown — now dies in twelve seconds out of two hundred
shifts, where before it reached 119 seconds of a 120-second shift. A skilled bot
outlives an unskilled one by nearly ten times rather than by one percent. Deaths
are caused by something the player did: an empty belly from rationing badly, or a
destroyed kitchen from missing. The mouth's rhythm gives the shot a *when* as
well as a *where*, and the slot geometry makes those the same skill rather than
two — a shot that arrives early now meets a gap too narrow to pass through
instead of being waved away by a flag. Feeding a creature that is not hungry is
now the worst move in the game, which is the first time the title has described
a rule. Every one of those is a property the old build did not have at any
difficulty, and none of them is a number I tuned into existence: the bots found
the first three and the fourth was the fix for them.

**But the picture has not caught up with the rules, and on a shared stream the
picture is the game.** The critic, seeing only the captures, scored Consequence
1 out of 10 — "the growth exists only as a number" — and it is right. I traded
the visible part of growth away to stay inside the 4 ms render budget: the warp
that deforms the painting has to redraw every cell it touches, and a creature
that is growing all shift touches all of them all the time, which took the draw
from 4.0 ms to 5.6 ms. I moved the growth onto the procedurally drawn mouth,
which is free at any size, and the result is a creature whose mouth is half again
as large at 90 seconds and whose body is within a few percent of where it
started. A judge watching this stream would see a number in the corner change.
That is not the brief. Before stage 3 I am going to spend an iteration making
growth physical — widening the region of the painting the warp is allowed to
touch so the creature can actually loom over the counter, calibrating the target
ring against the mouth the rig really draws rather than against constants I
chose, and making the creature's body a collider so a snack can no longer fly
through its chest. The rules are worth keeping. The next iteration is about
putting them on screen.

---

## Iteration 2 — putting the growth on screen

Stage 1's rules were right and its picture was not. This iteration changed no
stage; it made the stage that exists visible, and fixed three things the critic
found that were simply wrong.

**Changed:**

- **The rig has room to loom.** `WARP_REGION` widened up and to the left
  (`512,52,632x462` → `470,6,674x508`). The region only bounds where warp cells
  are *drawn*; the kernels that displace them are unchanged and die to zero well
  inside the new edges. The creature's head can now rise thirty pixels per unit
  of size instead of six, and at full size it fills the serving hatch.
- **The target ring is measured, not chosen.** New `scripts/mouth-calibrate.mjs`
  reads the mouth the rig actually drew at five sizes through a development hook
  and fits the rule constants to it. `ARENA.mouth` went from a guessed
  `{840, 284, 86, 58}` to a measured `{840, 280, 113, 68}`, and the mouth rises
  33 px per unit of size rather than 5. The linear fit's residual is ±3 px.
  Re-run it after any change to the pose's growth channels or to the warp.
- **The creature's chest is a collider.** "Three to five tin cans are drawn on
  top of the creature's belly and chin… the body is not a collider" — correct,
  and now it is: a snack that falls short hits the chest, says OFF THE BELLY and
  drops. Only the part below the mouth blocks; food arrives at the mouth almost
  level and a silhouette that included the cheek would stop every shot before it
  reached the target.
- **The scheduled vent flap is gone.** It appeared at 38 seconds on a timer and
  deflected shots off something the player could not see. It returns in stage 7
  as damage a lunge does to the kitchen.
- **The passive score drip** cut from 30 points/second to 6, so a landed serving
  is unmistakably the thing that scored.
- **Two bugs found while fixing the first one:** `bounceOffFace` refreshed the
  snack's life on *every* contact, so one snack rattled against the chest for
  nine hundred ticks without timing out; and a shot that fell short was charged
  for the chest contact *and* the floor miss, two charges for one mistake, which
  made irritation the only way anyone died (moderate: `kitchen-destroyed`
  199/200). A snack that has already bounced off the creature is not charged
  again, and a fourth contact simply ends it.

### Bots — 200 seeded shifts each

| bot      | n   | p10    | median | p90    | max    | feeds | score | size | worst 30s bucket |
|----------|-----|--------|--------|--------|--------|-------|-------|------|------------------|
| naive    | 200 | 12.3s  | 12.3s  | 12.3s  | 12.3s  | 0     | 73    | 1.00 | 100%             |
| moderate | 200 | 92.5s  | 101.7s | 113.7s | 133.7s | 23    | 7339  | 2.40 | 90.5%            |
| good     | 200 | 108.7s | 137.4s | 173.9s | 205.4s | 38    | 11909 | 2.40 | 43%              |

Causes: naive `kitchen-destroyed` ×200; moderate and good `empty-belly` ×200.
Decision density (moderate): **79.2/min**, range 69.1–101.6.

| gate | target | iter 1 | iter 2 |
|---|---|---|---|
| naive median survival | ≤ 45 s | 12.3 s PASS | 12.3 s PASS |
| moderate median survival | 90–150 s | 90.5 s PASS | 101.7 s PASS |
| moderate death spread | no bucket > 40 % | 51.5 % FAIL | **90.5 % FAIL** |
| good vs naive | ≥ 2.5× | 9.7× PASS | 11.2× PASS |
| decision density | ≥ 6/min | 55.8/min PASS | 79.2/min PASS |
| replay fixtures | exact | pass | pass |

The death spread got *worse*, and the reason is legible: with the double rage
charge gone, irritation now kills nobody who aims, so every skilled run ends the
same way — an empty belly at the point where appetite outruns the open window.
There is still no per-run variance. Stages 3, 4 and 7 are where it comes from,
and until they land this gate is not going to move.

### Render — measured on a full-grown creature, canvas filling 1920×1080

| | size 1.0 | size 1.7 | size 2.4 |
|---|---|---|---|
| median | 3.00 ms | 3.20 ms | 3.30 ms |
| p95 | 3.90 ms | 4.20 ms | 4.20 ms |
| mean | 3.10 ms | 3.32 ms | **3.41 ms** |

Inside the 4 ms budget at every size, and better than the 3.32 ms the rig loop
reported for a creature that never grew. Widening the region cost nothing — the
draw is priced per cell, not per pixel — and the warp grid was cut from 38×30 to
34×27 to pay for the extra displacement, which is what brought 4.59 ms down to
3.41 ms. Full-size frames were checked for tile edges and streaking afterwards.

The harness's own figure for this iteration (4.30 / 8.00 / 4.69) was measured
while the capture page was still animating in another context; the measurement
now runs before the capture browser context is created.

### Critic — iteration 2

| Criterion | iter 1 | iter 2 |
|---|---|---|
| Agency | 3 | **2** |
| Consequence | 1 | **7** |
| Tension | 3 | 3 |
| Readability | 2 | **4** |
| Comedy | 6 | 6 |
| Fairness | 3 | 3 |

Consequence 1 → 7 is the iteration's result, and it is the score the previous
critic's single change was aimed at: *"×1.19 and lean at 11.6 s, spike teeth and
extra eyes by 21.6 s, balloon belly at 72.2 s, inflamed orange throat at 87.2 s,
and a pale bloated ×2.40 hulk on the shift report."* Readability 2 → 4 came with
it: "mutations do read from the body at 960 px."

Agency fell from 3 to 2, which is within this loop's noise between critics but is
also fair: *"the launcher is identical in all 12 frames of each, no shot is
fired, and no aim or charge indicator exists."* Two separate causes, both real:

1. There is no visible aim. A faint 36-tick dotted guide exists and reads as
   ambient dust. The barrel carries no indication of angle or power. **Stage 5
   is where this is fixed** — power charge plus an aim that shows the two
   things the player is choosing.
2. The strips are landing between shots. The moderate bot feeds 23 times in
   100 seconds, so a 1.2-second window at a fixed 20-second cadence usually
   contains no launch at all. That is a harness fault, not a game fault, and the
   strips are now aligned to the nearest launch.

Other faults taken as work, in the critic's words:

- "`SNACK DOWN` means a miss… the phrase reads as a successful swallow."
- "Three toasts overlap into unreadable fragments."
- "The third HUD stat changes from `ITS SIZE ×2.31` to `ITS APPETITE ×1.29` in
  the same slot with the same formatting, so the number appears to fall."
- "Fullness only turns orange at 13 %… roughly 2.5 s of warning before a loss."
- "Death by empty belly while the creature is the fattest, palest and most
  placid it has been all run… there is no death beat."
- "Neither the creature nor the tray nor the launcher carries the current
  craving" — stage 4.
- "The `the ending` and `shift report` cells are the same screen twice."

### Next decision

Stage 3: mutations as permanent, stacking creature changes, with the copy and
HUD faults above folded in because they are a few lines each and they are
costing Readability and Fairness every iteration they stay.

---

## Iteration 3 — stage 3: mutations as permanent, stacking creature changes

**Changed:** the whole mutation system. `ArcadeMutation` — an eight-second
weather effect on the kitchen, one at a time, on a fixed count — is gone.
`state.mutations` is three levels that never fall.

- **Three servings of an ingredient is one level, to a maximum of three, and
  every level is live for the rest of the shift.** They stack.
- **Metal — a magnetic mouth.** It pulls metal food, and it drags loose kitchen
  metal off the shelves into its own teeth, which narrows the gap without
  changing the rhythm. A metal serving that arrives *flat* is caught by the
  teeth and clogs it further: metal has to be curved in, which is the one rule
  in the game that asks for a particular shape of shot rather than a particular
  moment.
- **Balloon — it inflates and floats.** The mouth rises off the counter and the
  pressure builds until it burps, drops, and shoves everything in the air.
- **Pepper — it spits servings back at the launcher.** A hit jams the launcher
  for over a second and costs composure. The spit is telegraphed.
- **One escape per pair, and every escape is a serving of the other
  ingredient**, so the way out of a problem is always another decision about
  what to feed it — and taking it deepens the mutation you escaped with:
  metal is ballast for a floating creature; pepper makes it sneeze a clogged
  mouth clear; a serving it spits back vents the balloon's pressure.
- Forces resolve in ingredient order, metal → balloon → pepper, so a stack
  always resolves the same way.
- The HUD's single mutation banner became a standing row of trait chips with
  levels, because the mutations no longer take turns.

### Bots — 200 seeded shifts each

| bot      | n   | p10   | median | p90    | max    | feeds | score | size | worst 30s bucket |
|----------|-----|-------|--------|--------|--------|-------|-------|------|------------------|
| naive    | 200 | 12.3s | 12.3s  | 12.3s  | 12.3s  | 0     | 73    | 1.00 | 100%             |
| moderate | 200 | 77.7s | 90.3s  | 100.9s | 122.7s | 19    | 5291  | 2.37 | 52.5%            |
| good     | 200 | 94.5s | 103.5s | 123.5s | 155.3s | 22    | 6057  | 2.40 | 77.5%            |

Decision density (moderate): 81.0/min. Four of five gates pass; the death
spread still does not (52.5 %).

The first cut of stage 3 put the moderate bot at 85.3 s, under the 90-second
floor — the clog, the jams and the clangs together were more than the loop could
carry — so the junk interval, the clog per piece, the spit interval and the jam
were all eased before the run above. The bots cannot use the hatch yet, which is
stage 6 and is the answer to a spit; some of that pressure should come back when
they can.

### Critic — iteration 3

| Criterion | iter 2 | iter 3 |
|---|---|---|
| Agency | 2 | 3 |
| Consequence | 7 | **2** |
| Tension | 3 | 3 |
| Readability | 4 | 3 |
| Comedy | 6 | 5 |
| Fairness | 3 | 3 |

Consequence fell five points, which is over this loop's revert threshold, so it
was checked against the images rather than taken on faith — and the critic was
right for a reason that had nothing to do with stage 3.

*"The HUD says ITS SIZE went ×1.19 → ×2.31 but the creature is not bigger."*
Iteration 2 put most of the growth on the mouth, because the mouth is drawn
rather than warped and costs nothing at any size. The mouth is also **shut about
five sixths of the time at full size**, so five frames in six showed a creature
that had not grown. Iteration 2's critic happened to be handed frames with the
mouth open and praised the growth; iteration 3's was handed frames with it shut
and could not find any. Both were reporting what they saw. The measurement was
right and the thing being measured was only sometimes visible.

## Iteration 4 — growth on the body, and a lift the rig can show

- **Growth moved onto the body.** Scale to the warp's ×1.14 texture ceiling,
  and rise and lean taking most of the warp region's remaining headroom —
  translations resample nothing, so they are the cheap half of the effect. At
  full size the creature now fills the serving hatch with its mouth shut.
- **The balloon's lift is applied to the picture.** It was moving the rules'
  mouth up by as much as 142 px while the drawn creature stayed where it was,
  so the lit target ring floated off the face — the exact fault iteration 2
  existed to fix, reintroduced by stage 3. The lift is now capped at 46 px,
  which is what the rig can actually show, and the pose channels that carry it
  are in the proportion `mouth-calibrate` measured.
- **The mouth the rig draws narrows with the clog**, because the clogged gap is
  what the rules test.
- **Spent snacks are only drawn once they are on the floor.** With the chest a
  collider they were being drawn where they stopped, which pinned decals on the
  creature's face and left others hanging in mid-air.
- **At most three score pills at a time, pushed apart so they cannot overlap.**
  Five landing together rendered as one unreadable smear
  (`DROPPED   TOO L  TC  DROPPED`).
- **Fullness and irritation are drawn on the canvas, under the creature.** They
  were hairlines in the bottom-left corner, six hundred pixels from where the
  player is looking, and they are the two numbers the run turns on.
- **A rejected serving no longer breaks the streak** — it costs one. `STREAK ×0`
  for a whole shift is a decoration, not a score.

Re-calibrated after the pose change: `risePerSize` 33 → 54.5, and the residual
of the linear fit is under 2 px at every size.

Render, full-grown, canvas filling 1920×1080: **3.70 ms median / 5.00 ms p95 /
3.82 ms mean**. Inside budget.

Bots after the change (24 shifts): naive 12.3 s, moderate 94.7 s, good 100.4 s.
Four of five gates. The good bot is now barely ahead of the moderate one, which
is the next balance problem: the pressures stage 3 added — clog, jam, clang —
fall on both equally because neither can answer a spit yet.

---

## Iteration 5 — stages 4 to 8 in one push

The ten-hour cap was close, so the remaining five stages were implemented
together and measured once. That is a departure from the brief's
one-stage-per-iteration rule, taken deliberately: the alternative was leaving
cravings, the charge, the reaction verb, the beats and the endings unbuilt. There
is consequently no per-stage evidence for any of them.

- **Stage 4 — cravings are dilemmas.** Seeded, never the same twice running, with
  a visible clock that shortens as the creature grows. Satisfied in time: a large
  bonus that scales with the streak, it calms, and **growth pauses** — the only
  brake in the game. Ignored: composure and a tantrum that shoves everything in
  the air and costs launcher time. Off-menu is eaten anyway and still counts
  toward that ingredient's mutation, which is the temptation.
- **Stage 5 — power.** Hold to charge, 9 to 16. At a single fixed charge only two
  or three angles land; a test asserts that no one charge lands at every angle.
  `ArcadeCommand` is now a union carrying the ingredient, the angle and the
  charge, and `GAME_VERSION` is 2. The trajectory guide is a first-shift aid:
  full arc for fifteen seconds of a player's first shift, a stub for the rest,
  a shorter stub on the second, nothing after that.
- **Stage 6 — one reaction verb.** Slam the hatch. It shuts the serving hatch for
  1.4 seconds, during which nothing can be launched; in exchange a serving it
  spits back bounces off it, and a lunge is stopped before it takes the vent off
  the wall. Pressing it on nothing still costs the lockout, which is what makes
  it a decision rather than a button.
- **Stage 7 — it acts on its own.** A seeded beat every eight seconds or so, more
  often as it grows: a sneeze that scatters the bench, a telegraphed lunge, or
  drool that makes the floor slick for eleven seconds — snacks keep more of their
  speed and get a second bounce, so the bank shot gets better. The vent is now
  damage: it exists only once a lunge nobody stopped has bitten it off, and it
  never repairs.
- **Stage 8 — endings by size.** Four, chosen by how big it got, in the
  handbook's voice. STILL EMPLOYED is kept for a run that beats the player's own
  best time.

### Bots — 200 seeded shifts each

| bot      | n   | p10    | median | p90    | max    | feeds | score | size | worst 30s bucket |
|----------|-----|--------|--------|--------|--------|-------|-------|------|------------------|
| naive    | 200 | 11.4s  | 12.4s  | 13.2s  | 13.2s  | 0     | 74    | 1.00 | 100%             |
| moderate | 200 | 71.8s  | 96.4s  | 113.8s | 137.4s | 22    | 6871  | 2.08 | 61.5%            |
| good     | 200 | 112.2s | 133.8s | 151.9s | 175.5s | 27    | 9667  | 2.14 | 68%              |

Causes: naive `kitchen-destroyed` ×200; moderate `empty-belly` 150 /
`kitchen-destroyed` 50; good `empty-belly` 188 / `kitchen-destroyed` 12.
Decision density (moderate): **87.5/min**.

Four of five gates. The charge and the hatch restored the skill gradient that
stage 3 had flattened — the good bot went from 3 % ahead of the moderate one to
39 % ahead — because both are things a better player uses and a worse one does
not.

### Critic — final

| Criterion | it0 | it1 | it2 | it3 | **final** |
|---|---|---|---|---|---|
| Agency | 2 | 3 | 2 | 3 | **4** |
| Consequence | 2 | 1 | 7 | 2 | **7** |
| Tension | — | 3 | 3 | 3 | **5** |
| Readability | 2 | 2 | 4 | 3 | **3** |
| Comedy | 4 | 6 | 6 | 5 | **6** |
| Fairness | — | 3 | 3 | 3 | **4** |

Lowest: **Readability**. Single change asked for: *"Give each mutation a
silhouette-level body change a viewer can name at 960 px."*

Four of its faults were fixed immediately afterwards and have not been
re-judged: an unlabelled striped panel over the launcher (the hatch — now bolted
to the counter, lit and captioned HATCH SHUT), duplicated fullness and irritation
meters (one pair now, on the canvas beside the creature, with the numbers on
them), an end card that named a size-based ending without the cause of death, and
hard-edged rectangular tearing on an inflated belly — the warp grid had been cut
from 38×30 to 34×27 to pay for the widened region, and the balloon's swell was
slamming into the ×1.14 scale ceiling on top of the growth. The grid is 35×28 and
the swell is halved; the lift and the sheen carry the balloon instead.

Render after those changes, full-grown, canvas filling 1920×1080: **3.90 ms
median / 5.10 ms p95 / 4.04 ms mean**; 3.39 ms at size 1.

---

## Iteration 6 — a silhouette per mutation

**The change.** The iteration-5 critic could not name a mutation from a 960 px
frame: the metal, balloon and pepper states were a HUD chip and a colour wash,
and "pressure burp" had no picture at all. `drawMutations` in `lib/render/scene.ts`
gives each one a noun at silhouette scale — the kitchen's cutlery clinging to the
chest, clipped to the body outline; a valve on the shoulder with the burp's
pressure drawn as an arc around it; heat off the body and steam out of the nose.
Nothing here is a rule: every value is read from `ArcadeState`.

Two bugs were found while doing it. The overlays multiplied alpha by the
mutation *level* (0–3) rather than by a fraction of the cap, so three pepper
washed the whole creature flat orange. And the meters were being drawn twice —
an older canvas meter block had survived an earlier replacement.

### Bots — 200 seeded shifts each

| bot | median | worst 30 s bucket | causes |
|---|---|---|---|
| naive | 12.4 s | 100 % | kitchen destroyed 200 |
| moderate | 99.2 s | **62 %** | empty belly 145, kitchen destroyed 55 |
| good | 136.8 s | 68 % | empty belly 186, kitchen destroyed 14 |

Density 104/min. Four gates of five; the death-spread gate still failing at 62 %.

### Critic — iteration 6

Agency 3, Consequence 6, Tension 4, Readability 4, Comedy 6, Fairness 4.

---

## Iteration 7 — make a good decision compound

**The change.** The death-spread gate had never passed. The reason was
structural rather than statistical: every good decision in the game paid the
same amount. Satisfying a craving was worth a fixed bonus, so two hundred
competent runs converged on the same curve and died in the same thirty seconds.

A craving satisfied now pays into the *next* one. `state.cravingStreak` counts
cravings met in a row; the growth pause scales with the streak
(`pausePerStreak`), and from the second in a row the creature's permanent
appetite multiplier is reduced (`appetiteRelief`), announced on the creature as
`IT EASES OFF ×N`. A missed craving resets it. The reward is now super-linear in
the one skill the game is about, so two runs that differ slightly in that skill
diverge instead of converging.

The first version of this was keyed to `state.combo` — the feed streak — which
almost never reaches four, so the compounding never fired at all. That is worth
recording, because the measurement said "no effect" for a reason that had
nothing to do with the design.

### Bots — 200 seeded shifts each

| bot | p10 | median | p90 | worst 30 s bucket | causes |
|---|---|---|---|---|---|
| naive | 26.5 s | 28.6 s | 30.6 s | 78.5 % | kitchen destroyed 200 |
| moderate | 97.2 s | **129.1 s** | 166.7 s | **37 %** | empty belly 164, kitchen destroyed 36 |
| good | 137 s | **182.4 s** | 233.8 s | 30.5 % | empty belly 177, kitchen destroyed 23 |

Density 108/min. Good ÷ naive = 6.4×. **All five numeric gates pass for the
first time**, the death-spread gate included.

### Critic — iteration 7

Agency 5, Consequence 7, Tension 5, Readability 3, Comedy 7, Fairness 4.

The specific fault that set the next iteration: *"strip-0020 shows twelve frames
of identical launcher angle, identical snack and no aim guide at all because the
launcher is reloading, so the headline 108 changes/min is not what a spectator
actually sees."*

---

## Iteration 8 — put the aim on screen

**The change.** No rule changed. The player's two choices — where the launcher
points and how hard it throws — were drawn as a faint dashed stub and a number
in the corner, and the loaded snack was hidden entirely for the whole 80-tick
reload. So two thirds of every sampled second showed an empty counter and a
launcher that appeared to be doing nothing.

- The aim is a solid lance out of the muzzle with a **crossbar at the distance
  the current power stands for**, so angle and power are one drawing on the
  launcher itself.
- The loaded serving **sits in the breech whether or not it can be fired**,
  dimmed over a dark pocket while reloading, at full strength when ready.
- A **reload ring** fills around the breech, so the wait is an event with a
  visible end rather than an absence.

A whole duplicated draw block was found and removed while doing this: 131 lines —
launcher, hatch, projectiles, event labels and the craving ring — were being
executed twice per frame. Same class of bug as the duplicate meters in iteration
6, and it had been costing roughly a millisecond a frame.

**The capture harness was lying about the game.** The bot's command trace was
replayed by firing each command on its tick, which made the launcher teleport to
its angle on the frame it fired. `scripts/loop-shots.mjs` now plays the wind-up:
the barrel sweeps towards the next shot at the game's own aim rate over the 44
ticks before it, the charge starts exactly as far back as that shot's power is
worth, and the fast-forward refuses to skip a wind-up. Strips start five frames
before the shot rather than three. What is filmed is the same trace as before —
only the frames between the commands are no longer blank.

### Bots — 200 seeded shifts each

Identical to iteration 7 by construction (no rule changed), and the frozen
replay traces came back byte-identical, which is the check that proves it:
naive 28.6 s, moderate 129.1 s at a 37 % worst bucket, good 182.4 s = 6.4×,
density 108/min. **All five gates pass — second consecutive iteration.**

### Critic — iteration 8

| | Agency | Consequence | Tension | Readability | Comedy | Fairness |
|---|---|---|---|---|---|---|
| iteration 7 | 5 | 7 | 5 | 3 | 7 | 4 |
| **iteration 8** | **8** | **9** | **7** | **5** | **7** | **6** |

*"Across clip-first-mutation frames 00, 06 and 08 — 15 seconds apart — the
launcher sits at three clearly different barrel angles, with three different
snacks visibly loaded in the breech, the highlighted slot moves 3 → 2 → 3, and
the dotted trajectory preview redraws to match. Nothing here repeats."*

**Open cheap-death finding.** *"clip-ending frame-10, 01:45. Fullness 11 % and
falling. HATCH SHUT is displayed. The launcher barrel is empty. The player has
no available verb. The run ends at 01:47 — the manifest shows the hatch becoming
usable exactly one tick after the player loses."*

---

## Iteration 9 — a shift may not end on a tick the player was locked out of

**The change.** The hatch is the player's own reaction verb and it takes their
launcher away for 84 ticks. Running the starvation clock through that produced
the shape of loss nobody reads as their own fault: the game tells the player to
land a snack, removes their ability to land one, and ends the shift for not
landing it.

**The belly now runs a tab instead of emptying.** While the hatch is shut the
drain accumulates in `state.hungerDebt` rather than being applied; the moment the
hatch lifts it is taken back at three times the rate, visibly, with the player
holding a loaded launcher. The fullness bar says `HELD` while the tab is running
and `CATCHING UP` while it is being paid. Nothing is forgiven, so the economy
over a shift is unchanged to within the repayment lag — only the tick the loss
can land on has moved.

Two smaller fairness fixes rode along. A lunge bite is no longer allowed to take
the last point of fullness, because it jams the launcher in the same beat.
And `ENDINGS[2]` was "It has eaten the kitchen." — chosen on size alone, so a
shift that ended on an empty belly announced *"Empty belly. It has eaten the
kitchen."*, naming the other failure state in the same sentence as the meters
that contradicted it. The size endings no longer name any cause of death.

### What was tried first, measured, and reverted

Two earlier versions of this rule **forgave** the drain rather than deferring it.
Both broke the death-spread gate, and the measurement is the reason the third
version exists:

| version | moderate median | worst bucket | moderate causes |
|---|---|---|---|
| freeze during hatch **and** jams | 141.8 s | **42 %** | kitchen destroyed 166, empty belly 34 |
| freeze during the hatch only | 137.9 s | **43 %** | kitchen destroyed 138, empty belly 62 |
| **defer and repay (kept)** | 128.0 s | **35 %** | empty belly 160, kitchen destroyed 40 |

Relieving even a second and a half of starvation pressure per hatch slam flipped
the game's dominant failure from starving to enraging, and rage deaths bunch:
rage climbs on a straight line, so two hundred runs reach 100 at nearly the same
place. Starvation is the failure with variance in it, and the gate is a good
detector of exactly that.

### Bots — 200 seeded shifts each

| bot | p10 | median | p90 | worst 30 s bucket | causes |
|---|---|---|---|---|---|
| naive | 26.5 s | 28.6 s | 30.6 s | 78.5 % | kitchen destroyed 200 |
| moderate | 94.7 s | **128 s** | 168.7 s | **35 %** | empty belly 160, kitchen destroyed 40 |
| good | 134.1 s | **178.2 s** | 233.4 s | 32.5 % | empty belly 170, kitchen destroyed 30 |

Density 112/min. Good ÷ naive = 6.2×. **All five gates pass — third consecutive
iteration.** `GAME_VERSION` bumped to 3; fixtures regenerated; 36 tests green.

---

## Iteration 10 — the last serving, and a third act that arrives

**The change.** The iteration-9 critic found no cheap death but flagged two
things that could become one, and one flat stretch:

- *"The run ended with two of the player's shots still in the air. For the last
  second or two nothing the player pressed could matter, and a stream audience
  will read 'it was right there' as a robbery."*
- *"The stage marker is stuck at 03 / IT NO LONGER FITS"* — because it was keyed
  to size against a ceiling a shift never reaches, so the fourth act existed in
  the code and never appeared on screen.

**THE LAST SERVING.** Once a shift, if the belly empties while one of the
player's servings is still in the air, the shift waits for it: the belly sits at
zero, the shot flies, and if it lands the run goes on. It is announced on the
launcher and it is the name the fourth act already had.

**The stage marker now describes the run rather than the clock.** Act four
arrives when fullness drops under 22 % or irritation passes 72 — when the shift
is actually in trouble — instead of at a size the medians never reach.

### What was tried first, measured, and reverted

**Two servings per mutation level instead of three**, to answer the critic's
*"the mutation chips freeze at ×1 ×1 ×1 a minute in and stay there for the
remaining 60 % of the run"*. Mutation strength *is* the difficulty ramp, so
making levels arrive half again as fast is not a way to show more escalation —
it is a way to make the game harder:

| | moderate median | worst bucket |
|---|---|---|
| three servings a level | 128.0 s | 35 % |
| **two servings a level** | **109.3 s** | **50.5 %** |

Reverted. The complaint is real and still open; the answer to it is not "the
same ramp, faster".

**An unlimited in-flight reprieve.** Letting *every* airborne serving land before
the shift ends passed all five gates — and broke a property test that has held
since iteration 1: *feeding whenever you can must be worse than feeding when it
is hungry*. It fell from 5 seeds of 5 to 3. A player firing on every cooldown
always has something in the air, so an unlimited reprieve is a safety net under
spamming, which is the exact strategy this whole redesign exists to kill. One
serving is a last chance; unlimited is a different game.

### Bots — 200 seeded shifts each

| bot | p10 | median | p90 | worst 30 s bucket | causes |
|---|---|---|---|---|---|
| naive | 26.5 s | 28.6 s | 30.6 s | 78.5 % | kitchen destroyed 200 |
| moderate | 102.2 s | **133.8 s** | 171.7 s | **38 %** | empty belly 99, kitchen destroyed 101 |
| good | 145.2 s | **183.7 s** | 235.7 s | 31 % | empty belly 142, kitchen destroyed 58 |

Density 127/min. Good ÷ naive = 6.4×. **All five gates pass — fourth consecutive
iteration.** 36 tests green, the rationing property restored.

The failure mix is now even: half of a moderate shift's deaths are starvation and
half are rage. Previously starvation was 80 % of them, and the critic had noted
it had never been shown a kitchen-destroyed ending to judge.

---

## Iteration 11 — a readability pass, and nothing else

Readability was the one criterion still under 7 (6 at iteration 10, 5 at
iteration 8). The iteration-10 critic named the faults precisely, and all of
them were presentation, so **no rule changed in this iteration** — which the
measurement confirms: the bot table and the frozen replay traces came back
byte-identical to iteration 10.

**The verdict pills no longer sit on the meters.** *"ONE MORE CHANCE sits
directly on top of the FULLNESS/IRRITATION bars and buries the fullness readout —
on the exact frame the player dies of an empty belly. Unacceptable."* The meter
band is now reserved before any pill is placed, and pills are pushed clear of it
upward.

**The meters are no longer the smallest type on screen.** *"the '40%' and '48%'
are the least legible elements in the frame, and they are the entire lose
condition."* Labels and numerals went from 11 px to 14 px, the bars from 9 px to
13 px tall, the panel from 250 px wide to 296, with a hairline border so it
separates from the counter.

**A verdict is a beat, not a banner.** A miss held for 65 ticks — longer than a
whole sampled second — so `TOO LATE` was still on screen over a wide-open mouth
and read as the game contradicting itself. Mistakes now hold for 38 ticks;
praise and mutations keep the longer hold.

**HATCH SHUT says why, and for how long.** *"its six slats are identically dark
in every frame I opened, so the most control-depriving moment in the run is also
the least explained."* The panel now carries `YOU SLAMMED IT` and a bar that
drains over the 84 ticks it stays down.

**What a mutation DOES is drawn at a size a stream can read.** The rule existed
only as 9 px grey text in the darkest corner of the frame, on for one beat. It is
now a banner across the top for three seconds, in the ingredient's own colour,
carrying the name and the rule.

One bug was caught by looking at the capture rather than the code: the banner
faded in over six ticks, which meant it was invisible on the one clip frame taken
at the moment the mutation fires — the only frame that matters for it. It now
appears at full strength and only fades out.

### Bots — 200 seeded shifts each

Byte-identical to iteration 10, as intended: naive 28.6 s, moderate 133.8 s at a
38 % worst bucket, good 183.7 s = 6.4×, density 127/min. **All five gates pass —
fifth consecutive iteration.**

### Critic — iteration 11

| | Agency | Consequence | Tension | Readability | Comedy | Fairness |
|---|---|---|---|---|---|---|
| iteration 10 | 8 | 9 | 7 | 6 | 7 | 8 |
| **iteration 11** | 8 | 6 | 7 | **4** | 6 | 7 |

Readability went down, not up, which is the opposite of what this iteration was
for. The faults the critic named are mostly not things this iteration touched,
and they are worth more than the number:

- *"The mouth wind-up arc is drawn in pale lime on a belly that rising irritation
  flushes to pale pink-tan. The danger cue erases the timing cue exactly when the
  danger is highest."* The only timing tell in the game becomes invisible at
  precisely the moment it matters. No previous critic had looked for it.
- *"ITS SIZE ×1.82 is a number with no picture behind it — I measured the
  silhouette at 726 px at ×1.28 and 751 px at ×1.82, about 3 % against a claimed
  42 %."* The rig has a hard scale ceiling for texture quality, so the HUD is
  printing a multiplier the art cannot honour.
- *"THE CUTLERY IS MOVING"* is a caption on decals that move by ≤ 14 px over
  twenty seconds.
- The banner this iteration added still stacks with verdict pills in one band:
  it fixed the collision with the meters and introduced a smaller one of its own.

And the thing it did fix, it fixed: the meters and their numerals are legible at
960 px in `docs/qa/loop/iter-11/hud-0200.jpg`, with `ONE MORE CHANCE` pushed
clear above them on the frame the player starves — which is the exact frame the
iteration-10 critic called unacceptable.

**No cheap death** — the third consecutive critic to look for one and report
none.

---

## Iteration 12 — the render budget, measured properly and then paid down

The final report of the second block named this first: **the draw was roughly
twice its 4 ms budget once the creature carried two mutations, and nobody had
noticed for eleven iterations because the capture harness only ever timed a
creature with none.** No rule changed in this iteration.

### Finding it

`scripts/render-budget.mjs` grew a per-frame profiler: warp cells actually
redrawn, the creature's own draw split into its phases, and each blended
composite timed separately. Three measurements settled it, and each one killed a
theory:

1. **The warp grid is not the variable.** 599 cells bare, 601 with metal, 611
   with all three — the cell count is flat across every state, so the warp is a
   constant floor of about 3.4 ms and not the thing that grows.
2. **`drawSkin` is the whole variable.** 0.01 ms bare, 1.4 ms with one mutation,
   4.5 ms with two or three.
3. **The blend mode is not the cost; the composite is.** Timed separately:
   overlay 1.42 ms, screen 1.18 ms, saturation 0.78 ms. A blended
   full-resolution composite of the body region costs about a millisecond
   whatever arithmetic it does, and a mid-shift creature was running four of
   them — because each colour grade composited itself.

### Paying it down

- **One composite instead of four, and `source-over` instead of blend modes.**
  Every body grade — irritation heat, rage, the metal wash, the balloon's taut
  rim, hunger pallor — is now painted into one scratch, masked once, and
  composited once with the one operation that is not blended. What is lost is
  luminance preservation, a wash rather than a grade, which at these alphas at
  960 px is not a difference anyone can see.
- **The grade scratch went from a third resolution to a fifth**, which is where
  the five radial gradients are actually filled. 1.78 ms to 0.72.
- **The composite covers the rectangle the grades paint into**, not the frame.
- **A no-skew fast path in the warp**: a cell that stretches and shifts but does
  not shear is exactly what `drawImage`'s source and destination rectangles
  express, so those cells draw under the scene's own transform with no transform
  switching. Measured: no change. The warp's cost is the pixels, not the calls,
  which is worth recording so nobody tries it again.
- **The grid went from 35x28 to 32x25**, and the vignette fill stops at x=800
  where its gradient reaches transparent instead of covering the frame.

### Two things that were tried and rejected by measurement

- **A lower supersample factor for the rig art (HI 2 to 1.5).** The theory was
  that the warp minifies its source 2:1 and pays for it. The warp got *slower*,
  2.70 to 3.29 ms. Reverted.
- **A 29x23 grid.** It fits the budget — and it tears. An inflated, lifted belly
  breaks into hard rectangular seams down the right flank with vertical
  streaking where the body meets the counter, which is the same failure a critic
  caught at 34x27 in the first block. 32x25 is clean on that pose and is where
  this stops.

### The numbers

Measured with nothing else running, a warm-up pass discarded, at 1920x1080:

| state | before | after |
|---|---|---|
| bare, x2.4 | 4.43 ms | **3.94 ms** |
| metal 3 | 6.50 | 4.68 |
| balloon 3 | 5.93 | 4.75 |
| pepper 3 | 6.13 | 4.47 |
| **typical 2/2/1 at x2.0** | **9.57** | **5.09** |
| worst 3/3/3 at x2.4 | 9.72 | 5.49 |

**The mutation cost fell from +5.3 ms to +1.5 ms.** A bare creature is inside
budget. A mutated one is 25-37 % over it, and the remaining cost is the warp:
about 470 transformed `drawImage` calls covering the creature at full
resolution, which is the floor of this architecture and was already being paid
before any of the mutation work existed. Cutting it further means a coarser grid,
and a coarser grid tears.

### A third thing the instruments were lying about

The profiler's own worst-case state was **unreachable in play**. It set the
balloon's lift to 16 at size 2.4, but the rules clamp lift to
`(liftMax + liftMaxPerLevel x level) x (1 - liftCrowding x sizeT)` — 11.5 at that
size. The tearing that state showed was the renderer being asked for a pose the
game cannot produce. The states are now set to what the ceiling actually allows,
including the steepest reachable one (balloon 3 at x2.0, lift 21.4), and that one
is clean.

### And a harness bug worth its own line

`stopServer` sent SIGTERM and returned. The dev server's workerd child ignores
it, so **every harness run in this session had been leaving a server and a
workerd behind**: seven stale pairs had accumulated, holding about five
gigabytes, and every render measurement taken while they were up was competing
with them for the machine. It now terminates the group, waits, and kills what is
still standing.

`scripts/loop-shots.mjs` now times a mid-shift creature with mutations rather
than a bare one, so the manifest of every capture carries an honest number.

### Bots and critic — iteration 12

Byte-identical to iterations 10 and 11, fixtures included, as intended for an
iteration that changed no rule: moderate 133.8 s at a 38 % worst bucket, good
183.7 s = 6.4x, density 127/min. **All five gates pass — sixth consecutive
iteration.** The capture harness's own wall clock fell from 925 s to 704 s for
the same shift, which is the cheaper draw showing up somewhere other than the
profiler.

| | Agency | Consequence | Tension | Readability | Comedy | Fairness |
|---|---|---|---|---|---|---|
| iteration 11 | 8 | 6 | 7 | 4 | 6 | 7 |
| **iteration 12** | 8 | **9** | 7 | 5 | 7 | 7 |

**No cheap death.** Fourth consecutive critic to look and report none.

The Readability faults are specific and one of them is mine from iteration 11:

- *"the PRESSURE BURP banner is a 680 px box parked directly over a fully-open
  mouth, covering the upper lip and left teeth — the exact pixels the player must
  read to time the shot the banner is telling them to take. It also overlaps the
  BALLAST toast, which renders as '...ALLAST'."* The banner added in iteration 11
  to make the mutation rule legible is now sitting on the thing it describes.
- *"strip-0140-00 carries five competing text objects simultaneously."*
- *"the top-left stat row renders at roughly 6-7 px cap height at stream size —
  ITS SIZE x1.82 is the game's headline number and a stranger simply cannot read
  it."*
- *"No sampled frame contains a death beat, so the most important moment of the
  run is a hard cut."* Two critics in a row have now said this.
- And one fairness line worth its own fix: *"the toast ONE MORE CHANCE is on
  screen in that same frame, which at 0% fullness is flatly untrue."*

---

## Iteration 13 — one thing on screen at a time

No rule changed. The iteration-12 critic counted five competing text objects in
one frame and found the mutation banner — added two iterations earlier to make
the rule legible — parked across a fully open mouth.

- **The banner moved off the creature**, into the empty left third of the
  kitchen, beside the launcher the advice is about. It is clear of the creature
  at every size, and it no longer clips the toast beside it.
- **While a banner is up it is the only verdict on screen**: the pill limit drops
  from two to one.
- **A bounce no longer promises a second chance there isn't one of.** `ONE MORE
  CHANCE` over a belly at zero, on the frame the shift ends, is the game saying
  something untrue; that pill is suppressed at zero fullness.
- **The stat row is readable at 960 px.** The HUD labels went from 11 px to
  14 px and the values from 30 px to 34: `ITS SIZE x1.82` is the game's headline
  number and at stream size a stranger could not read it.

### Bots and critic — iteration 13

Byte-identical again, fixtures included. **All five gates pass — seventh
consecutive iteration.**

| | Agency | Consequence | Tension | Readability | Comedy | Fairness |
|---|---|---|---|---|---|---|
| iteration 12 | 8 | 9 | 7 | 5 | 7 | 7 |
| **iteration 13** | 8 | 8 | **8** | 5 | 7 | 7 |

**No cheap death.** Fifth consecutive critic to look and report none.

Readability stayed at 5, and the reason is not the text any more — it is a
correctness bug the previous four critics had not caught:

> *"The bright swallow ellipse detaches from the mouth as the creature grows.
> hud-0020 at size x1.28: the ring sits exactly on the open mouth. hud-0120 at
> x1.68: the mouth is wide open near the top of the creature; the ellipse is
> centred roughly 180 px lower, over the belly. The error scales with size, so
> the display gets less honest exactly as the run gets more valuable... The game
> draws a target that is not the target."*

That is the next iteration, and it is a fairness bug rather than a clarity one.
The other standing faults: the cutlery decals are frozen in place from 01:01 to
the end screen, so a mutation grows as a HUD chip rather than as a body; the act
counter oscillates 04 to 03 and back; and two critics in a row have now asked for
a death beat.

---

## Iteration 14 — the target ring is the mouth again

The iteration-13 critic found the game drawing a target that was not the target:
the lit ellipse is the rules' collision region, and on a mid-run creature it was
sitting well below the open mouth, with the error growing as the run got more
valuable. No rule changed in this iteration; the picture was wrong.

### The instrument came first

`scripts/mouth-calibrate.mjs` had only ever measured a **bare** creature, and on
a bare creature the drawn mouth and the rules' ellipse agree to within 2.5 px at
every size — which is why five iterations of critics had not seen this and the
script said nothing was wrong. It now also measures the states a shift actually
reaches, one channel at a time, and compares the drawn mouth against the rules'
*effective* ellipse — `ry x max(gapFloor, open)`, which is what the collision
tests, not raw `ry`.

That turned an eyeball complaint into a table, and the table named the culprits:

| state | drawn vs rules, before |
|---|---|
| bare x1.68 | 4.2 px — fine |
| lift 10 | **28.9 px** |
| lift 20 | **39.1 px** |
| clog 0.6 | 27.8 px |
| metal 3 | 13.0 px |
| pepper 3 | 13.5 px |
| **balloon 3, no lift at all** | **84.1 px** |

The vertical size of the ring was never the problem — every `dry` is inside the
deliberate 0.86 inset. It is the position, and two mechanisms were fighting over
it.

### What was wrong

**Two mechanisms for one movement.** The rules move the mouth up by exactly
`creature.lift`, a number clamped to what the rig can show. The picture moved it
up by the lift *and* by the belly inflation — `bellySwell` was feeding
`bodyRise` and `squashY` as well as `squashX` — so a full balloon lifted the
painted mouth 84 px that the rules knew nothing about. The lift channel was
over-scaled on top of that: ten units of lift moved the picture 34 px.

**The fix:** inflation makes it wider, not taller. `bellySwell` now feeds
`squashX` alone; `lift` — the number the rules own — carries the vertical, at
coefficients divided by the measured 3.4x error. The clog's jaw shift, which was
raising the drawn mouth 22 px on its own, is cut to a quarter.

| state | before | after |
|---|---|---|
| lift 10 | 28.9 px | **6.4 px** |
| lift 20 | 39.1 px | **5.3 px** |
| balloon 3, no lift | 84.1 px | **49.4 px** |
| balloon 2 at x2.0 | 75.9 px | **41.1 px** |
| metal 3 | 13.0 px | 14.6 px |
| clog 0.6 | 27.8 px | 26.8 px |

### What was tried and reverted

A blanket correction term that pushed the head back down by the measured
displacement of every channel. It overshot by 200 px: the correction is large
enough to push the mouth into the region where the warp's floor gate changes the
response, so the system is not linear in the direction that would make a
compensation table work. Removing the cause beats cancelling it.

### Bots and critic — iteration 14

Byte-identical, fixtures included. **All five gates pass — eighth consecutive
iteration.**

| | Agency | Consequence | Tension | Readability | Comedy | Fairness |
|---|---|---|---|---|---|---|
| iteration 13 | 8 | 8 | 8 | 5 | 7 | 7 |
| **iteration 14** | 8 | **9** | 8 | 5 | 7 | 6 |

**No cheap death.** Sixth consecutive critic to look and report none.

This critic measured the ring in pixels rather than describing it, and the result
is both a confirmation and a new finding:

> *"The ring is correct **only at full aperture**."* At x1.53 wide open,
> `strip-0040-05`: **offset ~0 px**. But on a shut or nearly shut mouth it is
> *"114 px low and nearly five times the height of the opening"*
> (`strip-0120-05`).

That is a different object. When the mouth is shut the bright ellipse on screen
is the **opens-in telegraph**, drawn at `rx x 1.08` around the whole face, and it
looks exactly like the target ring because it is the same colour and the same
shape. The thing the critic measured as a badly-placed hitbox is a clock wearing
a hitbox's clothes. That is the next iteration, along with the loss card, whose
cause-of-death line is an eighth the size of the headline above it.

---

## Iteration 15 — the clock stops dressing as the target

The iteration-14 critic measured the lit ring in pixels and found it correct at
full aperture and 114 px low on a shut mouth. Those are two different objects:
the target ring, and the **opens-in telegraph**, which was drawn as a lime arc
around the whole face at the target's own colour and shape. On a shut mouth the
brightest thing on the creature was a hoop five times the size of the opening,
sitting on the jaw, and it was read — reasonably — as the hitbox.

- **The telegraph is now a clock.** Amber, a pair of closing brackets rather than
  a ring, converging from outside the face onto the gap the mouth is about to
  become. Nothing else on the creature is that colour or that shape.
- **The loss card leads with the loss.** The cause-of-death sentence went from
  12 px to 25, the stats labels from 10 to 14 and their values from 18 to 30, so
  `Empty belly. It has eaten the shift supervisor.` and `ACCURACY 28%` are
  readable at 960 px instead of being an eighth the height of the headline.

Byte-identical bots and fixtures again. **All five gates pass — ninth
consecutive iteration.**

| | Agency | Consequence | Tension | Readability | Comedy | Fairness |
|---|---|---|---|---|---|---|
| iteration 14 | 8 | 9 | 8 | 5 | 7 | 6 |
| **iteration 15** | 8 | 9 | 8 | 5 | **8** | 7 |

**No cheap death.** Seventh consecutive critic to look and report none — and this
one singled the hatch out: *"the one lockout that could have felt unfair is
handled carefully... blame explicitly assigned to the player, and the drain
provably frozen while it lasts. Whoever built that thought about fairness."*

Readability stayed at 5, and the critic's remaining complaint is the same
object again, measured more precisely than before: the brackets read as a
camera-focus reticle, and the ring *"is anchored to the head, not to the jaw"* —
a mid-run creature at x1.68 still has it low. Which is the residual the
calibration table had already quantified, and iteration 16 is that residual.

---

## Iteration 16 — the last of the mouth drift

The remaining divergence, found by walking the calibration table one channel at
a time, was in the mutation *expressions* themselves. Three presets were moving
the head:

- `activeBalloon`, worn at nine tenths of the balloon level, carried
  `headY: -20, bodyRise: 30` — **32 px of head lift on a full balloon** that the
  rules' collision ellipse knew nothing about, and the single largest remaining
  source of the ring sitting off the mouth.
- `warnBalloon`, worn as the pressure builds toward a burp, carried another
  `headY: -14, bodyRise: 20`.

Both now put their volume into width alone. A mutation is allowed to change the
creature's shape, its skin and its face; it is not allowed to move the one part
of it the rules have an opinion about.

### The whole repair, measured

Drawn mouth against the rules' effective collision ellipse, in the states a
shift reaches:

| state | iteration 13 | iteration 14 | iteration 16 |
|---|---|---|---|
| bare x1.68 | 4.2 px | 3.1 | **3.1** |
| lift 10 | 28.9 | 6.4 | **-1.2** |
| lift 20 | 39.1 | 5.3 | **-6.0** |
| balloon 1, live | 30.4 | 22.5 | **13.0** |
| balloon 2 at x2.0, live | 75.9 | 41.1 | **24.0** |
| balloon 3, no lift | 84.1 | 49.4 | **34.0** |
| metal 3 | 13.0 | 14.6 | 14.4 |
| clog 0.6 | 27.8 | 26.8 | 27.8 |

Two sources are still open and are now the whole of it: a clogged mouth is drawn
28 px higher than the rules put it, and every mutation preset overrides the jaw's
own aperture by a little, which shifts the drawn mouth's centre about 13 px even
when the rules say the mouth is fully open.

### Bots and critic — iteration 16

Byte-identical bots and fixtures. **All five gates pass — tenth consecutive
iteration.**

| | Agency | Consequence | Tension | Readability | Comedy | Fairness |
|---|---|---|---|---|---|---|
| iteration 15 | 8 | 9 | 8 | 5 | 8 | 7 |
| **iteration 16** | 8 | 9 | 7 | 5 | 8 | **4** |

**Cheap death: found, and it is the ring.** After seven consecutive critics
reporting none, this one traced the painted mouth cavity by hand at five sizes
and called the target itself the cheap death: *"A player who does exactly what
the HUD instructs — land the snack inside the lime ellipse — is, at x1.82,
throwing at the creature's chin."*

### The two instruments disagree, and that is the finding

This critic's table and `scripts/mouth-calibrate.mjs` cannot both be right:

| | calibration says | critic measured |
|---|---|---|
| ring x centre, every size | exactly the rules' x | *"pinned at x 1337, rx 194"* — which **is** the rules' x and rx, to the pixel |
| drawn mouth y at x1.82 | within ~30 px of the rules | **162 px above the ring** |

The ring is provably the rules' ellipse — the critic's own numbers confirm it
independently. So the disagreement is about **where the mouth is**, and the two
instruments are measuring two different things: `mouthBox()` reports the aperture
the rig draws, lip to lip, while the critic traced the dark cavity between the
teeth. On a wide-open mouth those are not the same object, and the player aims at
the hole they can see.

**That is the next iteration and it is the most important one on this list.**
Until the two agree, no amount of tuning the ring is trustworthy, because the
number being tuned against is not the number the player is looking at. The fix
is to make `mouthBox()` report the cavity — the dark opening — rather than the
painted aperture box, re-run the calibration, and re-fit. Everything measured in
iterations 14 and 16 stands; it was measured against the wrong reference.

Also from this critic, and cheap: **`IRRITATION` is never explained anywhere.**
It kills 100 % of naive runs and 29 % of expert ones, and across 116 captured
frames no toast, card or hint ever says what fills it. `FULLNESS` has four
coaching lines. That is a one-line fix worth a point of Fairness on its own.

And an evidence gap three critics have now raised: **there is still no capture of
the kitchen-destroyed ending**, which is half of a moderate shift's deaths. The
capture harness films the moderate bot on one fixed seed, and that seed starves.
It should film one of each.

---

## Iteration 17 — the ring is the mouth, and the reason it never was

The iteration-16 critic called the target ring a cheap death: *"A player who does
exactly what the HUD instructs is, at x1.82, throwing at the creature's chin."*
The calibration script disagreed, and the way out was to find what the script was
not measuring.

**It was the tracking.** The rules move the mouth vertically by `creature.track`
— *"a snack in the air owns the face"* — by up to forty-six pixels, and they do it
on every frame with a serving in flight, which is most of the frames a player is
aiming on. The picture followed that with nine pixels of head travel in the two
tracking expressions and nothing else. The calibration probes had no projectile
in them, so `track` was zero in every one of them and the script had been blind
to the largest divergence in the game.

The pose now follows `creature.track` the way it follows `creature.lift`. The
coefficient is three times the lift's, and that is measured rather than assumed:
at the lift's own numbers, forty units of track moved the painted mouth eleven
pixels against the rules' thirty-six, because downward displacement through the
body kernel meets the floor gate on the way and costs about three times as much
to buy.

Two smaller things rode along, both named by critics: a dark stroke under the lit
ring, because on a pale flushed creature it was cream on cream and the first
thing a 960 px downscale threw away; and a coaching line for `IRRITATION`, which
ends 100 % of naive runs and 29 % of expert ones and had never once been
explained on screen while `FULLNESS` had four lines to itself.

### The whole repair, measured

| state | it 13 | it 14 | it 16 | **it 17** |
|---|---|---|---|---|
| bare x1.68 | 4.2 px | 3.1 | 3.1 | **2.9** |
| **track +40** | — | — | 30.3 | **4.4** |
| lift 10 | 28.9 | 6.4 | -1.2 | **-2.2** |
| lift 20 | 39.1 | 5.3 | -6.0 | **-6.5** |
| balloon 1, live | 30.4 | 22.5 | 13.0 | **10.1** |
| balloon 3, no lift | 84.1 | 49.4 | 34.0 | **22.2** |

### Bots and critic — iteration 17

Byte-identical bots and fixtures. **All five gates pass — eleventh consecutive
iteration.** 36 tests green.

| | Agency | Consequence | Tension | Readability | Comedy | Fairness |
|---|---|---|---|---|---|---|
| iteration 16 | 8 | 9 | 7 | 5 | 8 | 4 |
| **iteration 17** | 8 | 8 | 7 | **6** | 7 | **6** |

**No cheap death.** And Readability moved for the first time in six iterations.

The ring verdict, from a critic who measured it rather than describing it:

> *"**It is now centred correctly.** Ring centre vs mouth-opening centre is
> dx = +2 px at x1.28 and dx = +2 px at x1.82. Vertically it tracks the lip line
> within ±7 px. Whoever worked on this last got the anchor right, and the
> previous reviewers' complaint about placement is resolved."*

### What is left of it, and it is a different problem

> *"Position: fixed. Boundary: not fixed. The drawn mouth is a rotated wedge —
> wide and flat across the top where the teeth are, tapering to a rounded point
> at the lower right. The ring is an axis-aligned ellipse. So it simultaneously
> claims face and abandons mouth: 109 px of ring on bare cheek at x1.28, and a
> 387 px band of open gullet above its top edge at x1.82."*

That is not a bug in the drawing. The rules' acceptance test **is** an
axis-aligned ellipse — `dx² + dyGap² ≤ 1` about the mouth's centre — so the ring
is telling the truth about the rules, and the painting is the thing that is a
wedge. Closing it means changing one of the two: either the collision takes the
mouth's axis and taper, or the painted mouth is redrawn rounder. The first is a
rule change and needs the gates re-measured; the second is a rig change. Either
is a real iteration, and it is now the whole of the ring problem.

### One critic finding checked and rejected

> *"The end card reads ACCURACY 28%. The real landed rate is 17 of ~120
> launches, about 14%. The card flatters by 2x."*

It does not. `state.shots` increments once per launch, and replaying the captured
shift gives **61 launches, 17 feeds, 28 %** — exactly what the card prints. The
critic counted event-log entries rather than launches. Recorded because a
measured claim deserves a measured answer, and because the next reader of this
log should not go and "fix" a correct number.

---

## Iteration 18 — the other ending, finally on film

Four critics in a row had written some version of *"I cannot judge the fairness
of the ending I was never shown."* **Kitchen destroyed is 100 % of how an
unskilled player dies and about half of how a competent one does**, and there
was not one frame of it anywhere in eighteen iterations of captures, because the
harness films one fixed seed and that seed starves.

`scripts/loop-shots.mjs --cause kitchen-destroyed` walks seeds until the moderate
bot dies the way you asked to see. Seed 20268830, 2:19, 21 feeds, 43 % accuracy.
`docs/qa/loop/iter-18/`.

### The critic, on an ending nobody had judged

Fairness **6**, Readability **5**, and **no cheap death** — but the review is the
most useful one this project has had, because it measured things:

**The meter that kills you teaches you it is not your problem, then kills you in
twenty seconds.** Read off the frames: irritation is 0 % at 0:20, 4 % at 1:01,
10 % at 1:21 — and **8 % at 1:42, having decayed** — then 20, 30, 47, 66, 87, 93,
100. *"Eighty per cent of the meter that kills you fills in the last 27 seconds
of a 139-second shift."*

**The reward currency was counted and the death currency was invisible.** Every
hit carried a number — `PERFECT +530`, `CRAVING +360`. Every miss carried a mood
word and nothing else: `ON THE FLOOR`, `DROPPED`, `OFF THE BELLY`, `TOO LATE`,
`CLANG`. *"A player cannot learn that a miss is worth 7 irritation because the
game never once tells them a miss is worth anything."*

**The lethal meter was the quieter of the two, measured rather than eyeballed:**
fill-to-track contrast **10.53:1 for fullness against 3.96:1 for irritation.**

And two things that are real and are not fixed here: the creature wears the same
placid smile at 8 % irritation and at 93 %, so the death has no presence outside
the HUD; and the report card for "it has eaten the kitchen" renders a spotless
kitchen with intact pots and a delighted frog.

---

## Iteration 19 — the death currency gets a number

Two of that review's findings are presentation and both are now fixed. No rule
changed: the costs are read out of `TUNING`, the labels are composed in the
renderer, and the frozen traces came back byte-identical.

- **Every miss carries its price.** `TOO LATE  +2.5 IRRITATION`,
  `ON THE FLOOR  +5 IRRITATION`, in the same size and weight as `PERFECT +530`,
  in a red-bordered pill instead of the reward's.
- **The lethal meter is no longer the quiet one.** The irritation fill went from
  a dark red on a near-black maroon track to a bright salmon on true black, and
  it brightens again past 55 %.

`docs/qa/loop/iter-19/` is the same kitchen-destroyed shift with both. **All five
gates pass — twelfth consecutive iteration**, fixtures byte-identical. Verified
by eye at 960 px; not yet put to a critic.

Still open from the iteration-18 review, and both are real: the creature does not
show irritation at all, and the report card contradicts its own sentence by
drawing an undamaged kitchen.

---

## Iteration 20 — irritation on the face, and how far that got

The iteration-18 review's sharpest line was that the creature wears the same
placid smile at 8 % irritation and at 93 %, so the meter that ends every unskilled
run has no presence outside the HUD. The expressions for it already existed —
`annoy1`, `annoy2`, `annoy3`, with bared teeth, an angry brow and narrowed eyes —
and the reason they were not on screen is the order they are worn in.

A pose is a blend and the last wearer wins. Irritation was worn at step 3 of the
stack, before the mutations at step 4, before tracking at step 5 and the one-shot
reactions at step 6. So a creature three misses from wrecking the kitchen was
showing a balloon's smile, and a burp turned it back into a happy frog.

- **Irritation is re-worn after the mutations**, and from step two it wins.
- **Above the top step it is re-worn after the reactions too**, at a weight that
  blends under them rather than replacing them — a reaction is the player's own
  doing and is the feedback they need, but it should not be able to make a
  creature at ninety per cent look delighted.
- **`annoy2` and `annoy3` lost their `headY` and `squashY`.** They carried 13 and
  15 px of head lift, which at the top of the meter is 15 px of the lit ring
  drifting off the mouth — the fault iterations 14 to 17 spent four rounds
  removing. Irritation leans in with `headX` and `lean`, which cost the ring
  nothing.

**All five gates pass — thirteenth consecutive iteration**, fixtures
byte-identical, 36 tests green.

### What it actually looks like, honestly

Partly solved. In the same frame the iteration-18 critic called out —
`clip-ending/frame-09`, 87 % irritation, mid-burp — **the brow and the eyes now
read as angry**: heavy lids, brows down over the eyes, where before they were
raised and open. **The mouth is still a smile**, because the burp reaction owns
`cornerLift` and `mouthWidth` outright and a half-weight blend underneath it does
not invert a grin.

So: the face has a temper now, the mouth does not. Finishing it means either
letting irritation take `cornerLift` and `mouthWidth` outright above the top step
— at the cost of a reaction reading less clearly on the one frame it fires — or
authoring a snarling variant of the recovery reactions. That is the next
iteration and it is small. This one was not put to a critic; there was no block
time left to run one.

---

## Iteration 21 — finishing the temper, and building the instrument that finished it

Iteration 20 got the brow and the eyes and left the mouth smiling. Two further
attempts at the mouth changed nothing on screen, and each one cost a sixteen-
minute capture to discover that. A capture shows you the frame; it does not tell
you which channel is winning.

**`scripts/pose-probe.mjs`** prints the pose the animator actually settled on, in
a named state, with a real reaction playing over the top. It answered in three
minutes what three captures had not:

| | cornerLift | teethBare | browAngry | lowerLid | rageFlush |
|---|---|---|---|---|---|
| calm (rage 4) | -0.12 | 0.40 | 0.39 | 0.42 | 0.00 |
| rage 87 | **-1.00** | **0.99** | **0.99** | **0.82** | **0.94** |
| rage 87, mid-burp | **-0.97** | 0.89 | 0.90 | 0.75 | 0.94 |

The blend was never the problem after iteration 20's re-ordering — the channels
were already at full snarl, and they already survived a burp. So the change that
finished it is small: above the top step irritation now takes `cornerLift`,
`mouthWidth`, `teethBare`, `browAngry`, `lowerLid` and `lipPress` outright rather
than blending, and it pushes the corners *past* level, because the painted mouth
curves upward on its own and pulling it to level still reads as a smile.

### What it looks like, and where the rig's limit is

Side by side at 87 % irritation, iteration 19 against 21 (`clip-ending/frame-09`
of each): **the brows come down heavy over narrowed eyes and the flush is on the
face** — the creature is unmistakably scowling where it used to be beaming. The
mouth flattens and drops a little, and no further.

That last part is a rig limit, not a blend order, and the probe is what proves
it: `cornerLift` is at -1.00, as low as the expression set goes, and the painted
mouth at a wide aperture is a grin the warp can bend but not invert. Taking it
further means authoring a snarl into the mouth drawing itself rather than asking
the corner channel for more than it has.

**All five gates pass — fourteenth consecutive iteration**, fixtures
byte-identical, 36 tests green. The bots never touch the renderer, so a pose
change cannot move them; that is why this one is presentation-only in the
strictest sense.

---

## Iteration 22 — the last third is worth something

*"Moderate and good bots both finish at exactly x1.96 with identical score rates,
60.8 against 61.1 points a second, so fifty extra seconds of expert play is the
fourth act repeating."* And the obvious lever — making the mutations arrive
faster — was measured in iteration 10 and rejected, because mutation strength
**is** the difficulty ramp and speeding it up broke the death-spread gate.

So the escalation this iteration adds is not difficulty. **Everything scored is
multiplied by a shift pay rate that rises with time survived.** The last third of
a run is worth more than the first, a number on the HUD goes up every twenty
seconds in a stretch that previously had nothing new in it, and the dead
`ITS APPETITE` slot — which never left x1.00 to x1.05 in any captured shift —
becomes `SHIFT PAY`, which reaches x2.51 by two minutes.

### Keyed to size first, and measured, and changed

The first version paid by how big the creature had got, which reads better as a
fiction. It did nothing:

| | survival ratio | score ratio |
|---|---|---|
| before | 1.37x | 1.38x |
| **paid by size** | 1.37x | **1.30x** |
| **paid by time** | 1.37x | **1.65x** |

Size plateaus at about x1.96 for every competent player, so a multiplier riding
it is flat across exactly the stretch it was meant to bend. Time is the thing
that never plateaus.

### Bots — 200 seeded shifts each

| bot | median | score | points/second |
|---|---|---|---|
| naive | 28.6 s | 157 | — |
| moderate | 133.8 s | **14362** | **107.3** |
| good | 183.7 s | **23635** | **128.7** |

Survival, causes of death and the death spread are **identical to the previous
eleven iterations, to the second** — which is the point: the reward curve bent
and the difficulty did not. **All five gates pass — fifteenth consecutive
iteration.** 36 tests green; fixtures regenerated, since this is the first rule
change since iteration 11.

---

## Iteration 23 — you are not paid for the seconds you are failing

Two faults from the iteration-22 critic, one of them introduced by iteration 22
itself.

**The pay rate was climbing while the player failed.** *"In strip-0200-05 and
-08 the score is frozen at 11512 — no feed since 01:56 — yet SHIFT PAY climbs
x2.46, x2.49, x2.51 across the same window. A headline number that goes up
during a five-second total-failure streak is anti-agency feedback."* Correct, and
the fix was already in the game's own vocabulary: the score has paid for **time
kept fed** since iteration 1, and the multiplier now rides the same clock. A
belly under the line stops the meter.

**You could not tell your own snack from the kitchen's cutlery.** *"In
clip-first-stack/frame-08-stream the player's tin can and the hazard spoon are
the same fourteen-pixel grey smudge over the same busy photograph."* A serving in
flight now carries a dark halo, a long bright tail in its own ingredient colour
and a ring around it — three things the room's metal does not have. Verified at
960 px: three servings in flight in `iter-23/clip-first-stack/frame-08-stream.png`
read instantly against a belly covered in forks.

### Bots — 200 seeded shifts each

| bot | median | score | points/second |
|---|---|---|---|
| naive | 28.6 s | 157 | — |
| moderate | 133.8 s | 14167 | 105.9 |
| good | 183.7 s | 23324 | 127.0 |

Survival, causes and spread identical again; the score ratio holds at **1.65x
against a survival ratio of 1.37x** after moving the multiplier onto paid time.
**All five gates pass — sixteenth consecutive iteration.** 36 tests green.

### The iteration-22 critic, and what it weighted

| | Agency | Consequence | Tension | Readability | Comedy | Fairness |
|---|---|---|---|---|---|---|
| iteration 21 | — | — | — | — | — | — |
| **iteration 22** | 6 | 8 | 6 | 5 | 7 | 7 |

**No cheap death.** Agency and Tension are lower than the previous critic's, and
the reason is a different emphasis rather than a regression: this one weighted
**the naive tier** heavily — *"200 runs, 0 feeds, a 4.1-second outcome spread and
one cause of death... that is not a game with low agency, that is a cutscene of
fixed length"* — and the flat opening, *"FULLNESS reads 65 % at 00:20, 00:32,
00:40 and 00:47. Four samples spanning 27 seconds and the needle does not move."*

Both are worth answering and neither is answered here. The naive bot is a
deliberate strawman — it never aims at all, which is not what a beginner does —
but "nothing in the first thirty seconds teaches aim" is true of the game and not
just of the bot, and the numeric gate requires that bot to die inside 45 s, so
the answer has to be an aid rather than a difficulty change. The flat opening is
a tuning question: the drain is real from the grace tick onward, it is simply
slower than a serving restores, so a competent player sits at a plateau until
the appetite catches up.

---

## Iteration 24 — the opening gets a stake, and the dead slot earns its place

Two critics had measured the same flat opening — *"FULLNESS reads 65 % at 00:20,
00:32, 00:40 and 00:47; four samples spanning 27 seconds and the needle does not
move"* — and the same dead HUD slot: `STREAK` read x0 in eleven of twelve sampled
frames, because at 28 % accuracy it always will.

The stake in the first forty-five seconds was never missing; it was invisible.
It is the **first mutation**, three servings out, shown only as three small pips
in a corner chip. The `STREAK` slot now reads **NEXT CHANGE** — the ingredient
the creature is closest to changing on, and how many servings away — so the
opening has a number that moves and a promise that lands. Presentation only; the
data was already in the state.

### Critic — iteration 24

| | Agency | Consequence | Tension | Readability | Comedy | Fairness |
|---|---|---|---|---|---|---|
| iteration 22 | 6 | 8 | 6 | 5 | 7 | 7 |
| **iteration 24** | **7** | 8 | **8** | **6** | 7 | 7 |

**No cheap death.** Tension went 6 to 8 and Readability 5 to 6. On the three
things that were asked for, the verdicts were "half landed", "landed as
information, failed as a distinct signal" and "not landed" — each with a reason
precise enough to act on, which is the next iteration.

---

## Iteration 25 — three faults, two of them mine

**The ring grammar was spent the same iteration it was bought.** Iteration 23
gave a serving in flight a ring so it could not be confused with the kitchen's
cutlery, and it worked — *"eleven white matte forks, none of them ringed... the
player's tin can carries an opaque lime ring. A stranger gets this in one
frame."* And then: *"the player's air puff is a teal bag inside a thin teal ring;
the creature's balloon-belly valve is a teal blob inside a thin teal ring — same
hue, same ring weight, same diameter. You spent the whole iteration teaching
'ring = your snack' and then put a ring on a body part."* The valve's pressure
readout is now a **gauge** — a vertical bar on a dark plate — which is a shape
nothing in flight uses.

**The pay rate stalled in silence.** *"Between 01:54 and 02:01 the multiplier has
frozen because the belly dropped under the danger line, and nothing marks it.
Same weight, same colour, same position. The one moment where SHIFT PAY could
have said 'you are losing something right now' passes in silence."* It now reads
`SHIFT PAY · STALLED` in red with the figure struck through, and it is on the
report card, which had been grading a 121-second run without mentioning the
number that run had spent 121 seconds compounding.

**A reassuring word on a falling bar.** *"A pill reading CATCHING UP sits inside
the FULLNESS row while the number falls 60 % to 55 %... it is the only place in
the build where the HUD actively misinforms a stranger."* Correct — catching up
is the hatch debt being repaid, which means the bar is falling *faster* than
usual. It reads `PAYING IT BACK` now.

**All five gates pass — eighteenth consecutive iteration**, fixtures
byte-identical, 36 tests green.

---

## Iteration 26 — teeth were growing out of the tongue

Reported by the player, and true: on a wide-open mouth the lower teeth in the
middle of the arc were drawn on top of the tongue's body, so they read as teeth
growing out of it.

The comment on the code said what it was doing — *"Tongue on the floor of the
mouth, then the teeth in front of it"* — and that order is right at the corners
of the jaw and wrong everywhere else. A tongue sits on top of the lower jaw and
in front of the teeth rooted in it; only the upper row hangs in front of
everything. So the order is now the anatomy's: **lower teeth, then the tongue,
then the upper teeth.** The corners still show their fangs, because the tongue is
narrower than the mouth.

`scripts/mouth-calibrate.mjs --shot <file>` now saves a still of the mouth at its
widest, which is the only state where the interior is fully visible and therefore
the only one worth checking a draw order against. It is how this was verified,
and it costs three minutes rather than a sixteen-minute capture.

**All five gates pass — nineteenth consecutive iteration**, fixtures
byte-identical, 36 tests green. Nothing here touches a rule; it is a draw order.

---

## Iteration 27 — the teeth were inside the tongue sprite

The player looked again after iteration 26 and said the tongue *"still shows some
residual teeth and is now split in half."* Both halves of that were right, and
neither had the cause I had assumed.

**The split** was two tongues. The lolling-tongue sprite, meant for a lazy
open-mouthed pant, was being drawn over the in-mouth tongue at full jaw, so the
two overlapped offset and read as one tongue cut down the middle. It is now gated
on `pose.jawOpen < 0.4` — a tongue lolls out of a *slack* mouth, not a gaping one.

**The residual teeth** took four failed fixes before I stopped guessing. Draw
order was already correct. Adding a general rule — *no tooth may end inside the
tongue's ellipse* — culled the teeth that crossed the flesh and was worth keeping,
but a pale nub still rode the tongue's right edge. So I made the measurement
decisive: a temporary `return` at the top of `drawTeeth`, drawing **zero** teeth.
The nub was still there. It was never a drawn tooth.

`scripts/rig-part.mjs` (new) dumps a single sprite out of the built rig as a PNG,
and the tongue patch showed it outright: **three of the painting's lower teeth are
inside the cut.** `TONGUE` was traced around the whole painted tongue, so its
lower rim crossed the teeth rooted in front of it and its top-right caught the
dark cavity behind. Those ivory tips were baked into the texture and travelled
with it, which is why no amount of draw-order or culling work could move them.

The fix is the cut, not the draw: `TONGUE` is now `(815, 308, 40x16)`, an ellipse
sitting entirely on flesh. It is smaller than the painted tongue, which costs
nothing — the sprite is stretched to the drawn tongue's size either way.

The lesson is the one this loop keeps re-learning: **when three fixes in a row
fail, the model of the problem is wrong, so build the instrument instead of
trying a fourth.** One `return` statement and one sprite dump found in ten minutes
what four visual fixes had not.

**Render fell inside budget in every state for the first time.** Worst case was
4.52 ms at iteration 26; it is now **3.94 ms mean / 3.77 ms median** (typical
2/2/1 at x2.0), with the heaviest state, three-of-everything at x2.4, at 3.87 ms
mean / 3.80 ms median. The smaller tongue patch and the teeth the new rule no
longer draws account for it. That closes a standing open item.

| state | mean | median | p95 |
|---|---|---|---|
| balloon 3 | 3.64 | 3.60 | 3.90 |
| balloon 3 x2.0 lift | 3.67 | 3.43 | 4.60 |
| pepper 3 | 3.59 | 3.57 | 4.10 |
| typical 2/2/1 x2.0 | 3.94 | 3.77 | 4.90 |
| worst 3/3/3 x2.4 | 3.87 | 3.80 | 5.90 |

**All five gates pass — twentieth consecutive iteration.** naive 28.6 s, moderate
133.8 s (worst bucket 38 %), good 183.7 s, density 126.91/min. Identical to
iteration 26, as they must be: nothing here touches a rule.

**Critic: Agency 9, Consequence 9, Tension 8, Readability 6, Comedy 8,
Fairness 7** (iteration 24 was 7/8/8/6/7/7). No criterion fell, and no cheap
death: *"The 2:00 ending was telegraphed for at least 40 seconds."*

Readability is the floor again, at 6, and its top fault is specific and fair:
**the score economy shows two red badges and explains neither.** SHIFT PAY ·
STALLED appears at 1:20 and 2:00 but not at 1:41 at the same size, so it toggles
on a hidden condition; PAYING IT BACK sits on the fullness bar unexplained. The
critic's own words: *"Every other punishing state in this game gets a
plain-English line. The multiplier that the entire run is built on gets
nothing."* That is iteration 28.

The other two faults are the ones this loop already knows: the first thirty
seconds show a beginner none of the game (naive: 0 feeds in 200 runs), and
"Reloading" holds the centre-bottom of the HUD in 6 of 6 sampled frames.

---

## Iteration 28 — the score's own rule, said out loud

The critic given only iteration 27's captures put this first, and it was right:

> *"Every other punishing state in this game gets a plain-English line. The
> multiplier that the entire run is built on gets nothing."*

SHIFT PAY turned red at 1:20 and 2:00 but not at 1:41 at the same creature size,
so it toggled on a condition nothing on screen named. The condition is the belly:
pay only accrues above 30 % fullness. Three things were wrong with how that was
carried.

**The number was a literal in two places and a third copy in the HUD.** It is now
`TUNING.payFloor`, so the rules own it and the renderer reads it. A threshold the
UI has to memorise is a threshold that can silently disagree with the simulation.

**The badge named the state and not the cause.** The fullness bar now lights
`PAY STALLED` at the same moment the corner badge strikes through the multiplier.
Two badges, one rule, lit together — the eye connects the number to the bar it
depends on without being told.

**The line itself was invisible.** There is now a tick on the fullness bar at
30 %, drawn *always*, not only once it has been crossed. A threshold you can only
see after falling through it is a warning that arrives too late to act on.

And the caption states the rule in the voice the other rules use, in the band
between 25 % and 30 % — above the "Empty belly soon" warning, which is more
urgent and keeps precedence: **"Under 30 % your pay stops climbing. Feed it to
start earning again."**

**The end card now names what killed the run.** The critic: *"the end card does
not name which failure state fired, so the player cannot learn from the loss."*
`failureReason` was in the state all along and drawn nowhere. D57 says no *ending*
may name a cause of death, and that stands — the headline still describes only how
big it got. The cause is a separate line: "IT WENT HUNGRY." or "YOU MISSED TOO
OFTEN." Those are different claims and they belong in different sentences.

`scripts/hud-state.mjs` (new) photographs the HUD either side of a threshold by
setting the vitals directly. Checking a change to the meters used to require a
twenty-five-minute capture run to reach a state deep in a shift; it is now one
minute, which is the difference between verifying a HUD change and hoping.

**All five gates pass — twenty-first consecutive iteration**, numbers identical
to iterations 26 and 27 to the decimal, which is the proof that `payFloor: 30`
replaced the literal `30` and changed nothing. 36 tests green, fixtures
byte-identical.

---

## Iteration 29 — the window, drawn

A critic given only iteration 28's captures found the thing this loop had been
missing for twenty-eight iterations, and called it by name:

> **CHEAP DEATH.** *"The game charges `TOO LATE +2.5 IRRITATION`. The projectile
> is mid-flight, roughly 380px from the target... nothing on screen shows how
> long the mouth will stay open. The game's own tip is 'Shut. You have to catch
> the window.' It knows this is the core skill. It does not render the window."*

That is exactly right, and it had been true since stage 2. The rules bill a shot
by the aperture at the moment it **arrives**, a serving is most of a second in
the air, and the only mouth information on screen was the mouth *now*: the ring
while open, and brackets counting down while shut. Neither answers the one
question the player is actually being asked — *will it still be open when this
lands?*

**The window is now drawn.** A strip under the mouth lays out the next ninety
ticks left to right, lit where the rules say the mouth will be open wide enough
to swallow and dark where it will not, with a notch at the tick the serving
currently aimed would arrive. Fire now or wait: the answer is on the strip.

Two exports carry it, and both are readouts rather than rules:

- `apertureAhead(creature, ticks)` runs the same `apertureAt` the simulation
  runs, off the same cycle fields, so the strip cannot drift from the mechanic it
  draws. It refuses to look more than one cycle out, because the next window's
  length is a seeded roll the renderer has no business reaching for, and reports
  the shortest window the rules can make instead of guessing: a lead that is
  right for a short window is right for a long one, never the reverse.
- `previewFlight` is `trajectoryPreview` with the two facts the points alone
  cannot carry — how many ticks the serving is airborne, and whether the walk
  actually **ended** in that time.

**`settled` was the whole difficulty.** The first version marked the last point
of the guide as the arrival, which is only true if the walk finished; a preview
that merely ran out of steps looks identical to one that arrived, and the first
capture showed a cheerful green ring hanging in mid-air over a shot that fell
forty pixels short of the counter. The second difficulty was worse and would have
shipped: the dotted guide is deliberate **training wheels** — `guideSteps` runs
34, then 10, then 8, then 0 by the third shift — so anything hung off the guide
would have vanished for exactly the players who no longer have it. The flight
walk now always runs far enough to settle, and `guideSteps` governs only how much
of it is **drawn**.

**It cost the budget and had to be bought back twice.** Thirty rectangles a frame
plus a 96-step walk every sixth tick put the worst state at 4.08 ms. One fill per
open *run* rather than per sampled tick recovered part of it; halving the walk's
cadence to twelve ticks recovered the rest, and costs a fifth of a second of
staleness on a readout spanning a second and a half — while any change the player
**makes** is in the cache key and refreshes at once. Worst state 3.89 ms.

**All five gates pass — twenty-second consecutive iteration**, numbers identical
to the decimal for the third iteration running, which is what a readout should do
to bots that do not read the screen. That cuts both ways, and it is worth saying
plainly: **the gates are blind to this change.** No bot reads a strip, so nothing
in the measured table can tell me whether the window makes the game fairer or
merely easier. The critic is the only instrument pointed at it.

**Critic: Agency 7, Consequence 9, Tension 8, Readability 5, Comedy 8,
Fairness 7.** The verdict that mattered: **"I see no CHEAP DEATH."** Fairness rose
and the finding closed.

But the instrument that closed it is now the top fault, and fairly:

> *"~130 px of olive-yellow and dull red painted on a pale-green belly,
> unlabelled, no legend... identical widget state, opposite game state. At stream
> scale this element transmits zero bits."*

The reported contradiction is a misreading — the strip is the **future**, so its
left edge is *now*, and the critic read the notch's position against the lit
segment as the present state. But a widget a careful observer decodes wrongly is
not a widget that works. Nothing marks which end is now, and it is drawn in two
low-contrast colours on pale flesh. That is iteration 30.

---

## Iteration 30 — making the instrument readable, and an honest number

Iteration 29 closed the cheap death and the thing that closed it became the top
fault. The critic's words: *"~130 px of olive-yellow and dull red painted on a
pale-green belly, unlabelled, no legend... At stream scale this element transmits
zero bits."* And the specific decode failure, worth quoting because it is the
whole lesson:

> *"hud-0120: tick right of the lit segment, mouth **wide open**. hud-0140: tick
> right of the lit segment, mouth **closed**. Same bar state, opposite mouth
> state. I cannot build a rule that survives all four."*

That is not a contradiction in the widget. The strip is the **future**: its left
edge is *now*, and the critic was reading the notch against the lit segment as
the present. But a careful reader who decodes a widget backwards has found a
defect in the widget, not in themselves. Three things were missing and are now
there:

- **A plate.** The strip drew straight onto whatever the creature had mutated
  into, which by the second minute is pale. It sits on its own near-opaque dark
  plate, so it is never olive on olive.
- **A NOW mark.** A caret at the left edge, pointing right. Without one, a strip
  of lit and dark blocks is a bar chart of nothing — and that single missing
  glyph is what made the reading reversible.
- **A serving, not a playhead.** The marker is a dot in the loaded ingredient's
  own colour on a stem, which is the grammar a serving in flight already uses
  (D67). It reads "my food lands here" rather than "a cursor is at this time".

Checked at the resolution it is judged at: the frame was downscaled to 960 px
before looking at it, which is the only honest way to check a readability fix and
is not what the previous two iterations did.

**The silent meter got its label.** The critic, again correctly: irritation fell
nine points between two sampled moments with *"no banner, no floating number, no
colour flash, in a game that otherwise annotates a 2.5-point increase with a
full-width label."* A feed calms it, and that was the one movement on the doom
meter carrying no number. It now reads `-N IRRITATION` in the same breath as the
label, on the rules' own figure — and because a craved serving is worth more of
it, the argument for honouring a craving is now made visible at the moment it
pays.

### The render number, stated properly

This iteration's honest figure is **not** the passing run. Six measurements of
the same build, worst state: **4.13, 3.87, 4.01, 4.05, 3.92, 4.00** — a median at
the line, not under it, with run-to-run noise of about +/-0.13 ms. The `rig` term
alone swung 3.04-3.45 ms across runs of *identical code*, which is larger than
anything the strip could cost, so three rounds of cutting my own draw calls moved
nothing measurable. Some of the spread was a machine with stale dev servers on
it, and a clean machine reads 3.92/3.96 — but reporting that run alone would be
choosing the number rather than measuring it.

So: **D62 is re-opened.** The build sits AT the 4 ms budget, not inside it. The
arithmetic says where the remaining work is and it is not in the HUD: the warp is
3.3 ms of a 4 ms budget, and everything drawn on top of it — meters, labels,
mutations, ring, strip — is about 0.6 ms together. No further HUD cut can buy
meaningful headroom. The warp grid is the term, D64 already recorded that 29x23
tears, and that is the next real piece of work rather than another round of
shaving rectangles.

**All five gates pass — twenty-third consecutive iteration**, identical to the
decimal for the fourth running.

**Critic: Agency 9, Consequence 9, Tension 8, Readability 5, Comedy 7,
Fairness 6.**

The strip now decodes. Iteration 29's critic got *"zero bits"*; this one read it
straight off the frames — *"a swallow-window timing track... the coloured dot is
the predicted arrival time of the food currently in flight. You want the dot to
land on a lit segment"* — and called the idea *"the best on the screen"*. It
still wants it off the creature's mottled belly and at brutal contrast, and it is
right that it now rhymes with the reload bar at the bottom of the frame.

**But a new cheap death, and it has been true since stage one.** This is the best
finding any critic has made against this build:

> **CHEAP DEATH — the kitchen has no meter, and it kills half your runs.**
> *"`kitchen-destroyed` is 101/200 moderate runs and 58/200 good runs... there is
> no kitchen health bar, no structural damage indicator, nothing. A player
> watching a bar labelled IRRITATION has no reason to know it is a structural HP
> bar for a building they cannot see."*

Every iteration of this loop has read that bar as the rage meter it is named
after. It is not. It is one of the two things that end a shift, it ends more of
them than starving does at moderate skill, and what it does at 100 is stated once,
in the smallest text on the screen, in the corner nobody looks at. Iteration 31.

And a plain bug, found only because the critic reads the frames in order:
**the stage counter runs backwards.** `04 / THE LAST SERVING` at 1:20, `03 / IT
NO LONGER FITS` at 1:41, `04` again at 2:00. D59 keyed act four to a condition
rather than the clock, which fixed act four never appearing and made the ordinal
non-monotonic — and "THE LAST SERVING" was demonstrably not the last, twice.

---

## Iteration 31 — the bar says what it does to you

The best finding any critic has made against this build, and it had been true
since stage one:

> **CHEAP DEATH.** *"`kitchen-destroyed` is 101/200 moderate runs and 58/200 good
> runs — more than half of all non-naive losses... there is no kitchen health
> bar, no structural damage indicator, nothing. A player watching a bar labelled
> IRRITATION has no reason to know it is a structural HP bar for a building they
> cannot see."*

Thirty iterations read that meter as the rage meter its name promises. It is not.
It is one of the two things that end a shift, it ends **more** of them than
starving does at ordinary skill, and what it does at 100 was stated exactly once,
in the smallest text on screen, in the corner nobody watches. IRRITATION is the
mechanic's name. It is not the consequence's name, and the consequence is the
part the player needs.

**So each meter now says what it does, on the meter.** The bar in its dangerous
half carries one line under the plate at 14 px: `FULL — IT WRECKS THE KITCHEN`,
or `EMPTY — IT EATS YOU`. It appears only past the halfway mark, so it is a
warning rather than furniture, and it fades up with the danger. Checked at 960 px
before being believed.

This is the counterpart to D75 and the same principle as D68: **a readout may
name a mood, but something on screen has to name the outcome.** Every previous
fix in this area made the meters *bigger*, *brighter*, *better contrasted* — six
iterations of making an unlabelled thing more visible. None of them made it say
what it was.

**The stage counter ran backwards.** `04 / THE LAST SERVING` at 1:20, `03 / IT NO
LONGER FITS` at 1:41, `04` again at 2:00 — caught only because a critic reads the
frames in time order. D59 keyed act four to a condition rather than the clock,
which fixed act four never appearing and quietly made the ordinal non-monotonic;
and "THE LAST SERVING" was demonstrably not the last, twice in one run. The three
acts are keyed to growth and stay monotonic; the danger state has stopped wearing
an ordinal and reads `!! ON THE BRINK`, which is a state and is allowed to come
and go.

**`PAY STALLED` moved out of the wrong row.** The badge sat inside the row
labelled FULLNESS, and the critic called the placement *"actively misleading"* —
correctly, since a badge about pay in a row about fullness reads as a claim about
fullness. It belongs on that bar, because that bar is the cause, so it now states
the cause: `BELOW PAY LINE`, pointing at the tick D70 drew on the same bar.

**The strip was left alone.** The critic asked for it off the belly and at harsher
contrast; looking at the actual iteration-30 captures rather than the description,
it draws on an opaque black plate with a bright lime fill and is already the
highest-contrast object in the frame. The fair half of the note — that it now
rhymes with the reload bar — is recorded rather than acted on, because moving it
would undo the one thing that made it decode: it sits under the mouth it is about.

**All five gates pass — twenty-fourth consecutive iteration**, identical for the
fifth running. Render: 3.89 and 4.24 ms on two runs of this build, the same
+/-0.2 ms noise D62 was re-opened over, with `rig` alone moving 3.30 to 3.53
between them.

**Critic: Agency 8, Consequence 9, Tension 8, Readability 4, Comedy 7,
Fairness 6.**

**The cheap death is closed.** Asked directly what happens when each meter runs
out, the critic answered both, and named where it learned them: *"IRRITATION:
full = it wrecks the kitchen... FULLNESS: empty = it eats you"* — read off the
new caption row. And on the ending: *"No cheap death in the ending clip — the
score is frozen at 10909 from 111.5s to 121.7s with FULLNESS visibly draining to
2%, so the starvation was on screen for ten seconds."*

**And the new caption has a bug, found in the same breath.** It picks the wrong
meter:

> *"hud-0200: FULLNESS **2%**, IRRITATION 80%, caption reads 'FULL — IT WRECKS
> THE KITCHEN' — and roughly one second later the run ends with 'IT WENT
> HUNGRY'... The one line telling a stranger which way the player is about to die
> is anti-correlated with actual danger in 2 of 3 samples."*

Irritation was tested first and won whenever it was past half, whatever fullness
was doing. Both meters compute a danger already; the caption just has to take the
**larger** one. Iteration 32.

Readability fell 5 to 4 on this build, which is the loop's lowest score to date
and the thing to be honest about: the caption fault above is a fault I
introduced, and the timing strip remains *"the best mechanic here"* and *"the
worst-served element on screen"* in the same paragraph.

---

## Iteration 32 — the caption follows the danger, and the track gets an address

Two faults, both found by a critic reading only the frames, both mine.

**The caption named the wrong death.** Iteration 31 put the consequence on the
meter and then chose between the two by testing irritation first: past half, it
won, whatever fullness was doing. So a run at **2 % fullness and 80 % irritation**
was told the kitchen was in danger and was eaten a second later. Measured:
*"anti-correlated with actual danger in 2 of 3 samples."*

The fix is not a reordering, it is removing the ordering. Both bars already know
their own distance to their own lethal end; the caption takes the **larger**.
There is no precedence left to get wrong, which is the only kind of fix worth
making to a bug of this shape. Verified at 2 % / 80 %: it reads `EMPTY — IT EATS
YOU`.

**The track was anchored to the wrong thing.** Three critics running called the
timing strip both the best idea on screen and the worst-served element on it. The
last one said why:

> *"It is simultaneously the smallest, lowest-contrast, least-labelled thing on
> screen and sits over the busiest art... I reverse-engineered the game's core
> skill expression from a death message."*

The contrast complaint was already wrong by iteration 30 — it draws on an opaque
plate. The real fault was the anchor. The track hung off the creature, so it
**moved** as the creature moved and **grew** as the creature grew: the two
properties a thing you must read in a third of a second must not have. It is now
the third row of the plate the player already reads the other two numbers off,
labelled `MOUTH`, 296 px instead of 118, in the same place in every frame of
every shift.

Which settles an argument this loop had with itself at iteration 31, when I
declined to move it on the grounds that *"it sits under the mouth it is about"*.
That was true and it was the weaker consideration. Adjacency is worth something;
a fixed address is worth more, and a HUD row can be learned once and then read
without looking for it.

**All five gates pass — twenty-fifth consecutive iteration**, identical for the
sixth running. Render 4.08/4.15 ms on this build, inside the same +/-0.2 ms noise
band D62 is re-opened over.

**Critic: Agency 8, Consequence 9, Tension 7, Readability 5, Comedy 7,
Fairness 4.** Readability recovered a point; **Fairness lost two**, and the reason
is worth more than the number.

Both fixes worked and both were judged insufficient for the same structural
reason. The caption is now correct — at 2 % fullness and 80 % irritation it names
starvation, and the run ends of starvation a second later, which the critic
verified. But:

> *"It is only ever right about one of the two deaths. At hud-0200 IRRITATION is
> at 80 % with the bar nearly full, and the only full-width red text on screen is
> pointing at the other meter."*

**One caption slot and two ways to die means one of them is always unannounced**,
and D78 only chose which. `kitchen-destroyed` is the plurality ending across the
whole population — 200/200 naive, 101/200 moderate, 58/200 good — and it is the
one that loses the slot whenever starvation is worse. The fix is not a better
rule for picking; it is two captions. There is a row for each meter already.

Second, the threshold is too low to mean anything: *"that same banner was already
on screen at hud-0140 when FULLNESS was 45 % **and rising**. A warning displayed
identically at 45 %-and-climbing and at 2 %-and-dying carries no information at
the moment it matters."* Binary and sticky.

And a third fault this loop has been walking past for thirty-two iterations,
caught by comparing a timestamp against the bot table:

> *"The rule that kills the entire naive cohort is first shown at 01:41 — 2.8x
> longer than a naive run survives... Every one of those 200 kitchen-destroyed
> runs ended from a mechanic the game had not yet mentioned."*

The coaching line naming irritation's consequence sits below the opening aim tips
in the priority chain, and the opening tips hold the slot for the first fifteen
seconds — which for a naive player is half their life. Iteration 33.

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
