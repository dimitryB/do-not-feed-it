# Local physical game review — September 9, 2026

Branch: `codex/creature-arcade`. Local practice only; no chain attestations,
mainnet transactions, hosted release, repository publication or submissions.

## Independent work and review

The user explicitly requested agents for implementation and harsh visual review.
A simulation agent implemented and tested the pure arcade rules. An asset/audio
agent generated three original assets and implemented procedural audio. A separate
visual reviewer inspected actual browser screenshots. The main agent integrated
the renderer, UI, input, effects and iterative fixes.

The reviewer rejected the initial duplicate start buttons, face-obscuring craving
card, flat launcher, translucent food, tiny labels, and conflicting pre-run HUD.
The second pass was accepted for title composition and gameplay hierarchy, with
further requirements for tooth alignment, a grounded launcher mount, nonduplicated
mutation instructions and more state coverage. This is evidence of a review
process, not an objective claim of AAA quality or perfect game feel.

## Browser observations

Codex in-app browser, macOS. Tested desktop and narrow phone-shaped viewports.

- The title has one primary start action and no wallet gate.
- Default aim physically launches a shot and catches it after flight, not on click.
- Three servings trigger warning then active mutation; score and streak advance.
- Magnetic teeth, balloon lift and pepper gust were activated through real UI play.
- Keyboard Space, pointer food selection, launch button and phone aim slider used.
- Pause stops tick/time advancement; help and mixer use the retained focus trap.
- Fullness and irritation are visible on the narrow layout; no horizontal overflow.
- No console errors/warnings were observed in the checked browser states.
- Local best uses a versioned device-local key; no global ranking is implied.

Screenshots were saved under `/tmp/dnfi-qa/` for review. Temporary artifacts are
not committed as product assets. Final selected screenshots may be retained in
`docs/qa/` with their state and date.

## Automated evidence

`./scripts/check.sh` passed on September 9, 2026: application TypeScript and
ESLint; 23 Node tests (15 physical arcade, 4 legacy harness, 4 D1); 4 V0 contract
tests; Solidity compilation; full client/server/Workers production build.

Physical tests cover flight before scoring, all three force changes, one active
mutation and warning/expiry, pepper pulse telegraph, preview/live equality, floor
rebound, bounds, capacity, event cap, replay malformed traces/cooldowns, terminal
immutability, full 120-second survival, vent warning/movement/swept collisions,
and craving reward. They do not establish cross-browser/Workers replay integrity.

Procedural audio had type/lint and temporary mocked WebAudio lifecycle checks:
no context before unlock, bounded sources, live bus/master/mute changes, pause and
disposal. No subjective listening panel or hardware audio compatibility audit.

## Balance evidence

A deterministic scripted launch every two seconds through a whole shift showed
an initial flaw: metal-only fixed aiming outscored adaptive cravings. The craving
bonus was increased and a warned moving flap introduced after 40 seconds. With
these provisional rules, fixed metal scored 10,760, while adaptive cravings scored
14,430. Both survived. This is a useful regression observation, not human fun data.

## Remaining release gates

Uncoached human playtests, broader browser and physical-device checks, gamepad,
formal frame-time/memory measurements, subjective audio review, a richer authored
creature rig, and the complete verified Hemi communal loop remain outstanding.
Do not mark M3–M7 complete or describe the V0 registry as validating these rules.

## Final browser run and review

A real UI-driven 120-second shift completed after final physics alignment:
**12,440 points, 33 caught snacks from 50 launches (66%), seven mutations, survived**.
Food selections followed visible cravings and keyboard aiming adjusted during
balloon lift. The timed vent caused observable deflections and misses. Immediate
restart reset time, score, food and aim; pause then stopped the new run. These
are automated browser inputs, not an uncoached human playtest.

The final separate critic reviewed `docs/qa/balloon.png`, the vent/catch captures,
and `docs/qa/survival.png`. Final verdict: no blocking visual defects in the
reviewed captures. The creature's inflated silhouette, teeth alignment, impact
attribution, title hierarchy, pause and narrow result/restart layout passed.
Remaining aesthetic limits: a simple vent compared with the illustrated room,
limited authored creature expressions, and small secondary hints. The critic's
browser surface was unavailable, so independent work was screenshot review;
the parent agent drove the full browser playtest.

Mute was toggled, observed persisted after reload, and restored to audible state.
Shift+Tab from the guide container wrapped to its final button; Tab wrapped back
to Close; Escape closed the dialog. Final browser warning/error log was empty.
The viewport override was reset and the title was left ready for the user.
