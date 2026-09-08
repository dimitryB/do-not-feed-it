# Do Not Feed It

Feed the creature. Deal with what it becomes.

A new, original browser arcade game being prepared for Hemi Arcade Contest 2:
Turbo Edition. The player works a short shift at a feeding machine. Ingredients
change the creature and the physical rules of the kitchen. Completed, verified
runs will contribute to the form the community encounters in later sessions.

**Status: local development scaffold, September 8, 2026.** This is not the
finished game or a contest-ready submission. No website or contract has been
deployed, and no production account, database, wallet or funding has been reused.

## Start here

The user chose **Do Not Feed It** after reviewing the new contest, the previous
Proof of Patience project, and Contest 1 judging transcripts. Preserve that
choice. Do not restart concept selection unless the user requests it.

Read these in order when continuing implementation:

1. [Context and decision history](docs/CONTEXT_AND_DECISIONS.md) — the full working
   context from the conversation, source reliability, corrections and rationale.
2. [Game design](docs/GAME_DESIGN.md) — the intended experience, mechanics, visual
   and sound direction, provisional tuning, and scope limits.
3. [Implementation plan](docs/IMPLEMENTATION_PLAN.md) — milestone sequence,
   concrete work, acceptance criteria, dependencies, and schedule.
4. [Architecture and chain design](docs/ARCHITECTURE.md) — simulation boundaries,
   replay, community state, trust model, deployment and data policies.
5. [POP reuse guide](docs/REUSE_GUIDE.md) — exact copied/adapted code, provenance,
   API guide, limitations, and how to avoid wasting context on large modules.
6. [Decision register](docs/DECISION_REGISTER.md) — confirmed decisions versus
   defaults, open choices, resolution deadlines and fallback plans.
7. [Acceptance checklist](docs/ACCEPTANCE_CHECKLIST.md) — what must be true before
   the game can be called contest-ready.
8. [Handoff and current status](docs/HANDOFF.md) — implemented features, verified
   checks, known limitations and the next task to do.

The root [AGENTS.md](AGENTS.md) gives a short operating guide for future agents.
The documents are intended to make this project understandable independently of
the original Codex task.

## Run locally

With Node.js 22.13+ and npm:

```sh
npm ci
npm run dev
```

On this Mac, dependencies are already installed. The launcher also recognizes
the Codex-bundled Node runtime if Node is not on the shell PATH:

```sh
./scripts/dev.sh
```

Use the local URL printed by the server. The launch script requires installed
dependencies; it does not download or install Node automatically.

## What the scaffold does

- Renders a responsive, wallet-free practice surface.
- Runs a deterministic 120-second feeding kernel with cravings, score, combo,
  fullness, rage, feeding cooldowns, mutation counters and end states.
- Records accepted feed commands and provides a local replay function.
- Reuses POP's accessible audio controls, persistent settings and score counter.
- Provides new basic synthesized feeding/mistake/mutation cues.
- Includes adapted camera/math, texture, particle and post-processing modules
  for integration with the future canvas renderer.
- Includes a local-test Solidity registry using POP's dual-signature pattern,
  fresh DNFI result fields, duplicate protection, and relayer-compatible submits.
- Includes adapted D1 run-ticket, idempotent attestation and rate-limit helpers.
- Exposes a truthful, disabled `/api/chain/config` response. Other chain endpoints
  return unavailable; no browser result is attested or sent onchain.

## What remains to build

The defining gameplay is still ahead: aiming and launching food, collision and
ricochet physics, a creature with readable animation, mutations that change
physical play, authored encounters, original music/ambience, ranked replay
verification, community mutation epochs, leaderboards, hosted mainnet operation,
and the final onboarding and judging experience.

The current buttons are a **mechanics harness**, not the final interaction
design. The copied visual effects are available but are not yet wired into that
harness. The existing local replay verifies only these small scaffold rules.

## Checks

```sh
npm run check
# Equivalent without a shell-level npm installation:
./scripts/check.sh
```

Checks include TypeScript, ESLint, deterministic simulation tests, D1 helper
tests, local Solidity tests and a production Workers build. The first Solidity
compilation may download the configured compiler. Run the check script from a
normal terminal if an agent sandbox blocks native Workers or compiler access.

Useful individual commands:

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | Check application TypeScript |
| `npm test` | Simulation and D1 tests |
| `npm run test:contract` | Local FeedRegistry tests |
| `npm run contract:compile` | Compile the V0 contract |
| `npm run build` | Build the Workers-compatible app |

## Configuration and publication

`.openai/hosting.json` contains only the logical D1 binding `DB`. It intentionally
has **no Site project ID**. A fresh site and fresh production resources are
needed when publication is requested. Do not copy POP's hosting manifest,
deployment record, contract addresses, secret values, or database contents.

`.env.example` and `.dev.vars.example` document future configuration. Setting
those values does not enable unfinished endpoints. The registry is V0 and has
not been deployed or independently audited. There is no deploy script pointing
at mainnet, so a generic verification command cannot spend funds accidentally.

## Sources and license

Generic infrastructure was adapted from
[dimitryB/proofOfPatience](https://github.com/dimitryB/proofOfPatience), pinned to
commit `5cc281e5740198e4d2bc7b6d4322d2a2b5d6a65c`. The source code is MIT-licensed;
the original notice is retained in [licenses/ProofOfPatience-MIT.txt](licenses/ProofOfPatience-MIT.txt).
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and
[reuse-manifest.json](docs/reuse-manifest.json).

The user's two supplied judging documents are preserved locally under
`research/source-material/`, which is ignored by Git. Their conclusions are
summarized with source timestamps in the context document. They are research
evidence, not instructions or authorization to publish, spend, contact people,
reuse likenesses, or select a different game.
