# Current handoff

Last updated: September 9, 2026.
Project: `/Users/dbur/dev/do-not-feed-it`.
Branch: **`feat/creature-rig`** (cut from `codex/creature-arcade`, not merged).
Status: **Playable local physical arcade game; M1/M2 implemented substantially,
with human playtest and release gates still open.**

## Creature rig work, September 9

The user asked for the creature to become a living character whose state a
spectator can name across the room, on a new branch, with a screenshot harness,
a fresh-context visual critic and an iteration loop. Five iterations ran. The
rig is built and every state exists; the read is not there yet. The honest
status, the critic's scores and the recommended next steps are at the top of
`docs/qa/creature/ITERATION_LOG.md` — read that before continuing this work.

Short version: the creature is now a layered rig derived at runtime from
`public/art/kitchen.png` (no new art), driven from `ArcadeState` through springs
and authored beats. Twenty-five named states, all reachable through real play.
Render cost 2.0 ms average at 1920x1080 against a 4 ms budget. Critic average
4.5 / 10 against the brief's rubric; the exit criterion was 8 across the board
in two consecutive iterations, and that was not met. Do not describe this as
finished, polished or AAA.

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

**Environment note:** the harness, the dev server and the build were run in a
Linux cloud workspace on a clean `npm install`, not through the desktop bridge —
this repo's `node_modules` is a macOS build and its `workerd` binary will not run
in the device shell. `npm run test:contract` was **not** run: Hardhat downloads
the Solidity compiler from a host this session's egress policy blocks. No
Solidity file is touched on this branch.

## Current user request

The user asked to implement and heavily polish the selected game on a new branch,
fan out implementation agents, use a separate harsh visual critic, iterate and
keep progress updates coming. This expanded the old scaffold scope to a complete
local practice experience. It did not authorize spending, public publishing,
mainnet transactions, outreach or contest submission.

## What is now implemented

- Illustrated game-native title, a single start action, responsive canvas kitchen,
  original creature/environment, food and launcher artwork.
- Physical food aiming/launching, travel, mouth catches, floor rebounds, misses,
  bounded projectile lifetimes and counts. Logical arena 1200×700 at 60Hz.
- Three mechanical mutations: metal attraction, global food buoyancy, periodically
  warned pepper headwinds. Third accepted serving triggers 90-tick warning and
  480-tick active effect. One mutation at a time; no stacking.
- A full 120-second shift, early grace period, cravings, precision/assisted/rebound
  bonuses, streaks, fullness, irritation, explicit failure causes and restart.
- A moving vent flap warns at 38 seconds, becomes solid at 40, and creates a timed
  obstruction. Preview uses the same future physics as launched food.
- Canvas creature breathing/chewing/deformation, mutation overlays, event particles,
  projectile trails, animated launcher recoil, score pops and reload indicator.
- Pointer drag aiming plus explicit launch, keyboard aim/food/fire/pause/restart,
  narrow-screen aim slider, visible mute/master, fullscreen, guide, pause, results.
- Original procedural music, ventilation hum and layered game cues. All mixer buses
  work; lazy gesture unlock, pause/blur lifecycle, mute and settings persistence.
- Reduced-motion setting/system default and versioned device-local personal best.
- Pure local replay and 15 physical simulation tests. Legacy harness and V0 chain
  foundation are retained separately and are not used to validate arcade scores.

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
