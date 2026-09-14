# Decision register

Update this file when playtests or implementation change a choice. “Proposed”
means a practical default for progress, not mandatory user approval before every
implementation step. Escalate material product/scope changes to the user using
the current task's communication tools and instructions.

| ID | Choice | State | Rationale / resolution point |
| --- | --- | --- | --- |
| D01 | Do Not Feed It is the selected new game | User-confirmed | Latest request; do not switch to BELOW or a POP sequel |
| D02 | Separate project at `~/dev/do-not-feed-it` | User-confirmed | Preserve POP and other projects |
| D03 | Reuse selected POP infrastructure | User-confirmed | Reduce token use and reimplementation |
| D04 | New game mechanics, content and identity | Required by scope/rules | Original contest entry with credited components |
| D05 | Local scaffold and detailed docs in this task | User-confirmed | No production publication or funding requested |
| D06 | React/Vinext/Vite + Workers/D1 + Solidity/viem | Adopted scaffold choice | Existing POP stack and lockfile save setup; reassess only for a concrete need |
| D07 | npm lockfile retained | Adopted | No gratuitous package-manager migration |
| D08 | Two-dimensional physical playfield | Proposed | Scope and control clarity; confirm in first physical prototype |
| D09 | Standard shift lasts 120 seconds | **Superseded by D36** | The fixed round was the reason there was no ramp and no failure; see D36 |
| D10 | Metal, balloon and pepper initial ingredients | Proposed / harness implemented | Three visibly different consequences; confirm by milestone M1 |
| D11 | Clock/time echo ingredient deferred | Proposed scope limit | Extra determinism and teaching costs; reconsider after M4 only |
| D12 | One active mutation first, at most two later | **Superseded by D44** | Mutations that expire and never stack are the reason feeding has no consequence |
| D13 | Aim + launch final controls; selection buttons only in harness | Proposed / scaffold limitation | Avoid shipping a matching quiz; settle pointer semantics in M1 |
| D14 | Guest practice before wallet | Adopted product requirement | Strong judging evidence and low friction |
| D15 | End-of-run player signature, optional sponsored submission | Proposed | Contract supports relayers; budget/abuse policy must precede sponsorship |
| D16 | Separate verifier and transaction-sending responsibilities | Proposed architecture | Verifier signs correctness; gas sender cannot alter signed outcome |
| D17 | Full server replay of ranked inputs | Proposed production requirement | POP's plausibility-only approach does not establish correctness |
| D18 | Contract V0 trusts a verifier | Implemented foundation, not production-ready | Signatures and numeric bounds; no gameplay resimulation or world validation |
| D19 | Snapshot fixed for each run | Adopted architecture principle | Prevent mid-run shared-state disruption and incomparable replay |
| D20 | Daily UTC community epochs | Proposed | Understandable revisit schedule; test empty/quiet epochs; settle before contract V1 |
| D21 | Per-player contribution caps / weighting | Open | Must avoid raw spam domination; one wallet is not one human |
| D22 | Highest diet determines one inherited trait with secondary bounded modifier | Proposed | Visible outcome and limited complexity; settle after pairwise playtests |
| D23 | Ties and empty epochs use deterministic neutral rules | Proposed | No arbitrary backend choice; specify before V1 |
| D24 | Community history and competitive boards versioned by snapshot | Proposed | Compare like conditions; no misleading all-time score ordering |
| D25 | Full creature renderer / sprite vs small 3D asset | Open | Choose smallest expressive approach after one mutation proves fun |
| D26 | Industrial kitchen, playful creature comedy | Proposed art direction | Distinct from POP; supports visible mechanical consequences |
| D27 | Original music and ambience | Planned | Mixer exists, soundtrack does not; make stream readability a criterion |
| D28 | No real-person likeness or voice required | Adopted scope choice | Affectionate Hemi flavor can be text/props without impersonation |
| D29 | 24-hour POP submission cooldown not inherited | Implemented V0 choice | Multiple practice attempts should remain useful; production limits are separate |
| D30 | Fixed 60 simulation ticks per second | Scaffold default | Predictable input timestamps; production physics/replay portability still to prove |
| D31 | Guest pause allowed while hidden / mixer open | Implemented harness policy | Ranked pause/timing policy remains open; close before M3 |
| D32 | New production resources and deployment identity | Required | Never repurpose POP's Site, contract or database |
| D33 | MIT license and provenance record | Adopted | Compatible with contest; original copied-code notice retained |
| D34 | Public source/release at submission time | Contest requirement, future action | User must authorize actual external publication through task scope |
| D35 | Discord submission channel | Unresolved external detail | Announcement conflicts between `#game-contest-2` and `#game-contest` |

