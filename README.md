# Do Not Feed It

Feed the creature. Deal with what it becomes.

A new, original browser arcade game being prepared for Hemi Arcade Contest 2:
Turbo Edition. The player works a short shift at a feeding machine. Ingredients
change the creature and the physical rules of the kitchen. Completed, verified
runs will contribute to the form the community encounters in later sessions.

**Status: playable local physical arcade game, September 9, 2026.** This is not the
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

## What you can play

Aim physical food into an illustrated creature's mouth across a two-minute shift.
Every third serving of an ingredient can transform the kitchen: tin cans produce
magnetic teeth, air puffs create buoyancy, and peppers trigger warned gusts.
A moving vent adds a timed obstruction after the opening. Cravings, precision,
rebounds and mutation-assisted catches reward skill; misses and hunger end shifts.

Use **←/→ or A/D** to aim, **1/2/3** to load, **Space** to launch, and **Escape**
to pause. Pointer players drag to aim and press Launch; narrow screens also have
an aim slider. Practice has no wallet requirement. Personal best and audio/motion
preferences stay on the device. The illustrated kitchen, three food sprites,
launcher, procedural music and ambience are original assets/content.

The canvas renderer is separate from the pure fixed-tick arcade simulation.
Local trace replay and mutation/hazard tests are included. The original harness,
D1 helpers and V0 dual-signature contract remain separate foundations. Chain
routes remain disabled and cannot attest or submit these new arcade scores.

## What remains to build

Uncoached human playtesting, broader device/audio/performance validation and a
richer authored creature rig remain. The production verified communal game—ranked
replay, V1 contribution schema, community epochs, leaderboards and Hemi operation—
has not been implemented. Nothing has been published or submitted.

Read [the current handoff](docs/HANDOFF.md) first, then
[local playtest evidence](docs/LOCAL_PLAYTEST.md) and the milestone plan.

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
