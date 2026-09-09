# Creature rig iteration log

## FINAL REPORT — stopped after five iterations, exit criteria not met

**Status: the rig is built, all 25 states exist and are reachable through real
play, and the renderer is well inside budget — but the creature does not yet
read the way the brief requires.** The critic's average over the 25 named states
went 4.2 → 3.7 → 4.4 → 4.4 → 4.5. The exit criterion is two consecutive
iterations with every state at 8 or better. Nothing here is close to that, and I
am reporting it rather than rounding it up.

### What passed

- **All eleven required state groups exist, with the per-ingredient variants**,
  25 named states in total, and the scripted trace reaches every one of them
  through `launchFood`/`stepArcade` across three real shifts (survived at tick
  7200, irritated out at 1739, starved out at 4615) — not only through the pose
  hook. `docs/qa/creature/iter-5/manifest.json` records the reached list.
- **Presentation only.** `lib/game/arcade.ts` rules, scoring, replay and trace
  are unchanged in behaviour; the only addition is two optional presentation
  tags on `ArcadeEvent` that nothing in the rules, replay or scoring reads. The
  23 existing tests pass unmodified.
- **Render budget.** 2.025 ms average, 7.900 ms max over 134 frames at
  1920x1080 on this machine, against a 4 ms average budget. Every iteration is
  measured with `performance.now()` around the scene draw and reported above.
- **Reduced motion** is captured every iteration and was reviewed by the critic
  each time. Nothing flashes; motion is suppressed and the states still carry
  colour and pose. Three reduced-motion states score 6-7; three score 3.
- **`npm run typecheck`, `npm run lint`, `npm test` and `npm run build` are
  green.** See the caveat on `test:contract` below.
- **Craft failures that were real bugs are fixed**: the geometry tearing, the
  two sprite masks built in the wrong coordinate space (the "tongue" was a crop
  of teeth), the eyelid veil, the inverted brow pivot, the duplicated antennae,
  the eye dropout, and the whole-scene scale pop.

### What did not pass

- **No state set reaches 8, let alone twice.** The best states are
  active-metal, active-pepper and tracking-near at 6-7; a cluster around
  attract-idle, hungry-mild, tracking-far, warn-metal, warn-balloon, recovery and
  off-menu still resolve to the same resting face and sit at 3-5.
- **The three gulp strips are one animation with three tints.** Anticipation and
  contact are there; squash, overshoot, settle and per-ingredient timing are not.
- **The miss reads as a success.** The strip ends on a smile with nothing on the
  floor. This is the single most misleading thing in the set.
- **Balloon inflation has nowhere visible to happen.** The belly is behind the
  hatch, so a swell that is physically correct is invisible on screen.
- **Open craft defects:** the vent flap still reads as a floating placeholder;
  two score-toast draw failures (ghosted behind the pipework in
  craving-satisfied, clipped mid-word in off-menu); a ghost arc of the closed
  mouth across the chin in active-metal; hard flush boundaries at the jaw.
- **`npm run test:contract` cannot run in this environment.** Hardhat downloads
  the Solidity compiler from `binaries.soliditylang.org`, which this session's
  egress policy blocks. No Solidity file is touched anywhere on this branch
  (`git diff codex/creature-arcade..feat/creature-rig --stat -- contracts test`
  is empty), so the contract tests are unaffected, but I have not run them and
  do not claim they pass.
- **The captures were produced in a Linux container**, not on the Mac. The repo's
  `node_modules` is a macOS build and its `workerd` binary cannot run under the
  device shell, so the dev server, the build and the harness were run against a
  clean install in the cloud workspace on the same commits. Re-running
  `node scripts/creature-shots.mjs --iter N` on the Mac should reproduce the set.

### Why the average moved the way it did

Iteration 1's 4.2 was inflated: most states were the same neutral frame, and a
critic cannot fault a state it cannot distinguish from another. Iteration 2
scored 3.7 while the renderer objectively improved, because the states finally
differed enough for the critic to name what was wrong with each. From there the
numbers move honestly: 4.4, 4.4, 4.5. Two of the five iterations spent their
budget on defects (folding, sprite masks, eyelids, blinks, kernel bounds) rather
than on performance, which is the right order — a state cannot be judged while
the creature has no eyes — but it left little room for the animation work.

### Recommended next step, in order

1. **Author one exclusive pose per state and stop falling back to the resting
   smile.** Eight states share it. This is worth more than any other change: a
   crude but distinct brow, jaw and antenna position for each would move the
   cluster from 3-4 to 6-7 on its own. The pose vocabulary in
   `lib/render/creature/pose.ts` supports it; the values are simply not
   authored far enough apart yet.
2. **Rebuild the gulp as three animations, not one.** Metal: a hard jolt with a
   sharp throat lump. Balloon: a soft close, cheek puff and floaty rebound.
   Pepper: settle, then a delayed wince. The contact frame is already right; the
   settle is missing.
3. **Make the miss look like a failure** — flinch, a visible splat on the
   counter, and a side-eye held through the tail of the beat.
4. **Move the balloon mutation above the hatch line.** A throat sac and cheeks
   inflating where the camera can see them, plus a visible lift off the sill.
5. **Clear the remaining craft caps**: the vent prop, the two toast draws, the
   active-metal ghost arc, and the flush falloff.

