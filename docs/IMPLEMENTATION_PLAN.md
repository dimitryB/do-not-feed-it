# Implementation plan

Prepared September 8, 2026. This is the plan for turning the local scaffold into
the selected **Do Not Feed It** entry. It is not a claim that the listed systems
already exist. See [HANDOFF.md](HANDOFF.md) for verified implementation status,
[GAME_DESIGN.md](GAME_DESIGN.md) for intended behavior, and
[DECISION_REGISTER.md](DECISION_REGISTER.md) for open choices.

## Outcome and order of work

Ship a free, original, immediately understandable browser arcade game in which
feeding visibly changes a creature and the physics of play. A verified communal
diet on Hemi changes the next creature players encounter. Make both halves
visible: the moment-to-moment physical joke and the shared consequence afterward.

Build in this dependency order:

1. Prove one physical feeding interaction and one mutation are fun.
2. Complete a short, readable shift with three mechanically distinct ingredients.
3. Freeze simulation rules and a replay format that the server can reproduce.
4. Implement verified result submission and the communal state transition.
5. Refine teaching, creature expression, sound, performance and return visits.
6. Complete real mainnet, hosting and submission checks when authorized.

Do not spend the first week designing a generic engine, full creature genetics,
an economy, or an elaborate wallet dashboard. The useful reusable engine already
exists; the distinctive game does not. A physical prototype is the next task.

## Proposed calendar and checkpoints

Dates are a working schedule, not promises about staffing or completed work.
The announcement's playable deadline is **October 27, 2026, 09:00 ET / 13:00 UTC**.
Recheck the official rules before publication and submission.

| Milestone | Target window | Deliverable / exit gate |
| --- | --- | --- |
| M0 | September 8 | Runnable local scaffold, preserved decisions, reused foundations, green checks |
| M1 | September 9–13 | One complete physical feeding-and-mutation loop, understood without explanation |
| M2 | September 14–20 | Three ingredients, expressive creature, coherent 120-second shift |
| M3 | September 21–27 | Deterministic ranked replay and frozen V1 data/contracts design |
| M4 | September 28–October 4 | Verified shared-world loop working end to end; WIP release when authorized |
| M5 | October 5–11 | Strong opening, sound, creature comedy, visible community consequence |
| M6 | October 12–18 | Compatibility, accessibility, performance, abuse/recovery testing |
| M7 | October 19–25 | Feature freeze, mainnet/release verification, submission package |
| Buffer | October 26 | Recover from release issues; no new game systems |
| Deadline | October 27, 09:00 ET | Fully playable eligible submission, with time margin |
| Judging | October 29 | Stable production version and support readiness |

Office hours announced for September 9/23 and October 7/21 at 15:00 UTC can
resolve unclear rules and get early feedback. This plan creates no appointments,
reminders, messages, submissions or deployment authorization.

If the calendar slips, cut scope in the fallback order below. Preserve the
physical mutation hook and the community consequence; do not retain decorative
systems at their expense.

## M0 — local scaffold and reliable starting point

### Included in this task

- Create the independent project at `/Users/dbur/dev/do-not-feed-it`.
- Preserve the actual conversation decisions, judging corrections, sources and
  provisional assumptions in detailed Markdown.
- Retain compatible POP tooling and generic visual modules, detach imports from
  POP gameplay, retain its MIT notice, and record provenance.
- Adapt audio settings, accessible dialog behavior, score display and D1 helpers.
- Add a small deterministic feeding kernel and honest practice UI.
- Adapt the dual-signature contract pattern to DNFI metrics for local tests.
- Keep application chain routes disabled until their verifier exists.
- Validate types, lint, simulation, D1 behavior, local contracts and build.

### Gate

The project opens independently, local development starts, no POP resources are
configured, and a future implementer can find both the next task and the reasons
for it without reading the original chat. The prototype is explicitly labeled
as a scaffold. Detailed M0 results belong in HANDOFF.md.

## M1 — first physical loop

### Task 1: isolate the current harness from the final scene

- Keep the current deterministic simulation as a reference while introducing
  `lib/game/types.ts`, `lib/game/input.ts` and `lib/game/physics.ts` only as needed.
- Create a thin `lib/render/scene.ts` that consumes game state and draw-time
  events. Keep browser objects outside simulation files.
- Mount a canvas through a small client component such as
  `app/components/GameCanvas.tsx`; leave menus, score and dialogs in React.
- Use one logical arena coordinate system. Recalculate viewport transforms on
  resize and map pointer coordinates back into the arena correctly.
- Integrate only the reusable core helpers needed now. Do not initialize every
  texture or post-processing pass just because it was copied.

### Task 2: food as a physical object

- Begin with a launcher, one ingredient, a mouth target, floor and two walls.
- Pick pointer interaction by testing a minimal alternative: hold/drag to aim
  and release to launch, versus aim plus explicit launch button. Record choice.
