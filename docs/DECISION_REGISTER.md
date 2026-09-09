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
| D09 | Standard shift lasts 120 seconds | Scaffold default | Short replay cycle; test after projectile travel and food supply exist |
| D10 | Metal, balloon and pepper initial ingredients | Proposed / harness implemented | Three visibly different consequences; confirm by milestone M1 |
| D11 | Clock/time echo ingredient deferred | Proposed scope limit | Extra determinism and teaching costs; reconsider after M4 only |
| D12 | One active mutation first, at most two later | Proposed | Readability before combination complexity; resolve in M2 |
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
