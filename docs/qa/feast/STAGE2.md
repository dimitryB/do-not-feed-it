# FEAST — stage 2: the presentation

Pillars 6 and 7 of `docs/FEAST_BRIEF.md`. The rules (`lib/game/arcade.ts`) were
not touched; two rule proposals that fell out of the work are P7–P9 in
`docs/DECISION_REGISTER.md` (decisions D106–D111). Capture set:
`docs/qa/loop/iter-1` (moderate bot, seed 20260911, 252.9 s, 282 feeds, 7
frenzies, best combo 28, died empty-belly at ×2.40 with every mutation at 3).

## What changed

**The creature grows, visibly (D106, D107).** The warp could never stretch the
painting past ×1.14, so growth was a number. The creature is now drawn through
a tightly traced silhouette (`SILHOUETTE`, `ANTENNAE` in
`lib/render/creature/anatomy.ts`) as a clipped layer, scaled about its resting
mouth by `1 + 0.36·(size−1)` wide and `1 + 0.06·(size−1)` tall (a balloon adds
3.5 % a level sideways), and translated so the drawn mouth lands on the rules'
`creature.x, creature.y`. Growth, lift, bob and tracking are that one transform;
the mouth's own scale is the rules' `mouthGrowX/Y` divided by the body scale.
`scripts/mouth-calibrate.mjs` now fits the rules' constants from the drawn
mouth to within a pixel per size (`ARENA.mouth {838, 280, 112, 69}` vs the
rules' `{840, 279, 113, 69}`; rise 46.9 vs 48; growX 0.236 vs 0.237; growY
0.455 vs 0.456) with no coefficient, and the eleven live states agree with the
rules' ring within 5 px except `metal 3 only` (dy 12, the snarl's jaw). The
kitchen behind the creature is in-painted (`rig.backdrop`) and the sill is
drawn back over it, so a creature past the counter sinks behind it. Vertical
growth is tiny on purpose: the rules put the mouth at y ≈ 160–230 late in a
shift (48 px a size plus lift plus bob) and the eyes are 29 px above the
mouth's top at any scale, so any more and the face leaves the frame.

**The HUD is the creature (D108).** Deleted: the MOUTH/BELLY/IRRITATION plate,
`NOW → 1.5 s`, SHUT THEN, the forecast chevron, the pay line and SHIFT PAY,
NEXT CHANGE, ITS SIZE, the coaching line, the phase label, the cutlery stuck to
the belly, the balloon valve. On screen in play: score (52 px, left), time
(right), three chips (level ×N, a glow when a level lands), the craving ring
(54 px, shrinking arc), a combo counter above the launcher that grows from 30
to 72 px and becomes a pulsing FRENZY banner with a time bar at five, and one
belly bar under the creature with no numbers that flashes red (2.5 Hz) under
25 %. Irritation is the flush and brows plus a red vignette above 70. The
legend strip is 1/2/3 with the snack and its mutation, and Space.

**One caption at a time (D109).** NOM. / THAT ONE. YES. / STUFFED. / OFF THE
PAN ×2 / DOUBLE BANK ×3 / TRIPLE BANK ×4 / CLANK. / UTENSIL +500 / COOKED / IT
IS ON FIRE. / IT INHALES / FIRE BREATH / SINGED / FORK IN THE WORKS / BIGGER. /
MAGNET MOUTH ×1 / IT WANTS TIN. / TANTRUM. / IT TOOK THE TRAY. / ON THE FLOOR.
Priority decides replacement; the slot is the empty left third. Score pops are
numbers only, at the catch, 22–64 px by value.

**Bouncers (pillar 2 drawn).** The five rules' colliders are drawn where
`ARENA.bouncers` puts them: a hanging pan, a shelf with jars, a caged pendant
lamp that glows (it pays double), a chain with a hook, a pot on the counter.
A `bounce` event flashes a ring at the contact point (gold when it banked,
teal off the belly) and the prop wobbles on a damped spring.

**Juice (D110, D111).** Catch: three held frames (page scheduler holds the
simulation and drops the remainder; the renderer holds its clock 50 ms), the
rig's snap squash, an 18-dot NOM burst plus sparks in the snack's colour, a
score pop by value. Bank: ring flash, prop wobble, gold sparks. Frenzy: rumble
(0.22 sustained, a 1.0 hit at the start), warm vignette, FRENZY in 92 px
display type pulsing at 2.6 Hz, music to double time with a fifth over every
note, ambience ducked to a third. Miss: dust and a sad clank. Grow: a ring
pulse to the frame edges, a brief lime flash and a BIGGER. card. Metal: chrome
teeth plus electric arcs between them; cutlery storms are forks, spoons and
knives with motion trails and a magnet arc. Balloon: body inflates sideways,
lift and bob come through the mouth pin, the belly flashes teal on a bounce.
Pepper: the tell puffs the cheeks, glows the pressure marks and draws the cone
in dashes with air streaking in; the breath is a flickering cone with a hot
core and embers; cooked snacks carry a flame trail; the bench fire is fifteen
flames and smoke along the bench. Every effect falls back to colour and pose
under reduced motion and nothing flashes above 3 Hz.

