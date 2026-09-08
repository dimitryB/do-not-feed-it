# Architecture and production design

This document separates implemented scaffold behavior from the proposed
production design. No external service, verifier, relayer or contract deployment
is running as part of this scaffold. Read the current status in
[HANDOFF.md](HANDOFF.md) before treating an interface as a shipped capability.

## Stack and reasons

The retained stack is TypeScript, React, Vinext/Vite, Cloudflare Workers/D1,
viem and Solidity with Hardhat. This follows the compatible POP project and
keeps its npm dependency versions and lockfile where practical. The official
Sites Vite plugin replaces the old repository-local plugin implementation.

The `.openai/hosting.json` file only declares the logical `DB` binding. The
placeholder database ID in Vite configuration is for local emulation. Neither
is a production resource. A future release needs a fresh site identity and
actual resource provisioning; POP's resource IDs must not be reused.

## Current module boundaries

| Area | Current files | Current responsibility |
| --- | --- | --- |
| Page / input | `app/page.tsx` | Practice start/restart, ingredient selection, feed action, HUD, audio dialog, frame scheduling |
| Pure rules | `lib/game/config.ts`, `lib/game/simulation.ts` | Fixed-tick feeding harness, counters, phase changes, seeded cravings, local replay |
| Presentation library | `lib/engine/{core,fx,postfx,textures,types,presentationConfig}.ts` | Adapted generic POP math, camera, particles, texture generation and post effects; not wired to the harness |
| Audio | `lib/engine/audio.ts`, audio UI/settings components | Lazy Web Audio cues, persistence and accessible mixer |
| Shared chain types | `lib/chain.ts` | Hemi configuration, V0 EIP-712 types, ABI and typed-data constructors |
| Routing | `worker/index.ts`, `worker/chain.ts` | Vinext routing and deliberately disabled chain API |
| Persistence primitives | `db/chainState.ts`, `db/schema.ts`, `drizzle/0000_dnfi_chain_state.sql` | Namespaced ticket, attestation, rate-limit and snapshot helpers |
| Contract | `contracts/FeedRegistry.sol` | Locally tested V0 result registry; signatures, duplicate prevention and broad numeric bounds |
| Verification | `tests/`, `test/` | Local simulation, database and contract tests |

The desired extension points are `lib/game/input.ts`, `lib/game/physics.ts`,
`lib/render/scene.ts`, `worker/verifier.ts` and `worker/world.ts`, but create them
when their responsibilities become concrete. Do not add empty service layers.

## Simulation is authoritative; rendering is a projection

The final simulation receives a rules version, immutable world snapshot, seed,
and ordered input commands. It produces state and semantic events. It must not
read DOM dimensions, canvas objects, network state, wall time or Web Audio.

The renderer may interpolate positions, add springs, particles, expression,
camera shake and audio. Those effects must not move collision geometry or award
points independently. Consume semantic events once using stable event IDs or
an event cursor; rerenders and catch-up frames must not play a sound twice.

The scaffold kernel runs at 60 ticks/second with 7,200 ticks per standard shift.
Its seeded xorshift cravings and integer counters replay deterministically for
the current tests. This does **not** establish deterministic cross-runtime
projectile physics; that physics does not exist yet.

For the physical game, specify:

- Logical arena coordinates independent of CSS size/device pixel ratio.
- Quantized aim/power values and tick-indexed commands.
- Maximum projectile count, lifetime, speed and force.
- Stable collision resolution order and bounded collision iterations.
- Exact rounding/fixed-point rules, including negative values and boundaries.
- A versioned PRNG algorithm and independent cosmetic randomness.
- Terminal-state rules, simultaneous feed/expiry/loss behavior and score bounds.

Run the same deterministic corpus in the supported browser simulation and
Workers verifier before freezing a rules version. If floating-point behavior
diverges, simplify or move authoritative quantities to fixed-point integers.

## Practice and ranked timing

Current practice pauses while hidden or when the mixer is open. Its frame loop
caps elapsed catch-up to protect responsiveness; wall-clock duration can differ
from simulated duration after a stall. This is acceptable for the labeled local
harness and is not a ranked anti-cheat policy.

