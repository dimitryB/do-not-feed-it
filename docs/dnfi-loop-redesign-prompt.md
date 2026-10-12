# Loop prompt: make Do Not Feed It engaging

Paste everything below the line as the task. Assumes the agent runs on the Mac in `~/dev/do-not-feed-it` with sub-agents available. Companion reasoning: `dnfi-loop-redesign.md`.

---

You are working in `~/dev/do-not-feed-it`, a browser arcade game for Hemi Arcade Contest 2 (judged live on a shared desktop stream by non-expert players). Cut a new branch `feat/creature-loop` from `feat/creature-rig`. Work autonomously; do not ask me questions. Make decisions, record them in `docs/DECISION_REGISTER.md`, and keep going until the exit criteria are met or a hard cap is hit. Read `docs/dnfi-loop-redesign.md` (copy it into `docs/` first from the path I give you, or from the text below if attached) and `docs/qa/creature/ITERATION_LOG.md` final report before starting.

## The problem

The current loop in `lib/game/arcade.ts` is a clicker: the seed is unused so every shift is identical; launcher, speed and mouth are fixed, so the default angle (−40°) hits every time and pressing Space on cooldown wins; cravings are a fixed cycle and off-menu food is accepted; mutations are eight-second aim adjustments that never accumulate; failure is nearly unreachable; there is no timing skill, no ramp, no risk and no consequence. The title promises consequences.

## The target loop

"Feed it → it changes → adapt." You must feed it to survive and every feed makes it more dangerous. The creature is the difficulty curve.