A realistic estimate for reaching "every state at 8" from here is a further
four to six iterations of the same loop, most of it pose authoring rather than
engineering. The harness, the rig and the review loop are in place and cost
about five minutes per capture pass, so that work is now cheap to do.

**The branch `feat/creature-rig` is not merged.**

Branch `feat/creature-rig`. Presentation only: `lib/game/` rules, the trace
format and `tests/` behaviour are unchanged in every entry below.

Captures live in `docs/qa/creature/iter-N/` and are **not** committed — the set
is roughly 240 MB per iteration and is regenerated with:

```sh
node scripts/creature-shots.mjs --iter N
```

`manifest.json` per iteration records the capture list, the measured render
cost and which states the scripted real-play trace actually reached.

## Iteration 0 — evaluation harness

**Changed:** nothing about the art. Added the review harness so every later
iteration can be judged the same way.

- `lib/dev/hook.ts` — development-only render controls (`window.__dnfi`):
  freeze the render clock, force reduced motion, force a pose, read the rolling
  scene-draw cost. `DEV_HOOKS` folds to `false` in a production build, so the
  hook and the pose presets behind it are dropped by the bundler.
- `lib/dev/poses.ts` — 25 named creature states, each built as a synthetic
  `ArcadeState` of exactly the shape live play produces, parameterised by
  seconds since the moment that defines the state so a strip can be walked.
- `app/page.tsx` — development-only `__dnfi.play`: deterministic start, manual
  tick stepping, scripted launches, state snapshots. Manual mode only stops the
  presentation loop from advancing ticks; the rules are untouched.
- `lib/game/arcade.ts` — events carry two optional presentation tags,
  `ingredient` and `craved`. Nothing in the rules, replay, scoring or the trace
  reads them; the 23 existing tests stay green.
- `scripts/creature-shots.mjs` — Playwright harness (`playwright` added as a
  devDependency; a preinstalled Chromium is used via `DNFI_CHROMIUM`). Boots the
  dev server, hides the HUD, captures 25 states at 1920x1080, eight six-frame
  strips 100 ms apart, a reduced-motion pass, three HUD-visible screens, a
  960-wide `-stream.png` copy of every capture, and a contact sheet.

**Render timing:** 1.607 ms average, 3.500 ms max over 171 frames at
1920x1080. Budget is 4 ms average.

**Scripted trace:** three real shifts (survived, irritated out, starved out)
drive every state through `launchFood`/`stepArcade` rather than the pose hook.

**Critique:** not run. The renderer is unchanged, so iteration 0 is the
baseline the loop measures against: one painting with a small mesh wobble,
identical in all 25 states.

**Next:** build the layered rig and author every state.

## Iteration 1 — the layered rig

**Changed:** replaced the single-image mesh wobble with a rig cut from the same
painting.

- `lib/render/creature/anatomy.ts` — every landmark measured off `kitchen.png`
  in arena coordinates: eyes and pupils, the traced outline of the painted
  mouth, the chin skin used to rebuild it, the body silhouette.
- `lib/render/creature/rig.ts` — builds the rig once, lazily. The painted mouth
  is cut out along its outline and rebuilt from the creature's own chin skin,
  tiled and flipped, then relit through a soft-edged mask; the painted pupils
  are filled in the same way so a new pupil can look around. Cut parts: pupils,
  tongue, two bands of eyelid skin. The teeth are painted to the sampled ivory,
  because the painted fangs are small, low-contrast and half in shadow.
- `lib/render/creature/warp.ts` — a smooth displacement field (head tilt and
  offset, body squash, jaw, belly, swallow, cheeks, antennae) applied to the
  picture as a grid of affine cells. The creature is never cut out, so there is
  no silhouette edge to tear. Cells that fold are drawn straight instead.
- `lib/render/creature/pose.ts` — game state to performance: springs for weight
  and overshoot, authored one-shot beats for the gulp and the flinch, and a
  target set per state.
- `lib/render/creature/draw.ts` — authored mouth (lips, cavity, palate, tongue,
  two rows of teeth), eyes (pupil, lids clipped to the eye, brow, catchlight)
  and skin colour (flush, pallor, pressure marks, sweat, exhale).
- Harness: `__dnfi.settle()` replays the run-up to a capture so the springs
  arrive where the performance actually arrives; `__dnfi.hideAim()` drops the
  aim guide so a capture shows the creature alone.

**Render timing:** 1.002 ms average, 2.500 ms max over 140 frames at 1920x1080.

**Scripted trace:** all 25 states reached through real play across three shifts
(survived at tick 7200, irritated out at 1739, starved out at 4615).

**Critique average: 4.2 / 10.**

