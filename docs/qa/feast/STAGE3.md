# FEAST — stage 3: the pace, the camera and the props

Opened by the stage 2 review of `docs/qa/loop/iter-1`: the whole escalation
was spent in the first half minute, the face left the frame from about ×2,
and the props were grey outlines on a painting. Decisions are D112–D120 in
`docs/DECISION_REGISTER.md`. Rules changes are confined to `TUNING` and the
level thresholds in `lib/game/arcade.ts` (GAME_VERSION 5); the renderer work
is in `lib/render/scene.ts` and `lib/render/creature/draw.ts`. Capture sets:
`docs/qa/loop/iter-101` (first run, reviewed) and `docs/qa/loop/iter-102`
(after the fixes; moderate bot, seed 20260911, 353 s, 474 feeds, 16
frenzies, best combo 27, died empty-belly at ×2.40 with every mutation at 3).

## 1. Pacing

### What changed, and why each number

| constant | stage 1 | stage 3 | why |
| --- | --- | --- | --- |
| `servingsPerLevel` 3 | — | `levelServings [10, 28, 70]` | A level every three servings put all three ingredients at ×3 by 29 s. Cumulative per ingredient, rising, so the first chip is quick and the third level is a late-shift event |
| `growthPerFeed` | 0.05 | 0.014 | ×2.15 by 29 s. Four times smaller is still not enough on its own (see the pause, below) |
| `growthEarlyBoost` 0.9 | — | `growthShape` −0.3 | Front-loading made the first frenzy — every catch gorged, growth doubled — spend half the curve. Back-loaded: a serving is worth 0.7× at ×1 and 1× at the cap |
| `cravingGap` | 80 | 120 | The moderate bot chains cravings; at 80 the growth pause was active ~70 % of its shift and no per-feed number paced the curve. At 200 the chain, which also carries its survival, broke and the median fell to 95 s |
| `growthPauseMax` | 150 | 120 | Same reason, smaller lever |
| `drainBase` / `drainPerSize` / `drainPerMinute` | 0.06 / 0.005 / 0.08 | 0.06 / 0.015 / 0.07 | With size arriving later the size term is weaker, so the per-minute term carries more. The per-minute slope is the naive bot's killer; the size term is the moderate's |
| `temperSpread` | 0.8 | 1.0 | Keeps the moderate's worst 30-s bucket under 40 % with the steeper slope |
| `restoreShrink` | 0.6 | 0.42 | Gives the big late creature back some of what the slope takes |
| `gorgeGrowth` | 2 | 2 | Kept: stuffing it is the title's punishment, and in a frenzy every catch is a stuffing |

