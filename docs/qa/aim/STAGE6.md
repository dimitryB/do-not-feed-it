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
that runs a little ahead of it so the chain leans, with a faint wake behind
it while it shuttles; a small tag under it says whose it is as it comes
down (BITCOIN BLOCK. / ETHER BLOCK. / HEMI BLOCK.). Its rim, in its coin's
colour, never goes dark and pulses while its coin is in the barrel.
Broken: a filled bloom with wedges of light where it was while the room
drops a stop for a few frames, a shock ring, the cube in two halves and iron
plates with hot edges thrown back toward the launcher, a kick of the
camera, 90 ms of hit-stop and the creature's eyes snapping to it; then a
BLOCK REWARD. card under it that lands solid in the coin's colour, lights a
mini coin as each
coin is swallowed and carries the running total; on the last coin the
mouth rings in the coin's colour and the creature swallows harder than for
any feed. MISSED THE BLOCK. when one
is hoisted away; WRONG TOKEN. on its tag and a red outline when another
coin glances off. Four sounds. The creature watches a block when nothing is in the air.
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
| moderate | 142.7 s | 141.1 s | 194 | 227 | 89 % | 4.02 (40 %) |
| good | 163.9 s | 157.3 s | 217 | 267 | 92.6 % | 6.29 (68 %) |

Every FEAST gate passes: naive 48.8 s (40–80) with 29 feeds (≥ 6); moderate 141.1 s (100–180), 89 % accuracy (≥ 55), 7.48 frenzies a run (≥ 1), worst 30-s bucket 30.5 % (≤ 40), first level 27.5 s (25–45), ×1.5 at 67.7 s (60–90), ×2.0 at 168.7 s (120–180), first ×3 and all three ×3 never before 150 / 240 s, first frenzy 10.1 s (≤ 40); decision density 104.11 / min (≥ 6); good 157.3 s ≥ 1.8 × naive. Reports: `docs/qa/aim/stage6-bots-moderate.json`, `stage6-bots-others.json`.

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
| survival, median | 117.5 s | 142.7 s | 94.9 s | 105.5 s | 141.1 s |
| feeds | 103 | 194 | 56 | 42 | 227 |
| score, median | 47,377 | 163,572 | 20,901 | 14,046 | 202,493 |
| FOMO (frenzies) a run | 1.8 | 5.8 | 0.91 | 0.17 | 7.48 |
| blocks broken a run (share of those that came) | — | — | 5.16 (45 %) | 0.52 (5 %) | 4.02 (40 %) |

As a share of what the moderate bot gets, one barrel setting used to be worth
53 % of the feeds and 29 % of the score; it is now worth 25 % and
10 % (19 % and 7 % if the setting has to go
straight in). Survival moves less than feeds because a creature that is fed
less also grows and empties more slowly — the stage 3 "do not feed it"
economy — so feeds and score are the honest measure here.

**The blocks do not separate the two bots, and that is reported as it is.**
The `fixed` bot breaks 5.16 (45 %) — more than the moderate bot breaks
(4.02 (40 %)), which goes for 60 % of blocks on purpose. Its barrel is
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

The moderate and good bots move the barrel 37 and
37 times a minute by 8° or more between planned shots (`aim:`
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
| 10 | aim iter-17, loop iter-309 (the good bot) | 7 | 7 | 7 | 7 | 7 | 6 | — (stopped here; see below) |

From round 5 on, the whole-shift capture follows the good bot
(`loop-shots.mjs --bot good`), which goes for every block, so the strips
show what a player who uses the blocks sees; earlier rounds followed the
moderate bot, which goes for 60 % of them. The staged scenes are the same
throughout.

**The exit bar was not met.** Payoff reached 8 in rounds 6, 8 and 9, and
every criterion reached 7 at least once; round 10 had five of the six at 7
(Payoff 7, Cohesion 6). No single round cleared all six. Two things are
worth knowing when reading the table:

- **The critics disagreed with each other, not only with the work.** The
  room-wide flash was the problem in round 2 and was asked back in rounds 3
  and 4;
  the block's total was wanted at the mouth in round 7, off the mouth in
  round 8 and back at the mouth in round 10; round 3 offered coins over the
  captions and rounds 4 and 6 wanted captions over the coins. Each round was
  still applied on its own terms, which is why the scores move by a point
  either way from round to round rather than climbing.
- **What every late round still asked for needs the rules, not the
  renderer:** a block that hangs lower in clear air on a longer chain
  (rounds 6–10), and Bitcoin and Ether needing visibly different barrel
  angles late in the shift (rounds 6–10, Aim agency). Both move the
  pacing gates and were left for a deliberate pass (Open).

Round 10's remaining asks, for the next pass: the block's reward as the
loudest number on screen (a popup per coin at the mouth and one total,
the card at full saturation under the FOMO grade); a bigger break (about
110 px at 960, a brief white flash) with chunks that keep the cube's
riveted face; HEMI's reward jets tapered so the coins do not read as a
barbell; a bigger cube, its tag kept while it hangs; bigger mint Ether
bubbles; a coloured lance while reloading; MISSED THE BLOCK. only while
the block is visible.

## Open

- **The barrel still settles late in a shift.** The landing windows widen
  with the mouth. Direct landings, probe sweep (`probeFlight`), by size:

  | Size | Bitcoin | Ether | HEMI | One angle lands all three (at different charges) |
  | --- | --- | --- | --- | --- |
  | ×1 | −65°…−39° (charge 15–16) | −64°…−32° | −39°…−26° | −39° only |
  | ×1.6 | −65°…−41° | −64°…−34° | −44°…−28° | −44°…−41° |
  | ×2.0 | −65°…−42° | −64°…−35° | −48°…−29° | −48°…−42° |
  | ×2.4 | −65°…−42° | −64°…−36° | −50°…−31° | −50°…−42° |

  So a grown creature can be fed all three coins from about −45° by
  changing only the charge (Bitcoin full, Ether high, HEMI low), and the
  blocks have stopped coming by then (D147). Every critic from round 6 on
  named it (strips 0140 and 0200). The fix is a
  per-coin flight retune that keeps the coins a mouth-height apart at the
  same charge as the mouth grows — it moves every pacing gate, so it was
  not started late in this session. The `fixed` bot never sees it (it
  dies at about 95 s, before ×1.6).
- **Blocks do not separate a fixed barrel from an aiming one** (above): a
  barrel left at −61° breaks 45 % of blocks by luck. Every stretch of air
  Bitcoin can reach is crossed by some shots that feed the mouth; making
  luck rarer would mean blocks Bitcoin cannot reach.
- **The block hangs high, in front of the shelf, the pan and the lamp.**
  Rounds 6–10 asked for it lower, in clear air, on a longer chain. Its
  height is the rules' (`crateDropMin/Max`, y 135–160); lower means more
  of the shots that feed the mouth cross it (a probe sweep: about 10–14 %
  of mouth shots cross today's lane, 20–34 % at y 200) and it sits in the
  flight lane, so it needs its own pass with the bots.
- **Critic notes outside the two changes**, left alone: BLOCK FULL. (the
  camera pull-back card, stage 5) now reads as being about the blocks; at
  the late camera the backdrop shows a seam and a doubled lantern; the
  vent flap the creature bit off (stage 4) hangs next to the rail and is
  read as a grey rod by every critic (lit a little in round 6, not moved —
  it is a rules bouncer).
- The sounds (`block-in`, `block-hit`, `block-gone`, `wrong-token`) have
  not been reviewed by anyone; the critics see stills.
- Not merged, not pushed (`feat/aim` on top of `feat/feast`).