| State | Score | Reason | Fix |
|---|---|---|---|
| attract-idle | 5 | Generic grin, reused verbatim by four other states | Make idle a real pose, eyes cut to the launcher |
| hungry-mild | 3 | Identical to idle bar a tongue tip | Whole-body cue: slack jaw, sagging lip |
| hungry-severe | 5 | Reads, but barely a step past mild | Drop head and shoulders below the hatch line |
| tracking-far | 3 | Pixel-identical to idle; only the food says anything | Actually rotate head and eyes toward the projectile |
| tracking-near | 7 | Wide mouth and raised brow read instantly | Head tilt up and forward |
| gulp-metal | 4 | Closed mouth plus score text; no clank, no bulge | Hard jaw clamp, metallic flash, visible throat bulge |
| gulp-balloon | 4 | Pixel-sibling of gulp-metal | Puff cheeks, pop the outline |
| gulp-pepper | 5 | Reads as a yawn, not a burn | Flush red, squeeze eyes, add tears |
| miss-floor | 4 | Side-eye on the neutral pose; text does the work | Real flinch frame, eye-line to the mess |
| miss-vent | 4 | Identical to miss-floor | Head snaps toward the vent |
| irritation-1 | 3 | Indistinguishable from neutral | Genuine heavy brow, downturned corners |
| irritation-2 | 6 | Colour shift reads as a white-balance error | Confine the flush to the creature, set the jaw |
| irritation-3 | 7 | Flush plus bared teeth reads furious | Stop grading the whole background |
| warn-metal | 3 | Identical to idle; no quiver | Teeth lengthen and jitter, metallic sheen |
| warn-balloon | 2 | Identical to warn-pepper; belly never swells | Inflate the belly outline |
| warn-pepper | 2 | Identical to warn-balloon | Redden and bulge the cheeks with pressure marks |
| active-metal | 6 | Long teeth read, but sit as a flat band over the lip | Seat the teeth into the gum with occlusion |
| active-balloon | 1 | Geometry tearing: a shard through the skull | Rebuild the inflation deformer |
| active-pepper | 5 | Reads as roaring, not a hot exhale | Volumetric plume from the mouth, drop the body flush |
| recovery | 3 | Identical to idle plus a ring artifact | Show a real settle past normal |
| craving-satisfied | 4 | Reuses the pepper wince: discomfort, not delight | Distinct delight pose, no squint |
| off-menu | 4 | Byte-identical to gulp-metal | Flat shrug: half lids, dropped antenna |
| end-survived | 3 | Belly carries the tearing artifact | Remove tearing, read the full belly as roundness |
| end-starved | 7 | Slumped, drooping, hollow: reads without text | Hollow the belly outline too |
| end-enraged | 6 | Same vocabulary as irritation-3 | Give the ending a unique lunging beat |
| strip-gulp-metal | 3 | Static silhouette across six frames | Anticipate, squash on contact, overshoot, settle |
| strip-gulp-balloon | 2 | Same frames as metal, plus tearing at 400 ms | Own puff-and-wobble curve; fix tearing first |
| strip-gulp-pepper | 4 | Opens linearly, no settle, text swallowed by the throat | Wince-and-recover curve, move the text |
| strip-miss-floor | 2 | Head never moves | Impact beat, then settle into the side-eye |
| strip-onset-metal | 4 | Monotonic lengthening, no quiver | Jitter resolving into a snap-to-alignment |
| strip-onset-balloon | 1 | Six identical frames | Accelerating swell with an outline change |
| strip-onset-pepper | 1 | Frame-for-frame the same as balloon | Author a separate pepper onset |
| strip-pepper-exhale | 6 | The only real arc, but no settle and flat 2D strokes | Close the mouth on the last frame; scene-lit heat |
| reduced-hungry-severe | 5 | Nothing lost, but cues are small | Carry hunger in the pose and skin tone |
| reduced-irritation-3 | 7 | Colour alone carries it | Keep the flush local |
| reduced-gulp-metal | 3 | Just the neutral closed mouth | Hold a post-gulp pose |
| reduced-active-metal | 6 | Long teeth survive suppression | Integrate the teeth into the geometry |
| reduced-active-balloon | 0 | Tearing worse than the animated still | Do not ship until the deformer is rebuilt |
| reduced-active-pepper | 4 | Heat arcs float detached over the hatch frame | Anchor the exhale to the mouth |
| reduced-end-survived | 3 | Tearing across the belly | Remove the tearing |

**Blocking defects:** geometry tearing on every balloon-inflated state including
the mid-play HUD; warn-balloon and warn-pepper identical to each other; both
onset strips effectively still images; score text composited over the creature's
chest and swallowed by the throat; detached exhale arcs floating over the hatch.

**HUD screens:** title strong; result strong; mid-play strong in layout but not
stream-safe while the tearing artifact sits centre frame.

**Decision for iteration 2:** fix the tearing at its cause (the radial
displacement terms normalise their direction, which is discontinuous at the
centre of the kernel — replace with a linear radial falloff); give every state
its own pose vocabulary instead of falling back to idle; put real squash,
overshoot and settle into the gulp and miss beats; separate the three mutation
warnings; keep colour grading on the creature; move the score text off its body.

## Iteration 2 — fixing the rig's real bugs

**Changed:**

- **The tearing is gone.** Two causes. The belly and swallow deformers pushed
  along a *normalised* radial direction, which flips sign through the centre of
  its kernel — a discontinuity, and a discontinuity folds a warp cell. Both now
  push proportionally to distance. On top of that the sampled grid is forced
  monotone before any cell is drawn, so no cell can invert, and a cell whose
  source rectangle is much larger than the cell itself is clipped to its own
  bounds instead of smearing across the frame.
- **Two sprite masks were built in the wrong coordinate space** — the feather
  gradient was created before the transform that fills it, so the soft disc was
  centred on a corner. The pupils and the tongue were nine-tenths transparent
  and cut from the wrong part of the picture: the "tongue" in the mouth was
  actually a crop of teeth. Fixed, and the eye landmarks were re-measured off
  the painting (they were out by 7-8 px, which is why the pupil cut missed).
