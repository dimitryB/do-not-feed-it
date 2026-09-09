# Acceptance checklist

This checklist describes the release gates, not just compilation. Checked M0
items describe this scaffold only. Selected local arcade items were checked September 9, 2026; see
LOCAL_PLAYTEST.md for their scope and limitations. Unchecked items remain open. Record release commit, environment,
date and result alongside final verification.

## M0: local foundation

- [x] Separate local project with a new name and no POP deployment identity.
- [x] Context includes the selected concept, user requests, contest requirements,
  judging evidence, historical POP correction and provisional choices.
- [x] POP reuse is documented with retained original license notice.
- [x] Runnable guest practice harness and deterministic local replay kernel.
- [x] Large reusable presentation modules no longer depend on POP gameplay.
- [x] Audio controls use a new persistence key and disclose absent channels.
- [x] Chain API is closed; no browser score can be attested by the scaffold.
- [x] Types and lint pass; simulation, D1 and local contract tests pass.
- [x] Production application build succeeds.
- [ ] Full creature, physical feeding and production communal gameplay exist.

## Opening and core game

- [x] A new visitor can start without wallet setup or a long instruction screen.
- [ ] Controls are obvious on desktop and touch; keyboard-only play is viable.
- [x] First successful feed feels responsive and has visual/audio confirmation.
- [ ] First mutation occurs early enough to demonstrate the premise.
- [ ] A spectator can identify what changed and why without reading a manual.
- [x] Food follows physical trajectories; the game is not only a craving quiz.
- [x] Metal, balloon and pepper produce distinct physical consequences.
- [ ] Supported mutation pairs are readable and bounded; expiry clears effects.
- [ ] Creature pose/silhouette makes each major state understandable.
- [ ] Wrong food, misses, rage, starvation and survival have coherent feedback.
- [ ] A complete shift has a beginning, escalation and satisfying ending.
- [x] Loss explains its cause and restarting takes one obvious action.
- [ ] The local game is enjoyable without recording a result onchain.

## Replay and server verification

- [x] Authoritative rules never call DOM, audio, network, wall time or unseeded RNG.
- [ ] Input encoding, quantization, PRNG, tick/collision order and version are fixed.
- [ ] Cross-runtime replay fixtures agree on exact meaningful outcomes.
- [ ] All single and supported combined mutations have deterministic fixtures.
- [x] Input/trace size and replay CPU limits reject excessive work early.
- [ ] Server tickets bind the settled player/session policy, version, seed,
  snapshot, epoch and expiry.
- [ ] Score and diet metrics come from server replay, never browser assertions.
- [ ] Same-payload retry returns the same winning attestation atomically.
- [ ] Conflicting replay, expired ticket and unsupported version fail closed.
- [ ] Ranked focus/pause and real-time policy is explicit and tested.
- [ ] Verifier trust and bot/Sybil limits are documented accurately.

## Contract and communal game

- [ ] V1 signed fields include the metrics needed for actual diet aggregation.
- [ ] Wrong player/verifier, chain, contract, version and expired signatures fail.
- [ ] Duplicate run IDs and replayed transactions cannot add contributions.
- [ ] Numeric bounds match the final playable rules and edge cases.
- [ ] Snapshot identity and contribution attribution are enforced as designed.
- [ ] Epoch boundary, late result, tie and empty-period outcomes are deterministic.
- [ ] Caps/weighting are explicit and do not claim one wallet equals one human.
- [ ] Two clients observe the same canonical future creature.
- [ ] Each run keeps its starting snapshot despite later community changes.
- [ ] A player can see how their recorded diet affects an upcoming form.
- [ ] Version/snapshot rankings compare compatible conditions.
- [ ] Indexer restart, bounded catch-up, stale writes and reorg recovery work.
- [ ] Owner powers, verifier rotation, pause and migration policies are clear.
- [ ] Production gas sponsorship, if used, has funding caps and failure behavior.
- [ ] Wallet rejection or RPC failure leaves guest play available.
- [ ] A real production result is confirmed on Hemi Mainnet from the public build.

## Presentation, access and performance

- [x] Original creature/art/sound assets have recorded license/provenance.
- [x] No borrowed POP game identity or unapproved likeness/voice is required.
- [x] Mixer mute/levels persist; every exposed final channel has actual behavior.
- [ ] Text and interaction targets remain readable on phone and stream layouts.
- [x] Ingredient/status information is available beyond color and audio alone.
- [x] Reduced motion/flash settings meaningfully reduce effects.
- [x] Dialog focus containment/restoration and keyboard navigation work.
- [ ] Resize, touch cancellation, orientation and high-DPI transforms work.
- [ ] Representative target browsers/devices have been exercised and recorded.
- [ ] Startup, frame time, memory, replay cost and restart behavior are measured.
- [ ] Lower-effects rendering preserves authoritative gameplay.
- [ ] No persistent audio voices/listeners/objects leak across repeated shifts.

## Publication and contest submission

- [ ] Official current deadline, entry/team rules and submission channel rechecked.
- [ ] New hosting identity/resources, production secrets and migrations configured.
- [ ] Public build loads from a fresh visitor context and completes a run.
- [ ] Free play: no entry fee, purchases, token gate or paywall; gas only if needed.
- [ ] Hemi Mainnet contract address, explorer link and version are accurate.
- [ ] Production contract source is verified and its trust model documented.
- [ ] Authorized public GitHub/GitLab repository has MIT/ISC license and credits.
- [ ] Setup/build instructions and environment examples work without secrets.
- [ ] User-provided raw judging documents are excluded from public source.
- [ ] Submission contains correct live/source URLs, controls and required team data.
- [ ] Submission and any outreach have explicit authorization in the active task.
- [ ] Accepted submission evidence, release commit and rollback notes are retained.
- [ ] Deadline buffer remains; feature freeze held through judging stability.

## Evidence discipline

Compilation demonstrates compilation. Local EIP-712 tests demonstrate the tested
contract behavior. Neither demonstrates game fun, browser compatibility, full
replay integrity or a successful mainnet deployment. Keep those gates separate
and attach the appropriate evidence when marking them complete.

September 9 note: local replay bounds apply to the new arcade kernel only.
No server-verification or full milestone completion is implied by those checks.

Final local browser evidence: a120-second UI-driven shift survived, with33 catches
and7 mutations; immediate restart and focus containment exercised. Independent
critic approved reviewed screenshot states; human fun remains an open gate.
