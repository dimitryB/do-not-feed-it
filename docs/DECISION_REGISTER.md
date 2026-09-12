# Decision register

Update this file when playtests or implementation change a choice. “Proposed”
means a practical default for progress, not mandatory user approval before every
implementation step. Escalate material product/scope changes to the user using
the current task's communication tools and instructions.

| ID | Choice | State | Rationale / resolution point |
| --- | --- | --- | --- |
| D01 | Do Not Feed It is the selected new game | User-confirmed | Latest request; do not switch to BELOW or a POP sequel |
| D02 | Separate project at `~/dev/do-not-feed-it` | User-confirmed | Preserve POP and other projects |
| D03 | Reuse selected POP infrastructure | User-confirmed | Reduce token use and reimplementation |
| D04 | New game mechanics, content and identity | Required by scope/rules | Original contest entry with credited components |
| D05 | Local scaffold and detailed docs in this task | User-confirmed | No production publication or funding requested |
| D06 | React/Vinext/Vite + Workers/D1 + Solidity/viem | Adopted scaffold choice | Existing POP stack and lockfile save setup; reassess only for a concrete need |
| D07 | npm lockfile retained | Adopted | No gratuitous package-manager migration |
| D08 | Two-dimensional physical playfield | Proposed | Scope and control clarity; confirm in first physical prototype |
| D09 | Standard shift lasts 120 seconds | **Superseded by D36** | The fixed round was the reason there was no ramp and no failure; see D36 |
| D10 | Metal, balloon and pepper initial ingredients | Proposed / harness implemented | Three visibly different consequences; confirm by milestone M1 |
| D11 | Clock/time echo ingredient deferred | Proposed scope limit | Extra determinism and teaching costs; reconsider after M4 only |
| D12 | One active mutation first, at most two later | **Superseded by D44** | Mutations that expire and never stack are the reason feeding has no consequence |
| D13 | Aim + launch final controls; selection buttons only in harness | Proposed / scaffold limitation | Avoid shipping a matching quiz; settle pointer semantics in M1 |
| D14 | Guest practice before wallet | Adopted product requirement | Strong judging evidence and low friction |
| D15 | End-of-run player signature, optional sponsored submission | Proposed | Contract supports relayers; budget/abuse policy must precede sponsorship |
| D16 | Separate verifier and transaction-sending responsibilities | Proposed architecture | Verifier signs correctness; gas sender cannot alter signed outcome |
| D17 | Full server replay of ranked inputs | Proposed production requirement | POP's plausibility-only approach does not establish correctness |
| D18 | Contract V0 trusts a verifier | Implemented foundation, not production-ready | Signatures and numeric bounds; no gameplay resimulation or world validation |
| D19 | Snapshot fixed for each run | Adopted architecture principle | Prevent mid-run shared-state disruption and incomparable replay |
| D20 | Daily UTC community epochs | Proposed | Understandable revisit schedule; test empty/quiet epochs; settle before contract V1 |
| D21 | Per-player contribution caps / weighting | Open | Must avoid raw spam domination; one wallet is not one human |
| D22 | Highest diet determines one inherited trait with secondary bounded modifier | Proposed | Visible outcome and limited complexity; settle after pairwise playtests |
| D23 | Ties and empty epochs use deterministic neutral rules | Proposed | No arbitrary backend choice; specify before V1 |
| D24 | Community history and competitive boards versioned by snapshot | Proposed | Compare like conditions; no misleading all-time score ordering |
| D25 | Full creature renderer / sprite vs small 3D asset | Open | Choose smallest expressive approach after one mutation proves fun |
| D26 | Industrial kitchen, playful creature comedy | Proposed art direction | Distinct from POP; supports visible mechanical consequences |
| D27 | Original music and ambience | Planned | Mixer exists, soundtrack does not; make stream readability a criterion |
| D28 | No real-person likeness or voice required | Adopted scope choice | Affectionate Hemi flavor can be text/props without impersonation |
| D29 | 24-hour POP submission cooldown not inherited | Implemented V0 choice | Multiple practice attempts should remain useful; production limits are separate |
| D30 | Fixed 60 simulation ticks per second | Scaffold default | Predictable input timestamps; production physics/replay portability still to prove |
| D31 | Guest pause allowed while hidden / mixer open | Implemented harness policy | Ranked pause/timing policy remains open; close before M3 |
| D32 | New production resources and deployment identity | Required | Never repurpose POP's Site, contract or database |
| D33 | MIT license and provenance record | Adopted | Compatible with contest; original copied-code notice retained |
| D34 | Public source/release at submission time | Contest requirement, future action | User must authorize actual external publication through task scope |
| D35 | Discord submission channel | Unresolved external detail | Announcement conflicts between `#game-contest-2` and `#game-contest` |

## The feeding-loop redesign (branch `feat/creature-loop`)

