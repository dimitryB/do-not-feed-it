# Current handoff

Last updated: September 8, 2026.
Project: `/Users/dbur/dev/do-not-feed-it`.
Status: **M0 local scaffold complete; M1 physical prototype is next.**

## What the user chose

Build **Do Not Feed It**, a new game for Hemi Arcade Contest 2. Place it in a new
folder under `~/dev`, reuse appropriate Proof of Patience infrastructure to save
work/tokens, and preserve detailed context and an implementation plan. Do not
restart concept selection or assume every proposed tuning value was explicitly
approved. The concept allows a totally new game; it is not a POP sequel.

## What exists now

- A standalone React/Vinext/Vite/Workers project with installed dependencies,
  retained npm lockfile and local shell launchers.
- A responsive guest practice surface with three ingredient choices, feeding,
  fullness/rage, score/combo, timer, mutation labels and restart/end states.
- A pure fixed-tick simulation and local replay function for those scaffold
  rules, with deterministic replay and invalid-input tests.
- Adapted POP engine core, textures, particles/ribbons/rope, post effects and
  generic types. They are available libraries; a final canvas scene does not
  yet consume them.
- Adapted mixer settings/dialog/focus trap and odometer; a new small sound
  engine with feeding/mistake/mutation/UI tones. Music and ambience are absent.
- Namespaced D1 ticket/attestation/rate-limit/snapshot primitives and migration.
- New DNFI EIP-712 types and a locally tested V0 `FeedRegistry` contract using
  POP's player/verifier signature and relayer-compatible submission pattern.
- Closed chain endpoints: config reports disabled, submissions return 503.
- Detailed context/design/architecture/plan/reuse/acceptance documents, a
  decision register, a 31-entry source provenance manifest and retained license.
- Both supplied judging documents, copied unchanged into Git-ignored local
  research storage.

## What does not exist yet

Projectile aiming/physics, food collisions, physical mutations, creature art or
animation, a complete authored shift, original soundtrack/ambience, canonical
ranked trace format, full server replay, community diet aggregation/epochs,
versioned world snapshots, production leaderboards, wallet result UI, relayer
operation, hosted deployment and a Hemi Mainnet contract deployment.

The practice screen is a mechanical test harness. Mutation labels currently
change state and feedback, not physics. Do not present it as the finished game.
The V0 contract has aggregate feeding counters only and cannot implement the
planned ingredient-specific community diet without a new settled schema.

## Validation completed for M0

On September 8, 2026, using Node 24.19.0 and the installed lockfile:

| Check | Result / scope |
| --- | --- |
| TypeScript | Passed application typecheck |
| ESLint | Passed with no warnings after adapting inherited comments/helper annotation |
| Simulation tests | 4 passed: exact replay, duplicate-input cooldown, terminal behavior, malformed trace rejection |
| D1 tests | 4 passed: idempotent attestation, conflicting payload rejection, shared counters, monotonic cursor |
| Contract tests | 4 passed: relayer/duplicate behavior, wrong signer/domain, numeric/time bounds, owner pause |
| Solidity compile | Passed with 0.8.28, production optimizer, Paris EVM target |
| Production web build | Passed through client, server and Workers build stages |
| Local HTTP smoke check | Verified again from the final project location: `/` returned 200 HTML; chain config returned 200 with `enabled:false`; attestation route returned 503 |
| Research copies | Byte equality checked against the two supplied original files |

Native Miniflare tests needed a loopback listener outside the agent sandbox;
their initial sandbox-only attempts failed with `EPERM`, then passed in the
normal local runtime. Hardhat fetched the configured compiler on first use.
Vinext reports that the root route cannot be classified by its current static
analysis; the build succeeds and the local route responds. This is a tool
classification notice, not a claim of end-to-end browser validation.

No browser interaction, visual QA, playtest, accessibility audit, performance
benchmark, production security audit or real mainnet transaction was performed.
These remain separate future gates in ACCEPTANCE_CHECKLIST.md.

## Local startup

```sh
cd ~/dev/do-not-feed-it
./scripts/dev.sh
```

The launcher uses a normal Node installation if available, otherwise this Mac's
Codex-bundled Node runtime. It does not install dependencies or mutate the user's
shell configuration. Dependencies are present locally; a fresh checkout needs
Node 22.13+ and `npm ci`. Standard `npm run dev` and `npm run check` are supported
on a normal Node/npm installation. `./scripts/check.sh` runs the same checks
without requiring npm to be on the shell PATH.

The verification server was temporary. Start the launcher for a new session.
The local baseline is on branch `codex/scaffold`. No remote Git repository, public site or production database was created.
`.openai/hosting.json` is unregistered and contains only the logical D1 binding.
No old POP IDs, private keys, deployed contract addresses or DB state were copied.

## Immediate next implementation task

Implement **M1: one physical feeding interaction plus magnetic teeth**. Read the
M1 section of [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), the single-mutation
design in [GAME_DESIGN.md](GAME_DESIGN.md), and the simulation boundary in
[ARCHITECTURE.md](ARCHITECTURE.md). Use [REUSE_GUIDE.md](REUSE_GUIDE.md) to find
existing camera/math/effects APIs without reloading the whole engine.

Deliver a canvas with one launcher, physical food, mouth collision and a
telegraphed magnetic mutation that visibly alters the next shot. Keep practice
wallet-free. Prove cause → transformation → adaptation before adding ingredients,
community contracts or a full art pipeline. Keep the existing harness available
only if it is useful for debugging; it should not dictate the final interaction.

A useful next task prompt is:

> Continue Do Not Feed It from docs/HANDOFF.md. Implement milestone M1's physical
> feeding prototype and magnetic-teeth mutation using the retained engine APIs.
> Preserve the pure deterministic game boundary and guest-first start. Validate
> the new interaction and update the design/decision/handoff documents with what
> was actually implemented. Do not treat the current craving buttons as the final
> gameplay or deploy the V0 contract as production community state.

## Facts future tasks must not lose

- The user selected DNFI; BELOW, Dead Air and other concepts are history.
- Judging transcripts show a successful POP submission demonstration and a
  shared Most Fun win. A later pending-deployment README snapshot does not erase
  that historical evidence.
- Rapid clarity, creature comedy and spectator-readable consequences are
  priorities inferred from judging; there is no official 90-second score rule.
- Daily epochs, three launch foods, 120 seconds and two-effect cap are defaults,
  not individually confirmed user requirements.
- Publicly predictable seeds and signed hashes do not constitute full replay
  verification or bot/Sybil resistance.
- Originality requires new game content and behavior; credited open-source
  infrastructure reuse is the intended saving.
- Current request authorized a local scaffold, not publication, spending or
  messaging. Follow the actual next user request for further action scope.
