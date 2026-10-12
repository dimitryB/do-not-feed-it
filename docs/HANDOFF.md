# Current handoff

## FEAST stage 3, October 12, 2026 (branch `feat/feast`, not merged)

Three things from the stage 2 review, fixed and measured:

1. **Pacing.** `lib/game/arcade.ts` (GAME_VERSION 5) — `TUNING` and the
   level thresholds only: levels at 10 / 28 / 70 servings of an ingredient
   (`levelServings`, `levelFor`, `servingsForLevel`), growth 0.014 a feed
   back-loaded, craving gap 120, drain `0.06 + 0.015/size + 0.07/min` at
   temper 0.5–1.5. 200 shifts: naive 74.2 s, moderate 142.7 s (first level
   27 s, ×1.5 at 67 s, ×2.0 at 141 s, first ×3 never before 142 s), good
   163.9 s; all fourteen gates pass. `scripts/loop-bots.mjs` now reports and
   gates the pacing (censored percentiles; `--bots`; a timeline option).
2. **The camera.** `lib/render/scene.ts` pulls the whole arena-space scene
   back about `(600, 530)` once the creature is past ×1.4, in 0.04 steps eased
   over 1.5 s, keeping the brow ≥ 80 px below the top edge (0.80 at ×2.4 with
   balloon ×3); the first step says IT NO LONGER FITS. HUD and captions stay
   in screen space; the pointer aim reads the launcher's on-screen position
   (`app/components/GameCanvas.tsx`); `__dnfi.camera()` is a dev hook.
3. **Props and the face.** Every bouncer and the vent flap are painted to the
   room (dark enamel, amber rim, shadows, cords, sway, a glint on a hit);
   cheek flushes are radial glows; the metal / taut / pallor washes share a
   0.5 cover budget so the late creature stays green.

Decisions D112–D120; the report, both tables, the camera measurements and
the open list are in `docs/qa/feast/STAGE3.md`; captures `docs/qa/loop/
iter-101` and `iter-102` (the old `iter-2` / `iter-3` manifests from the
loop iterations were left as they were). Render 4.65 ms median on the
typical state. Open: the lamp bouncer on the face (P8), a fresh-context
critic pass on `iter-102`, the pot and the cheek glow at 1920.

## FEAST stage 2, October 12, 2026 (branch `feat/feast`, not merged)