- **Eyelids stopped being a veil.** The lid band feathered over half its length,
  so a half-open lid laid a 50% skin wash across the whole eye. It is now opaque
  for 84% of its length, drawn in nine slices whose lengths follow a curve so the
  lid edge arcs, and the brow pivots at the *outer* corner (it was pivoting at
  the inner one, which inverted every angry and worried brow).
- **The closed mouth moved to where a closed mouth belongs**, mid-muzzle rather
  than up under the nose, and the jaw kernel now compresses the chin instead of
  lifting the mouth line.
- Colour grading is masked to the creature's own silhouette, so irritation no
  longer looks like the room's white balance drifting. Score pops are drawn as
  a pill above the action instead of loose text over the creature's chest. The
  balloon mutation's pasted arrow glyphs are gone. Each state is now sampled at
  a time that suits it — a 90-tick warning is not readable 25 ticks in.
- Pose work: idle actually looks at the launcher; peckish and starving are
  separate reads; the three irritation steps have separate shapes; warnings are
  partial and unstable where actives are committed; recovery sags past its
  resting size before settling; craving and off-menu are a delight beat and a
  shrug rather than two copies of the same settle.

**Render timing:** 1.893 ms average, 3.300 ms max over 126 frames at 1920x1080.

**Checks:** typecheck, lint, 23 tests and the production build all pass.
`npm run test:contract` cannot run in this environment — Hardhat downloads the
Solidity compiler from `binaries.soliditylang.org`, which the session's egress
policy blocks. No Solidity file is touched by any commit on this branch.

**Critique average: 3.7 / 10** (iteration 1 was 4.2). The score went down while
the renderer got better, which is worth stating plainly: iteration 1's average
was inflated by states that the first critic could not fault because they were
all the same neutral frame. This critic named the real problem — six states are
still interchangeable with idle, and the creature smiles through all of them —
and found two artifacts that iteration 1 had hidden rather than fixed.

| State | Score | Reason | Fix |
|---|---|---|---|
| attract-idle | 7 | On-model, warm, clean craft; gaze locked at camera | Angle the eyes and head toward the launcher |
| hungry-mild | 3 | Pixel-identical to idle | Lowered brow, slack jaw, tongue lolling, body sunk |
| hungry-severe | 3 | Broad grin reads delighted, not starving | Invert the mouth curve, hollow the cheeks, sag the head |
| tracking-far | 4 | Eyes point at camera while the pellet is off to the left | Aim pupils and head at the projectile |
| tracking-near | 6 | Wider maw reads "incoming" | Converge the pupils on the pellet |
| gulp-metal | 3 | Closed smile plus specks; nothing says metal | Hard clamp, squash, clank spark, throat bulge |
| gulp-balloon | 3 | Same as gulp-metal with a different particle hue | Puffed cheek, body lift, upward drift |
| gulp-pepper | 2 | Eyes absent, antennae multiplied to five | Fix eye occlusion and the antenna artifact |
| miss-floor | 3 | Untouched idle smile with a caption | Real flinch plus a hard side-eye at the mess |
| miss-vent | 3 | Identical pose to miss-floor | Vent should be a head-jerk away |
| irritation-1 | 2 | Indistinguishable from idle; no brow at all | Visible brow furrow, compressed asymmetric mouth |
| irritation-2 | 3 | Eyes collapse into slits; reads sleepy | Keep the eyes open and narrow them into a glare |
| irritation-3 | 6 | Bared teeth and flush land | Pull the corners down so it snarls, not guffaws |
| warn-metal | 3 | Idle with slightly more teeth | Teeth lengthening into a rigid comb, cold specular |
| warn-balloon | 2 | Closed smile, zero belly change | Start the swell at ~40% here |
| warn-pepper | 2 | Eyes vanished, antennae duplicated | Fix the artifact, add cheek veining |
| active-metal | 7 | Long spike teeth read instantly and stay on-model | Cold rim-light so they read as metal |
| active-balloon | 4 | Hard cut-out seam along the sill; reads as a camera zoom | Inflate inside the hatch instead of scaling past it |
| active-pepper | 4 | Exhale is flat arrow glyphs outside the hatch; eyes gone | Real heat haze from the mouth; restore the eyes |
| recovery | 2 | Eyes absent, mouth wide, antennae multiplied | Closed-mouth exhale, half-lidded, body settling |
| craving-satisfied | 3 | Closed smile with occluded eyes; caption clipped | Full-body delight beat |
| off-menu | 3 | Same closed smile as craving-satisfied | Flat half-lidded shrug |
| end-survived | 6 | Hooded eyes and smug closed smile read as full | Slower slump, rounder belly |
| end-starved | 3 | A grey wash over a grinning face | Model starvation in the silhouette |
| end-enraged | 6 | Open maw and hot rim-light read furious | Distinct lunging rage silhouette |
| strip-gulp-metal | 2 | Mouth never closes; no beat at all | Anticipate, snap, bulge, overshoot, settle |
| strip-gulp-balloon | 2 | Same curve as metal, different particle colour | Own timing: fast intake, slow float, soft bob |
| strip-gulp-pepper | 3 | Mouth opens progressively — the opposite of a gulp | Snap shut first, then the wince opens it |
| strip-miss-floor | 1 | Six identical smiling frames | Sharp recoil, hold, slow side-eye |
| strip-onset-metal | 5 | Teeth grow, but a straight linear ramp | Quiver during growth, snap to alignment at the end |
| strip-onset-balloon | 1 | No belly swell visible at any point | Ramp the belly with an elastic overshoot |
| strip-onset-pepper | 3 | Colour ramp reads; creature eyeless throughout | Restore the eyes; reddening cheek geometry |
| strip-pepper-exhale | 3 | Single-frame jump to fully open, then holds | Anticipation, burst, settle back |
| reduced-hungry-severe | 3 | Wide happy grin with tongue out | Droop-and-desaturate silhouette |
| reduced-irritation-3 | 6 | Bared teeth plus flush survive suppression | Deepen the brow |
| reduced-gulp-metal | 2 | Idle smile plus a number | Persistent static tell: bulged throat, clenched jaw |
| reduced-active-metal | 7 | Long teeth carry the state with no animation | Cold highlight for metal specificity |
| reduced-active-balloon | 4 | Cut-out seam at the sill is obvious frozen | Fix the sill compositing |
| reduced-active-pepper | 4 | Only the glyphs distinguish it; face eyeless | Bake reddened cheeks and heat shimmer into the pose |
| reduced-end-survived | 6 | Hooded smug smile holds up static | Rounder belly |