- Add keyboard selection/aim/fire equivalents and usable touch targets.
- Store launches as tick-indexed, quantized intent; never as browser pixel
  coordinates. Choose and document aim angle/power limits before replay work.
- Add bounded projectile speed, gravity, collision geometry, lifetime and
  maximum active food count. Resolve collision order deterministically.
- Make mouth acceptance and a miss immediately visible. Do not let one object
  score twice or survive forever behind scenery.

### Task 3: metal produces magnetic teeth

- After a clear threshold of metal servings, warn briefly, transform the mouth,
  and attract applicable incoming food in a bounded region.
- Show a tooth silhouette change, visible attraction trail and a distinctive
  sound. Caption the rule in plain language without pausing the action.
- Demonstrate that a previously valid shot now behaves differently. Ensure the
  player can adapt and exploit the change; randomness alone is not the hook.
- End the mutation with a readable release, and clear its force contributions.
- Implement cheap debug toggles to force the mutation and visualize collision
  shapes. Keep them out of ranked production and ordinary player menus.

### Task 4: first-play observation

Ask a few willing testers to start from the title screen with no live coaching.
Observe whether they feed the creature, notice the changed physical rule, and
adjust a subsequent shot. Aim for the first consequential change in roughly
20–40 seconds and a understandable whole premise within 90 seconds. These are
product targets inferred from judging, not official scoring rules.

Record what happened, not just whether testers said it was fun: first launch,
first successful feed, first mutation, first adaptation, restart intention and
places where they looked away from the playfield. A small local notes template
is sufficient; do not build analytics infrastructure first.

### Gate / fallback

Proceed when the mutation creates both a readable joke and a playable change.
If feeding still feels like selecting the requested answer, improve trajectory,
mouth motion and mutation interaction before adding food types. If aiming is
too hard on mobile, simplify aim assistance and geometry, then retest. Preserve
the concept; do not restart the game-concept shortlist.

## M2 — complete the local game

### Task 1: ingredient vocabulary and mutation interactions

- Add balloon buoyancy: food or body motion changes visibly upward, within
  bounds that keep the mouth reachable.
- Add pepper pressure: a telegraphed burp pushes projectiles, creating a timing
  opportunity. Do not use an unavoidable random blast as a difficulty spike.
- Keep clocks/time echoes out of this milestone.
- Initially allow one active mutation. Add a second only if the first three are
  individually legible and all three pairings are coherent.
- Specify stacking, refresh/replace rules, expiry, force caps and interactions
  with the communal inherited trait. Record these in GAME_DESIGN and fixtures.
- Replace scaffold cravings/servings rules where physical play warrants it;
  update score bounds and tests instead of preserving accidental V0 tuning.

### Task 2: a complete shift

- Author a gentle opening, rising middle and short climax across the provisional
  120 seconds. Escalation should combine learned rules before adding novelty.
- Define food availability and replenishment. Unlimited perfect instant feeds
  are acceptable only in the debug harness, not as the whole final challenge.
- Tune fullness, rage, score/combo and fail states with actual flight time.
- Ensure the player sees the cause of loss and has a one-action restart.
- Make survival a satisfying ending with a brief creature reaction and a result
  panel; never replace the immediate outcome with a wallet prompt.
- Decide which meaningful run metrics should affect the communal diet: correct
  feed counts, accepted ingredient counts, or capped qualified contributions.
  Document the choice and incentive implications before signing any V1 schema.

### Task 3: creature and presentation

- Choose the smallest expressive rendering approach that can stretch, chew,
  recoil, glance and visibly transform. A 2D rig is the working default; a 3D
  asset is not a requirement. Avoid large art pipelines before this decision.
- Give the creature recognizable idle, anticipation, acceptance, refusal,
  mutation and ending poses. Use procedural motion where it saves bespoke art.
- Integrate selected particle/camera/audio feedback with event deduplication.
- Retune POP-derived orange/brass/flash defaults to the new kitchen palette.
- Create original, licensed final assets; maintain an asset-source ledger.
- Keep teaching text and useful status readable at stream and phone sizes.

### Gate

A guest can play a full shift with mouse, keyboard or touch. Each ingredient
changes physical behavior, not just color or numbers. The creature is expressive,
the mutation combination cap is settled, and the game is worth repeating without
an onchain reward. No production chain dependency should block local practice.

## M3 — replay and production data design

### Task 1: lock deterministic simulation boundaries

- Resolve integer/fixed-point versus tightly constrained floating-point physics
  with cross-runtime fixtures. Choose using evidence from browser and Workers
  replay, not the visual engine's convenience.
- Freeze input ordering, quantization, tick rate, collision order, PRNG algorithm
  and terminal-state behavior for a version. Remove all wall-clock/random/browser
  calls from the authoritative kernel.
