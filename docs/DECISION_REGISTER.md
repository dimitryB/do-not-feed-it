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
| D82 | Every meter that kills you shows where it is heading, not only where it is | Implemented (iteration 34) | D72 gave the mouth a future because the rules bill by arrival; the belly never got one, and the belly is the majority death — 142 of 200 good-bot runs. The drain is not constant either: it climbs with the size and appetite the player raises by playing well, so the bar falls faster the better the run has gone and nothing said so. `drainPerTick` is exported from the rules, and the bar carries a chevron at the level reached in ten seconds — one reload plus one flight — drawn as a chevron rather than a tick because the pay line is already a tick on that bar |
| D83 | A caption names its own meter, in the tense it is reporting | Implemented (iteration 34) | "FULL — IT WRECKS THE KITCHEN" under a bar reading FULLNESS 2 % parsed as a claim about fullness, and "TOO LATE" on a prediction marker read as "you already missed" about a shot not yet fired, over a visibly open mouth. Both captions were correct; the vocabulary was borrowed from the other readout. They now read BELLY EMPTY / IRRITATION FULL, and OPEN THEN / SHUT THEN. Three iterations of redrawing the track were beaten by putting the right two words on it |
| D84 | The outlier in a vocabulary is the thing that changes | Implemented (iteration 35) | Every warning, the coaching line and the ending card said "belly"; only the meter said FULLNESS, and the irritation caption says FULL — so a reader going up from "IRRITATION FULL — IT WRECKS THE KITCHEN" to a bar labelled FULLNESS concluded that filling the belly wrecks the kitchen. D83 fixed the captions, which was the wrong side of the collision. The bar reads BELLY |
| D85 | The forecast is a number in the row, not a glyph on the fill | Implemented (iteration 35) | The ten-second chevron was drawn in the fill's own colour; a critic reverse-engineered it correctly from six frames of pixel measurement and still could not confirm it. The chevron sits in a dark notch now, and the row's value reads `51% -> 23%`. The first attempt at a label drew "IN 10s" in amber on the lime fill — the same green-on-green mistake committed while fixing it |
| D86 | An instrument reporting nothing is a fault in the instrument | Implemented (iteration 35) | Four critics running said the contact strips gave them nothing the close-ups did not give better. Twelve frames across 960 px is 68 px each, at which only "green creature or pale creature" survives. Six frames at a wider gap covers the same span at 160 px each — enough to show a mouth opening and a serving arriving, which is all a strip is for |
| D87 | A control names the action; the fill carries the state | Implemented (iteration 36) | The launch button read "Reloading" whenever busy, and a player firing on every cooldown is in the ready state 2.2 % of the time — measured — so the most prominent control in the frame read Reloading for a whole shift and four critics read it as a broken gun. It reads Launch always, and the reload sweeps the whole button instead of a 3 px hairline invisible at 960 px |
| D88 | Teach the cure wherever the cost is taught | Implemented (iteration 36) | Every irritation message was a price — +5 on the floor, +2.5 too late, "every miss raises IRRITATION" — and the meter falls when food lands, which nothing stated. `kitchen-destroyed` is 101 of 200 moderate runs: the most common death for an ordinary player had a stated punishment and an undocumented remedy. Both coaching lines now name the cure in the same sentence as the cost |
| D89 | A fault three readers keep reporting is a fault | Recorded (iteration 36) | The reload label was reported by four critics and explained away once as a capture artefact, on reasoning that happened to defend work already done. The fifth report was refused with evidence from a second instrument, and measuring took ten minutes and proved the critics right. When an independent reader repeats a finding, the next step is a measurement, never a better explanation |
| D90 | Nothing is drawn over the bar it is reporting on | Implemented (iteration 37) | The belly badge was centred on the fill because the row had space above it; D79 moved the MOUTH row in and the badge stayed. Since the badge appears BECAUSE the belly is in trouble, it blinded the player exactly when it mattered, in all four frames it appeared in. It rides the label line beside the number. The same error shape had put ONE MORE CHANCE on the timing readout, because the reserved meter band still described the two bars it was written for at D61 |
| D91 | A correct decision can be invalidated by a later correct one, and only a reader notices | Recorded (iteration 37) | The badge placement, the reserved band and the launch button styling were each right when written and each wrong by iteration 36 — invalidated by a row moving in above, a plate growing, and a word being removed. Nothing in `npm run check`, the five numeric gates or the fixture replay can catch a layout claim going stale; only a reader looking at a frame can. That is what the critic pass is for, and it is why presentation changes need one even when no rule moved |
| D92 | Anything load-bearing is drawn at twice what looks sufficient | Implemented (iteration 38) | Three markers in one pass were correct in the code and absent from the picture: the pay line at 2 px (1 px at 960, reported as "a threshold it refuses to draw"), the reload bar at 7 px (3 px at 960, making the control "pixel-identical across all six frames"), and a badge overlapping a bar by one pixel. D74 already required checking at 960; checking is not enough, because a thing can be checked and still be at the edge of visible. The rule is arithmetic: the audience gets half of what is authored |
| D93 | The remaining readability work is a scale pass, not more markers | Recorded (iteration 39) | Every named HUD element is now correct — it exists, says the right thing, names the right meter and appears at the right moment — and a critic shown close-ups can decode each one while reading almost none of them on a 960 px strip. Three iterations of enlarging individual markers each landed right in kind and short in degree. The next move is the HUD's type and stroke scale as a whole, deliberately, rather than a fourth round of widening single glyphs |