**Blocking defects:** the creature loses its eyes in eight states and two whole
strips; antennae duplicate in four states; a hard cut-out seam where the
inflated belly crosses the sill; the score caption clipped at the top edge; and
the underlying one that explains most of the low scores — it smiles through
starving, irritation, mutation and death.

**HUD screens:** title livestream-ready; mid-play strong but crowded, with the
mutation banner sitting over the creature's head; result has the right layout
and the wrong creature — "YOU'RE THE SNACK / Empty belly" over a plump grinning
monster.

**Decision for iteration 3:** the four causes behind most of these scores, in
order — (1) `Math.sign` in the antenna deformer is a step discontinuity across
the head's centre line, which folds cells and duplicates the antennae; (2)
expressive lid values reach 1.0 and close the eyes completely, so only a blink
should ever do that; (3) the mouth curve is always convex-up, so every state
smiles — the corner and apex offsets have to be able to invert the curve; (4)
the floor gate lets the arms move with the body, which opens a seam at the sill.

## Iteration 3 — root causes behind the low scores

**Changed:** the four causes iteration 2's critique pointed at.

- `Math.sign(x - 848)` in the antenna deformer was a step discontinuity across
  the head's centre line. A step folds the cells there, and a folded cell that
  the monotone clamp then repairs samples source pixels its neighbour already
  used — which is why the antennae appeared four to six times. It is a smooth
  fan now.
- Expressive lid values reached 1.0 and shut the eyes completely. Blink is a
  separate channel; expression is capped at 0.66, so only a blink ever closes
  an eye. An eyeless creature reads as a rendering fault, not as a mood.
- The painted mouth curves upward, so every state smiled. The corner and apex
  offsets now move in opposite directions, which inverts the curve into a real
  frown.
- The floor gate let the arms move with the body and opened a cut edge along
  the sill; it now reaches zero well above the counter.
- The swallow is drawn as well as warped: a shaded lump travelling down the
  throat. Pepper pressure is a blotch with veining rather than hairline
  scratches. Metal teeth take a cold edge light.
- Strips can now sample *before* the event: a gulp strip starts with the snack
  still in the air, so anticipation and contact are both in frame.

**Render timing:** 2.011 ms average, 6.700 ms max at 1920x1080.

**Critique average: 4.4 / 10** (was 3.7).

| State | Score | Reason |
|---|---|---|
| attract-idle | 5 | Handsome, but eyes at camera and the same picture as hungry-mild |
| hungry-mild | 4 | Only a slightly smaller smile separates it from idle |
| hungry-severe | 6 | Slack jaw, drooping lids, drool all read; drool is a 1px scratch |
| tracking-far | 4 | Nothing in the creature says "watching food" |
| tracking-near | 5 | Wide mouth reads; the food sprite sits flat on the cheek |
| gulp-metal | 4 | Flat mouth line, faint bulge, identical to gulp-balloon |
| gulp-balloon | 4 | Same picture as gulp-metal |
| gulp-pepper | 5 | Wide mouth reads as a laugh, not a burn |
| miss-floor | 3 | Identical to miss-vent and irritation-1 |
| miss-vent | 3 | Same face; vent is an unlit striped rectangle |
| irritation-1 | 3 | Indistinguishable from neutral |
| irritation-2 | 4 | A global warm wash that reads as a lighting shift |
| irritation-3 | 5 | Reads hostile but is the same shot as end-enraged |
| warn-metal | 4 | A cheerful grin; nothing says "building" |
| warn-balloon | 4 | The belly wash is invisible at 960px |
| warn-pepper | 5 | Pink cheeks read as blushing on a smiling face |
| active-metal | 6 | Unmistakable fangs; tooth/lip overlap and a ghost arc |
| active-balloon | 5 | Mouth is a hard-edged decal running past the cheeks |
| active-pepper | 4 | Heat arrows float in the background at the wrong depth |
| recovery | 4 | A smug grin; nothing deflates |
| craving-satisfied | 5 | Delight legible but the same picture as end-survived |
| off-menu | 4 | Reads pleased rather than indifferent |
| end-survived | 5 | Duplicates craving-satisfied and recovery |
| end-starved | 4 | Still plump and grinning |
| end-enraged | 5 | The same open red maw as three other states |
| strip-gulp-metal | 3 | Snaps in one frame, then three identical holds |
| strip-gulp-balloon | 3 | Frame-for-frame the metal strip |
| strip-gulp-pepper | 3 | Identical timing again |
| strip-miss-floor | 3 | No flinch; the caption carries the event |
| strip-onset-metal | 5 | Real progressive growth, but a linear ramp |
| strip-onset-balloon | 3 | Effectively six copies of one still |
| strip-onset-pepper | 3 | A tint fade is not animation |
| strip-pepper-exhale | 4 | Opens in one frame then holds |
| reduced-hungry-severe | 7 | Works from pose and colour alone |
| reduced-irritation-3 | 6 | Carries statically |
| reduced-gulp-metal | 2 | A plain neutral smile plus a caption |
| reduced-active-metal | 7 | Fangs carry the state with no motion |
| reduced-active-balloon | 4 | Decal mouth dominates; belly barely bigger |
| reduced-active-pepper | 4 | Static arrows float at the wrong depth |
| reduced-end-survived | 4 | Identical to craving-satisfied |