## The feeding-loop redesign (branch `feat/creature-loop`)

Opened by `docs/dnfi-loop-redesign.md`. Every decision here was taken against
the bot harness and the gameplay critic, and the evidence for each is in
`docs/qa/loop/ITERATION_LOG.md`.

| ID | Choice | State | Rationale / resolution point |
| --- | --- | --- | --- |
| D36 | The shift is endless; the creature always wins | Implemented (iteration 1) | Score is time kept fed, plus feeds, plus style. A fixed 120-second round cannot have a ramp, and the bot table showed every skill level stopping at the clock rather than at a failure. The 12-minute `ARENA.maxTicks` is a replay bound, not a round |
| D37 | The creature's size is the difficulty curve | Implemented (iteration 1) | Every accepted serving grows it: bigger mouth, shorter open window, faster appetite. Growth is front-loaded so the first servings visibly change it |
| D38 | Growth asymptotes at ×2.4 and does not end the shift | Implemented (iteration 1) | Ending the run when the creature reached full size was tried first and **inverted the skill ordering** — the better the player, the sooner they hit the cap and the shorter their run. Size is the curve; what ends a shift is failing to keep up with it |
| D39 | Food is only accepted while the mouth is at least 45 % open | Implemented (iteration 2) | The open window is the timing skill. A shut mouth physically rejects the shot — a "snub" that bounces off the face and can still be banked back in — rather than silently swallowing it |
| D40 | Feeding a creature that is not hungry is the bad decision | Implemented (iteration 1) | Above 82 fullness a serving returns 15 % of its nourishment and grows the creature three times as fast. This is the title as a rule, and it is what separates a player who rations from one who fires on cooldown: it is the single change that moved the naive bot from 119 s to under 60 s |
| D41 | Irritation cools at ~0.6/s | Implemented (iteration 1) | Without it the meter is a ratchet and every run ends the same way; with it the meter reads as how you are playing now |
| D42 | One seeded "temperament" per shift | Implemented (iteration 2) | Sets how generous the mouth is for the whole shift, so a seed has a character worth talking about and two equally good shifts last different lengths |
| D43 | The warp's ×1.14 scale ceiling is kept | Implemented (iteration 1) | The rig cannot magnify the painting further without dissolving its skin detail. Growth therefore reads through the procedurally drawn mouth (which has no such limit), plus rise and lean, which are translations and cost nothing |
| D44 | Mutations become permanent, stacking creature changes | Implemented (iteration 3) | Replaces D12. Three servings is a level, three levels is the cap, nothing wears off. Metal gives it a magnetic mouth that drags the kitchen's own cutlery into its teeth and catches a flat metal shot; balloon inflates it off the counter until it burps; pepper spits servings back at the launcher and jams it |
| D45 | One escape per mutation pair, and every escape is a serving | Implemented (iteration 3) | metal+balloon: metal is ballast. metal+pepper: pepper makes it sneeze the clog out. balloon+pepper: a serving it spits back vents the pressure. The way out of a problem is always another decision about what to feed it — and taking it deepens the mutation you escaped with |
| D46 | Forces resolve in ingredient order, metal → balloon → pepper | Implemented (iteration 3) | A stack has to resolve the same way every time or the replay is not a replay |
| D47 | The reaction verb is "slam the hatch" | Implemented (stage 6) | One verb with two uses — it stops a lunge and blocks a serving coming back — rather than two verbs that each do one thing. It shuts the hatch for 1.4 s, during which nothing can be launched; pressing it on nothing still costs the lockout, which is what makes it a decision rather than a button |
| D48 | Launch power is a held charge, 9 to 16 | Implemented (stage 5) | At a single fixed charge only two or three angles land; the arc and the charge together are the aiming skill. Verified as a rule by a test that asserts no single charge lands at every angle |
| D49 | The trajectory guide is a first-shift aid and then it is gone | Implemented (stage 5) | Full arc for the first fifteen seconds of a player's first shift, a stub for the rest of it, a shorter stub on the second, nothing after that. Counted in `localStorage`, so it is a property of the player rather than of the run |
| D50 | Cravings are seeded and timed | Implemented (stage 4) | Replaces the fixed three-of-each cycle. Satisfied in time: a large bonus, it calms, and growth pauses — the only brake in the game. Ignored: composure and a tantrum that knocks the bench about. Off-menu is eaten anyway and still counts toward that ingredient's mutation, which is the temptation |
| D51 | The creature acts on its own between shots | Implemented (stage 7) | A seeded beat every eight seconds or so, faster as it grows: a sneeze that scatters the bench, a telegraphed lunge, or drool that makes the floor slick and the bank shot better |
| D52 | The vent is damage, not a schedule | Implemented (stage 7) | It exists only once a lunge nobody stopped has bitten it off the wall, and it never repairs. Previously it appeared at 38 seconds on a timer and deflected shots off something not on screen |
| D53 | Four endings, chosen by how big it got | Implemented (stage 8) | Under an endless ramp every run ends with the creature winning, so the fail screen is the reward: handbook, shift supervisor, kitchen, promoted. STILL EMPLOYED is kept for a run that beats the player's own best time |
| D54 | A craving satisfied pays into the next one | Implemented (iteration 7) | Every good decision used to pay the same fixed amount, so two hundred competent runs converged and died in the same thirty seconds. The growth pause scales with the run of cravings met, and from the second in a row the permanent appetite multiplier eases. Super-linear reward in the one skill the game is about is what finally passed the death-spread gate |
| D55 | The aim and the power are drawn on the launcher | Implemented (iteration 8) | A lance out of the muzzle with a crossbar at the distance the current charge stands for, the loaded serving visible in the breech through the whole reload, and a ring that fills as the reload finishes. Presentation only: no rule changed, and the frozen replay traces came back byte-identical |
| D56 | A shift may not end on a tick the player was locked out of | Implemented (iteration 9) | While the hatch is shut the hunger drain accumulates as a debt instead of being applied, and is taken back at triple rate the moment the launcher is available again. Forgiving that drain instead was measured twice over two hundred shifts and broke the death-spread gate both times, by flipping the dominant failure from starving to enraging; deferring it leaves the economy intact and moves only the tick the loss can land on |
| D57 | No ending may name a cause of death | Implemented (iteration 9) | "It has eaten the kitchen." was picked on size alone, so an empty-belly shift announced the other failure state's own name in the same sentence as the meters that contradicted it. The four endings describe the size it reached and nothing else |
| D58 | Once a shift, a serving already in the air gets to land | Implemented (iteration 10) | THE LAST SERVING. Granting it on every crossing was measured and rewarded the worst strategy in the game — a player firing on every cooldown always has something in the air — and broke the property test that rationing beats gorging. One is a last chance; unlimited is a safety net under spamming |
| D59 | The stage marker describes the run, not the clock | Implemented (iteration 10) | Act four was keyed to a size the medians never reach, so it existed in the code and never appeared on screen. It now arrives when fullness drops under 22 % or irritation passes 72 — when the shift is actually in trouble |
| D60 | What a mutation does is drawn on the canvas, not in the corner | Implemented (iteration 11) | The rule existed only as 9 px grey text in the darkest corner, on for one beat. It is now a three-second banner in the ingredient's colour, and the duplicate mutation pill was removed because the two overlapped into an unreadable double |
| D61 | The meters own a band no label may enter | Implemented (iteration 11) | A verdict pill was covering the fullness number on the frame the player starved. The band is reserved before any pill is placed. The meters were also the smallest type on screen and are the only two numbers that end a shift; they are now 14 px on a 13 px bar |
| D62 | The render budget is measured with mutations on | RE-OPENED (iteration 30) — the build sits AT the budget, not inside it | `scripts/loop-shots.mjs` timed a full-size creature with no mutations, which is not a state a shift spends much time in, and reported 4 ms. `scripts/render-budget.mjs` measures each state on its own: bare 3.80 ms, a typical two-mutation mid-shift creature 7.34 ms, worst case 7.89 ms, against a 4 ms budget. Two level-2 mutations cost about what three level-3 ones do, which points at the warp grid rather than the overlays. Closed at iteration 27: the single-composite grade (D63), the 32x25 grid (D64), the reachable-state rule (D65), the smaller tongue patch and the teeth that no longer draw onto the tongue (D69) brought the worst measured state to 3.94 ms mean / 3.77 ms median, and the heaviest — three of everything at x2.4 — to 3.87 ms. Re-opened at iteration 30: six runs of one build gave 4.13 / 3.87 / 4.01 / 4.05 / 3.92 / 4.00, a median at the line with +/-0.13 ms of noise — and the `rig` term alone swung 3.04-3.45 ms across runs of IDENTICAL code, so three rounds of cutting draw calls moved nothing measurable. The arithmetic says where the work is: the warp is 3.3 ms of the 4 ms and everything drawn over it is 0.6 ms together, so no HUD cut can buy headroom. The grid is the term, and D64 already records that 29x23 tears |
| D63 | Body colour grades composite once, with `source-over` | Implemented (iteration 12) | Each grade used to blend itself onto the frame, and a mid-shift creature ran four blended full-resolution composites. Measured at about a millisecond each whatever the mode — the cost is the blended composite, not its arithmetic. One masked scratch, one unblended composite, over the rectangle the grades paint into. The mutation render cost fell from +5.3 ms to +1.5 ms |
| D64 | The warp grid stops at 32x25 | Implemented (iteration 12) | 29x23 fits the budget and tears: an inflated, lifted belly breaks into hard rectangular seams down the flank, the same failure a critic caught at 34x27. The warp's remaining 3.4 ms is the floor of this architecture and predates every mutation |
| D65 | A render state is only worth measuring if the rules can reach it | Implemented (iteration 12) | The profiler's own worst case set the balloon's lift to 16 at full size, which the lift ceiling clamps to 11.5; the tearing it showed was a pose the game cannot produce. States are now set from the ceiling, and include the steepest one that is actually reachable |
| D66 | The shift pays by time kept fed | Implemented (iterations 22-23) | Moderate and good players scored 60.8 and 61.1 points a second — identical — so an expert's extra fifty seconds bought nothing and the biggest number on screen could not tell them apart. Keyed to size first and measured: it did nothing, because size plateaus at x1.96 for everyone competent. Time kept fed never plateaus; the score ratio went to 1.65x against a survival ratio of 1.37x, with survival untouched to the second. The multiplier stalls, visibly, whenever the belly is under the line |
| D67 | A ring means one thing: your serving, in flight | Implemented (iterations 23, 25) | At 960 px the player's tin can and a spoon the magnet was dragging were the same grey smudge. A serving now carries a dark halo, a bright tail in its ingredient colour and a ring — and the balloon's pressure readout, which had been a ring in the same teal, is a gauge, because grammar spent on two things is grammar spent |
| D68 | No reassuring word on a falling bar | Implemented (iteration 25) | "CATCHING UP" sat in the fullness row while the bar fell faster than usual, because catching up is the hatch debt being repaid. It reads "PAYING IT BACK" |
| D69 | A sprite is cut from flesh only | Implemented (iterations 26-27) | The player reported teeth growing out of the tongue, and after a correct draw-order fix and a "no tooth may end inside the tongue" rule a pale nub survived. Drawing zero teeth proved it was not a drawn tooth: `TONGUE` had been traced around the whole painted tongue, so three of the painting's lower teeth and the cavity behind them were baked into the cut and travelled with the sprite. The cut is now `(815, 308, 40x16)`, entirely on flesh. Separately, the lolling tongue is gated on `jawOpen < 0.4` — two tongues were overlapping at full gape and read as one split down the middle |
| D70 | A threshold the score depends on is drawn on the bar it is a line on | Implemented (iteration 28) | SHIFT PAY turned red twice a run and nothing named the cause; a critic given only the captures called it the worst fault, because it breaks the scoreboard, the one thing a viewer can root for. The 30 % belly line is now `TUNING.payFloor` — owned by the rules, read by the HUD, not memorised in three places — and it is drawn as a tick on the fullness bar at all times, not only once crossed. The bar badge and the corner badge light together, and the caption states the rule in the voice the other rules use |
| D71 | The ending describes the size; a separate line names the cause | Implemented (iteration 28) | D57 stopped the *ending* naming a cause of death and was right to, but the result card then named no cause at all, so a player who died at 2 % fullness and 80 % irritation could not tell which one fired. `failureReason` was in the state and drawn nowhere. The headline still describes only how big it got; one line below it says "IT WENT HUNGRY." or "YOU MISSED TOO OFTEN." Different claims, different sentences |
| D72 | The mouth's future is drawn, because the rules bill by it | Implemented (iteration 29) | The rules charge a shot by the aperture when it ARRIVES and a serving is most of a second in the air, so the timing skill was leading a target whose future nothing showed. A critic given only the captures called it a cheap death and was right; the next critic, given the strip, reported none. `apertureAhead` and `previewFlight` are readouts — they run the simulation's own functions on a projected copy and decide nothing. The flight walk always runs far enough to settle, because the dotted guide is training wheels that fade by the third shift and the flight TIME it implies must not fade with it |
| D73 | A readout the bots cannot see is a change only the critic can judge | Recorded (iteration 29) | Three iterations running, the bot table came back identical to the decimal, which is correct — no bot reads the screen — and is also the limit of the instrument. Nothing measured can say whether drawing the window made the game fairer or merely easier. Where a change is pure readout, the critic is the only evidence, and the log should say so rather than let five green gates imply a verdict they cannot give |
| D74 | A readout is checked at the resolution it is judged at | Implemented (iteration 30) | Two iterations shipped a timing strip after inspecting it at 1920 px, and a critic reading the 960 px captures decoded it backwards: nothing marked which end was NOW, and it was two low-contrast colours on flesh that turns pale by the second minute. The fix is a plate, a NOW caret, and a marker that is the SERVING in its own ingredient colour rather than an abstract playhead. The check is now to downscale the frame to 960 px BEFORE judging it |
| D75 | Every movement of the doom meter carries its number | Implemented (iteration 30) | Costs were annotated — a snub +2.5, a miss +5 — and relief was not, so the only unlabelled movement on the meter that ends most runs was the good one. It reads `-N IRRITATION` on a feed, on the rules' own figure; and since a craved serving is worth more of it, the case for honouring a craving is now made at the moment it pays |
| D76 | A meter names the outcome, not only the mood | Implemented (iteration 31) | IRRITATION is a kitchen-destruction bar wearing an emotion's name, and it ends 101 of 200 moderate runs — the majority failure at ordinary skill. What it does at 100 was stated once, in the smallest text on screen. Six earlier iterations made these meters bigger, brighter and better contrasted without making either of them SAY anything; the bar in its dangerous half now reads `FULL — IT WRECKS THE KITCHEN` or `EMPTY — IT EATS YOU` at 14 px, fading up with the danger |
| D77 | A number that can go down is not an ordinal | Implemented (iteration 31) | D59 keyed act four to a condition so that it would actually appear, and thereby made the act counter non-monotonic: `04 / THE LAST SERVING` at 1:20, `03` at 1:41, `04` again at 2:00, with "the last serving" demonstrably not the last twice in one run. The three acts are keyed to growth and only ever climb; the danger state reads `!! ON THE BRINK`, which is a state and may come and go |
| D78 | Between two ways to die, the screen names the nearer one | Implemented (iteration 32) | D76 put each consequence on its meter and then picked between them by testing irritation first, so a run at 2 % fullness and 80 % irritation was warned about the kitchen and eaten a second later — anti-correlated with real danger in 2 of 3 sampled frames. Both bars compute a distance to their own lethal end; the caption takes the larger, and the ordering that could be wrong no longer exists |
| D79 | A readout you must read in a third of a second gets a fixed address | Implemented (iteration 32) | The swallow-window track was anchored to the creature, so it moved as the creature moved and grew as it grew. Three critics running called it the best idea on screen and the worst-served element on it. Adjacency to the mouth was the argument for keeping it there and it is the weaker one: it is now the third row of the meter plate, labelled MOUTH, 296 px instead of 118, in the same place in every frame |
| D80 | Two ways to die get two warnings, not one slot and a rule for picking | Implemented (iteration 33) | D78 chose the nearer death and was correct every time, which still left the other one unannounced — and the unannounced one was `kitchen-destroyed`, the plurality ending across the whole population, losing the slot exactly at the end of a long run. Each bar carries its own caption and both show at once when both are true. The thresholds also moved off halfway, which was low enough that the banner read the same at 45 % and rising as at 2 % and dying |
| D81 | A rule is taught before it can kill you, measured against the bot table | Implemented (iteration 33) | The line naming irritation's consequence waited for rage 35 and first appeared at 1:41 in the captures, against a naive median survival of 28.6 s — every one of 200 naive kitchen-destroyed runs ended from a mechanic the game had not mentioned. It now arrives at rage 20. The test is not "is the rule stated somewhere" but "is it stated inside the lifetime of the player it kills" |