**Audio.** New cues in `lib/engine/audio.ts`: chew, clank, bounce, bank,
frenzy-start/end, utensil, cooked, flame-tell, flame, fire, jam, grow, tantrum,
craving; `setFrenzy` ducks the ambience and lifts the score. The mixer is
unchanged.

**Harness.** `scripts/loop-shots.mjs` films a `first-frenzy` clip and times
the typical state without the retired `clog`/`pressure`; the dev pose presets
(`lib/dev/poses.ts`) speak the new event vocabulary.

## Render cost

Typical state (×2.0, metal 2 / balloon 2 / pepper 1, lift 9) at 1920×1080 on
this container:

- `scripts/render-budget.mjs --only typical --runs 2 --seconds 6`: **4.40 ms
  median**, 4.72 ms mean, 7.30 ms p95, 383 warp cells a frame (was 590: growth
  no longer goes through the warp).
- The capture harness, measured while the dev server is still compiling:
  4.10 ms median / 9.2 p95 on the first run, 5.80 ms median / 8.0 p95 on the
  second. The harness number has always been the noisy one; the budget
  instrument is the one to read, and it is under the ~5 ms line.

## The critic table

No sub-agent spawning tool was available to this session, so the table below
is a self-read of the 960-px captures only (`*-stream.png` in
`docs/qa/loop/iter-1`), scored as harshly as a fresh reader would. It should
be replaced by a real fresh-context pass; the prompt to give that critic is at
the end of this file.

| criterion | score | one line | single most important fix |
| --- | --- | --- | --- |
| Agency | 7 | The lance, the charge bar and the loaded snack say what is being chosen; the combo sits on the barrel and eats the lance at ×3+ | Move the combo counter to the counter's left of the launcher |
| Consequence | 7 | Every catch pops a number and a word, a miss leaves a snack on the floor, a singe shows a cone through the launcher | The belly bar is too thin and dark to see it drain at 960 px: 18 px and a glow |
| Spectacle | 7 | FRENZY, a fire cone across the room, TRIPLE BANK ×4, forks in the air; but a one-second strip often shows one held state six times | Spread each strip over four seconds, not one, so a catch and its pop are both in it |
| Power | 8 | The frenzy banner, the ×3 chips, +1500 off the belly, a creature that fills the frame | Keep |
| Readability | 6 | Chrome teeth and the fire cone name their mutations without text; balloon reads only as "it is higher", and the late creature is a pale blob with its eyes at the top edge | Stop the metal wash, the taut sheen and hunger pallor compounding into white; keep the face in frame (rules: P8/lift) |
| Comedy | 7 | THAT ONE. YES. / IT TOOK THE TRAY. / SINGED land; NOM. repeats | Rotate the catch captions (NOM. / CHOMP. / GULP. / MORE.) |
| Fairness | 6 | The lit ring is the mouth at every size; a belly bounce can be credited before the snack touches the painted belly, and the lamp bouncer is drawn on the face | P7 (belly ellipse follows the body) and P8 (move the lamp) |

## What is still weak

- The rules push the mouth to y ≈ 160 late in a shift, so the face is at the
  top edge from ×2.2 with a balloon under it. Only a rule change fixes it (a
  lower `risePerSize` or `liftPerLevel`); the renderer has already given up
  nearly all vertical growth to keep the eyes in.
- The moderate bot reaches ×2.4 inside sixty seconds on this seed; the brief
  wanted ×2 by minute two. That is a stage 1 pace question.
- Late-game colour: metal's steel wash, balloon's taut rim and hunger pallor
  stack into a white creature. Each was reduced; they still compound.
- The belly bar is correct and quiet. It should be louder.
- The bouncer props are outlines on a painting and look it; the lamp sits on
  the forehead because the rules put it there.
- The hit-stop and the chip glow could not be judged from stills.

## The critic prompt

Give a fresh-context agent only the `*-stream.png` files in
`docs/qa/loop/iter-1` (the six strips, the four clips, the eight stills) and
this: "Score Agency, Consequence, Spectacle (did something big and legible
happen in every 20-s strip?), Power (is there a moment the player looks
great?), Readability (can you name what is happening without any text?),
Comedy and Fairness, 0–10 each, one line each, and the single most important
fix for each. You know nothing about the game except that the player launches
snacks into the creature's mouth."