1. **Growth.** Every accepted serving grows the creature (scale, reach, appetite). Hunger drain scales with size. The shift is endless survival: score = time kept fed + feeds + style. The creature always wins eventually.
2. **Mouth rhythm.** The mouth opens and closes on a seeded rhythm; the open window is the timing skill and shrinks with size. The creature tracks and lunges toward food when hungry, snaps when irritated. Body position and scale are driven by these mechanics (this is where the rig's "head position" item is solved).
3. **Mutations are creature changes, permanent for the shift, stacking.** Metal: magnetic mouth pulls all metal — food and loose kitchen metal that starts clogging the mouth; metal shots must be curved in off-axis. Balloon: the creature inflates and drifts upward, the target moves and rises until it burps it off. Pepper: it spits food back at the launcher; a hit costs reload time or rage. Deterministic ordering for pair interactions and one escape rule per pair.
4. **Cravings are dilemmas.** Seeded-random craving with a visible shrinking timer. Satisfied in time: big bonus, it calms, growth pauses briefly. Ignored: rage up and a tantrum beat (knocks food off the bench, lights flicker). Off-menu food is eaten and counts toward that ingredient's mutation. The temptation is deliberate.
5. **Power charge.** Hold Space to charge speed (about 9–16); aim arc plus power is the skill. The trajectory preview appears only during a player's first shift for 15 s, then a short stub, then never.
6. **One reaction verb.** A duck (dodge spit) or "slam the hatch" (cancels a lunge at the cost of a few seconds of feeding). Pick one, make it feel good.
7. **Autonomous creature beats.** Seeded events between shots: a sneeze that knocks food off the bench, a lunge that bites the vent off (the vent becomes a consequence, not a scheduled flap), drool that changes floor bounce. Each is a physics event plus a laugh line.
8. **Endings by size.** Three or four escalating fail screens in the existing copy voice ("It has eaten the shift supervisor" → "It has eaten the kitchen" → "It has been promoted"). Keep "STILL EMPLOYED" for a run that beats the player's personal best.

Keep the bank shot and reward it more. Keep the three ingredients; do not add a fourth.

## Constraints

- `lib/game/arcade.ts` remains the single source of truth: pure, fixed 60 Hz tick, seeded (`seed` must now drive cravings, rhythm and beats), no `Math.random`, no renderer dependency, replayable from a command trace. Extend `ArcadeCommand` for power and the reaction verb; bump a `GAME_VERSION` constant; update `replayArcade` and tests together. The legacy `simulation.ts` harness and the V0 contract are untouched and unused.
- Presentation follows mechanics: the rig in `lib/render/` consumes creature scale, position, mouth aperture and mutation flags from `ArcadeState`; do not author new facial poses. Effects may not substitute for a rule.
- Render budget unchanged (≤ 4 ms average draw at 1920×1080, report median/p95 each iteration). Reduced motion still readable.
- Keep the existing art, copy voice and title/result screens; text ≥ 14 px; every gameplay-critical audio cue has a visual twin.
- No chain work, no new UI framework, no hosting, no new ingredients, no puzzle mechanics.
- `npm run check` green every iteration (contract tests may be skipped only if the compiler download is blocked; say so). Commit each iteration, author `Dimitry B <dimitryB@users.noreply.github.com>`, message `loop: iteration N — <change>`.

## Build the measurement first (iteration 0)

Fun cannot be unit-tested, so measure its preconditions and let a critic judge the rest.

1. **Bot harness** `scripts/loop-bots.mjs`: three deterministic bots on the pure sim — *naive* (never aims, fires on cooldown), *moderate* (reacts to cravings and mouth rhythm with 250 ms latency and ±4° aim noise), *good* (150 ms, ±1.5°). Run 200 seeded shifts each. Report survival-time percentiles, feeds, score, and cause of death.
2. **Decision density**: for the moderate bot, log every tick whether the best action changed (different ingredient, angle band, power band, wait, or reaction verb) and report changes per minute.
3. **Replay fixtures**: freeze three traces per iteration and assert the replay reproduces the final state exactly.
4. **Gameplay captures** `scripts/loop-shots.mjs` (extend the existing Playwright harness): a scripted moderate-bot run in the real browser, HUD visible, capturing a 12-frame strip every 20 s and a 30-second clip (or frame sequence) at 960 px wide around the first mutation, the first stack, and the ending.
5. Commit before changing any rule.

## The loop

Each iteration: implement the next stage in the order above (finish one stage before starting the next), run `npm run check`, bots, fixtures and captures, then spawn a **fresh-context gameplay critic** sub-agent. Give it only: the bot report, the decision-density number, the 960 px strips and clips, and this rubric. It must not see the code or your notes. It returns a score 0–10 per criterion, one sentence each, and the single change most likely to raise the lowest score.

Rubric:
- **Agency**: could a spectator tell from the strips what the player is deciding and why? (A run where the same input repeats scores ≤ 3.)
- **Consequence**: does feeding visibly make things worse over time? Is the creature bigger/stranger at 90 s than at 10 s?
- **Tension**: are there near-misses, recoveries and a death that looks earned rather than scheduled?
- **Readability**: at 960 px, can you name the active mutations and the craving without reading the HUD?
- **Comedy**: did any capture make you want to show someone? Which?
- **Fairness**: anything that reads as a cheap death or an unreadable rule.

Numeric gates (hard, from the bot harness): naive bot median survival ≤ 45 s; moderate bot median 90–150 s with deaths spread so no 30-second bucket holds more than 40% of them; good bot median ≥ 2.5× naive; decision density ≥ 6 changes/min for the moderate bot; replay fixtures exact.

If an iteration lowers the critic's lowest score by 2 or more or breaks a numeric gate, revert that iteration's rule change and try a different one for the same stage. Append every iteration to `docs/qa/loop/ITERATION_LOG.md`: what changed, bot table, decision density, critic table, render timing, next decision. Treat critic averages as noise and the specific faults as signal.

## Exit criteria (all)

- All eight stages implemented and reachable in real play (verified by the browser capture, not only the sim).
- Numeric gates pass on two consecutive iterations.
- Critic: every criterion ≥ 7 on two consecutive iterations, no "cheap death" finding open.
- `npm run check` green; render within budget; replay exact; `GAME_VERSION` bumped; `docs/GAME_DESIGN.md`, `docs/DECISION_REGISTER.md`, `docs/HANDOFF.md` updated to describe the game that now exists, not the one that was planned.
- Title, mid-run and ending screens re-captured with HUD and judged at least as strong as `docs/qa/title.png` / `docs/qa/survival.png`.

Hard caps: 16 iterations or 10 hours, then a final report at the top of the loop log stating what passed, what did not, and the recommended next step. Do not merge. Do not touch chain code.

## First checkpoint before anything else

After stage 1 alone (growth + mouth rhythm + hunger scaling, endless), run the bots and one browser capture and write a two-paragraph note in the log answering: is this already more interesting than the current build, and why? If the honest answer is no, stop and write down what you would change in the target loop before continuing — do not push through the remaining stages on a foundation that is not working.
