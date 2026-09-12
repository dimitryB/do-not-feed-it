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