Before ranked play, decide whether hidden-tab pauses are allowed, whether focus
loss cancels ranking, how long tickets remain valid and which server timestamps
bound completion. Do not infer input honesty from a final score or a client timer.
A full replay proves consistency with the rules, but cannot by itself prove a
human played in real time rather than a bot finding a valid optimal trace.

## Proposed ranked submission flow

1. A player may start guest practice immediately. The final design can offer a
   separate ranked attempt without turning the landing page into a wallet gate.
2. The server creates a unique ticket bound to supported game version, seed,
   immutable snapshot hash/epoch and expiry. Session/player binding is an open
   choice to resolve before V1; the copied ticket table does not implement it.
3. The client simulates locally, records bounded canonical inputs, and shows
   the result immediately at the end.
4. The verifier validates ticket/trace shape and resource limits, then replays
   the authoritative rules. It derives score and contribution metrics itself.
5. The finalized result is bound to a player's typed signature. The verifier
   attests that same domain-bound result. Choose exact request order during V1
   implementation so retries do not change payloads or signer binding.
6. Either the player or a funded relayer submits both signatures to the
   configured Hemi contract. The contract validates domain, replay protection,
   expiry, bounds and verifier authority, then records the accepted event.
7. The client tracks receipt/confirmation and links to the explorer. The indexer
   incorporates accepted finalized events into rankings and community state.

Two signers serve different purposes: the player authorizes attribution and
the verifier attests correctness. A relayer is only the transaction sender. It
cannot change signed fields, but it needs funding, availability and an abuse
policy. Those operational pieces have not been copied or created.

## V0 contract: exact capability and limits

`FeedRegistry` uses the EIP-712 domain name `Do Not Feed It`, version `0`, chain
ID and verifying contract address. The signed result fields, in order, are:

| Field | Type | Purpose |
| --- | --- | --- |
| runId | bytes32 | One-time run identity |
| gameVersion | bytes32 | Rules identity accepted by this deployment |
| player | address | Score owner / player signer |
| score | uint64 | Verifier-attested score |
| durationTicks | uint32 | Simulated duration |
| totalFeeds | uint32 | Accepted feed attempts in the V0 kernel |
| correctFeeds | uint32 | Successful craving matches in the V0 kernel |
| mutationEvents | uint32 | Mutation triggers in the V0 kernel |
| seed | bytes32 | Signed seed identifier |
| traceHash | bytes32 | Signed trace commitment |
| snapshotHash | bytes32 | Signed world-state commitment |
| deadline | uint64 | Signature expiry |

The verifier signs a `VerifierAttestation(bytes32 resultHash)` envelope around
the fully domain-bound result digest. Shared viem constructors are exercised
against the Solidity implementation by local tests.

V0 rejects duplicate run IDs, unsupported game version, zero player/run identity,
expired or excessively distant signatures, invalid player/verifier signatures,
and results beyond its provisional duration/feed/score bounds. It records best
score and emits the run result. The owner can pause and rotate the verifier.

**V0 does not replay gameplay, know canonical world snapshots, aggregate diet,
enforce per-ingredient contributions, run epochs, resist Sybil players, or index
history.** Signed hashes do not demonstrate that their underlying data was
validly computed. Correctness ultimately depends on the verifier. Score bounds
are defense in depth, not a proof that someone earned the score.

The current result does not contain ingredient-specific diet totals. V1 needs a
settled representation if those totals drive the creature. The current best
score mapping is per player within one deployment; fair rankings across future
versions/snapshots need a new indexing/schema decision. There is no promised
upgrade path; deploying V0 prematurely would create avoidable migration work.

## Proposed community state and epochs

The hook is persistent shared consequence, not merely uploading a high score.
A working default is a daily UTC diet epoch that derives the next creature's
inherited trait. Freeze that trait/snapshot for each run to preserve fairness
and replay. Daily timing and the exact diet formula remain provisional.

Before V1, document these rules with examples:

| Question | Working direction / unresolved detail |
| --- | --- |
| Canonical inputs | Only accepted verified runs; decide whether contract events or explicit finalized state anchor snapshots |
| Contributions | Bounded, ingredient-specific qualified feed metrics; define caps/weighting before implementation |
| Identity | Wallet-based caps reduce one-wallet spam but do not prove unique humans |
| Epoch boundary | Use one explicit chain/time basis; specify late runs and finalization grace period |
| Empty epoch | Carry forward a bounded neutral/previous form under a deterministic rule |
| Tie | Stable, documented tie-break; no secret backend selection |
| Trait mapping | Dominant ingredient supplies a recognizable inherited rule; optional secondary modifier must stay bounded |
| Activation | Next eligible run starts from an immutable published snapshot |
| Outages | Guest practice remains available; cached state must identify its age and validity |
| Rule changes | New version identity and compatible ranked cohorts; no silent reinterpretation of old runs |

An illustrative, non-final example: if metal dominates one epoch's capped
verified diet, the next creature begins with magnetic teeth. A player should
see both the community cause and the changed shot behavior. Exact totals and
cap formulas must be derived from playtesting and abuse analysis, not copied
from this illustration into a production contract.

Do not describe a public Bitcoin block hash as secret, manipulation-proof
randomness. A future header-based seed needs a specified block-selection rule,
availability/finality handling and threat model. Header integration is not
required by the current concept. Contest 1 praise for BLOCKSTEP establishes an
interesting precedent, not a requirement to add header calls or a guarantee of
an innovation award.

## Persistence and indexer

The retained D1 helpers solve a useful narrow problem: durable tickets,
idempotent same-payload attestation writes, conflict rejection, shared fixed
window counters and a monotonic cursor. They are not a full verifier or world DB.

Production migrations will likely add:

- Ticket game version, snapshot/epoch, trace-format version and association.
- Trace/result references with bounded retention and retry status.
- Community snapshots keyed by chain, contract, game version and epoch/hash.
- Indexed finalized block/cursor metadata and a safe reorg recovery mechanism.
- Version/snapshot-aware rankings and contribution deduplication.

The inherited leaderboard snapshot table is keyed only by contract address.
Do not use it unchanged for multi-chain/version/epoch data. Its monotonic cursor
test prevents stale normal writes; it does not implement reorg rollback. A
reorg-aware design needs an explicit controlled invalidation/rewind path.

Use bounded log batches and retryable deterministic reductions. D1 should be
rebuildable from the chosen canonical history. Do not trust browser-submitted
rankings or let a stale cache choose the next creature silently.

## Trust, privacy and operational limits

- Verifier compromise can authorize false scores within contract bounds. State
  this honestly; the design is server-verified, not fully onchain simulation.
- Replay verification does not solve bots or multiple-wallet Sybil behavior.
  Cap and rate-limit based on actual risk without promising human uniqueness.
- Wallet addresses and contract events are public. Avoid unnecessary names,
  emails, raw IP retention or long-lived device identifiers.
- Decide trace retention, ticket cleanup and diagnostic log redaction before
  production. Keep signatures and request payloads out of casual error logs.
- Rate limits, request size limits and replay budgets protect server costs; gas
  sponsorship needs a separate financial cap and depleted-funds behavior.
- Handle verifier/RPC/indexer failure with honest status and recoverable retry.
  Never turn unavailable verification into automatic acceptance.
- Rotate secrets through environment/provider configuration, not committed files.

## Configuration and safe local operation

`GET /api/chain/config` currently reports `enabled: false` and a scaffold reason.
Other `/api/chain/*` requests return 503. Environment examples document future
keys but setting them does not enable endpoints that have not been implemented.

Local Hardhat tests use ephemeral test accounts and contracts. Mainnet settings
in configuration are templates only. No deployment module or mainnet address is
provided, no wallet is funded, and no production resource has been provisioned.
The check script builds and tests; it does not publish or submit transactions.

When publication is requested, use a fresh site/resource identity, bind real
secrets in the provider, apply the reviewed production migrations, deploy the
settled contract and verify the real chain path. Recheck current official Hemi,
Workers and contest documentation at that time.