- Generate a game version from documented rules/build identity. Retain the
  precise simulation bundle for replayable submitted versions.
- Replay fixtures must cover each mutation, all supported pairs, projectile
  boundaries, same-tick events, starvation/rage, survival and near-end launches.
- Record semantic outcomes plus a compact deterministic state digest. Do not
  make visual animation or sound timing part of score validation.

### Task 2: define trace and server-issued ticket

- Add a canonical versioned trace encoder/decoder with bounded integer fields,
  a maximum command count and a maximum byte length.
- Decide ranked pause behavior and elapsed-time validation. Current practice
  pauses on hidden tabs/dialogs; this must not become an unexamined ranked rule.
- Bind tickets to run ID, version, seed, immutable snapshot hash, epoch,
  expiry and a session/player association policy. Decide when a wallet is needed
  for a ranked attempt while retaining immediate guest practice.
- Extend the copied D1 schema; its existing seed/expiry ticket alone does not
  bind all of these. Add migration and idempotent expiry/error handling.
- Reject malformed/oversized traces before expensive replay. Budget replay CPU,
  storage and concurrent requests against actual deployed platform constraints.

### Task 3: verify rather than accept claimed scores

- Implement a Workers verifier that replays canonical inputs against the exact
  ticket seed and snapshot. Derive every signed gameplay metric server-side.
- Bind the player to the finalized result and retain same-payload retry behavior.
- Keep conflicting-payload retries rejected and preserve the first attestation
  atomically when parallel requests arrive.
- Return actionable errors for expired tickets, unsupported versions, stale
  snapshots, invalid trace and unavailable verification. Preserve local results
  and allow practice to continue.
- Keep signing secrets on the server. Do not provide a fallback that signs
  browser-provided numbers when replay is unavailable.

### Task 4: resolve the community protocol before contract V1

- Specify epoch time basis, activation/finalization, late submissions and the
  snapshot used by a run crossing an epoch boundary.
- Specify diet aggregation, per-player caps, tie-breaks, empty epochs and trait
  mapping. The same accepted events must always derive the same next monster.
- Decide which facts must be contract-enforced versus verifier-attested, and
  make that trust boundary explicit in UI/repository documentation.
- Decide event fields, versioned rankings, owner powers, emergency pause,
  verifier rotation, correction/migration policy and canonical snapshot format.
- Include ingredient-specific verified counts in the V1 signed data if diet
  aggregation needs them. V0 has aggregate feeds only and cannot supply them.
- Review replay attack domains: chain, contract, game version, run, snapshot,
  player, expiry and one-time consumption.

### Gate

Browser and server produce identical outcomes for the fixture corpus; tampering
and malformed traces fail closed; the community rules can be explained with
worked examples. Freeze V1 types only now. Do not deploy the scaffold contract
as if it already implements the community game.

## M4 — end-to-end shared creature

### Task 1: contract and chain client

- Replace V0's provisional result bounds and ABI with the settled V1 design.
- Add or split a world-state contract only where it materially clarifies rules;
  avoid a generic upgradeable ecosystem for this contest.
- Test player/verifier signatures, invalid domains, mutation data, contribution
  caps, duplicate/late runs, epoch ties/empty periods, owner operations and every
  numeric boundary relevant to production scoring.
- Implement client network checking, typed signing, submission status, explorer
  links and retry recovery against known deployment/version configuration.
- If sponsorship is selected, implement a separate bounded relayer policy with
  deduplication, funding limits and direct-submit fallback. Contract support for
  relayers alone does not pay gas or operate a backend.

### Task 2: snapshot and indexer

- Add snapshots identified by chain + contract + game version + epoch/hash.
- Treat D1 as a cache of accepted chain history. Use bounded event batches,
  deterministic reduction and a documented reorg/finality policy.
- Fix the inherited address-only snapshot cache key before multiple chains,
  versions or epochs are supported.
- Freeze one snapshot per run. A new community trait should appear on the next
  eligible run with a clear explanation, never silently change live physics.
- Test quiet epochs and outages. Show snapshot age and cached/offline state
  honestly; use a clearly marked practice fallback if canonical state is absent.

### Task 3: community UX

- Title screen: show the creature, one inherited trait and why it has that trait.
- During play: make inherited behavior physically recognizable.
- Result screen: show the verified contribution and the epoch it can affect.
- History: present recent forms and their diet causes without exposing a block
  explorer's implementation details as the main game interface.
- Leaderboard: compare compatible version/snapshot conditions. Never mix scores
  across materially different physics and imply a fair ranking.

### Gate / release condition

Two independent clients can complete valid runs and observe the same derived
future creature. A copied or tampered submission cannot add another contribution.
Wallet rejection, RPC outage and unavailable gas leave a usable guest game.
When the user authorizes a WIP release, use a fresh hosting identity/resources,
verify deployment from a clean visitor session, and share the correct URL.

