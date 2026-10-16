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

**Every coin flies its own way** (`TUNING.flight`, `flightOf()`,
`launchSpeed()`, `straightTicks()`). Each coin has its own gravity, its own
launch speed at the lowest and the highest charge, and HEMI a straight burn
measured in pixels. This was tuned twice: the first tuning (round 1–10
captures) kept the coins apart at any one charge but let a grown creature
be fed all three from about −45° by changing only the charge; the second
pass retuned all three so that no barrel angle feeds all three coins at any
charge at any size (D139).

| Coin | Gravity | Launch speed, lowest → full charge | Straight burn | What it means to aim it |
| --- | --- | --- | --- | --- |
| Bitcoin | 0.30 | 9 → 15 | — | Heavy. It reaches the mouth only at full charge, on a steep lob: −62°…−46° when the creature is fresh. Hold it all the way, barrel high. |
| Ether | 0.09 | 11 → 12.5 | — | Floats on the middle arc and hardly cares about the charge: −41°…−33° at the lowest charge, −37°…−31° at full. |
| HEMI | 0.16 | 14 → 18 | 300 px | Flies dead straight for its first 300 px at any charge, then falls: −32°…−26° at any charge. Point it at the mouth, barrel low. |

Direct landings by size (probe sweep of every angle and charge against the
rules' own `probeFlight`; the pairs column counts the barrel angles that two
coins share at some charge):

| Size | Bitcoin | Ether | HEMI | Angles shared by two coins | Angles that feed all three |
| --- | --- | --- | --- | --- | --- |
| ×1 | −62°…−46° | −41°…−31° | −32°…−26° | Ether–HEMI 2 | none |
| ×1.4 | −62°…−47° | −44°…−33° | −34°…−27° | Ether–HEMI 2 | none |
| ×1.8 | −62°…−48° | −46°…−34° | −37°…−29° | Ether–HEMI 4 | none |
| ×2.4 | −62°…−49° | −50°…−36° | −41°…−30° | Bitcoin–Ether 2, Ether–HEMI 6 | none |
| ×1.8, two magnets | −65°…−42° | −46°…−34° | −37°…−29° | Bitcoin–Ether 5, Ether–HEMI 4 | none |
| ×1.8, two gas levels | −59°…−52° | −49°…−35° | −38°…−29° | Ether–HEMI 4 | none |

The bands drift steeper together as the mouth rises, so the barrel moves
with the coin all shift and a little with the size. `tests/aim.test.mjs`
holds the property: no barrel angle feeds all three coins at any charge in
any of those states. The chain segment behind the head ends at y 110 (was
190) so an overcharged shot along the lane goes past it. The default shot
is a HEMI at −30°, and the page loads HEMI first.

On screen: the barrel's lance is the first stretch of the loaded coin's own
free flight at the current charge (solid to the charge crossbar, then a
tail 110 px beyond, 210 px for Ether — short of the mouth and the props, no
colliders), in the coin's colour and in its own hand: Bitcoin's gold lance
droops and ends in heavy dashes, Ether's mint one floats and ends in a
string of bubbles, HEMI's red-orange one is a ruler with ticks and long
dashes. It steps back to 45 % while a shot is in the air and nothing is
charging. HEMI flies with a white-hot jet for its burn, Ether trails
bubbles, Bitcoin a tapering gold ribbon along its arc. The coin buttons,
the legend and the whitepaper say Heavy / Floats / Straight.

**Blocks** (the rules call them crates; `Crate`, `crateAt`, `spawnCrate`,
`breakCrate`, `movePour`):

- One at a time, on a seeded stream of its own. The first at 6 s; each next
  one 2–5 s after the last is broken or gone.
- Lowered over 32 ticks through a hatch in the ceiling on a long chain
  into the open air between the pan and the creature's head (the rail,
  x 420–545; the block hangs at y 175–195 since the second pass, was
  135–160), then it shuttles along the rail and back (one shuttle
  every 2.8–4.3 s, up to 30 % faster as the creature grows), swinging on its
  chain, and is hoisted away after 5.5–7.5 s. The head takes the right end
  of the rail as the creature grows; past about ×1.6 there is no room and no
  more blocks come (D147). The pan moved from (500, 150) to (370, 185),
  then to (320, 195) when the blocks came down, to make room.