## FEAST stage 1 — the rules and the feel (branch `feat/feast`)

Opened by `docs/FEAST_BRIEF.md`, which wins over every other document. Stage 1 is
the pure simulation only (`lib/game/arcade.ts`, the bot harness, the tests); the
presentation is stage 2. Every number below was taken against the bot harness and
the brief's gates; the evidence and the final table are in `docs/qa/feast/STAGE1.md`.

| ID | Choice | State | Rationale / resolution point |
| --- | --- | --- | --- |
| D94 | The mouth is open by default and chews for 36 ticks after every catch | Implemented (stage 1) | Replaces the seeded open/shut rhythm (D39, D42) and every prediction helper (`projectMouth`, the timeline). Timing is now "do not shoot into a chewing mouth": a snack arriving mid-chew clanks off the teeth, is lost, resets the combo and costs half a point of irritation. Acceptance is decided by `tick < creature.chewUntil`, never by the aperture, so the renderer may draw the chew however it likes |
| D95 | Cooldown 30 ticks, six snacks in flight, default shot lands | Implemented (stage 1) | The default angle moved from −52° to −40° so the default angle and power land in a resting mouth; a beginner who never aims still feeds it. Cutlery does not count against the six |
| D96 | Five static kitchen bouncers with restitution; a bank is a named multiplier | Implemented (stage 1) | `ARENA.bouncers`: pan, shelf, lamp, chain, pot. One contact ×2, two ×3, three or more ×4; the lamp is worth two contacts. A floor bounce alone is ×1.5. Each bouncer is credited once per snack (`hitMask`) so a snack resting on the shelf cannot farm it. The trampoline belly and the vent flap are banks too |
| D97 | Five consecutive catches is a FRENZY for 360 ticks; it does not extend itself | Implemented (stage 1) | Mouth gape ×1.5, no chewing, cooldown 15, every score ×3. The first build let a frenzy refresh on every fifth catch, and the moderate bot sat in one permanent frenzy from 40 s to 120 s; now the combo is spent when the frenzy ends and the next one is earned from zero. Frenzy servings raise no appetite — the power fantasy has no bill |
| D98 | Mutations are upside plus chaos and the first level starts its own clock | Implemented (stage 1) | Metal: magnet pull on metal food and on cutlery, storms of forks that pay +500 in the mouth and jam the launcher 45 ticks on it; the clog is gone. Balloon: lift 12 px and bob ±10 px per level, belly becomes a trampoline toward the mouth (OFF THE BELLY ×2). Pepper: fire breath on a 40-tick tell, a 50-tick cone that cooks snacks for ×2, a bench fire when a cooked snack lands on the bench, a singe jam when the launcher is inside the cone. The first storm comes 120 ticks after the chip lights, the first flame 180, so the consequence is legible rather than instant |
| D99 | The belly economy: drain ramps with time, servings shrink with size, combos and cravings feed better | Implemented (stage 1) | `drain = (0.06 + 0.005·(size−1) + 0.08·minutes) × appetite × temper`; a serving restores 8 (craved 18 + 8), divided by `1 + 0.6·(size−1)`, times `1 + 0.08·min(combo−1, 9)`. Measured over 120 shifts: the naive spammer and the aiming bot feed at nearly the same rate (0.9 vs 1.3/s) because the chew caps everyone, so survival separation had to come from what each catch is worth — combo, craving — and from gorging, which raises appetite five times as fast (D40 kept, sharpened). Together these moved good ÷ naive from 1.3× to 2.5× |
| D100 | One seeded temper per shift scales the drain by 0.6–1.4 | Implemented (stage 1) | Replaces the rhythm temperament (D42). With a time ramp and a frenzy-chaining endgame, deaths bunched at 90–120 s regardless of skill; a wide temper and a gentler slope (0.08/min, not 0.13) spread the moderate's deaths to 37 % in the worst bucket. The cost is that seeds differ in difficulty by up to ×1.4, which the result screen should own ("a hungry one") |
| D101 | The chest is only below the chin, and rises with the mouth | Implemented (stage 1) | The belly ellipse's left flank used to sit in front of the face as the creature grew, and at `risePerSize` 48 it stopped every flat shot. The belly check now applies only below `mouthY + mouthRy`, and `by` follows the mouth's rise fully. The vent flap moved from mid-kitchen to under the ceiling for the same reason: in FEAST nothing stands between the launcher and the mouth |
| D102 | The mouth rises 48 px per size unit, not 33 | Implemented (stage 1) | A naive fixed shot that still lands at every size is a spammer that never has to adapt. The rig must be recalibrated to this (`scripts/mouth-calibrate.mjs`), which is stage 2 work |
| D103 | The hatch stays in the trace but is never required | Implemented (stage 1) | It blocks a lunge and a singe and locks the launcher for 84 ticks. No bot presses it and every gate passes without it. `hungerDebt` is always 0 |
| D104 | Legacy names are kept so the current renderer type-checks | Implemented (stage 1) | `Projectile.kind` keeps `"junk"` (now a utensil) and `"spit"` (never produced); `ArcadeEvent.type` keeps the retired types; `creature.pressure`, `creature.clog`, `state.snubs`, `state.hungerDebt`, `TUNING.snubRage`, `apertureAhead`, `getHazard`, `previewFlight`, `payRate` remain. Stage 2 may delete them once `lib/render` and `app/` stop reading them |
| D105 | The bots aim analytically and let the rules verify | Implemented (stage 1) | The ballistic solution to the mouth seeds candidates; `probeFlight` decides; the bot fires the centre of the widest window of landing angles and holds when the window is narrower than its own noise. It spaces its arrivals past its own predicted chews and leads the bob by probing from the launch tick rather than the stale one. The naive cycles the three snacks so a beginner sees every mutation |

