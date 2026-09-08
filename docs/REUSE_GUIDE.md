# POP reuse guide

The purpose of reuse is to save implementation and context-discovery work while
building an original game. This is a selected infrastructure transplant, not a
new name for POP. The new physics, creature, run design and community protocol
are the work that makes Do Not Feed It a separate entry.

Upstream: [dimitryB/proofOfPatience](https://github.com/dimitryB/proofOfPatience),
commit [`5cc281e5740198e4d2bc7b6d4322d2a2b5d6a65c`](https://github.com/dimitryB/proofOfPatience/tree/5cc281e5740198e4d2bc7b6d4322d2a2b5d6a65c).
The exact source notice is in [ProofOfPatience-MIT.txt](../licenses/ProofOfPatience-MIT.txt).
[reuse-manifest.json](reuse-manifest.json) maps adapted files to upstream paths.

## Reuse map

| Foundation | What was retained / changed | Readiness and remaining work |
| --- | --- | --- |
| npm/tooling | Retained compatible package versions, npm lockfile, React/Vinext/Workers stack and Hardhat pattern; new project identity | Installed and build-tested; review dependencies again before release |
| Vite hosting | Retained local Workers configuration shape; switched to official `@openai/sites-vite-plugin`; fresh unregistered manifest | Local only; placeholder DB ID is not production provisioning |
| Engine core | Math, easing, vectors, color, RNG/noise, springs, camera and clock | Adapted type imports; available for selective use |
| Texture bakery | Procedural material generation and incremental jobs | Available, not initialized by harness; tune assets/startup cost |
| Particles / ribbons / rope | Generic effects and emitter infrastructure | Dimensions/glyphs detached from `lib/pop`; retune presets and integrate semantic events |
| Post effects | Compositing/grade/flash infrastructure | `PopPostParams` renamed; old visual defaults need a new restrained preset |
| Generic types | Extracted engine-only types from `lib/render/types.ts` | Removed POP question/scene/audio types |
| Audio mixer UI | Settings persistence, controls, focus trapping, reset flow | New storage key, crowd → ambience terminology; new compact sound engine |
| Sound engine patterns | Lazy Web Audio, gain controls, bounded voices, short synthesized cues | Reimplemented for DNFI; POP soundtrack/crowd engine excluded |
| Score counter | Odometer component | Integrated in the harness |
| Engagement helpers | Human-interaction flag and listener lifecycle | Available for future canvas focus transitions; dialog focus trapping is integrated |
| Hemi / typed data | Hemi chain config and EIP-712 dual-signature approach | New result schema/domain/ABI; V0 contract tested locally only |
| D1 helpers | Tickets, atomic attestation storage, conflict rejection, rate limits, cursor snapshot | Renamed to `dnfi_`; production world/ticket migrations still required |
| Contract test pattern | Hardhat/viem fixtures, typed signatures, relayer submission tests | New contract and four focused V0 tests; not a production security audit |
| D1 tests | Adapted original behavioral tests | Four tests pass in native Workers emulation |

## High-value APIs: inspect these before reading entire modules

| Module | Useful entry points | Typical use |
| --- | --- | --- |
| `lib/engine/core.ts` | `clamp`, `lerp`, `damp`, `ease`, `vec` | Bounded values, interpolation, visual motion |
| same | `createRng`, `createNoise` | Seeded presentation variation; final authoritative RNG must be specified separately |
| same | `createSpring`, `createCamera`, `createClock` | Creature motion, scene camera, render scheduling |
| `lib/engine/textures.ts` | `createTextureBakery` and `IncrementalTextureBakery` | Progressive procedural texture generation |
| `lib/engine/fx.ts` | `createParticleSystem`, `createRibbon`, `createRope` | Feeding bursts, projectile trails, soft appendages |
| `lib/engine/postfx.ts` | `defaultPostParams`, `createPostChain` | One controlled final presentation pass |
| `lib/engine/audio.ts` | Mixer engine methods / `unlock` / `play` | Start audio after a gesture and play semantic cues |
| `app/components/focusTrap.ts` | `useDialogFocusTrap` | Modal keyboard containment and focus restoration |
| `lib/chain.ts` | `resultTypedData`, `attestationTypedData` | Shared result/signature schema; don't independently recreate it in UI and worker |
| `db/chainState.ts` | Exported ticket, attestation, counter and snapshot helpers | Reuse atomic persistence behavior; inspect signatures when wiring a route |

Use `rg -n '^export ' <file>` and read the relevant surrounding range. The large
visual files are intentionally retained libraries; pasting all of them into a
new task's context loses the benefit of reuse. Start with their interfaces and a
small integration. Keep this guide updated when a real defect or API change is
found, rather than re-auditing every line for every feature.

## Specific adaptations and cautions

### Presentation

The original FX module depended on POP dimensions, stage position and SOON
letters. It now imports `presentationConfig.ts` with arena size, floor and generic
debris glyphs. Those are presentation defaults, not authoritative physics rules.
Once the physical arena is settled, share the appropriate geometry definition
without making the simulation depend on browser rendering.

Generic type definitions now live in `lib/engine/types.ts`. This removes runtime
dependencies on POP's questions and scene. Some inherited preset names and
material aesthetics remain inside unused engine implementations; they are not
instructions to reproduce POP's scene or branding.

The copied post effects can be expensive or visually excessive if every feature
is enabled. Add one needed effect at a time and honor reduced motion/flash
preferences. Reuse the machinery, then author the new game's presentation.

### Audio

The old large audio implementation generated POP-specific music and audience
reactions. It was not copied wholesale. The new small engine provides feeding,
mistake, mutation and UI tones using the retained mixer interaction pattern.
Music and ambience channel settings are reserved plumbing; no original tracks
or ambience bed exist yet. The scaffold discloses this. Finish or remove unused
channels before the contest release.

Do not copy POP voice lines, audience jokes, soundtrack or judging personalities
as a shortcut to originality. The creature should have its own expression and
sound vocabulary. Retain the practical gains: lazy unlock, persistence, bounded
voices, sensible volume and reliable mute.

### Chain and database

The reusable part is the signature, retry and persistence pattern. V0 replaces
POP's score metrics and domain, removes the inherited 24-hour gameplay cadence,
and keeps relayer-compatible player + verifier signatures. It does not inherit
proof of correct gameplay just by having a `traceHash`.

The copied D1 attestation helper preserves exactly one winning payload/signature
per ticket, including concurrent retries. Keep that behavior when adding snapshot
binding and full replay. The old address-keyed leaderboard snapshot requires
schema expansion and reorg policy for a multi-epoch community game.

POP's wallet-result component, large chain worker, event-indexed leaderboard
logic, old score contract and full contract test suite were studied as source
patterns, not transplanted as a falsely complete new onchain feature. New UI
and worker routes must match the settled DNFI protocol.

## Intentionally not carried over

- POP's SOON/question/backlog gameplay, five-minute broadcast, emergency POP OFF
  mechanic, scene composition, tutorial and specific score formula.
- POP's published app metadata, images/content, music/crowd behavior and theme.
- Existing contract addresses, deployment records, database contents, secrets,
  hosting project ID, resource bindings to actual production infrastructure.
- Tests that assert POP's exact copy, page layout or obsolete gameplay metrics.
- A 24-hour score restriction or leaderboard semantics unrelated to this game.
- Existing repository history or its `.git` directory.

## How to continue cheaply without creating hidden integration debt

1. Read HANDOFF, the next milestone and the relevant design section.
2. Build on current explicit interfaces; search for reusable APIs before writing
   replacements. Inspect a large file only when the feature actually uses it.
3. Keep the simulation pure and the renderer thin. A new dependency between
   gameplay and a visual effect can cost more to undo than writing a small adapter.
4. Port one behavior at a time and validate the behavior, not copied line count.
5. Reuse useful tests with new invariants. Remove irrelevant assertions rather
   than renaming them until they happen to pass.
6. Update the decision register and handoff after a material change so the next
   task does not repeat the same investigation.

No measured token-saving percentage is claimed. The main savings are avoiding
new tooling setup, mixer/accessibility scaffolding, effects infrastructure and
signature/idempotency rediscovery. Novel gameplay, original content and secure
community verification remain original implementation work.