- **Only its own coin opens it.** That coin is spent; the three coins inside
  pop straight up out of the top one after another, 10 ticks apart, and
  each swoops into the left of the mouth at mouth height, under the eyes,
  34 ticks after it came out (D148) — swallowed whole, no chew, each a full
  serving at ×2, combo included. Any other coin glances off it.
- Its coins are servings of its coin: they meet a craving, count toward
  that coin's mutation, and into a full creature they gorge it. A turbo'd
  coin cooks what is inside.
- Where a block is at any tick is a pure function of the block and the tick,
  so the probe, the first-shift guide, the bots and the replay all see it
  exactly; a prediction that runs past a block's life ignores it.

On screen it is a gunmetal cube on a steel chain, riveted and lamp-lit
like the launcher, with an enamel plate in its coin's colour and its coin's
mark on it, let down through a hatch whose doors swing open, on a trolley
that runs a little ahead of it so the chain leans, with a faint smear of its
colour behind it while it shuttles. The rail is drawn at y 64, below the
mutation chips (the rules' hook line is y 30, under them), and the block
comes out of the dark just below it. A tag on its chain, just above it,
says whose it is once it is most of the way down (BITCOIN BLOCK. / ETHER
BLOCK. / HEMI BLOCK.); it moves right of the FOMO wordmark when the two
would meet, and hangs beside the block when the camera pushes in far
enough to put it under the chips. Its rim is a thin inset line in
its coin's colour and its plate glows, harder while its coin is in the
barrel.
Broken: the room dips to about two thirds for a few frames; the real cube,
punched up to 1.2× and split by thick white-hot cracks, sits in a white-hot
core with its coin's colour as the band around it and eight wedges of
light; a shock ring a beat later; the cube in two halves and iron plates
with hot edges thrown back toward the launcher, a kick of the camera, 90 ms
of hit-stop and the creature's eyes snapping to it. A BLOCK REWARD. card
lands at the top left under the combo, over the coins and out of their
corridor — a dark plate with a border in the coin's colour that flares as
it lands and as each coin goes down — and lights a pip as each coin is
swallowed; the block's running total counts up beside it, where the
block hung (off the mouth, so the coins are seen going in), and on the
last coin the mouth rings in the coin's colour and the creature
swallows harder than for any feed. MISSED THE BLOCK. on its tag when one
is hoisted away; WRONG TOKEN. on its tag and a red outline when another
coin glances off. Four sounds. The creature watches a block when nothing
is in the air.
It is never called an airdrop (D131, `docs/LORE.md`).

**Balance** (D144): miss irritation 5 → 3, belly start 70 → 76 with 300
ticks of grace (was 240), growth per feed 0.014 → 0.0115 bent harder
toward the end (`growthShape` −0.3 → −0.45), mutation levels at
13 / 36 / 110 servings (were 10 / 28 / 70). Second pass: the drain's
growth with time on shift 0.07 → 0.058 a minute, because with Bitcoin
only at full charge the moderate bot reached ×2.0 in fewer than half its
shifts.

## The bots, 200 shifts each

`node --experimental-strip-types scripts/loop-bots.mjs --shifts 200`; seeds
from 1. Stage 5 numbers are `feat/feast` with the same harness.

| Bot | Stage 5 survival | Stage 6 survival | Stage 5 feeds | Stage 6 feeds | Stage 6 accuracy | Stage 6 blocks broken |
| --- | --- | --- | --- | --- | --- | --- |
| naive (never aims, cycles the coins) | 74.2 s | 52.2 s | 71 | 33 | 31.8 % | 0.19 (3.7 %) |
| moderate | 142.7 s | 151.2 s | 194 | 237 | 90.3 % | 4.75 (46.3 %) |
| good | 163.9 s | 163.1 s | 217 | 277 | 92.4 % | 6.23 (67.5 %) |

Every FEAST gate passes: naive 52.2 s (40–80) with 33 feeds (≥ 6); moderate 151.2 s (100–180), 90.3 % accuracy (≥ 55), 8.28 frenzies a run (≥ 1), worst 30-s bucket 30.5 % (≤ 40), first level 28.9 s (25–45), ×1.5 at 68.5 s (60–90), ×2.0 at 149.3 s (120–180; 61 % of shifts get there), first ×3 and all three ×3 never before 150 / 240 s (18 % and 17.5 % of shifts get there at all), first frenzy 12.4 s (≤ 40); decision density 96.64 / min (≥ 6); good 163.1 s ≥ 1.8 × naive. Reports: `docs/qa/aim/stage6-bots-moderate.json`, `stage6-bots-others.json`.

## Is one setting still enough? The `fixed` bot

The `fixed` bot is the complaint as a bot: at the start of the shift it
sweeps every angle and charge, sets the barrel to the one setting that lands
the most coins (then the widest window), and never touches it again. It
otherwise plays like the moderate bot: same reaction time and hand noise
(±4°), serves the craving, waits for an open mouth. `fixedDirect` is the
same but only counts shots that go straight in.

| 200 shifts each | Stage 5 `fixed` | Stage 5 moderate | Stage 6 `fixed` | Stage 6 `fixedDirect` | Stage 6 moderate |
| --- | --- | --- | --- | --- | --- |
| setting it chose | −58° at charge 11, all three coins straight in | — | −34° at 14: Ether straight in, HEMI only off a bank, Bitcoin never | −37° at 9: Ether straight in, nothing else | — |
| survival, median | 117.5 s | 142.7 s | 36.8 s | 30.8 s | 151.2 s |
| feeds | 103 | 194 | 5 | 3 | 237 |
| accuracy | — | — | 10 % | 7.2 % | 90.3 % |
| score, median | 47,377 | 163,572 | 1,825 | 1,032 | 214,983 |
| FOMO (frenzies) a run | 1.8 | 5.8 | 0 | 0.01 | 8.28 |
| blocks broken a run (share of those that came) | — | — | 0.02 (0.5 %) | 0.04 (1.6 %) | 4.75 (46.3 %) |

As a share of what the moderate bot gets, one barrel setting used to be worth
53 % of the feeds and 29 % of the score. After the first tuning it was worth
25 % and 10 %; after the second pass it is worth 2 % of the feeds and under
1 % of the score. The `fixed` bot now dies sooner than the naive bot (36.8 s
against 52.2 s): it serves the craving, so it keeps loading coins its one
setting cannot land, and its misses wreck the kitchen in 84 of 200 shifts,
while the naive bot's barrel happens to sit on HEMI's line. Survival moves
less than feeds in general because a creature that is fed less also grows
and empties more slowly (the stage 3 "do not feed it" economy), so feeds
and score are the honest measure.

**Blocks are no longer broken by luck.** After the first tuning a barrel
left at −61° broke 45 % of blocks, more than the moderate bot, because its
Ether and HEMI misses crossed the rail. With the second pass's flights and
the blocks lower (y 175–195), the `fixed` bot breaks 0.5 % of them and the
never-aiming naive bot 3.7 %; the moderate bot, which goes for 60 % of
blocks, breaks 46.3 %, and the good bot, which goes for every block,
67.5 %.

The moderate and good bots move the barrel 32.5 and
36.5 times a minute by 8° or more between planned shots (`aim:`
lines in the reports); that number is not a before/after measure — those
bots re-solve every shot from scratch on either version — which is why the
`fixed` bot exists.

## Captures and the critic

Two harnesses, both replaying the rules tick for tick in a real browser
through the development play hook, so every frame is a state the rules
reach:

- `node --experimental-strip-types scripts/aim-shots.mjs --iter N` →
  `docs/qa/aim/iter-N`: the moments the aim work is about — the three
  lances at one angle and charge, three coins in the air at once, a block on
  the rail, a block broken by its own coin (one for each coin), a wrong coin
  glancing off, and a late, grown creature with no block.
- `node --experimental-strip-types scripts/loop-shots.mjs --iter N
  [--bot good]` → `docs/qa/loop/iter-N`: a whole shift, time strips and
  close clips around the moments that matter (the first block among them).

Both now fail on any page error (D150). Each round was judged by a fresh
critic that had not seen the code or the earlier rounds, against
`docs/qa/aim/CRITIC_BRIEF.md`, at the stream size of 960 px. Exit bar: every
criterion ≥ 7 and Payoff ≥ 8.

| Round | Captures | Coin identity | Block readability | Payoff | Clarity | Aim agency | Cohesion | What changed after it |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | aim iter-3, loop iter-300 | 5 | 6 | 4 | 4 | 6 | 5 | Blocks off the face: the rail moved left of the head and shrinks as it grows, the pan moved, captions moved (D147) |
| 2 | aim iter-7, loop iter-301 | 6 | 6 | 6 | 6 | 6 | 7 | The pour pops out one coin at a time and lobs into the mouth (D148); gold Bitcoin, red-orange HEMI; a local burst instead of the room-wide veil; a small card with coin pips; per-coin block names; the trolley leads the block (D149) |
| 3 | aim iter-8, loop iter-302 | 7 | 6 | 4 | 3 | 6 | 6 | **Found a crash**: the card's first mini-coin frame threw and froze the canvas behind the dev overlay for the rest of the filmed shift. Fixed, guarded, and the harnesses now fail on page errors (D150). Captions under the coins; a bigger break; every coin's block break filmed |
| 4 | aim iter-10, loop iter-303 | 7 | 7 | 6 | 7 | 6 | 6 | Rays and a stronger room flash at the break; the coins pop straight up out of the block before they lob in (rules); the card lands solid in the coin's colour, carries the running total and lights a pip per coin swallowed; the block calls for its coin when it is loaded (outline, pulse ring) and steps back when it is not; darker iron rail, a hatch that opens, iron shards with hot edges that never reach the creature; the creature's eyes snap to a breaking block |
| 5 | aim iter-12, loop iter-304 (the good bot) | 8 | 6 | 7 | 6 | 7 | 7 | The coins pop up and back over the open air (rules: leaning left, 10 ticks apart), drawn 1.6× with their own trails; no per-coin pops on the face — the card counts up and thumps per coin, a nudge per coin and one total beside the mouth at the end; the block keeps its coin's colour when it is not the one loaded; a stronger backplate; plates drawn under the card; the FOMO wordmark moved left of the rail |
| 6 | aim iter-13, loop iter-305 (the good bot) | 7 | 7 | **8** | 7 | 6 | 6 | The block repainted as gunmetal like the launcher — lamp-lit lid and top edge, riveted straps, an enamel plate in its coin's colour, a thin rim that brightens and breathes when its coin is loaded (the floating ring removed); the burst a filled bloom with eight wedges, clipped short of the creature; 90 ms of hit-stop; the hatch's doors and light spill bigger; the last coin of a block swallowed with a bigger reaction than a feed (cheeks, belly, eyes); the card at full strength until it goes; the vent flap lit |
| 7 | aim iter-14, loop iter-306 (the good bot) | 7 | 7 | 7 | 6 | 6 | 7 | Rules: the pour leans further back and swoops into the left third of the mouth at mouth height (negative path gravity), under the eyes (D148). The last coin puts one total at the mouth and rings the mouth in the coin's colour; feeds close together merge into one rising number; the card stays solid for half a second with bigger pips; the cube breaks into two halves and plates; a faint wake behind a shuttling block; a steel chain; a longer lance; the scene overscans while shaking; the FOMO wordmark further left |
| 8 | aim iter-15, loop iter-307 (the good bot) | 7 | 7 | **8** | 6 | 7 | 7 | The total lives on the card only (no number over the mouth); the craving ring is kept clear of the UPTIME readout when the camera pushes in; a hoisted block fades before it reaches the mutation chips; the room drops a stop for a few frames and a dark halo sits behind the burst so it beats the lamps; the burst is bigger; HEMI's tint more saturated (`#ff6a2e`); Bitcoin's wake eight discs |
| 9 | aim iter-16, loop iter-308 (the good bot) | 7 | 6 | **8** | 7 | 7 | 6 | Whose block it is and WRONG TOKEN. ride under the block as a small tag instead of a caption in the shot path; the block arrives opaque (it fades only while hoisted); its rim never goes dark (3 px, pulsing when its coin is loaded) and its face takes a little of its coin's colour; the card is smaller, lands with less overshoot and never reaches the creature; the plates are torn steel quads with a rivet and a coin-coloured edge; a bigger splash for each coin swallowed |
| 10 | aim iter-17, loop iter-309 (the good bot) | 7 | 7 | 7 | 7 | 7 | 6 | End of the first pass. Second pass, before the next round: the flights retuned so each coin has its own band at every size and blocks hang lower (rules, D139, D141, D144); the block bigger with its tag kept while it hangs; a brief white flash and a bigger break; HEMI's reward jet tapered; bigger Ether bubbles; the lance keeps its coin's colour while reloading |
| 11 | aim iter-19, loop iter-310 (the good bot), second-pass rules | 8 | 7 | 7 | 5 | 7 | 6 | The tag moved from under the block (where the lower block put it in the captions' band) to the chain just above it, full strength, popping in; the block comes out of the dark below the mutation chips; one block total, low in the mouth over the throat, instead of a number per coin over the eyes; the hit frame is the cube itself swollen and split by white-hot cracks inside a bigger bloom, the shock ring a beat later; the card a dark plate with a coin-coloured border from its first frame (no solid fill), empty pips at 60 % with a ring; captions kept off the left edge; the camera pull-back card BLOCK FULL. renamed STATE BLOAT.; a darker lid and side on the cube, a 3 px rim with a soft glow, a coloured smear for its wake; Bitcoin's wake lighter and smaller; the lance steps back to 30 % while a shot flies and nothing is charging; the dark beyond a pulled-back frame is plain dark with feathered edges (no second, offset kitchen) |
| 12 | aim iter-20, loop iter-311 (the good bot) | 6 | 7 | 7 | 6 | 7 | 6 | The break: no hue wash over the room (a gold flash over a gold kitchen only made it more gold) — the room dips to about two thirds, a white-hot core about 160 across with the coin's colour as the band around it, the cube opaque and punched to 1.3× with its plate lit and white-hot cracks over the core. The block's total counts up low in the mouth as each coin goes down (60 → 68 → 80, as loud as the biggest feed), the card is its name and a pip per coin (the total left the card) and the pip that just lit thumps 1.3×. The rail is drawn at y 64, below the mutation chips (the rules' hook line, y 30, sits under them), so the trolley's run shows all shift; when the camera pushes in far enough to put the tag under the chips it hangs beside the block. A longer dashed tail on Ether's lance so its float shows; lances 7 px over a 13 px dark line. Bitcoin's wake a taper of six small discs. The cube's rim a 2 px inset bevel, the glow moved to its plate, a lighter side face, a heavier chain with a dark core and a warm rim, a bigger trailing swing |
| 13 | aim iter-21, loop iter-312 (the good bot) | 7 | 7 | 7 | 6 | **8** | 7 | Each lance's tail past the charge mark drawn in its coin's hand — Ether's a string of bubbles, HEMI's long ruler dashes with ticks along its shaft, Bitcoin's heavy short dashes — and the lance steps back only to 60 % while a shot flies. The hit frame is the real riveted cube, punched 1.12 → 1.22× with thick white-hot cracks over it, in a stronger bloom with thicker rays. The card moved out of the coins' corridor to the top left under the combo and is drawn over the coins and the burst, so it is never dimmed or crossed; bigger pips. The block's running total smaller (42 → 58), at 90 %, low in the mouth and still, and the splash per coin smaller and closer to the mouth. The tag beside the chain halfway up, so the chain shows. The PRESS E sign drops to the low caption slot while a block is out. Bitcoin's wake a continuous tapering gold ribbon |
| 14 | aim iter-22, loop iter-313 (the good bot) | **8** | 7 | **8** | 6 | **8** | 7 | The tag centred on the chain with its bottom just above the block, pushed right of the FOMO wordmark whenever the two would meet; the block's running total beside the card, where the block hung, instead of on the mouth, with HEMI's in a lighter tint; the card in place from its first frame (0.9 → 1× in 120 ms, its pips there from the start, never off the left edge); the lance at 45 % while a shot flies; a thicker Bitcoin ribbon; Ether's bubble tail a little longer; WRONG TOKEN. for 0.6 s and its cross at 55 % so the coin's mark shows through |
| 15 | aim iter-23, loop iter-314 (the good bot) | 7 | 7 | **8** | 7 | **8** | 7 | — **exit bar met** (stopped here; the renderer committed is the one these captures show) |

From round 5 on, the whole-shift capture follows the good bot
(`loop-shots.mjs --bot good`), which goes for every block, so the strips
show what a player who uses the blocks sees; earlier rounds followed the
moderate bot, which goes for 60 % of them. The staged scenes are the same
throughout.

**First pass (rounds 1–10).** Payoff reached 8 in rounds 6, 8 and 9, and
every criterion reached 7 at least once; round 10 had five of the six at 7
(Payoff 7, Cohesion 6). No round cleared all six. The critics disagreed
with each other as well as with the work: the room-wide flash was the
problem in round 2 and was asked back in rounds 3 and 4; the block's total
was wanted at the mouth in round 7, off it in round 8 and back in round 10;
round 3 offered coins over the captions and rounds 4 and 6 wanted captions
over the coins. What every late round asked for needed the rules, not the
renderer — a block lower in clear air on a longer chain, and Bitcoin and
Ether needing visibly different angles late in a shift — and that is what
the second pass did first.

**Second pass (rounds 11–15)**, on the retuned flights and the lower
blocks. Aim agency went to 8 from round 13 on and stayed there, and Coin
identity reached 8 in round 14. **Round 15 met the exit bar** — every
criterion at 7 or more and Payoff 8 (7 / 7 / 8 / 7 / 8 / 7) — narrowly:
Block readability and Clarity sit on the floor. That critic's next asks,
not done: more chain showing between the rail and the block (the tag still
covers much of it) and a visible hatch plate; the card kept clear of a
large combo counter and of the hanging pan; the block's increments louder
when a big feed lands at the same moment (a +840 beside a +5820); a
leftover pale smear on an Ether block's side while it shuttles (its wake);
a warm rim light on the blocks; thicker Bitcoin and HEMI trails at 960.

## Open

- **The critic exit bar is met, narrowly** (round 15: 7 / 7 / 8 / 7 / 8 / 7).
  One fresh critic's pass; another fresh critic could score a point lower
  on Block readability or Clarity, which sit on the floor. Its next asks
  are listed under the table.
- **Ether and HEMI sit next to each other.** Their bands touch (Ether
  −41°…−31°, HEMI −32°…−26° fresh, two shared degrees), so switching
  between them moves the barrel about 10°, against about 15° from either to
  Bitcoin. Critics see the Bitcoin swing at once and the Ether ↔ HEMI one
  less (round 12). Pushing them apart moves the pacing gates again.
- **The charge is mostly a Bitcoin decision now.** Bitcoin lands only at
  full charge; Ether's and HEMI's direct landings barely move with the
  charge (D139). The charge still matters for banks and for blocks, and
  holding a full charge for every Bitcoin is a timing cost; whether it
  should matter more for the other two is a design question, not a bug.
- **After about ×1.6 there are no blocks** (D147, by design), so the late
  shift's only reason to move the barrel is the coin. The bands keep that
  reason honest at every size (no angle feeds all three), but the critics'
  late strips show fewer swings than early ones.
- **Critic notes outside the two changes**, left alone: a lighter,
  hard-edged hull around a big creature (the painting inside the
  creature's own clip, scaled with it — stage 2's rig) shows more as it
  grows; the vent flap the creature bit off (stage 4) hangs beside the
  rail and is still read as a grey rod; the debris plates read as flat
  grey at stream size. Fixed in this pass from the earlier list: BLOCK
  FULL. is STATE BLOAT. (it read as being about the blocks), and the dark
  beyond a pulled-back frame no longer repeats the kitchen (no seam, no
  doubled lantern).
- The critics disagreed with each other from round to round on where the
  block's total belongs (on the card, in the mouth, beside the card), on a
  coloured room wash at the break, and on how far the lance should step
  back while a shot flies. Each round was applied on its own terms; the
  table above says which way each went.
- The sounds (`block-in`, `block-hit`, `block-gone`, `wrong-token`) have
  not been reviewed by anyone; the critics see stills.
- Not merged, not pushed (`feat/aim` on top of `feat/feast`).