## FEAST stage 2 — the presentation (branch `feat/feast`)

Pillars 6 and 7 of the brief. Nothing in `lib/game/arcade.ts` changed; the evidence
is in `docs/qa/feast/STAGE2.md` and the captures in `docs/qa/loop/iter-1`.

| ID | Choice | State | Rationale / resolution point |
| --- | --- | --- | --- |
| D106 | The creature is drawn as a clipped layer, scaled as a whole and pinned to the rules' mouth | Implemented (stage 2) | The warp cannot stretch the painting past ×1.14 without the skin dissolving, which is why 39 iterations of growth were invisible. The painting is now drawn through a tightly traced silhouette (`SILHOUETTE` in `anatomy.ts`), scaled about its resting mouth by `1 + 0.36·(size−1)` wide and `1 + 0.06·(size−1)` tall (+3.5 % wide a balloon level), and translated so the drawn mouth lands on `creature.x, creature.y`. Growth, lift, bob and tracking are all that one transform; the mouth's own scale is the rules' `mouthGrowX/Y` divided by the body scale, so `scripts/mouth-calibrate.mjs` now fits the rules' constants to within 1 px per size without a coefficient. Wider than tall because the mouth is the anchor and the rules keep it low (48 px a size, plus up to 36 of lift and 30 of bob): 0.06 is the most vertical scale that keeps the eyes on screen at the cap with a full balloon under them |
| D107 | The kitchen behind the creature is in-painted, and the sill is drawn back over it | Implemented (stage 2) | A moving, scaled layer exposes whatever the painting has under it, which was a second creature. `rig.backdrop` is the painting with the silhouette cut out and pull-push filled; it is only ever seen in slivers. Everything below `SILL_Y` (466) is drawn again on top, so a creature that has grown past the counter sinks behind it instead of standing on it |
| D108 | The HUD is the creature plus five things | Implemented (stage 2) | Deleted: the MOUTH/BELLY/IRRITATION plate, every `→ 1.5 s` / SHUT THEN marker, the pay multiplier, NEXT CHANGE, ITS SIZE, the coaching line and the phase label. Kept: score (left, 52 px), time (right), three chips (top centre, level ×N, a glow when a level lands), the craving ring (54 px, shrinking arc), a combo counter by the launcher that grows with the combo and becomes a pulsing FRENZY banner with a time bar, and one slim belly bar under the creature with no numbers that flashes red below 25 %. Irritation is the flush and brows plus a red vignette above 70 |
| D109 | One caption at a time, by priority | Implemented (stage 2) | Captions are short, big, funny and never instructions: NOM., THAT ONE. YES., OFF THE PAN ×2, UTENSIL +500, COOKED, IT IS ON FIRE., FIRE BREATH, CLANK., BIGGER., MAGNET MOUTH ×1. A new caption replaces the current one only if its priority is at least as high or the current one is more than half spent. They live in the empty left third of the kitchen, clear of the creature at every size. Score pops are numbers only, at the catch, scaled by value |
| D110 | The hit-stop is three held frames in the page's frame scheduler, and the renderer holds its clock with it | Implemented (stage 2) | The simulation cannot know about frames. On a `feed` (or a caught utensil) `app/page.tsx` steps nothing for three animation frames and drops the remainder rather than banking it, so the world resumes at its own pace; `lib/render/scene.ts` holds its render clock for 50 ms off the same event so particles, springs and captions freeze with it. Under reduced motion neither holds. Replay is unaffected: the trace records ticks, and the hold only shifts wall time |
| D111 | Every effect degrades to colour and pose under reduced motion | Implemented (stage 2) | No shake, no rumble, no hit-stop, no caption scale-in, fewer and slower particles, static flame and fire, static rings; the belly bar's red flash becomes a solid red; the chip glow is off. Nothing on screen flashes above 3 Hz: the belly flash is 2.5 Hz, the frenzy pulse 2.6 Hz |