**Blocking defects:** pepper heat arrows drawn in the background at the wrong
depth; the mid-play HUD banner contradicting the creature's pose; the score
toast reading the same number for every ingredient; the toast clipped behind
the overhead pipe; the balloon mutation's decal mouth; the unlit vent prop.

**Decision for iteration 4:** the mouth and eyes must ride the warp's local
*scale*, not just its offset — that is why the mouth sits on an inflated face
like a sticker. Break the five-way "open red maw" collision (gulp-pepper,
irritation-3, active-pepper, end-enraged, exhale) by giving each a different
mouth shape. Aim the eyes at the thing being reacted to. Drop the free-floating
gust arrows; light the vent.

## Iteration 4 — one pose per state

**Changed:**

- The mouth, the exhale and the eyes are drawn through the field's local scale
  as well as its offset, so they inflate with the face instead of sitting on it.
- Irritation 3 snarls with a shut mouth and bared teeth; the wide-open maw is
  reserved for the enraged ending and the pepper exhale. A pepper burn screws
  the face up — eyes shut, mouth small, corners down — instead of opening into
  a roar.
- Eyes aim at what is being reacted to: at the projectile while tracking, at the
  floor for a floor miss, up at the vent for a deflection.
- Peckish reads as a droop in its own right rather than a faded copy of
  starving. Starvation deflates the silhouette.
- The free-floating headwind arrows are gone — the exhale is drawn on the
  creature, anchored to its mouth. The vent flap has a cast shadow and an amber
  rim so it sits in the room.

**Render timing:** 2.018 ms average, 7.400 ms max at 1920x1080.

**Critique average: 4.4 / 10.**

| State | Score | Reason |
|---|---|---|
| attract-idle | 6 | On-model, but nothing reads as hungry and the eyes point away |
| hungry-mild | 3 | The attract pose with a slightly smaller mouth |
| hungry-severe | 3 | Only marginally different from mild |
| tracking-far | 5 | Mouth open but the gaze is locked forward |
| tracking-near | 7 | Big open maw with visible throat; best gameplay read |
| gulp-metal | 4 | Closed smile plus a sparkle; identifiable from the HUD only |
| gulp-balloon | 4 | Identical face to gulp-metal |
| gulp-pepper | 5 | Cheek redness, but no wince or heat |
| miss-floor | 4 | Flat mouth and one half-lid; no flinch |
| miss-vent | 4 | Pose identical to miss-floor |
| irritation-1 | 3 | A flat mouth line and nothing else |
| irritation-2 | 5 | The flush is a hard-edged patch that reads as a spotlight |
| irritation-3 | 5 | Still smiling under an orange decal |
| warn-metal | 5 | Sharp teeth, but no sense of quiver or alignment building |
| warn-balloon | 4 | The pale belly patch reads as a texture tear |
| warn-pepper | 5 | Cheek blush is a hard-edged decal |
| active-metal | 5 | Striking, but bone-white teeth and a stray elliptical arc |
| active-balloon | 3 | Marginally rounder belly; no lift, no strain |
| active-pepper | 5 | A huge red maw that reads as a roar, not heat |
| recovery | 3 | Indistinguishable from attract-idle |
| craving-satisfied | 4 | Callout clipped; the pose is the idle grin |
| off-menu | 4 | Reads pleased; callout clipped |
| end-survived | 5 | The same face as craving-satisfied |
| end-starved | 3 | Still smiling; only desaturation says starved |
| end-enraged | 7 | Bared teeth plus flush: clearest read in the set |
| strip-gulp-metal | 3 | Two-pose change and a whole-scene zoom pop |
| strip-gulp-balloon | 3 | Same timing and poses as metal |
| strip-gulp-pepper | 3 | Identical apart from a red chilli |
| strip-miss-floor | 2 | No flinch anywhere |
| strip-onset-metal | 4 | Progressive growth, but the eyes go dark early |
| strip-onset-balloon | 1 | No eyes in five of six frames |
| strip-onset-pepper | 2 | Eyes missing; a linear tint ramp |
| strip-pepper-exhale | 2 | Eyes missing at the start; opens and holds |
| reduced-hungry-severe | 3 | Static pose still reads content |
| reduced-irritation-3 | 5 | Colour names "angry"; the decal edge is obvious |
| reduced-gulp-metal | 3 | The idle grin plus a label |
| reduced-active-metal | 6 | Long teeth read instantly |
| reduced-active-balloon | 2 | Indistinguishable from idle |
| reduced-active-pepper | 6 | The open red maw is nameable |
| reduced-end-survived | 6 | Smug closed-eye grin reads well |