## Decisions that must close before contract V1

Score and metric schema, game-version rules, exact input encoding, maximum trace
size, snapshot identity, timing and pause policy, epoch boundaries, late results,
ties, contribution caps, outcome derivation, owner powers, correction policy,
indexer finality/reorg handling, and gas-sponsorship fallback.

Do not deploy the V0 contract and assume missing shared-world behavior can be
added without changing its schema. No upgrade mechanism has been promised.

## Decisions that can stay flexible longer

Creature name, cosmetic details, final music, nonessential flavor copy and extra
sound variations. Asset provenance and accessibility requirements still apply.

## How to record a change

For a meaningful change record: date, previous choice, new choice, why, playtest
or technical evidence, affected files, and whether existing replay fixtures or
recorded scores remain compatible. Prefer short appended decision notes over
silently rewriting assumptions that earlier test results depended on.

## September 9: local physical arcade implementation

- **D25/D26:** Implemented a layered illustrated scene with localized canvas mesh
  deformation, original generated kitchen/creature and food/launcher sprites.
  Tactile dark teal machinery, amber light and lime interface accents. This is
  a local presentation choice; a richer authored rig remains possible.
- **Controls:** Drag to aim, explicit Launch to fire; keyboard equivalents and
  a phone angle slider. No release-to-fire ambiguity. Pointer food selection
  returns focus to the canvas; keyboard button focus retains native semantics.
