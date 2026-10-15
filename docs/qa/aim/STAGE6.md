# FEAST stage 6 — the cannon

Branch `feat/aim`, from `feat/feast` at `0d57648`. GAME_VERSION 6. Decisions
D139–D150 in `docs/DECISION_REGISTER.md`; the design as it stands in
`docs/GAME_DESIGN.md` ("The cannon"); the canon for the new words in
`docs/LORE.md`.

## The complaint, measured

> right now canon control is underutilized, basically if canon is set at
> correct angle there almost no need to readjust it

On the stage 5 rules, before anything changed (probe sweeps of every angle
and charge against the rules' own `probeFlight`):

- **One angle for the whole shift.** −48° and −49° landed at every charge
  from 11 to 15 in every creature state tried: fresh, ×1.4, ×1.8, ×2.4, and
  ×1.8 with three Ether levels. At charge 12 any angle from −58° to −41°
  landed.
- **The mouth hardly moves.** Its centre climbs about 100 px over a whole
  shift, and the mouth grows faster than it moves.
- **All three coins flew the same way** (one gravity, one speed), so
  switching coins never moved the barrel.
- **The bank bonus lived in the same lane.** Holding the charge a little
  longer on that line carried the coin into the hanging chain behind the
  head, which dropped it into the mouth for OFF THE CHAIN ×2.

Of four options proposed (each coin flies differently; moving targets worth
shooting; a lit prop / trick-shot cravings; the creature shoves the
launcher), the user chose the first two.

## What changed

**Every coin flies its own way** (`TUNING.flight`, `flightOf()`). Direct
landing angles in the fresh state, by charge:

| Coin | Gravity | Speed | Straight burn | What it means to aim it |
| --- | --- | --- | --- | --- |
| Bitcoin | 0.30 | ×1.00 | — | Heavy. Below charge 15 it does not reach the mouth; at 15 it lands from −62° to −46°, at full charge from −65° to −39°. Lob it, hold it all the way. |
| Ether | 0.08 | ×0.70 | — | Floats: the slow, soft arc. Its angle moves with the charge, from −62°…−46° at charge 11 to −39°…−32° at 16. |
| HEMI | 0.16 | ×1.25 | 18 ticks | Straight: no gravity for its first 18 ticks, then normal. −39°…−29° at the lowest charge, −30°…−26° at full. Point it at the mouth. |

`tests/aim.test.mjs` holds the property that matters: at any one charge the
three coins' direct landing angles share at most two degrees. The chain
segment behind the head now ends at y 110 (was 190) so an overcharged shot
along the lane goes past it. The default shot is a HEMI at −30°, and the
page loads HEMI first.

On screen: the barrel's lance is the first stretch of the loaded coin's own
free flight at the current charge (solid to the charge crossbar, dashed
100 px beyond — short of the mouth and the props, no colliders), in the
coin's colour: Bitcoin's gold lance droops, Ether's mint one floats,
HEMI's red-orange one is a ruler. HEMI flies with a white-hot jet for its
burn, Ether trails bubbles, Bitcoin leaves a gold wake along its arc. The
coin buttons, the legend and the whitepaper say Heavy / Floats / Straight.

**Blocks** (the rules call them crates; `Crate`, `crateAt`, `spawnCrate`,
`breakCrate`, `movePour`):

- One at a time, on a seeded stream of its own. The first at 6 s; each next
  one 2–5 s after the last is broken or gone.
- Lowered over 32 ticks through a hatch in the ceiling into the open air
  between the pan and the creature's head (the rail, x 420–545; the block
  hangs at y 135–160), then it shuttles along the rail and back (one shuttle
  every 2.8–4.3 s, up to 30 % faster as the creature grows), swinging on its
  chain, and is hoisted away after 5.5–7.5 s. The head takes the right end
  of the rail as the creature grows; past about ×1.6 there is no room and no
  more blocks come (D147). The pan moved from (500, 150) to (370, 185) to
  make room.
- **Only its own coin opens it.** That coin is spent; the three coins inside
  pop straight up out of the top one after another, 8 ticks apart, and
  each drops into the mouth on its own lob 34 ticks after it came out
  (D148) — swallowed whole, no chew, each a full serving at ×2, combo
  included. Any other coin glances off it.
- Its coins are servings of its coin: they meet a craving, count toward
  that coin's mutation, and into a full creature they gorge it. A turbo'd
  coin cooks what is inside.
- Where a block is at any tick is a pure function of the block and the tick,
  so the probe, the first-shift guide, the bots and the replay all see it
  exactly; a prediction that runs past a block's life ignores it.

On screen it is a riveted iron cube on a chain, its coin's mark on the
face, let down through a hatch whose doors swing open, on a trolley that
runs a little ahead of it so the chain leans; it says whose it is as it
comes down (BITCOIN BLOCK. / ETHER BLOCK. / HEMI BLOCK.). It calls for its
coin while that coin is in the barrel — a thick outline in the coin's
colour and a ring pulsing out of it twice a second — and steps back, dimmed,
while another is. Broken: a white-hot burst with rays where it was, the
room lit in its colour for a few frames, a shock ring, iron plates with hot
edges thrown back toward the launcher, a kick of the camera, a beat of
hit-stop and the creature's eyes snapping to it; then a BLOCK REWARD. card
under it that lands solid in the coin's colour, lights a mini coin as each
coin is swallowed and carries the running total. MISSED THE BLOCK. when one
is hoisted away, WRONG TOKEN. and a red outline when another coin glances
off. Four sounds. The creature watches a block when nothing is in the air.
It is never called an airdrop (D131, `docs/LORE.md`).

