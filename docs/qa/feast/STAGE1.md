# FEAST — stage 1: the rules and the feel

Pure simulation only: `lib/game/arcade.ts`, `scripts/loop-bots.mjs`,
`tests/arcade.test.mjs`, the frozen fixtures. Nothing in `lib/render`, `app/` or
the audio was touched; the current renderer still type-checks against the new
state because the names it reads were kept (see "Legacy names" below). Decisions
are D94–D105 in `docs/DECISION_REGISTER.md`.

## What changed, by pillar

**1. Easy to hit, constant action.** `cooldownTicks` 30 (15 in a frenzy),
`maxProjectiles` 6 (cutlery does not count). The mouth is open by default. Every
accepted catch sets `creature.chewUntil = tick + 36` and emits a `chew` event; a
snack entering the mouth while `tick < chewUntil` clanks off the teeth (`clank`
event), becomes `spent` (keeps flying, feeds nothing, drops silently), resets the
combo and costs 0.5 irritation. The open/shut rhythm, `projectMouth`, the mouth
timeline and the cycle fields are gone. `apertureAhead(creature, n)` remains as a
readout of the chew. `ARENA.defaultAngle` is −40° so the default angle and power
land in a resting mouth.

**2. The kitchen is a playground.** `ARENA.bouncers` (also exported as
`BOUNCERS`): five static colliders with restitution. A snack reflects off them;
the first contact with each bouncer credits `projectile.bank += banks` and emits
`bounce` with the surface name. A banked snack that is caught emits `bank` with
the multiplier: one bank ×2 (named for the surface: OFF THE PAN), two ×3 (DOUBLE
BANK), three or more ×4 (TRIPLE BANK). The lamp is worth two. Floor-only is OFF
THE FLOOR ×1.5. The trampoline belly (balloon) and the vent flap (after a lunge)
are banks too.

**3. Frenzy.** `state.combo` counts consecutive catches (`bestCombo` kept). At 5,
`frenzyUntil = tick + 360`, `frenzies++`, `frenzy` event (`name: "start"`).
During a frenzy: `creature.gape` 1.5 (the collision ellipse is 1.5× on both axes),
no chewing, cooldown 15, every score ×3, no appetite gain. At the end: `frenzy`
event (`name: "end"`) and the combo resets to 0 — a frenzy does not extend
itself. A floor miss or a clank resets the combo.