The presentation was rebuilt to pillars 6 and 7 of `docs/FEAST_BRIEF.md`:
`lib/render/scene.ts` (HUD, bouncers, captions, particles, flame, fire, frenzy),
`lib/render/creature/*` (the creature is a clipped layer scaled as a whole and
pinned to the rules' mouth; in-painted backdrop; chrome teeth crackle),
`app/page.tsx` and `app/globals.css` (score/time/chips only, legend strip,
hit-stop in the frame scheduler, audio cues), `lib/engine/audio.ts` (new cues,
frenzy duck). Decisions D106–D111 and proposals P7–P9 are in
`docs/DECISION_REGISTER.md`; the report, timings and the critic table are in
`docs/qa/feast/STAGE2.md`; the captures are `docs/qa/loop/iter-1`. Render cost
4.4 ms median on the typical state. Open: a real fresh-context critic pass
(none could be spawned from the session that did this), the late-game face at
the frame's top edge (a rules question), and the belly bar's presence at 960 px.

## FEAST stage 1, October 12, 2026 (branch `feat/feast`, not merged)

The rules were rebuilt to `docs/FEAST_BRIEF.md` in the pure simulation only:
`lib/game/arcade.ts` (GAME_VERSION 4), `scripts/loop-bots.mjs`,
`tests/arcade.test.mjs`, regenerated `tests/fixtures/loop-traces.json`. All eight
brief gates pass at 200 shifts; the table, the decisions (D94–D105) and everything
the presentation stage needs — state fields, event payloads, bouncer geometry —
are in `docs/qa/feast/STAGE1.md`. `lib/render`, `app/` and the audio were not
touched and still type-check against the new state through kept legacy names;
stage 2 (presentation) rebuilds them and recalibrates the rig to the new mouth
rise. The section below describes the earlier state of the project.

Last updated: September 9, 2026.
Project: `/Users/dbur/dev/do-not-feed-it`.
Branch: **`feat/creature-rig`** (cut from `codex/creature-arcade`, not merged).
Status: **Playable local physical arcade game; M1/M2 implemented substantially,
with human playtest and release gates still open.**

## Creature rig work, September 9

The user asked for the creature to become a living character whose state a
spectator can name across the room, on a new branch, with a screenshot harness,
a fresh-context visual critic and an iteration loop, then asked for a second
session of the same. Thirteen iterations ran across two time caps. The rig is
built and every state exists; the read is not there yet. The honest status, the
critic's scores and the recommended next steps are at the top of
`docs/qa/creature/ITERATION_LOG.md` — read that before continuing this work.

Short version: the creature is now a layered rig derived at runtime from
`public/art/kitchen.png` (no new art), driven from `ArcadeState` through
expression blending, springs and authored beats. Twenty-five named states, all
reachable through real play. Render cost 3.3 ms average / 5.4 ms max at
1920x1080 against a 4 ms average budget — the grid was densified to stop the
belly tearing and there is no headroom left. Critic average 4.6 / 10 against the
brief's rubric, best single state 8; the exit criterion was 8 across the board in
two consecutive iterations, and that was not met. Do not describe this as
finished, polished or AAA.

Two things are worth knowing before touching this code, because both were
expensive to find:

- **The warp is a backward map.** `drawWarped` samples the source at
  `destination - field(destination)`. Anything drawn on top of the painting must
  be placed through `localTransform`, which inverts the field; reading the field
  at a part's own painted position puts it tens of pixels away from the feature
  it belongs to wherever the body is actually deforming.
- **The face is a set of expressions, not a pile of channels.** `pose.ts` blends
  *toward* named records, which pulls the channels an expression does not name
  back to rest. Adding a state by raising a few channels will produce something
  that looks like every other state; author a whole expression instead.

Where things are:

- `lib/render/creature/anatomy.ts` — landmarks measured off the painting.
- `lib/render/creature/rig.ts` — parts cut from the painting, the mouth and
  pupils removed and rebuilt from the creature's own skin.
- `lib/render/creature/warp.ts` — the displacement field and the grid draw.
- `lib/render/creature/pose.ts` — game state to performance.
- `lib/render/creature/draw.ts` — mouth, eyes, skin colour, exhale.
- `lib/dev/hook.ts`, `lib/dev/poses.ts` — development-only pose hook, stripped
  from production builds.
- `scripts/creature-shots.mjs` — the review harness. `node
  scripts/creature-shots.mjs --iter N` writes to `docs/qa/creature/iter-N/`.
  The PNGs are gitignored; the log and the manifests are kept.

Known-open defects, in the order worth fixing, are listed in the final report.
The short version: two confusion clusters (`attract-idle`/`off-menu`, and a
four-way cluster of open-mouthed states), three ingredients that read by hue
rather than by material or timing, an irritation ramp that is one pose with the
red turned up, a faint comb smear across the inflated belly, and a hazard flap
that still reads as a drawn overlay.

The harness suppresses the canvas-drawn score pills as well as the DOM HUD
(`__dnfi.hideLabels`). That matters: before it did, the critic was naming states
from their toast text rather than from the creature, and several scores were
inflated as a result.

**Environment note:** the harness, the dev server and the build were run in a
Linux cloud workspace on a clean `npm install`, not through the desktop bridge —
this repo's `node_modules` is a macOS build and its `workerd` binary will not run
in the device shell. `npm run test:contract` was **not** run: Hardhat downloads
the Solidity compiler from a host this session's egress policy blocks. No
Solidity file is touched on this branch.

## Current state — branch `feat/creature-loop`

The feeding loop was rebuilt. `lib/game/arcade.ts` is no longer the clicker
described in `docs/dnfi-loop-redesign.md`: the shift is endless, the creature is
the difficulty curve, food is only accepted through a mouth that opens and closes
on a seeded rhythm, mutations are permanent and stack, cravings are timed
dilemmas, the launch has a charge, and there is one reaction verb. What exists is
described in `docs/GAME_DESIGN.md` under "The loop that now exists"; why each
choice was made is in `docs/DECISION_REGISTER.md` (D36–D53); the evidence is in
`docs/qa/loop/ITERATION_LOG.md`, whose final report is the first thing to read.

**Read the final report before changing anything.** It states what passed, what
did not, and the next step in order. After three blocks: **all five numeric gates
pass and have passed on eleven consecutive iterations**, there is no open
cheap-death finding, and the lit target ring — which five critics running called
the worst thing in the game — now sits on the mouth to within two pixels at every
size. The naive "press Space on cooldown" strategy went from surviving 119.2 s of
a 120 s shift to dying in 28.6 s of an endless one.

The open list is short and the first item is a design decision, not a bug: **the
rules accept food inside an axis-aligned ellipse and the painted mouth is a
rotated wedge**, so the ring is truthful about the rules and still claims some
cheek and misses some gullet. Give the collision the mouth's axis and taper, or
redraw the mouth rounder — the first moves a rule and needs the gates
re-measured. After that: the draw is 13-25 % over its 4 ms budget once the
creature carries two mutations (measure with `scripts/render-budget.mjs`, never
with the capture harness), and the creature still never reacts to anything, which
every critic in three blocks has named as the largest upside left.

Do not merge this branch. Nothing in `contracts/`, `worker/` or `db/` was
touched.

### How to measure a change

- `node --experimental-strip-types scripts/loop-bots.mjs --shifts 200
  --density-shifts 8 --json docs/qa/loop/iter-N-bots.json
  --fixtures tests/fixtures/loop-traces.json`
- `node --experimental-strip-types scripts/loop-shots.mjs --iter N`
- `node --experimental-strip-types scripts/mouth-calibrate.mjs` after **any**
  change to the pose's growth channels or to the warp — otherwise the lit target
  ring stops being the mouth the player can see.
- `npm run typecheck && npm run lint && npm test && npm run build`.
- Then a fresh-context critic that sees only the bot table, the decision-density
  number, the images and the rubric.

**Never edit anything under `lib/` or `app/` while a capture is running.** The
dev server reloads on write and silently corrupts the whole set; it cost one
iteration's captures.

## Current user request

The user asked to implement and heavily polish the selected game on a new branch,
fan out implementation agents, use a separate harsh visual critic, iterate and
keep progress updates coming. This expanded the old scaffold scope to a complete
local practice experience. It did not authorize spending, public publishing,
mainnet transactions, outreach or contest submission.

## What is now implemented

The eight stages of `docs/dnfi-loop-redesign.md`, in `lib/game/arcade.ts`:

1. **Growth.** Every serving makes it bigger; the hunger drain scales with size
   and a permanent, uncapped appetite multiplier. The shift is endless — size is
   a plateau, appetite is the ramp, so a better player scores more rather than
   reaching a ceiling sooner.
2. **Mouth rhythm.** Food is only accepted through a mouth that opens and closes
   on a seeded cycle whose open window shrinks as it grows, with tracking and
   lunging. `projectMouth` predicts it exactly, which is what the bots aim at.
3. **Mutations, permanent and stacking.** Three servings of an ingredient is a
   level, three levels each. Metal is a magnetic mouth that drags the kitchen's
   own cutlery into itself and clogs; balloon inflates and lifts; pepper spits
   servings back. Each pair has one escape rule.
4. **Cravings as dilemmas.** Seeded, with a visible shrinking ring. Satisfied: a
   bonus, it calms, growth pauses — and the pause and the appetite relief both
   compound with the run of cravings met in a row. Ignored: rage and a tantrum.
   Off-menu is eaten anyway and still counts toward that mutation.
5. **A held charge.** Power 9–16 over 40 ticks, drawn on the launcher as a lance
   with a crossbar at the distance the current charge throws. The trajectory
   preview is a first-shift aid and then it is gone.
6. **One reaction verb.** Slam the hatch. It blocks what is coming back at you
   and costs you the launcher for 84 ticks — during which the belly runs a tab
   rather than emptying, so a shift cannot end on a tick you were locked out of.
7. **Autonomous seeded beats.** A sneeze that scatters the bench, a telegraphed
   lunge that bites the extractor vent off the wall and never repairs, drool that
   makes the floor slick and the bank shot better. Each is a physics event and a
   line.
8. **Four endings by size**, plus THE LAST SERVING — once a shift, a serving
   already in the air gets to land before the belly empties the run.

Around that, from the earlier scaffold and the rig branch: an illustrated
game-native title and result screen, a canvas kitchen and a warp-based creature
rig cut from the same painting, pointer and keyboard input with a narrow-screen
aim slider, original procedural music and layered cues with a working mixer,
reduced-motion support, a device-local personal best, and a pure local replay.
Presentation reads `ArcadeState` and decides nothing.

## Main files

- `app/page.tsx`: shell, HUD, input, fixed tick scheduling, audio and dialogs.
- `app/components/GameCanvas.tsx`: high-DPI canvas lifecycle/pointer mapping.
- `lib/render/scene.ts`: original asset projection, mesh deformation and effects.
- `lib/game/arcade.ts`: authoritative local physical rules, preview and replay.
- `tests/arcade.test.mjs`: physical invariants, mutation/hazard/replay tests.
- `lib/engine/audio.ts`: original procedural audio and mixer lifecycle.
- `public/art/`: three generated original assets; `docs/ART_PROVENANCE.md` records
  actual generator, exact briefs and source paths.
- `docs/LOCAL_PLAYTEST.md`: browser/critic feedback and validation evidence.

## Validation and evidence discipline

Full local check passed: TypeScript, ESLint, 23 Node tests, four V0 contract tests,
Solidity compile and production client/server/Workers build. Vinext still reports
an informational inability to classify the root route statically; the build and
local route succeed. Local `/` returns HTTP200. A full UI-driven shift survived
with12,440 points,33/50 catches and7 mutations; immediate restart was verified. Browser interactions and multiple
visual reviews were performed in the in-app browser, with desktop and phone
layouts; details and limits are in LOCAL_PLAYTEST.md.

Do not call this objectively perfect or AAA, cross-browser certified, server
verified, deployed, community-integrated or contest submitted. Strong original
art and automated tests do not establish human enjoyment or production readiness.

## Local startup

```sh
./scripts/dev.sh
```

Uses normal Node or the retained Codex-bundled fallback. `./scripts/check.sh` runs
the complete suite. Native local listeners may require the unsandboxed runtime.
Development URL is `http://localhost:3000/` when started normally.

## Next meaningful work

0. **Bring the draw back inside its 4 ms budget with mutations on.** Do this
   before anything else. `node --experimental-strip-types
   scripts/render-budget.mjs` measures each state on its own; a typical mid-shift
   creature (two mutations at level 2, size 2.0) currently costs 7.34 ms against a
   3.80 ms bare one. Two mutations at level 2 cost about the same as three at
   level 3, so the cost is not the overlays scaling with level — start at the warp
   grid's cell-skip threshold in `lib/render/creature/warp.ts`, which is priced
   per cell drawn. Fold a mutation-loaded state into the capture harness's own
   timing afterwards so the manifest stops reporting a state the game is rarely in.
0b. **Make the creature's state legible on the creature.** Two faults, one theme,
   and every critic across both blocks has landed on it independently: the mouth's
   wind-up arc is drawn in pale lime on a belly that rising irritation flushes to
   pale pink-tan, so the danger cue erases the only timing tell exactly when the
   danger is highest; and the HUD prints a size multiplier of ×1.82 against a
   silhouette a critic measured as 3 % wider than at ×1.28.
1. Observe uncoached players: first catch, first mutation, understanding the vent,
   adapting aim, perceived fairness, restart intent and accessibility needs.
2. Tune the provisional shift and expand creature reactions based on observations,
   not a decorative systems backlog. Keep the coherent art direction.
3. Freeze a versioned physical trace and cross-runtime fixtures before implementing
   M3/M4 server verification and ingredient-specific communal state.
4. Continue the existing release plan; do not switch on the scaffold chain API or
   deploy V0 for these new score rules.

## Still absent

Production ranked replay, tickets bound to settled rules/snapshots, V1 contribution
schema and contract, canonical communal epochs/world snapshots, production wallet
result UI, funded relayer, indexer/reorg operations, hosted deployment, real Hemi
Mainnet verification, public source publication and contest submission.

No old POP identity, private key, contract, database or Site ID is reused.
`.openai/hosting.json` remains local-only and unregistered. See preserved design,
context, decisions, architecture and reuse manifest for original rationale.