Opened by `docs/dnfi-loop-redesign.md`. Every decision here was taken against
the bot harness and the gameplay critic, and the evidence for each is in
`docs/qa/loop/ITERATION_LOG.md`.

| ID | Choice | State | Rationale / resolution point |
| --- | --- | --- | --- |
| D36 | The shift is endless; the creature always wins | Implemented (iteration 1) | Score is time kept fed, plus feeds, plus style. A fixed 120-second round cannot have a ramp, and the bot table showed every skill level stopping at the clock rather than at a failure. The 12-minute `ARENA.maxTicks` is a replay bound, not a round |
| D37 | The creature's size is the difficulty curve | Implemented (iteration 1) | Every accepted serving grows it: bigger mouth, shorter open window, faster appetite. Growth is front-loaded so the first servings visibly change it |
| D38 | Growth asymptotes at ×2.4 and does not end the shift | Implemented (iteration 1) | Ending the run when the creature reached full size was tried first and **inverted the skill ordering** — the better the player, the sooner they hit the cap and the shorter their run. Size is the curve; what ends a shift is failing to keep up with it |
| D39 | Food is only accepted while the mouth is at least 45 % open | Implemented (iteration 2) | The open window is the timing skill. A shut mouth physically rejects the shot — a "snub" that bounces off the face and can still be banked back in — rather than silently swallowing it |
| D40 | Feeding a creature that is not hungry is the bad decision | Implemented (iteration 1) | Above 82 fullness a serving returns 15 % of its nourishment and grows the creature three times as fast. This is the title as a rule, and it is what separates a player who rations from one who fires on cooldown: it is the single change that moved the naive bot from 119 s to under 60 s |
| D41 | Irritation cools at ~0.6/s | Implemented (iteration 1) | Without it the meter is a ratchet and every run ends the same way; with it the meter reads as how you are playing now |
| D42 | One seeded "temperament" per shift | Implemented (iteration 2) | Sets how generous the mouth is for the whole shift, so a seed has a character worth talking about and two equally good shifts last different lengths |
| D43 | The warp's ×1.14 scale ceiling is kept | Implemented (iteration 1) | The rig cannot magnify the painting further without dissolving its skin detail. Growth therefore reads through the procedurally drawn mouth (which has no such limit), plus rise and lean, which are translations and cost nothing |
| D44 | Mutations become permanent, stacking creature changes | Planned (stage 3) | Replaces D12 |
| D45 | The reaction verb is "slam the hatch" | Planned (stage 6) | One verb, two uses — it cancels a lunge and blocks a spit — rather than two verbs that each do one thing |

## Decisions that must close before contract V1

Score and metric schema, game-version rules, exact input encoding, maximum trace
size, snapshot identity, timing and pause policy, epoch boundaries, late results,
ties, contribution caps, outcome derivation, owner powers, correction policy,
indexer finality/reorg handling, and gas-sponsorship fallback.

Do not deploy the V0 contract and assume missing shared-world behavior can be
added without changing its schema. No upgrade mechanism has been promised.

## Decisions that can stay flexible longer

Creature name, cosmetic details, final music, nonessential flavor copy and extra
sound variations. Asset provenance and accessibility requirements still apply.

## How to record a change

For a meaningful change record: date, previous choice, new choice, why, playtest
or technical evidence, affected files, and whether existing replay fixtures or
recorded scores remain compatible. Prefer short appended decision notes over
silently rewriting assumptions that earlier test results depended on.

## September 9: local physical arcade implementation

- **D25/D26:** Implemented a layered illustrated scene with localized canvas mesh
  deformation, original generated kitchen/creature and food/launcher sprites.
  Tactile dark teal machinery, amber light and lime interface accents. This is
  a local presentation choice; a richer authored rig remains possible.
- **Controls:** Drag to aim, explicit Launch to fire; keyboard equivalents and
  a phone angle slider. No release-to-fire ambiguity. Pointer food selection
  returns focus to the canvas; keyboard button focus retains native semantics.
- **Rules:** New `arcade.ts` is separate from legacy `simulation.ts`. All accepted
  food fills the belly; cravings give a larger score bonus. One mutation max,
  90-tick warning, 480 active ticks; thresholds during an existing mutation do
  not stack or replace it. Third accepted serving of an ingredient is the trigger.
- **Difficulty:** 15-second initial hunger grace, two-minute shift, vent warning
  at38 seconds and solid moving flap at40. One hazard deflection per projectile.
  A scripted balance check justified larger craving bonus and timed obstruction.
- **D27:** Original procedural music/ambience and layered effects implemented;
  all mixer buses now have real behavior. No externally recorded soundtrack.
- **D30/D31:** 60Hz quantized local physics; practice pauses for dialogs, blur and
  hidden tabs. Production timing, cross-runtime reproducibility and versioned
  ranked cohorts are still unresolved. Device-local best uses an arcade-specific
  key and is never a global leaderboard.