**4. Mutations, permanent and stacking** (3 servings a level, 3 levels, first
level starts its clock from the moment it lands):
- METAL — magnet: metal snacks and all cutlery are pulled toward the mouth
  (`magnetPerLevel` 0.055/tick within 300 + 80·level px). Cutlery storms: every
  ~420 − 90·level ticks a `junk` projectile spawns from a seeded wall point (left
  wall arc, ceiling on the creature's side, or straight down onto the launcher)
  with `utensil` event `name: "loose"`. In the mouth: `utensil` event
  `name: "caught"`, +500 (×3 in a frenzy), no chew. Within 54 px of the launcher:
  `jam` event `name: "utensil"`, launcher jammed 45 ticks. The clog is gone.
- BALLOON — `creature.lift` rises to 12·level px; `creature.bob` is
  ±10·level px on a 240-tick sine with a seeded phase. The belly ellipse
  (`bx, by, brx, bry`) is a trampoline: a food snack hitting it below the chin
  reflects at restitution 0.95, is steered 55 % toward the mouth, gets `vy ≤ −4`,
  `bank += 1`, `lastBank = "belly"`, `bounce` event `name: "belly"`. Without a
  balloon the belly still bounces (restitution 0.5) but credits nothing. The
  belly never blocks.
- PEPPER — fire breath every ~540 − 90·level ticks: `state.flame =
  { tellUntil, until, angle, length }`, `state.threat = { kind: "flame" }`,
  `flame` event `name: "tell"` (40 ticks), then `flame` event `name: "breath"`
  and a 50-tick cone (`flameCone(state)` gives origin, angle, half-angle 0.17,
  length, `telling`). A food snack inside the cone becomes `cooked` (`cooked`
  event; ×2 when caught). A cooked snack touching the floor between
  `ARENA.bench.from` and `.to` starts a bench fire (`benchFireUntil`, `fire`
  event `name: "start"`, 180 ticks; `name: "out"` when it ends): launched snacks
  are cooked for free (a `cooked` event at launch) and irritation rises
  0.015/tick. If the launcher is inside the cone when the breath starts: `jam`
  event `name: "singe"`, 45 ticks — unless the hatch is shut (`block` event).
  Cone reach is 70 % of the way to the launcher at level 1, 85 % at 2, 100 % at 3.

**5. Escalation.** Growth per feed 0.05 × (1 + 0.9·(1 − t)), cap 2.4, `grow`
event every 0.2 of size (label "BIGGER.", `value` = size). Mouth rises 48 px per
size unit (was 33), belly rises with it. Appetite drain
`(0.06 + 0.005·(size−1) + 0.08·minutes) × appetite × temper`, where temper is a
seeded 0.6–1.4 and `drainPerTick(state)` is the readout. A serving restores 8
(craved 18 + 8), divided by `1 + 0.6·(size−1)`, times `1 + 0.08·min(combo−1, 9)`;
above 85 fullness a serving restores 30 %, grows it double and raises appetite
five times as fast. Cravings keep their clocks (780 → 430 ticks by size, 80-tick
gap), the growth pause (60 ticks, +25 % per streak, cap 150) and the streak
relief (−0.02 appetite from the second in a row). A tantrum jams 40 ticks, adds
12 irritation and burns 6 fullness. Beats (sneeze, lunge, drool) are unchanged
except the lunge jam is 40; an unstopped lunge still eats the vent, which now
swings under the ceiling (x 620, y 55–145) as a bank. Endless; endings by size.

## The bot table

200 shifts, pure simulation, `node --experimental-strip-types
scripts/loop-bots.mjs --shifts 200 --density-shifts 8 --json
docs/qa/feast/stage1-bots.json --fixtures tests/fixtures/loop-traces.json`.

| bot | n | p10 | median | p90 | max | feeds | accuracy | frenzies/run | banks/run | clanks/run | score | worst 30-s bucket |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| naive | 200 | 41.3 s | **58 s** | 81.7 s | 107.4 s | 54 | 51.1 % | 0.07 | 29.17 | 41.6 | 18337 | 52.5 % |
| moderate | 200 | 91.5 s | **128.7 s** | 191.9 s | 284.7 s | 169 | 84.5 % | 5.81 | 43.18 | 21.7 | 160061 | 38 % |
| good | 200 | 103.6 s | **148.1 s** | 237.2 s | 317.2 s | 214 | 84.9 % | 6.64 | 78.51 | 26.7 | 196875 | 26 % |

All 600 deaths were empty-belly. Deaths per 30-second bucket:

- naive: 0-30s 1 %, 30-60s 52.5 %, 60-90s 42 %, 90-120s 4.5 %
- moderate: 60-90s 6 %, 90-120s 38 %, 120-150s 19.5 %, 150-180s 20 %, 180-210s 10 %, 210-240s 5.5 %, 240-270s 0.5 %, 270-300s 0.5 %
- good: 60-90s 2.5 %, 90-120s 22.5 %, 120-150s 26 %, 150-180s 14.5 %, 180-210s 18 %, 210-240s 7.5 %, 240-270s 7.5 %, 270-300s 1 %, 300-330s 0.5 %

First frenzy: moderate median 20.5 s (in 100 % of runs), good 26.3 s, naive reaches one in 6.5 % of runs.

Decision density (moderate): median 127.24 changes/min over 8 shifts (107.19–139.71)

| gate (docs/FEAST_BRIEF.md) | value | verdict |
| --- | --- | --- |
| naive median survival 40–80 s | 58 s | pass |
| naive median feeds ≥ 6 | 54 | pass |
| moderate median 100–180 s | 128.7 s | pass |
| moderate accuracy ≥ 55 % | 84.5 % | pass |
| moderate mean frenzies ≥ 1 | 5.81 | pass |
| moderate: no 30-s bucket > 40 % of deaths | 38 % | pass |
| good median ≥ 1.8× naive | 148.1 s = 2.55× | pass |
| decision density ≥ 6/min | 127.24/min | pass |
| replay fixtures exact | 3 traces, `tests/loop-replay.test.mjs` | pass |

The 120-shift tuning run that preceded it is `docs/qa/feast/stage1-bots-120.json`
(naive 58 s, moderate 128 s, good 146.5 s, moderate accuracy 84 %, 5.6 frenzies
per run, worst bucket 36.7 %, all gates passing).

### How the tiers separate, honestly

The chew caps everyone at about 1.7 catches a second, so the naive spammer
(two shots a second, every other one clanking) and the aiming bot feed at nearly
the same *rate* — 0.9 against 1.3 a second. Aim alone bought ×1.3 of survival.
What moved good ÷ naive to ×2.5 was what each catch is worth: a combo feeds
better, a craving feeds much better, and stuffing a full creature raises its
appetite five times as fast. The frenzy is the endgame — at a drain of 15–19 a
second, a frenzy refills the belly in six seconds and the moderate bot survives
its last forty seconds by chaining them until a clank or a singe breaks the
combo. That is the intended power fantasy and it is also why deaths bunched at
90–120 s until the temper spread was widened to 0.6–1.4 and the slope eased to
0.08 a minute. The cost: seeds differ in difficulty by up to ×1.4.

## What the presentation agent needs

### `ArcadeState` fields the rig and HUD should read

- `creature`: `size`, `x y rx ry` (mouth ellipse, after growth, lean, lift, bob
  and tracking), `bx by brx bry` (belly ellipse), `aperture` / `open` (1 open,
  chew curve down to 0.1), `chewUntil`, `untilOpen` (ticks left in the chew, −1
  while open), `gape` (1, or 1.5 in a frenzy — the collision ellipse is
  `rx·gape, ry·gape`), `lift`, `bob` (positive is up; `y` already includes
  both), `track`, `flush` (rage/100), `brow` ((60 − hunger)/60). `pressure` and
  `clog` are always 0.
- `combo`, `bestCombo`, `frenzyUntil`, `frenzies` (use `inFrenzy(state)` and
  `cooldownFor(state)`); `clanks`, `banks`, `cooked`, `utensils`.
- `flame` and `flameCone(state)` for the fire breath; `benchFireUntil` for the
  bench fire; `threat` (`kind: "lunge" | "flame"`, with `tick`) for tells.
- `hunger`, `rage`, `appetite`, `drainPerTick(state)`, `size`, `mutations`,
  `servings`, `craving`, `wanted`, `reloadUntil`, `lastLaunchTick`,
  `hatchClosedUntil`, `vent` + `getHazard(vent, tick)`.
- `projectiles[]`: `kind` (`"food"` or `"junk"` = a utensil), `ingredient`,
  `x y vx vy`, `age`, `bounces` (floor), `bank`, `lastSurface`, `lastBank`,
  `cooked`, `spent` (clanked, still flying, worth nothing), `assisted` (magnet).

### Event types and payloads

Every event has `id tick type x y label`, optional `ingredient`, `craved`,
`value`, `name`. `x y` are arena coordinates at the moment.

| type | when | label | name | value |
| --- | --- | --- | --- | --- |
| `launch` | a shot leaves | ingredient | | |
| `feed` | a catch | `NOM +N` / `BANK +N` / `COOKED +N` / `CRAVING +N` / `STUFFED +N` | | points |
| `chew` | a catch outside a frenzy | `CHOMP` | | 36 |
| `clank` | a snack or utensil off the teeth | `CLANK` | | |
| `bounce` | any surface contact | `OFF THE PAN` … / `OFF THE FLOOR` / `OFF THE BELLY` / `OFF THE VENT` / `BOUNCE` | surface (`pan shelf lamp chain pot floor belly vent`) | bank count so far (0 if uncredited) |
| `bank` | a banked snack is caught | `OFF THE PAN ×2` / `DOUBLE BANK ×3` / `TRIPLE BANK ×4` / `OFF THE FLOOR ×1.5` | last credited surface | multiplier |
| `frenzy` | start / end | `FRENZY` / `FRENZY OVER` | `start` / `end` | 360 on start |
| `utensil` | spawn / caught | `CUTLERY` / `UTENSIL +N` | `loose` / `caught` | points when caught |
| `cooked` | a snack enters the cone, or launches through a bench fire | `COOKED` | | |
| `flame` | tell / breath | `IT INHALES` / `FIRE BREATH` | `tell` / `breath` | 40 / 50 |
| `fire` | bench fire start / out | `THE BENCH IS ON FIRE` / `FIRE OUT` | `start` / `out` | 180 |
| `jam` | the launcher is jammed | `FORK IN THE WORKS` / `SINGED` / `SNEEZED ON` / `TANTRUM` / `BITTEN` | `utensil` / `singe` / `sneeze` / `tantrum` / `lunge` | ticks |
| `grow` | size crosses a 0.2 step | `BIGGER.` | | size |
| `mutation` | a level lands | `MAGNET MOUTH ×1` … | | level |
| `craving` | a craving starts, or streak relief | `IT WANTS PEPPER` / `IT EASES OFF ×2` | `start` / `relief` | streak |
| `tantrum` | an ignored craving | `TANTRUM` | | |
| `beat` | sneeze / lunge tell / drool / a bite / the last serving | `SNEEZE` / `IT IS COMING OUT` / `DROOL` / `IT ATE THE VENT` / `IT TOOK THE TRAY` / `THE LAST SERVING` | `sneeze` / `lunge` / `drool` / `bite` / `last-serving` | |
| `miss` | a snack on the floor or out | `ON THE FLOOR` | | |
| `hatch`, `block`, `end` | as before | | | |

Retired but still in the type union (never emitted): `snub clog sneeze spit hit
burp gust`. Stage 2 may remove them once `lib/render` and `app/` stop matching on
them.

### Bouncer geometry (`ARENA.bouncers`)

| name | shape | position | restitution | banks |
| --- | --- | --- | --- | --- |
| pan | circle | (500, 150) r 34 | 0.85 | 1 |
| shelf | segment | (300, 110) → (440, 110) | 0.80 | 1 |
| lamp | circle | (760, 60) r 26 | 0.90 | 2 |
| chain | segment | (1040, 0) → (1040, 190) | 0.75 | 1 |
| pot | circle | (540, 598) r 36 | 0.80 | 1 |

Snacks have a 10 px collision radius; segments are 3 px thick. The vent flap
(after a lunge): x 620, width 16, height 90, swinging between y 55 and 145 on a
300-tick cycle, `warning` for its first 120 ticks. The bench (bench-fire zone)
is x 120–720 on the floor (y 620). The launcher region is a 54 px circle at
(210, 540).

### Rig calibration

The mouth now rises 48 px per size unit (D102) and the belly rises with it;
`scripts/mouth-calibrate.mjs` must be re-run against the new `mouthFor` so the
lit target ring and the painted mouth agree at every size. Lift and bob are
already included in `creature.y` / `creature.by`.

### Legacy names kept for the current renderer

`Projectile.kind` `"spit"` (never produced) and `"junk"` (a utensil);
`creature.pressure`, `creature.clog` (0); `state.snubs`, `state.hungerDebt` (0);
`TUNING.snubRage` (= `clankRage`), `TUNING.openMin`, `TUNING.payFloor`;
`apertureAhead`, `getHazard`, `previewFlight`, `trajectoryPreview`, `payRate`,
`MUTATION_NAMES`, `MUTATION_RULES`, `MUTATION_LABELS`.

## Verification

`npm run typecheck`, `npm run lint`, and
`node --experimental-strip-types --test tests/arcade.test.mjs
tests/loop-replay.test.mjs tests/simulation.test.mjs tests/chain-state.test.mjs`
pass (37 tests, the arcade suite in about half a second). The hardhat contract
test was skipped: it cannot download the compiler here.
