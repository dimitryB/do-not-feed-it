# Current handoff

Last updated: September 9, 2026.
Project: `/Users/dbur/dev/do-not-feed-it`.
Branch: **`codex/creature-arcade`**.
Status: **Playable local physical arcade game; M1/M2 implemented substantially,
with human playtest and release gates still open.**

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