- **Rules:** New `arcade.ts` is separate from legacy `simulation.ts`. All accepted
  food fills the belly; cravings give a larger score bonus. One mutation max,
  90-tick warning, 480 active ticks; thresholds during an existing mutation do
  not stack or replace it. Third accepted serving of an ingredient is the trigger.
- **Difficulty:** 15-second initial hunger grace, two-minute shift, vent warning
  at38 seconds and solid moving flap at40. One hazard deflection per projectile.
  A scripted balance check justified larger craving bonus and timed obstruction.
- **D27:** Original procedural music/ambience and layered effects implemented;
  all mixer buses now have real behavior. No externally recorded soundtrack.
- **D30/D31:** 60Hz quantized local physics; practice pauses for dialogs, blur and
  hidden tabs. Production timing, cross-runtime reproducibility and versioned
  ranked cohorts are still unresolved. Device-local best uses an arcade-specific
  key and is never a global leaderboard.
- **Authorization:** User requested new branch, full local game development and
  parallel agents/visual review. No production account/resource or publication
  was requested; chain config remains disabled. New scores are incompatible with
  V0 registry bounds and must never be sent to that registry.

## September 9: D25 closed — creature presentation approach

**D25 was open: "Full creature renderer / sprite vs small 3D asset — choose the
smallest expressive approach after one mutation proves fun."**