**Balance** (D144): miss irritation 5 → 3, belly start 70 → 76 with 300
ticks of grace (was 240), growth per feed 0.014 → 0.0115 bent harder
toward the end (`growthShape` −0.3 → −0.45), mutation levels at
13 / 36 / 110 servings (were 10 / 28 / 70).

## The bots, 200 shifts each

`node --experimental-strip-types scripts/loop-bots.mjs --shifts 200`; seeds
from 1. Stage 5 numbers are `feat/feast` with the same harness.

| Bot | Stage 5 survival | Stage 6 survival | Stage 5 feeds | Stage 6 feeds | Stage 6 accuracy | Stage 6 blocks broken |
| --- | --- | --- | --- | --- | --- | --- |
| naive (never aims, cycles the coins) | 74.2 s | 48.8 s | 71 | 29 | 31 % | 0.09 (2 %) |
| moderate | 142.7 s | 138.5 s | 194 | 219 | 89 % | 4 (41 %) |
| good | 163.9 s | 151.4 s | 217 | 258 | 92.9 % | 6.51 (68 %) |

Every FEAST gate passes: naive 48.8 s (40–80) with 29 feeds (≥ 6); moderate 138.5 s (100–180), 89 % accuracy (≥ 55), 7.43 frenzies a run (≥ 1), worst 30-s bucket 28.5 % (≤ 40), first level 27.6 s (25–45), ×1.5 at 67.2 s (60–90), ×2.0 at 160.9 s (120–180), first ×3 and all three ×3 never before 150 / 240 s, first frenzy 10 s (≤ 40); decision density 103.45 / min (≥ 6); good 151.4 s ≥ 1.8 × naive. Reports: `docs/qa/aim/stage6-bots-moderate.json`, `stage6-bots-others.json`.

## Is one setting still enough? The `fixed` bot

The `fixed` bot is the complaint as a bot: at the start of the shift it
sweeps every angle and charge, sets the barrel to the one setting that lands
the most coins (then the widest window), and never touches it again. It
otherwise plays like the moderate bot: same reaction time and hand noise
(±4°), serves the craving, waits for an open mouth. `fixedDirect` is the
same but only counts shots that go straight in.

| 200 shifts each | Stage 5 `fixed` | Stage 5 moderate | Stage 6 `fixed` | Stage 6 `fixedDirect` | Stage 6 moderate |
| --- | --- | --- | --- | --- | --- |
| setting it chose | −58° at charge 11, all three coins straight in | — | −61° at 15: Bitcoin straight in, Ether and HEMI off the pan, in the fresh state only | −39° at 16: Bitcoin and Ether straight in, HEMI never | — |
| survival, median | 117.5 s | 142.7 s | 92.3 s | 105.5 s | 138.5 s |
| feeds | 103 | 194 | 52 | 42 | 219 |
| score, median | 47,377 | 163,572 | 18,179 | 14,046 | 196,559 |
| FOMO (frenzies) a run | 1.8 | 5.8 | 0.88 | 0.19 | 7.43 |
| blocks broken a run (share of those that came) | — | — | 4.96 (43 %) | 0.5 (5 %) | 4 (41 %) |

As a share of what the moderate bot gets, one barrel setting used to be worth
53 % of the feeds and 29 % of the score; it is now worth 24 % and
9 % (19 % and 7 % if the setting has to go
straight in). Survival moves less than feeds because a creature that is fed
less also grows and empties more slowly — the stage 3 "do not feed it"
economy — so feeds and score are the honest measure here.

**The blocks do not separate the two bots, and that is reported as it is.**
The `fixed` bot breaks 4.96 (43 %) — about what the moderate bot breaks
(4 (41 %)), which goes for 60 % of blocks on purpose. Its barrel is
left at −61°: its Ether shots bank off the pan and its HEMI misses fly up,
and both cross the rail's stretch of room, so whenever the block's own coin
comes up for the craving, the block is often in the way. A probe sweep of
the room says the same: every stretch of air between the launcher and the
mouth that Bitcoin can reach is also crossed by some of the shots that feed
the mouth, so a block that every coin can break can also be broken by luck.
The never-aiming naive bot, whose barrel stays at −30°, breaks
2 % of them; the good bot, which goes for every block,
68 %. What luck does not buy is the rest of the game: the fixed
barrel feeds a quarter as much and scores a tenth.

The moderate and good bots move the barrel 36 and
38 times a minute by 8° or more between planned shots (`aim:`
lines in the reports); that number is not a before/after measure — those
bots re-solve every shot from scratch on either version — which is why the
`fixed` bot exists.

## Captures and the critic

CRITIC_SECTION

## Open

OPEN_SECTION