Tried and rejected, in order, each at 30–60 shifts: a per-size drain of
0.03 (naive lived to 80 s: its whole life is "early", so the base and slope
move it and size barely does); `appetiteRelief` 0.035 to favour the craving
chain (naive meets nearly every craving by spraying all three snacks, so it
gained *more* than the moderate: 83 s); `missRage` 8 to give the spammer a
kitchen-wrecked ending (feeds cool irritation faster than misses raise it;
nobody's rage left zero); shifting weight from the slope to the base (made
naive's fall from 85 to 0 gentler and *longer*). The curve shape is set by
two things the bots do: the moderate bot stuffs the creature in every frenzy
(gorged growth) and pauses growth with every craving it chains; a human does
both less well, so a human's creature grows faster than the bot's. The gates
are tuned to the bot, as the brief says.

### The bot table

200 shifts, pure simulation, `node --experimental-strip-types
scripts/loop-bots.mjs --shifts 200 --density-shifts 8 --json
docs/qa/feast/stage3-bots.json --fixtures tests/fixtures/loop-traces.json`
(1029 s).

| bot | n | p10 | median | p90 | max | feeds | accuracy | frenzies/run | banks/run | clanks/run | score | size at death | worst 30-s bucket |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| naive | 200 | 61.6 s | **74.2 s** | 95.8 s | 106.1 s | 71 | 49.1 % | 0 | 0.69 | 69.7 | 14107 | ×1.64 | 74.5 % |
| moderate | 200 | 103.2 s | **142.7 s** | 210 s | 330.8 s | 194 | 83.1 % | 5.8 | 37.61 | 29 | 163572 | ×2.15 | 27.5 % |
| good | 200 | 125.3 s | **163.9 s** | 247.2 s | 361 s | 217 | 80.9 % | 5.66 | 80.25 | 41.4 | 181363 | ×2.18 | 28.5 % |

All 600 deaths were empty-belly. Deaths per 30-second bucket:

- naive: 30-60s 8 %, 60-90s 74.5 %, 90-120s 17.5 %
- moderate: 60-90s 1.5 %, 90-120s 27.5 %, 120-150s 25 %, 150-180s 20 %, 180-210s 15.5 %, 210-240s 5 %, 240-270s 4 %, 270-300s 0.5 %, 300-330s 0.5 %, 330-360s 0.5 %
- good: 90-120s 4.5 %, 120-150s 28.5 %, 150-180s 27 %, 180-210s 16 %, 210-240s 12 %, 240-270s 4.5 %, 270-300s 3.5 %, 300-330s 2 %, 330-360s 1.5 %, 360-390s 0.5 %

First frenzy: moderate median 22.7 s (100 % of runs), good 44.4 s (99.5 %),
naive never (its best combo is 2: every other shot clanks off its own chew).
Decision density (moderate): median 141.33 changes/min over 8 shifts
(109.02–150.07).

### The pacing table

Time to each mark, median with p10 / p90 and the share of runs that reach
it. The percentiles are **censored**: a run that dies first counts as
"never", which sorts after every time, so a median reads "never" when fewer
than half the runs got there. The median among the runs that did reach the
mark is in brackets, because the censored number is the honest one and the
bracketed one is the shape of the curve.

| bot | first level | size ×1.5 | size ×2.0 | first ingredient ×3 | all three ×3 |
| --- | --- | --- | --- | --- | --- |
| naive | 27.7 s (26.5 / 28.5, 100 %) | 53.6 s (37.9 / never, 89.5 %) [52.2] | never (2.5 %) [99] | never (0 %) | never (0 %) |
| moderate | **27.1 s** (17.6 / 49.1, 100 %) | **66.9 s** (50.1 / 97.8, 99.5 %) [66.7] | **141.5 s** (104.7 / never, 67.5 %) [122.2] | **never** (p10 141.9 s, 41.5 %) [152.6] | **never** (p10 144.7 s, 39.5 %) [156.4] |
| good | 40.9 s (27.4 / 59.7, 100 %) | 90.7 s (69.6 / 119.9, 100 %) | 163.4 s (127.1 / never, 70 %) [146.4] | 199 s (145.4 / never, 57 %) [163.5] | 201.9 s (148.1 / never, 55 %) [165.5] |

Honest notes on two of these. The ×2.0 gate (120–180 s) passes on the
censored median of 141.5 s; two thirds of the moderate's runs get there and
they get there at 122 s. The "all three at ×3 not before 240 s" gate passes
because the median is "never": fewer than half the moderate's runs live
long enough. For the bots, "first ×3" and "all three ×3" land seconds apart
— they rotate the three snacks evenly — so there is no tuning in `TUNING`
that separates the two marks for a bot; a human with a favourite snack
separates them by the gap between thresholds 2 and 3. The stage-2 capture
seed (20260911) is a long one: in the browser run it reached ×1.5 at 91 s,
×2.0 at 150 s, the first ×3 at 189 s and all three at 191 s, and died at
353 s.

| gate | value | verdict |
| --- | --- | --- |
| naive median survival 40–80 s | 74.2 s | pass |
| naive median feeds ≥ 6 | 71 | pass |
| moderate median 100–180 s | 142.7 s | pass |
| moderate accuracy ≥ 55 % | 83.1 % | pass |
| moderate mean frenzies ≥ 1 | 5.8 | pass |
| moderate: no 30-s bucket > 40 % of deaths | 27.5 % | pass |
| good median ≥ 1.8× naive | 163.9 s = 2.21× | pass |
| decision density ≥ 6/min | 141.33/min | pass |
| moderate first level at 25–45 s | 27.1 s | pass |
| moderate size ×1.5 at 60–90 s | 66.9 s | pass |
| moderate size ×2.0 at 120–180 s | 141.5 s | pass |
| moderate first ingredient ×3 not before 150 s | never (p10 141.9 s) | pass |
| moderate all three ×3 not before 240 s | never (p10 144.7 s) | pass |
| moderate first frenzy inside 40 s | 22.7 s, 100 % of runs | pass |
| replay fixtures exact | 3 traces, `tests/loop-replay.test.mjs` | pass |

The sixteen tuning passes that led here are summarised in D112–D115; the
harness changes (`--bots`, the timeline option, the pacing table and gates)
are D116.

## 2. The camera

`lib/render/scene.ts` now owns a camera (D117). Once the creature is past
×1.4 the whole arena-space scene — painting, creature, bouncers, launcher,
projectiles, every effect — is scaled about `(600, 530)` by the largest
factor that keeps the brow (20 px above the eye sockets) at least 80 px and
the antenna tips at least 24 px below the top edge. The requirement is
computed from the rules' geometry with the bob's whole swing allowed for,
quantised to 0.04 and only ever lowered during a run, each step eased over
1.5 s (a cut under reduced motion). The first step says **IT NO LONGER
FITS.** The room beyond the frame is the same painting, dark; the creature
is not clipped to the frame, so from about ×2.2 its antennae rise over the
dark — which is the joke. The HUD, the captions and FRENZY are screen space;
the craving ring, the belly bar and the combo are placed from on-screen
positions; the pointer aim is taken from the launcher's on-screen position
(a uniform zoom preserves angles). The camera applies on the ending screen
too, so the ×2.4 result no longer shows a chin.

Measured headlessly through the dev hooks (`__dnfi.camera()`, `poseNow()`):

| state | zoom | brow below the top edge | at the worst of the bob | antenna tips |
| --- | --- | --- | --- | --- |
| ×1.4, no balloon | 1.00 | 92 px | 92 px | 42 px |
| ×1.6, balloon ×1, lift 12 | 0.92 | 107 px | 101 px | 60 px |
| ×2.0, balloon ×2, lift 24 | 0.84 | 115 px | 104 px | 71 px |
| ×2.4, balloon ×3, lift 36 | 0.80 | 108 px | 93 px | 65 px |

`scripts/mouth-calibrate.mjs` re-run: the bare fit is unchanged within
noise (`ARENA.mouth {838, 279, 112, 70}` vs the rules' `{840, 279, 113, 69}`),
and in the eleven live states the drawn mouth and the rules' ring agree
within 5 px except `metal 3 only` (dy 9, the snarl's jaw; was 12). The
script now prints the zoom and the on-screen disagreement, which is the
arena one times the zoom because the ring and the painted mouth go through
the same transform: at ×2.4 with balloon ×3, zoom 0.80, on-screen dx −3.7
dy −3.1.

## 3. The props and the face

Every bouncer was a grey vector outline (D119). Now: a cast-iron pan on a
cord with a wall shadow, a lit handle and a hook ring; a pendant lamp with
a dark tin shade, a lit underside and a wire cage in silhouette; a stock pot
standing on the counter with a contact shadow, a reflection smear, a sheen
down the enamel and a lit rim; a dark plank on iron brackets with three
bottles in silhouette, each with a bead of lamplight (the shelf integrates
as a silhouette, so it stays); a chain of dark links lit on their right
side with a hook; the vent flap it bites off as louvred tin on a wire. The
amber rim comes from the lamps on the right of the painting. Hung props sway
slowly; a bounce drives a white glint along the rim through the wobble
spring. No prop is an outline.

The face (D120): the irritation flush and pepper's pressure marks were red
stroke lines on each cheek; both are soft radial glows now. Metal's steel
wash, the balloon's taut rim and hunger's pallor compounded into a white
creature late in a shift; they share one budget (`WASH_CAP` 0.5 of summed
cover) and are scaled back together past it, and the flat components are
smaller. In `iter-102/clip-ending` the creature at ×2.4 with every mutation
at 3 is green with a flush and red cheeks.

## What the captures showed, and what was fixed between them

`iter-101` (first run): the pacing read on screen — ×1 chips at 0:40, ×2 at
2:00, the creature at ×2 at 2:00 instead of ×2.3 at 0:46; the camera held the
eyes at ×2 and the late creature was green; the pan, pot and chain read as
objects at 960 px. Three things were wrong: (1) the arena was clipped to its
own rectangle, so at ×2.4 the eyes were inside the screen but cut by the
frame's edge — the clip is gone, and the frame-edge fade no longer covers
the top edge; (2) the ending screen reset the camera to 1 and showed a chin;
(3) the vent flap was still a grey outline. `iter-102` is the run after
those fixes. The tracking sign in the camera's requirement was also wrong
(a lean *down* was being treated as a lean up).

## Render cost

Typical state (×2.0, metal 2 / balloon 2 / pepper 1, lift 9) at 1920×1080:

- `scripts/render-budget.mjs --only typical --runs 2 --seconds 6`: **4.65 ms
  median**, 5.18 ms mean, 9.40 ms p95, 383 warp cells a frame (stage 2:
  4.40 median). The camera adds a second backdrop draw and the band fill
  when zoomed; the props are gradients, no new composites.
- The capture harness: 4.30 ms median / 9.0 p95 (`iter-101`), 4.50 ms
  median / 7.6 p95 (`iter-102`). The harness number is the noisy one.

## What is still weak

- The lamp bouncer sits on the face from ×1.5 (P8, a rules position);
  with the camera it now sits between the eyes at ×2.4. Moving it is a rule
  change that needs a bot run.
- The bots rotate ingredients evenly, so for them the third level of every
  ingredient arrives within seconds of the first; the 240-s gate is met by
  "never", not by spacing. A human separates them; the bots cannot show it.
- The naive bot's deaths bunch (74.5 % in 60–90 s). The brief only gates the
  moderate's spread, and the naive bot is one fixed shot on a timer, so it
  has no variance to spread; a human beginner has.
- The pot still reads a little graphic at 1920; at 960 it is a dark pot on
  the counter. The cheek glow at full irritation is large.
- The band beyond the frame is the painting, dimmed, with a hard edge at
  the top where the painted ceiling meets its own dim copy. It reads as a
  frame; it is not a room.
- The craving ring at ×2.4 with the camera pulled back sits over the chain.
- No fresh-context critic pass has been run on `iter-102`; the prompt at the
  end of `STAGE2.md` still applies, pointed at `iter-102/*-stream.png`.

## Verification

`npm run typecheck`, `npm run lint`, `npm run build` and
`node --experimental-strip-types --test tests/*.test.mjs` (38 tests) pass.
The hardhat contract test was not run: it cannot download the compiler here.