**Decision: a layered rig derived at runtime from the existing painting.**
Branch `feat/creature-rig`. Not merged.

- Previous choice: one AI-generated painting with a localised canvas mesh
  wobble. The project's own critic had flagged "limited authored creature
  expressions", and on a three-minute judged stream a single picture wobbling
  reads as static.
- New choice: `lib/render/creature/` — landmarks measured off `kitchen.png`
  (`anatomy.ts`), parts cut and gaps rebuilt from the creature's own skin at
  runtime (`rig.ts`), a smooth displacement field over the picture
  (`warp.ts`), game state to performance with springs and authored beats
  (`pose.ts`), and the authored mouth, eyes and skin colour (`draw.ts`).
- Why not regenerate the creature: the painting is the art direction. Deriving
  the rig from it keeps lighting, palette and style guaranteed-consistent, adds
  no new asset to license or record, and is reversible.
- Why not a 3D asset: it would replace the art direction rather than extend it,
  and the render budget (4 ms average) does not need it — the rig measures
  3.3 ms average / 5.4 ms max at 1920x1080. That figure roughly doubled over the
  run as the warp grid was densified from 30x23 to 38x30 cells to stop the
  inflated belly tearing, so there is no headroom left for another density
  increase; the remaining smear has to be fixed by moving less paint.
