# Creature rig iteration log

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