**Blocking defects:** the eyes absent across most frames of three strips; a
whole-scene zoom pop in every gulp strip; clipped score callouts; the stray
elliptical arc on active-metal; the warn-balloon belly texture; the result
screen's pose contradicting its headline.

**Decision for iteration 5:** the eye dropout is a blink landing on the capture
— a held pose must hold the eyes open. The zoom pop is the body and belly
kernels reaching past the edge of the warped region, so the displacement jumps
to zero at the region boundary; shrink them until they die inside it. Clip the
magnetic arcs to the approach side so they stop crossing the cheek.

## Iteration 5 — holding the eyes, bounding the kernels

**Changed:**

- A held pose holds the eyes open (`__dnfi.holdBlink`). A blink is 130 ms, and a
  capture that lands inside one shows a creature with no face.
- The body, belly and head kernels now reach zero inside the warped region.
  A kernel that is still non-zero at the region edge steps to zero there, which
  is what produced the whole-scene scale pop between strip frames.
- Magnetic arcs are clipped to the approach side of the mouth, so they read as a
  field in front of it rather than an ellipse across the cheek.
- The score pill is opaque enough to read over the pipework; the body grading
  mask is tighter, so the room keeps its own colour.

**Render timing:** 2.025 ms average, 7.900 ms max over 134 frames at 1920x1080.
Budget is 4 ms average.

**Critique average: 4.5 / 10** — the best of the five, and still well short.

| State | Score | Reason |
|---|---|---|
| attract-idle | 5 | Charming, but the same resting smile four other states use |
| hungry-mild | 3 | Identical to attract-idle |
| hungry-severe | 6 | Desaturation and slack jaw read, though as sick rather than starving |
| tracking-far | 4 | The unmodified idle smile; only the projectile tells you |
| tracking-near | 6 | Genuinely gapes and escalates from tracking-far |
| gulp-metal | 4 | Nothing metal; identifiable only by the toast |
| gulp-balloon | 4 | Same frame with a different number |
| gulp-pepper | 6 | The only gulp that reads on its own |
| miss-floor | 3 | Calmly smiling; no flinch, no mess |
| miss-vent | 2 | A flat striped rectangle floating unattached |
| irritation-1 | 3 | A flat mouth line; indistinguishable from neutral |
| irritation-2 | 5 | The flush reads as a stage light, ending in a hard jaw line |
| irritation-3 | 5 | Strong colour, but the mouth is still a mild closed smile |
| warn-metal | 4 | A happy toothy grin, not a mutation building |
| warn-balloon | 2 | The belly is behind the hatch, so the swell has nowhere to happen |
| warn-pepper | 5 | Pink cheeks read as bashful, not pressurised |
| active-metal | 6 | Best silhouette change; a ghost arc of the closed mouth on the chin |
| active-balloon | 4 | A small uniform scale-up that reads as a blur, not inflation |
| active-pepper | 7 | Wide red-glowing maw and squint carry it instantly |
| recovery | 3 | Indistinguishable from attract-idle |
| craving-satisfied | 4 | Toast draws at ~20% alpha behind the pipes |
| off-menu | 4 | Reads content rather than tolerant; toast clipped mid-word |
| end-survived | 5 | The same frame as craving-satisfied |
| end-starved | 6 | Sunken eyes, grey pallor and a slump communicate emptiness |
| end-enraged | 6 | Bared teeth plus a red-hot face finally deliver anger |
| strip-gulp-metal | 4 | Real anticipation and a clean contact snap; no squash or settle |
| strip-gulp-balloon | 3 | The metal clip retinted |
| strip-gulp-pepper | 3 | The same clip; the burn arrives too late |
| strip-miss-floor | 2 | Reads as a successful catch |
| strip-onset-metal | 5 | Linear growth with no quiver or settle |
| strip-onset-balloon | 2 | A barely perceptible uniform scale |
| strip-onset-pepper | 4 | A linear tint ramp over an unchanging pose |
| strip-pepper-exhale | 6 | Best strip: real anticipation and a genuine snap open |
| reduced-hungry-severe | 6 | Desaturation and slack jaw survive suppression |
| reduced-irritation-3 | 5 | Colour alone is not enough while the mouth smiles |
| reduced-gulp-metal | 3 | Nothing left but the toast |
| reduced-active-metal | 7 | The clearest reduced-motion state |
| reduced-active-balloon | 3 | The resting monster with softer skin |
| reduced-active-pepper | 7 | Red maw plus squint reads instantly from a still |
| reduced-end-survived | 5 | Content but not smug; same frame as craving-satisfied |

**Blocking defects still open:** the floating vent sprite; two score-toast draw
failures (ghosted behind the pipework, and clipped mid-word); a ghost arc of the
closed mouth across the chin in active-metal; the miss strip ending on a smile
with no mess; and hard-edged flush boundaries at the jaw and chest.