- Why not cut the creature out of the background: a cut-out has a silhouette
  edge, and a silhouette edge tears when the body deforms. Warping the whole
  picture with a field that decays to nothing before the counter has no edge to
  tear.
- Evidence: thirteen iterations, each captured by `scripts/creature-shots.mjs`
  and scored by a fresh-context critic that sees only stream-resolution images
  and the frame strips. Averages 4.2, 3.7, 4.4, 4.4, 4.5, then 3.8, 3.6, 4.2,
  4.2, 4.6 out of 10 against the brief's rubric. The averages are noisier than
  they look — each pass is judged by a different critic and the later ones were
  markedly more rigorous — so the per-iteration fault lists are better evidence
  than the numbers. Full tables, timings and the final report are in
  `docs/qa/creature/ITERATION_LOG.md`.
- Affected files: `lib/render/scene.ts`, `lib/render/creature/*`, `lib/dev/*`,
  `app/components/GameCanvas.tsx`, `app/page.tsx`, `scripts/creature-shots.mjs`.
- Replay compatibility: unaffected. `ArcadeEvent` gained two optional
  presentation tags (`ingredient`, `craved`) that the rules, scoring, replay and
  trace never read; existing recorded traces replay identically.

**Status: adopted for local presentation, incomplete against the brief.** The
creature is not yet at "a spectator across the room can name the state", and the
final report says so with the specific states and the work left.

