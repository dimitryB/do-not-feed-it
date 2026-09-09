# Creature rig iteration log

Branch `feat/creature-rig`. Presentation only: `lib/game/` rules, the trace
format and `tests/` behaviour are unchanged in every entry below.

Captures live in `docs/qa/creature/iter-N/` and are **not** committed — the set
is roughly 240 MB per iteration and is regenerated with:

```sh
node scripts/creature-shots.mjs --iter N
```

`manifest.json` per iteration records the capture list, the measured render
cost and which states the scripted real-play trace actually reached.

## Iteration 0 — evaluation harness

**Changed:** nothing about the art. Added the review harness so every later
iteration can be judged the same way.

- `lib/dev/hook.ts` — development-only render controls (`window.__dnfi`):
  freeze the render clock, force reduced motion, force a pose, read the rolling
  scene-draw cost. `DEV_HOOKS` folds to `false` in a production build, so the
  hook and the pose presets behind it are dropped by the bundler.
- `lib/dev/poses.ts` — 25 named creature states, each built as a synthetic
  `ArcadeState` of exactly the shape live play produces, parameterised by
  seconds since the moment that defines the state so a strip can be walked.
- `app/page.tsx` — development-only `__dnfi.play`: deterministic start, manual
  tick stepping, scripted launches, state snapshots. Manual mode only stops the
  presentation loop from advancing ticks; the rules are untouched.
- `lib/game/arcade.ts` — events carry two optional presentation tags,
  `ingredient` and `craved`. Nothing in the rules, replay, scoring or the trace
  reads them; the 23 existing tests stay green.
- `scripts/creature-shots.mjs` — Playwright harness (`playwright` added as a
  devDependency; a preinstalled Chromium is used via `DNFI_CHROMIUM`). Boots the
  dev server, hides the HUD, captures 25 states at 1920x1080, eight six-frame
  strips 100 ms apart, a reduced-motion pass, three HUD-visible screens, a
  960-wide `-stream.png` copy of every capture, and a contact sheet.

**Render timing:** 1.607 ms average, 3.500 ms max over 171 frames at
1920x1080. Budget is 4 ms average.

**Scripted trace:** three real shifts (survived, irritated out, starved out)
drive every state through `launchFood`/`stepArcade` rather than the pose hook.

**Critique:** not run. The renderer is unchanged, so iteration 0 is the
baseline the loop measures against: one painting with a small mesh wobble,
identical in all 25 states.

**Next:** build the layered rig and author every state.