### Proposals recorded rather than implemented (stage 2)

- **P7 — The belly ellipse should follow the drawn body.** `TUNING.belly` grows by `bodyGrow` 0.085 a size while the drawn body now grows 0.36 wide, so at size 2 a balloon bounce is credited up to 90 px before the snack touches the painted belly. Proposed: `bodyGrow` ≈ 0.3 on x (keep y), which is a rule change and moves the trampoline window, so it needs a bot run.
- **P8 — The lamp bouncer sits on the forehead.** `(760, 60)` is above the creature's left eye from size 1.5 on; the prop is drawn in front of the head because the rules say a snack bounces there. Proposed: move it to `(690, 52)`, between the painted lamp and the antennae, or make it the painted lamp at `(609, 68)`.
- **P9 — A `craving` relief and a `beat` drool deserve no caption**, and there is no event for the combo itself (a `combo` event with the count would let the counter's pop be driven by the rules rather than inferred from the last feed).

## FEAST stage 3 — pacing, the camera and the props (branch `feat/feast`)

Opened by the stage 2 review of `docs/qa/loop/iter-1`: the escalation was spent in
the first half minute, the face left the frame from ×2, and the props were
outlines on a painting. The evidence is in `docs/qa/feast/STAGE3.md`, the bot
table in `docs/qa/feast/stage3-bots.json` (200 shifts), the captures in
`docs/qa/loop/iter-101` and `iter-102`.

| ID | Choice | State | Rationale / resolution point |
| --- | --- | --- | --- |
| D112 | Mutation levels land at rising serving thresholds, 10 / 28 / 70 per ingredient | Implemented (stage 3) | Replaces "three servings a level" (D98). `TUNING.levelServings` is cumulative per ingredient; `levelFor` and `servingsForLevel` are the helpers. At three a level the moderate bot had every ingredient at ×3 by 29 s. Now its first level lands at 27 s (p10 18, p90 49), the third level of any one ingredient is a late-shift event (p10 142 s, fewer than half the runs get there) and the naive spammer still sees its first chip at 28 s. The bots rotate ingredients evenly, so for them "first ×3" and "all three ×3" land seconds apart; a human with a favourite snack separates them. GAME_VERSION 5 |
| D113 | Growth per feed is 0.014, back-loaded, and the gorge doubles it | Implemented (stage 3) | Was 0.05 front-loaded (×1.9 at birth). `growthShape` −0.3 makes a serving worth 0.7× at ×1 and 1× at the cap, because the first frenzy gorges it early anyway: every catch in a frenzy lands on a full belly and grows it double (the title's punishment, kept). Measured: ×1.5 at 67 s median, ×2.0 at 141 s censored (122 s among the 67 % of runs that get there), the first BIGGER. card now takes more than six servings |
| D114 | The craving gap is 120 ticks and the growth pause caps at 120 | Implemented (stage 3) | At gap 80 / cap 150 the moderate bot chained cravings back to back and growth was paused for about 70 % of its shift, which is why no per-feed growth number could pace the curve. At 200 / 120 the chain also carried the bot's survival (appetite relief, 18-point restores) and the median fell to 95 s. 120 / 120 is the middle: the pause is still the reward for a craving, and it is no longer most of the shift |
| D115 | The drain is `(0.06 + 0.015·(size−1) + 0.07·minutes) × appetite × temper`, temper 0.5–1.5, servings shrink by 0.42 a size | Implemented (stage 3) | Replaces D99/D100's numbers. The per-minute term is the naive bot's killer (it dies when the drain crosses its fixed feed rate; a steeper slope ends it sooner), the size term is the moderate's, and with size now arriving later the slope had to carry more. Tried and rejected, with the measurements in STAGE3.md: a bigger per-size term (naive lived to 80 s), a bigger appetite relief (naive meets nearly every craving by spraying all three snacks, so it gained more than the moderate), `missRage` 8 (feeds cool irritation faster than misses raise it; nobody died of it). Temper 1.0 keeps the moderate's worst 30-s bucket at 27.5 % |
| D116 | The bot harness gates the pacing as well as the brief | Implemented (stage 3) | `scripts/loop-bots.mjs` records when each run reaches its first level, ×1.5, ×2.0, the first ingredient at ×3 and all three, and reports censored percentiles: a run that never gets there sorts after every time, so a median reads "never" when fewer than half the runs reached the mark, and "not before N s" passes on "never". Six pacing gates sit beside the brief's eight. `--bots` filters the run; `playShift(…, { timeline: true })` returns a per-second sample for tuning |
| D117 | A camera pull-back, in steps, once the creature is past ×1.4 | Implemented (stage 3) | The rules put the mouth at y ≈ 150 late in a shift and the eyes are 29 px above the mouth's top at any scale, so from ×2 the face left the frame, and the face is the character (the stage 2 report's first open item). `lib/render/scene.ts` scales the whole arena-space scene about `(600, 530)` by the factor that keeps the brow 80 px and the antennae 24 px below the top edge, computed from the rules' geometry with the bob's whole swing allowed for, quantised to 0.04 and only ever downward, each step eased over 1.5 s (a cut under reduced motion). The room beyond the frame is the same painting, dark; the creature is not clipped to it, so a head that no longer fits is drawn over the dark. Measured at ×2.4 with balloon ×3: zoom 0.80, brow 93 px at the worst of the bob. The HUD, captions and FRENZY stay in screen space; the craving ring, belly bar and combo are placed from the creature's and the launcher's on-screen positions; the pointer aim is taken from the launcher's on-screen position (a uniform zoom preserves angles, so the mapping is otherwise unchanged); the camera applies on the ending screen too. P5 is closed by this, in the other direction |
| D118 | "IT NO LONGER FITS." is a beat | Implemented (stage 3) | The first camera step of a run fires a priority-6 card caption, once. The camera is presentation and decides nothing, so this is the one caption that is not driven by a rules event |
| D119 | The props are painted to the room: dark enamel and iron, an amber rim from the lamps on the right, soft shadows, cords, sway, a glint on a hit | Implemented (stage 3) | Every bouncer and the vent flap were grey vector outlines on a painterly scene. Now: a cast-iron pan on a cord with a wall shadow and a lit handle; a tin-shade pendant lamp with a lit underside and a wire cage in silhouette; a stock pot standing on the counter with a contact shadow, a reflection smear, a sheen and a lit rim; a dark plank on iron brackets with three bottles in silhouette, each with one bead of lamplight; a chain of dark links lit on their right side with a hook; the vent flap as louvred tin. Hung props sway slowly; a bounce drives a white glint along the rim through the existing wobble spring. No prop is an outline. The shelf integrates as a silhouette so it stays |
| D120 | The cheeks flush as soft radial glows, and the three cool washes share one budget | Implemented (stage 3) | The irritation flush drew three red stroke lines on each cheek and pepper's pressure marks drew three more; both are now radial glows (the pressure mark keeps a hotter core). Metal's steel wash, the balloon's taut rim and hunger's pallor compounded into a white creature late in a shift; they now share `WASH_CAP` 0.5 of summed cover and are scaled back together past it, and the flat components were reduced (metal 0.24 → 0.16, pallor 0.45 → 0.3). A creature carrying every mutation at ×2.4 is still green with a flush |

## FEAST stage 4 — the tokens (branch `feat/feast`)

The three snacks are crypto tokens and the title is "do not feed it your
tokens". Presentation and copy only: `lib/game/arcade.ts` is untouched, the
ingredient keys (metal / balloon / pepper), the trace and the fixtures stay
exactly as they are. Evidence: `docs/qa/feast/STAGE4-TOKENS.md`, captures in
`docs/qa/loop/iter-200`.

| ID | Choice | State | Rationale / resolution point |
| --- | --- | --- | --- |
| D121 | metal → Bitcoin (HODL jaws), balloon → Ether (gas belly), pepper → HEMI (turbo breath); the rules keep their keys and the screen translates | Implemented (stage 4) | `lib/render/tokens.ts` owns the marks, the plates and the copy. Rule labels (MAGNET MOUTH ×1, OFF THE BELLY ×2, UTENSIL +500) are translated on the way to the screen by `tokenCopy`, so the frozen traces and fixtures replay unchanged and the renderer never asks the rules for a word. Cravings: IT WANTS BTC. / ETH. / HEMI. Cooked is TURBO'D ×2, the bench fire is THE KITCHEN IS CONGESTED., the breath is TURBO BREATH (the contest is the Turbo Edition). GAS SPIKE. is said on a bounce off the belly (the rules have no burp or vent beat; the belly trampoline is the gas event). Strapline: "Feed it your tokens. Deal with what it becomes." One token joke per ending (petty cash, your bags, the treasury, the foundation); nothing about prices, crashes or exploits |
| D122 | The marks are drawn unmodified; the coin is a plate behind the mark and every effect is around it | Implemented (stage 4) | Hemi asked that its logo not be modified in look and feel; the same rule is applied to all three. The mark only translates, tilts toward its heading by at most ±15° (`MARK_TILT`, never upside down; 15° on the floor, never squashed) and scales uniformly with the camera. The plate is a radial disc in the game's palette (BTC: a dark rim, its own mark is the coin; ETH: a pale plate, the grey Ξ vanished on dark enamel at 960 px; HEMI: dark enamel, orange rim). Spin is a glint running round the rim outside the mark; the tail, glow, selection ring, turbo ring, flame trail and magnet arcs are unchanged and sit around it. The DOM uses the same SVGs as `<img>` in a round `.item-art` plate with no blend or filter. Recorded in `docs/ART_PROVENANCE.md` |
| D123 | The marks are rasterised once, with their plates, at 56 / 112 / 224 device px | Implemented (stage 4) | Three bitmaps per token; each draw picks the smallest at or above `size × devicePixelsPerLogicalPixel × zoom`. `scripts/render-budget.mjs` on the typical state: 3.90 ms median (stage 3: 4.65), the coins cost nothing measurable. Nothing is rasterised per frame; `ready()` waits for every mark to decode or be given up on |
| D124 | The HEMI mark loads from `public/art/tokens/hemi.svg`, then `hemi.png`, then falls back to a stand-in without a log line | Implemented (stage 4) | The kit file had not landed at the time of this pass. The stand-in is an orange disc with a white H in the display font — plainly not the brand mark — on the same plate the real one will sit on, so the frame composition does not change when the file arrives. Nothing is logged: a missing file is the expected state until the kit lands, and a scary console line on the judges' stream would be worse than the stand-in. `scene.hemiFromKit()` reports which one is on screen |
| D125 | Cutlery storms carry the occasional hardware wallet; a wallet in the mouth is COLD STORAGE +500, a wallet in the launcher is SEED PHRASE LOST. | Implemented (stage 4) | Presentation only: which piece of junk is a wallet is hashed from its projectile id in the renderer (about 22 % of pieces), the rules see one kind of junk. The catch and jam captions look for the piece that vanished nearest the event last frame; when the renderer cannot tell (a fast-forward in the harness) the catch says COLD STORAGE and the jam says FORK IN THE WORKS. The wallet is a 36 × 22 dark rectangle with a small lit screen and one button; forks, spoons and knives are as before |
| D126 | A coin clink on launch and on a catch, pitched by token, on top of the existing cues | Implemented (stage 4) | `clink-btc` 1480 Hz, `clink-eth` 1760 Hz, `clink-hemi` 2217 Hz: two inharmonic partials with a fast decay and a tick of noise, at a level under the feed cue. Everything else in `lib/engine/audio.ts` is unchanged. Reduced motion is unaffected (audio is not motion) |
| D127 | The community diet is a nullable stub with one line of copy | Implemented (stage 4) | `lib/community/diet.ts`: `communityDiet` (BTC / ETH / HEMI shares and a window label) is `null`; `communityDietLine` renders "The community fed it 61% BTC this week." for the largest share and nothing for null or no servings. The line sits under the title legend. Nothing is wired to the chain; the chain layer fills the object later. Pinned by `tests/tokens.test.mjs` |

## FEAST stage 5 — the lore (branch `feat/feast`)

The fiction around the coins is crypto too. Copy only: `lib/game/arcade.ts`,
the trace and the fixtures are untouched. The canon is `docs/LORE.md`; the
words are in `lib/render/lore.ts`; captures in `docs/qa/lore/iter-1`
(`scripts/lore-shots.mjs`).

| ID | Choice | State | Rationale / resolution point |
| --- | --- | --- | --- |
| D128 | The frame is a DAO, not a restaurant job: Governance Proposal #004 "Do not feed it" passed and nobody enforces it; the Questionable Appetites DAO's kitchen is where the devs cook; Munch is what they cooked and has a full Bitcoin node for a stomach; the player is the night-shift keeper and the clock is uptime | Implemented (stage 5) | The user asked for the lore to be more crypto-specific once the snacks were coins. The painting is a kitchen and stays one, so the frame explains the kitchen ("every protocol has a kitchen: that is where the devs cook") instead of replacing it. The Bitcoin-node stomach is Hemi's virtual machine as an animal (Bitcoin and Ether in the same bite), the one Hemi reference that is about the creature rather than about Hemi's products. The monster is not placed in a bridge or tunnel: a thing that eats deposits reads as an exploit joke and would land on the sponsor |
| D129 | The double-meaning rule: every crypto word on screen is also literally true of what is on screen | Implemented (stage 5) | HARD FORK is a fork in its mouth, SLIPPAGE is drool, TOKEN BURN is the bench on fire, REVERTED is a coin off the teeth, TX DROPPED is a coin on the floor, SCALING is it growing, BLOCK FULL is it outgrowing the frame, MULTI-HOP is two banks, FOMO is the frenzy, MAXI TANTRUM is a craving ignored, ORDER FILLED is a craving met, FORKED is a fork in the launcher, TX STUCK is a wallet in it, EXTRACTOR: EATEN is the extractor vent bitten off, ONE TX PENDING is the last serving, OUT OF GAS is the empty belly. A judge on a compressed stream who does not know the slang still sees what happened. The D121 limits stand: nothing about prices, crashes, rugs, hacks or exploits; REKT is only ever the kitchen, wrecked. A fresh-context review moved four lines that broke the rule or leaned on real losses: BASED → ORDER FILLED, IT ATE THE MEV BOT → EXTRACTOR: EATEN (no bot is on screen), CHAIN SPLIT → FORKED, and stage 4's SEED PHRASE LOST → TX STUCK (people have really lost them). Stage 4's TURBO'D ×2 is TURBO'D. — on a HEMI coin the ×2 read as "HEMI 2x" |
| D130 | The epoch report: IT'S SO OVER. / WE'RE SO BACK. (new best, or surviving to the cap), a cause, the size joke and a wallet tier (shrimp, dolphin, shark, whale by `state.ending`) | Implemented (stage 5) | The rules' `ENDINGS` (employee handbook, shift supervisor, the counter, promoted) and `state.announcement` are no longer shown; the page composes the screen from `failureReason` and `ending` through `CAUSES`, `ENDING_JOKES` and `WALLET_TIERS`. The twelve-minute cap ends in IT REACHED SUPERFINALITY. and always headlines WE'RE SO BACK. The size jokes climb gas money → a whole block → the mempool → the chain; stage 4's bags / treasury / foundation were replaced because, next to REKT, "Unaudited" and a report titled POST-MORTEM (also replaced, by EPOCH REPORT), they read as a governance-exploit write-up and as a jab at a real foundation. Restart is "Ape back in", the one flavoured control. The rules' strings are left as they are; `tests/lore.test.mjs` replays the three frozen shifts and fails if any label the screen shows reaches it untranslated |
| D131 | The lore is checked against the Sept 9 and Oct 7 office hours: veHEMI as a weapon; "Unaudited" kept | Implemented (stage 5); "Unaudited" confirmed by the user | Sept 9: two community questions on the Genesis drop claim contract, exploited through a re-entrancy bug after skipping the full audit under deadline. Swapping "Unaudited." and "UNAUDITED" for "Unconfirmed." / "DRAFT" was proposed; the user chose to keep "Unaudited" and keep it friendly: it always sits next to "friendly" and is about Munch ("Friendly disposition. Unaudited.", "UNAUDITED BUT FRIENDLY"). Nothing else on screen says claim, airdrop, re-entrancy, drained, exploit or prices (`tests/lore.test.mjs` scans the page). Oct 7: Max said veHEMI as an in-game weapon would be funny — the help now says Munch locks up every HEMI it eats, so its turbo breath is technically veHEMI. Jeremy's "staked vampires" demo is the same double-meaning pun D129 asks for. Summary in `docs/LORE.md` |

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