### Proposals recorded rather than implemented (no gameplay was changed)

These would help expressiveness but are gameplay changes, so they are written
down instead of done:

- **P1 — Give the balloon mutation a visible body part.** The belly is behind
  the serving hatch, so "balloon belly" has nowhere on screen to happen. A
  throat sac above the hatch line, inflating with the same rule, would make the
  strongest mutation cue visible. This changes nothing mechanical, but it does
  change what the mutation *is* in the fiction, so it belongs to design.
- **P2 — Let a miss leave something on the counter.** The clearest failure read
  would be a snack visibly landing and staying for a second or two. Debris is
  presentation, but "the snack persists" is close enough to a rule that it
  should be a design call.
- **P3 — A short beat between catch and mutation trigger.** The third serving
  currently starts a 90-tick warning immediately. Half a second of the creature
  reacting to the serving before the warning begins would let the two beats read
  separately rather than overlapping.
- **P4 — Separate irritation thresholds from the meter.** The three authored
  irritation steps sit at rage 25/55/85, which the meter crosses at whatever
  pace misses happen. Explicit rule-level steps would let the presentation and
  the mechanic agree.
- **P5 — Push the camera in during play.** Every critic across thirteen
  iterations independently observed that the creature's head occupies a small
  part of a wide frame and that its body never changes position between states.
  A gentle push-in while a shift is running, and a wider body travel between
  states, would do more for nameability at stream resolution than any further
  work on the face. It is a presentation change and therefore in scope, but it
  moves the relationship between screen space and aim, so it should be a
  deliberate design call rather than something a renderer branch does quietly.
- **P6 — Give metal a material, not a colour.** The mutation reads as "bigger
  teeth" rather than "magnetic teeth" because the fangs stay ivory. A grey
  specular treatment plus filings visibly pulled toward the jaw would fix it,
  but the filings are new scene objects and their behaviour borders on a rule.