**HUD screens:** title stream-ready; mid-play legible and well organised but
framed at a different scale from the review stills and carrying three competing
toasts; result strong typographically, undercut by a comfortable-looking
creature under "YOU'RE THE SNACK" and by a "TIME LEFT AT CLOCK OUT" header on a
screen announcing the shift is over.

## Iteration 6 — expressions instead of maximums

**Changed:** the pose model itself. Targets were being built by accumulating
`Math.max` per channel, which is why eight states converged on the same resting
smile: every state added its own emphasis on top of whatever was already there,
and the average of many emphases is the middle. The face is now authored as
whole named expressions, and a state blends *toward* one — pulling every channel
the expression names, including the ones it wants at rest. A strong state
overrides a weak one instead of averaging with it.

Twenty-four expressions are authored in `lib/render/creature/pose.ts`: attract,
peckish, starving, trackFar, trackNear, snap, clank, puff, burn, delight, shrug,
startle, flinch, sideEye, annoy1/2/3, warnMetal, activeMetal, warnBalloon,
activeBalloon, warnPepper, holdPepper, blowPepper, deflate, smug, collapse,
rageEnd. Skin colour, the swallow, breathing, blink and eye aim are layered on
afterwards, because two of those can be true at once and an expression cannot.

Four channels were added because they carry silhouette at stream resolution:
`lean` (head toward the camera), `antennaTwist` (one antenna up, one down),
`browAsym` (a single raised brow) and `jawShift` (the mouth pulled to one side).

Also: the rebuilt-muzzle relight is masked over a much wider band, so its
boundary stopped reading as a second mouth across the chin; the warp grid went
from 26x19 to 30x23 because a coarse grid makes the per-cell affine
approximation visible as tile edges wherever the field compresses hard; and an
undisplaced cell is now skipped entirely, which paid for the denser grid twice
over (3.4 ms back down to 1.8 ms).

**Render timing:** 2.305 ms average, 25.0 ms max at 1920x1080.

**Critique average: 4.0 / 10** (iteration 5 was 4.5). Lower, and the reason is
in the findings: this critic could finally tell the states apart well enough to
name what is wrong with each, and found three real bugs the previous passes had
been unable to see past — the balloon kernel, the shared flush, and dead eyes.

Findings that mattered: the entire balloon line showed no swelling at all; the
eyes never looked at the food; irritation-2, irritation-3, warn-pepper and
gulp-pepper all shared one orange flush; the swallow bulge read as a hole
punched in the body; event particles read as debug markers.

## Iteration 7 — the bugs behind those findings

**Changed:**

- **The balloon mutation was being gated away.** Its kernel was centred on the
  belly at y=424, and the floor gate that keeps the arms still reaches zero at
  y=436 — so almost the whole swell was multiplied by nearly zero. It is now
  centred at y=286 on the part of the body above the serving hatch, with its own
  falloff reaching zero at the counter instead of being multiplied by the gate.
  Two falloffs multiplied together also made a gradient steep enough to pinch
  the arms where they rest on the sill; that is gone too.
- **The eyes could not travel far enough to read.** Pupil offset was ±10 px
  inside a 52 px eye. Now ±14, and `trackFar` is authored as a different shape
  from idle rather than a slightly wider one.
- **Irritation got its own colour.** `rageFlush` is a separate channel drawn as
  a dark blood-red with veining; orange now means pepper and nothing else.
- **A deflection is a startle, not a disappointment.** A `bounce` event wears a
  new `startle` expression — narrow O of a mouth, head snapped back, eyes wide —
  where a floor miss still wears the flat `sideEye`.
- **Openness and curvature were fighting.** The frown offsets were folded into
  the two lip apexes, so a snarl closed its own gap and lost the teeth it was
  supposed to bare. The mouth is now a centre line plus a gap, and the frown
  moves the centre.
- Mouth width moves the corners 62 px rather than 18, which is the difference
  between a shape change and nothing; teeth cannot cross the opposite row; the
  lip roll thins as the mouth closes so it stops drawing a second arc; the score
  pop holds full opacity and fades only at the end (it was spending most of its
  life at 12% alpha, which is what two critics reported as a draw-order bug);
  the swallow bulge is a lit lump rather than a dark ellipse; event particles are
  fewer, softer and shorter-lived; magnetic arcs stay clear of the face.

**Render timing:** 2.115 ms average, 12.3 ms max at 1920x1080.

**Critique average: 4.7 / 10** — the best of the seven.

Strongest: end-starved 7, irritation-3 7, gulp-pepper 7, reduced-irritation-3 7.
Weakest: end-enraged 3 (the wide mouth is drawn over the nose and the left eye),
strip-miss-floor 2 (a miss animates exactly like a catch), reduced-gulp-metal 2,
hungry-mild 3, warn-metal 3, warn-balloon 3, recovery 3, miss-vent 3.

**Blocking defects:** end-enraged draws its mouth over the nose and eye; a miss
is visually identical to a catch; the balloon's inflated silhouette has a hard
edge along the sill; teeth read as flat pasted triangles; the warn states still
look like the idle pose; the projectile is nearly invisible against the dark
half of the frame.

**Decision for iteration 8:** clamp the mouth so it can never rise past the
nose; give a miss its own flight and leave the snack on the counter; make the
projectile emissive; shade the teeth with roots and a contact shadow; push
peckish, warnMetal and deflate far enough apart from idle to read, and sample
recovery at the peak of its sag rather than on the way there.