## M5 — make the first session memorable

- Replace scaffold copy with one clear instruction and visual teaching inside
  play. Keep documentation available outside the critical start path.
- Make the first transformation a reliable performance: warning, pause/pose,
  physical change, sound, reaction and an opportunity to exploit it.
- Add original short music/ambience layers only after the effects are intelligible.
  Keep mixer persistence and an obvious mute control. Remove or disable any
  audio channel with no actual sound rather than pretending it works.
- Give each ending a concise character reaction and a quick restart.
- Make the community outcome understandable to a spectator without wallet or
  chain expertise. Keep chain confirmation asynchronous to gameplay.
- Test unaided opening and replay intent again. Prioritize observed confusion
  over extra effects. Retain humor that works without knowing Hemi personalities.

## M6 — reliability and accessibility

- Exercise desktop Chromium/Safari/Firefox and representative mobile/touch
  devices when browser QA is requested or included in that task's scope.
- Verify resize/orientation, high-DPI scaling, pointer cancellation, keyboard
  focus, dialog focus restoration and page scroll behavior.
- Honor reduced motion and limit flashes/camera shake. Never communicate the
  desired ingredient, mutation or failure through color or sound alone.
- Measure gameplay frame time, startup cost, memory growth, texture work and
  server replay cost. Set measured budgets rather than optimistic guarantees.
- Provide a lower-effects path; it must not change authoritative physics.
- Soak repeated restarts, audio toggles and mutations for leaked voices,
  listeners, canvases or retained texture/particle objects.
- Exercise ticket race/retry, expired attestation, duplicate receipt, dropped
  connection, stale config, verifier rotation and indexer restart.
- Review dependencies and production keys/configuration for the actual release.
  Keep financial credentials and provider secrets outside source control.

## M7 — freeze and submission

- Recheck contest facts, submission channel and deadline in the official source.
- Freeze core rules/version and preserve the verifier for already issued tickets.
- Verify a real successful **Hemi Mainnet** result from the actual public build,
  with correct contract/network/explorer information. A local contract test or
  testnet receipt does not satisfy this gate.
- Verify the community effect through the production path, not a fake UI count.
- Make the authorized repository public with MIT/ISC license, setup instructions,
  dependency/source credits, deployed contract info and an accurate trust model.
- Prepare submission text, category rationale, controls, team/entry information,
  live URL, source URL and a short demonstration. Do not invent metrics or odds.
- Verify free access, no purchases/paywalls and no mandatory token holdings.
- Check production from a fresh visitor context, collect the final receipt and
  record release commit, configuration/version and rollback instructions.
- Submit through the confirmed channel when explicitly authorized; preserve
  evidence of the submission. Keep October 26 available for fixes.

## Scope priorities and fallback order

| Priority | Keep / build | Reason |
| --- | --- | --- |
| P0 | Physical feeding, visible rule-changing mutations, expressive creature, guest start, fast retry | The actual selected game |
| P0 | Small replayable ruleset, valid mainnet integration, public licensed source at submission | Credible shared mechanic and eligibility |
| P0 | Readable controls and status, touch support, reduced effects, recovery paths | Judges must be able to play |
| P1 | Two simultaneous mutations, community history, richer soundtrack, score-sharing card | Valuable after the main loop is proven |
| Stretch | Clocks/time echoes, extra ingredients, cosmetic unlocks, advanced procedural anatomy | High cost; remove first if schedule slips |
| Excluded | Payments, gambling, NFT economy, real-time multiplayer dependency, POP re-skin | Not part of the selected scoped experience |

If time tightens: cut stretch features, reduce active mutation combinations,
reduce environments/creature variations, shorten cosmetic history and reduce
music layers. Keep three distinctive effects if feasible; if reducing to two,
record why the remaining pair still delivers sufficient variety. Any change
that removes the communal consequence or changes the selected game's premise
should be discussed with the user as a material scope change.

## Working rhythm and token economy

For each milestone, read this milestone plus the relevant architecture section,
not every source file. Inspect named APIs in REUSE_GUIDE before large modules.
Implement one complete interaction across input → simulation → presentation →
test, then evaluate it. Do not generate the entire backlog in one pass.

Keep a short completion note in HANDOFF with changed behavior, validation,
remaining limits and the next concrete task. Update design/version decisions
when evidence changes them. Preserve meaningful fixtures; avoid tests that only
repeat JSX text or implementation line order. Once relevant checks pass, move
on unless new changes or failures justify broader testing.

Do not estimate token savings as a measured percentage. Reusing documented,
tested foundations should reduce rediscovery and integration work, but the new
physics, art, replay verifier and community protocol still require original work.