- **Authorization:** User requested new branch, full local game development and
  parallel agents/visual review. No production account/resource or publication
  was requested; chain config remains disabled. New scores are incompatible with
  V0 registry bounds and must never be sent to that registry.

## September 9: D25 closed — creature presentation approach

**D25 was open: "Full creature renderer / sprite vs small 3D asset — choose the
smallest expressive approach after one mutation proves fun."**

**Decision: a layered rig derived at runtime from the existing painting.**
Branch `feat/creature-rig`. Not merged.

- Previous choice: one AI-generated painting with a localised canvas mesh
  wobble. The project's own critic had flagged "limited authored creature
  expressions", and on a three-minute judged stream a single picture wobbling
  reads as static.
- New choice: `lib/render/creature/` — landmarks measured off `kitchen.png`
  (`anatomy.ts`), parts cut and gaps rebuilt from the creature's own skin at
  runtime (`rig.ts`), a smooth displacement field over the picture
  (`warp.ts`), game state to performance with springs and authored beats
  (`pose.ts`), and the authored mouth, eyes and skin colour (`draw.ts`).
- Why not regenerate the creature: the painting is the art direction. Deriving
  the rig from it keeps lighting, palette and style guaranteed-consistent, adds
  no new asset to license or record, and is reversible.
- Why not a 3D asset: it would replace the art direction rather than extend it,
  and the render budget (4 ms average) does not need it — the rig measures
  3.3 ms average / 5.4 ms max at 1920x1080. That figure roughly doubled over the
  run as the warp grid was densified from 30x23 to 38x30 cells to stop the
  inflated belly tearing, so there is no headroom left for another density
  increase; the remaining smear has to be fixed by moving less paint.
- Why not cut the creature out of the background: a cut-out has a silhouette
  edge, and a silhouette edge tears when the body deforms. Warping the whole
  picture with a field that decays to nothing before the counter has no edge to
  tear.
- Evidence: thirteen iterations, each captured by `scripts/creature-shots.mjs`
  and scored by a fresh-context critic that sees only stream-resolution images
  and the frame strips. Averages 4.2, 3.7, 4.4, 4.4, 4.5, then 3.8, 3.6, 4.2,
  4.2, 4.6 out of 10 against the brief's rubric. The averages are noisier than
  they look — each pass is judged by a different critic and the later ones were
  markedly more rigorous — so the per-iteration fault lists are better evidence
  than the numbers. Full tables, timings and the final report are in
  `docs/qa/creature/ITERATION_LOG.md`.
- Affected files: `lib/render/scene.ts`, `lib/render/creature/*`, `lib/dev/*`,
  `app/components/GameCanvas.tsx`, `app/page.tsx`, `scripts/creature-shots.mjs`.
- Replay compatibility: unaffected. `ArcadeEvent` gained two optional
  presentation tags (`ingredient`, `craved`) that the rules, scoring, replay and
  trace never read; existing recorded traces replay identically.

**Status: adopted for local presentation, incomplete against the brief.** The
creature is not yet at "a spectator across the room can name the state", and the
final report says so with the specific states and the work left.

### Proposals recorded rather than implemented (no gameplay was changed)

These would help expressiveness but are gameplay changes, so they are written
down instead of done:

- **P1 — Give the balloon mutation a visible body part.** The belly is behind
  the serving hatch, so "balloon belly" has nowhere on screen to happen. A
  throat sac above the hatch line, inflating with the same rule, would make the
  strongest mutation cue visible. This changes nothing mechanical, but it does
  change what the mutation *is* in the fiction, so it belongs to design.
- **P2 — Let a miss leave something on the counter.** The clearest failure read
  would be a snack visibly landing and staying for a second or two. Debris is
  presentation, but "the snack persists" is close enough to a rule that it
  should be a design call.
- **P3 — A short beat between catch and mutation trigger.** The third serving
  currently starts a 90-tick warning immediately. Half a second of the creature
  reacting to the serving before the warning begins would let the two beats read
  separately rather than overlapping.
- **P4 — Separate irritation thresholds from the meter.** The three authored
  irritation steps sit at rage 25/55/85, which the meter crosses at whatever
  pace misses happen. Explicit rule-level steps would let the presentation and
  the mechanic agree.
- **P5 — Push the camera in during play.** Every critic across thirteen
  iterations independently observed that the creature's head occupies a small
  part of a wide frame and that its body never changes position between states.
  A gentle push-in while a shift is running, and a wider body travel between
  states, would do more for nameability at stream resolution than any further
  work on the face. It is a presentation change and therefore in scope, but it
  moves the relationship between screen space and aim, so it should be a
  deliberate design call rather than something a renderer branch does quietly.
- **P6 — Give metal a material, not a colour.** The mutation reads as "bigger
  teeth" rather than "magnetic teeth" because the fangs stay ivory. A grey
  specular treatment plus filings visibly pulled toward the jaw would fix it,
  but the filings are new scene objects and their behaviour borders on a rule.
