# Game design: Do Not Feed It

This is the implementation brief for the selected concept. Confirmed user
direction is distinguished from proposed design defaults in
[the decision register](DECISION_REGISTER.md). Values here should be tested,
not treated as already-proven balance.

## 1. One-sentence promise

Work a short shift feeding a strange creature; every ingredient can change the
physical rules of the kitchen, and the community's verified diet changes the
creature encountered in later shifts.

The title is an invitation to make a bad decision. The humor should come from
consequences the player sees and can exploit. A scoreboard or explanatory label
cannot substitute for a physical transformation.

## 2. Audience and contest position

The immediate audience is a Hemi community member opening a URL, including
judges sharing one desktop browser while talking. Prior gaming skill, wallets,
Bitcoin ownership and Hemi inside knowledge must not be required for practice.

Primary category aspirations are Most Original, Best Overall and Community
Choice. Meaningful shared state supports an innovation case. Creepy creature
design is welcome, but this is playful creature comedy. No need for gore,
extreme jump scares, attacks on real people, or a horror campaign.

An observer should understand a mistake from the picture: a magnetic tooth
pulls a can off course; a floating tray drifts toward a vent; a pressure burp
knocks food back into the machine. Big readable transformations produce useful
commentary, clips and memories even when the observer never touches a control.

## 3. Product pillars

1. **Feed → transform → adapt.** Ingredients change how the next shot behaves.
2. **One room, one creature, one main verb.** Spend art and programming effort on
   expressiveness and feel rather than environment count.
3. **Understandable mistakes.** Telegraph changes and show the cause of a miss.
4. **Competence before chaos.** Teach safe shots, then combine familiar rules.
5. **An amusing result either way.** Success and failure both deliver a payoff.
6. **A shared creature worth revisiting.** Canonical community state changes later
   sessions without destabilizing a run already in progress.
7. **Immediate access.** Guest practice first; recording happens between runs.

## 4. The complete intended player loop

### Arrival

The first viewport shows the kitchen/creature or a game-native attract screen,
the primary Play action, visible master volume, and a short control hint. The
network indicator is small and accurate. No marketing page precedes the game.

Practice starts without wallet connection. If a current community snapshot can
be read, its phenotype is shown. If offline, use a clearly labeled local practice
configuration. Never show a fabricated live world, player count or leaderboard.

### Shift

1. Read the creature's next craving, indicated by ingredient shape plus label.
2. Select/load food into the feeding machine.
3. Aim and launch it into the mouth through a small physical play area.
4. Recover from misses, avoid waste hazards, and maintain fullness/composure.
5. Notice the mutation warning caused by the diet.
6. Exploit or counteract the new behavior to continue feeding.
7. Survive the shift and improve score through accuracy, adaptation and combos.

### Result and return

Show the final score, performance summary and a short comic consequence. Restart
is immediate. If ranked recording is available, offer one clearly explained
submission flow and show its progress inside the same tab. Explain how much this
verified run contributed to the next creature form only after confirmation.

The community panel explains the current form, its epoch, how it arose, and the
next update. It should make a useful statement such as “Metal diet: magnetic
teeth next shift,” not display raw contract fields as the main player content.

## 5. Final controls: proposed defaults

| Action | Desktop keyboard | Pointer/touch |
| --- | --- | --- |
| Aim feeder | A/D or left/right | Drag across a clearly bounded aiming region |
| Select ingredient | 1/2/3 | Three large labeled ingredient controls |
| Launch | Space | Launch button / release gesture if playtests support it |
| Pause/options | Escape or visible control | Visible control |
| Restart after result | R | Play again |
| Audio | Visible master control | Same |

Choose one pointer launching scheme during the first physical prototype. Do not
ship two contradictory drag/release semantics. Avoid requiring simultaneous
precision gestures on a phone. All gameplay shortcuts must yield to focused
controls and open dialogs; ordinary page scroll and input should keep working.

The current scaffold exposes only selection and immediate feeding. Those
controls are a harness, and must evolve into the physical launch mechanic.

## 6. Ingredients and transformations

Launch with three ingredients unless playtests show that two produce enough
depth or a fourth is essential. Use different silhouettes and labels as well as
color. The following behaviors are proposed, not implemented physical effects.

| Ingredient | Visual identity | Mutation | New player decision | Main readability cue |
| --- | --- | --- | --- | --- |
| Metal | Bent can / angular scrap | Magnetic teeth | Curve a metallic shot around a hazard; compensate for attraction | Teeth align; attraction arcs appear before force activates |
| Balloon | Inflated food pouch | Balloon belly | Account for lift and slower fall; use a higher route before air escapes | Belly expands; upward particles and a buoyancy indicator |
| Pepper | Pepper pod / spice packet | Pressure burp | Time shots between predictable gusts, or use a gust for a rebound | Cheeks swell, pressure marks climb, then a directional exhale |

Clocks/time echoes were part of the original idea. Keep them as a stretch
ingredient: replaying object motion interacts with physics, determinism,
telegraphing and balance and should not block launch. Ingredient mixing and
recipes are also stretch features. The core game must be fun without crafting.

### Mutation lifetime and combinations

- Prototype default: a diet threshold produces a warning, an active effect and
  a clear recovery phase. Test roughly 1–2 seconds of warning and 6–10 seconds
  active before deciding the values.
- The scaffold currently announces a mutation on every third correct serving
  of an ingredient and keeps the label for eight seconds. This is test scaffolding.
- Start the physical build with **one active effect**. Enable a maximum of two
  only after each is readable and every pair has a deliberate behavior.
- Choose a deterministic ordering when two effects affect one projectile.
  Never let frame timing or array iteration accidents determine outcomes.
- A mutation can help a skilled player. It should not always be a penalty for
  doing the central action successfully.
- The community phenotype is a bounded modifier of the shift, not an unlimited
  accumulation of every historical effect.

### Pairwise design questions

| Pair | Candidate interaction | Failure to avoid |
| --- | --- | --- |
| Magnet + buoyancy | Slow lifted metal food can be pulled through a curved route | Food stuck in an endless orbit or unreachable target |
| Magnet + pressure | Time the shot after an exhale so attraction catches it | Unannounced force reversals |
| Buoyancy + pressure | Ride a predictable gust over a low obstacle | Items floating forever outside the arena |

Each interaction needs a timeout/escape rule and a deterministic terminal state
for projectiles. Cap objects and particles independently.

## 7. Round structure and difficulty

Provisional standard shift: **120 seconds**. This is a proposed scope decision,
not a conclusion that POP's successful five-minute round was too long. A shorter
shift allows rapid testing, repeated attempts and a complete judging experience.

| Segment | Intended experience |
| --- | --- |
| 0–15 seconds | One safe food and a large mouth; player learns to aim and feed |
| 15–35 seconds | Introduce the next ingredient and one clearly warned mutation |
| 35–65 seconds | First memorable chain reaction; spectators understand the cause |
| 65–95 seconds | More demanding trajectories and recovery choices |
| 95–120 seconds | A controlled finale using learned behaviors; visible countdown |

The game may end early through neglect or repeated mistakes. Avoid invisible
immunity, abrupt unfair spikes or a script that guarantees the same ending for
every player. The first session should build confidence; repeat attempts should
reward better timing and adaptation rather than memorizing hidden rules.

The current kernel begins at 70 fullness, loses one point per second, gives
12 fullness per correct feed, and adds 18 rage per incorrect feed. Those are
harness values. Physical food supply, travel time and feedback will change the
balance, so do not tune the final game around button-spam success in this harness.

## 8. Scoring and failure

### Intended score sources

- Successful feeding, weighted by demonstrated skill rather than raw inputs.
- A capped combo for consecutive good shots.
- Clearly shown precision, rebound or mutation-assisted bonuses if they improve
  play and can be reproduced by the verifier.
- Small survival/completion incentives only after balance is understood.

Avoid high score from idle waiting, input spam, intentionally farming endless
projectiles, repeated duplicate submissions, or paying gas more frequently.
The game has no financial payout for gameplay score in this design.

The V0 kernel awards `100 × combo`, with combo capped at five, for correct feeds.
Wrong feeds reset combo. The V0 contract bounds score by `500 × correctFeeds`.
Every future score change must update game version, server replay and contract
validation together where applicable. No POP answer/shot ceiling should survive
merely because it was already tested there.

Failure should be visually clear and mildly comic. Examples are placeholders:
“It ate the shift supervisor,” “It has a complaint about the menu,” or “The
inspection report has been eaten.” Test tone and avoid repetitive punchlines.

## 9. Community creature and replayability

The proposed community mechanic uses discrete epochs. Verified runs contribute
bounded diet values to the next epoch. The next creature's form is derived from
those contributions and a versioned rule. A run reads one snapshot at its start
and keeps it for its duration; changes happen between runs.

Desired player story:

1. “Everyone fed it metal yesterday.”
2. “Today it has magnetic teeth.”
3. “My shift contributes to tomorrow's creature.”

This is proposed behavior; the scaffold has no live community state. See
[architecture](ARCHITECTURE.md) for aggregation, fairness and verification.

Offer replay of a fixed challenge/snapshot for comparable scores. Cosmetic
lineage can tell a story without altering competitive conditions. Do not compare
scores across materially different physics as if all runs were identical.

A new installation must be playable with one user. Provide authored starting
forms and well-defined empty-epoch behavior. Do not fake community history to
hide an empty system. An author can play real test runs before an event; label
any demonstration data and keep it out of production rankings.

## 10. Visual direction

Proposed direction: an industrial feeding station with an expressive, tactile
creature. Dark blue-green equipment, pale readable labels, a punchy citrus accent
and occasional Hemi orange can distinguish it from POP's orange television set.
Treat this palette as a starting point; one coherent final art direction matters
more than preserving those particular hex values.

Use a large creature face/mouth and a simple trajectory. The playfield should
occupy most of the desktop viewport. Reduce side panels and text during action.
Food silhouettes must remain legible at compressed stream resolution.

The creature needs a small high-quality expression set: idle anticipation,
tracking food, satisfied gulp, disgust, warning buildup, mutation reveal,
recovery, and result. Animation should sell weight and cause-and-effect through
anticipation, contact, squash, recoil and settling. Test a deliberately simple
visual prototype before commissioning a large sprite library.

Original sprite/raster work, a coherent small 3D asset, or a deliberately
procedural game renderer are possible production choices. Do not spend the
first milestone rebuilding POP's giant procedural studio. The current harness
contains no final creature artwork and should not be presented as visual polish.

## 11. Audio direction and accessibility

- Put master volume on the first screen; keep mute available during play.
- Use short feeding sounds and distinct buildup/activation sounds for each
  mutation. Duck music during warnings and comic reveals.
- Provide a visual equivalent of every gameplay-critical audio cue. Judges may
  be talking, watching a compressed stream, or listening quietly.
- Start audio only from a user gesture. Handle suspended/unsupported audio and
  store settings safely when localStorage is unavailable.
- Music and ambience are separate controllable buses. Scaffold settings exist,
  but only four basic sound-effect cues are currently implemented.
- Use original/licensed music and assets. POP's soundtrack and crowd are not the
  new game's default soundtrack.
- Reduced motion disables shake, strobing and aggressive full-screen effects.
  Preserve information using static indicators. Avoid flashing faster than
  three times per second.
- Body text should generally be at least 16px, regular labels at least 14px.
  Use shape/text redundancy, adequate contrast, keyboard focus and large targets.

## 12. Scope boundaries

### Required for the intended contest game

Physical feeding, three satisfying mutations or a justified tighter set,
responsive controls, expressive creature, short complete run, fair score,
instant practice/restart, original presentation/audio, reproducible results,
real Hemi Mainnet recording, visible shared-creature consequence, readable
leaderboards, verified contracts, documented trust, and a public permissive repo.

### Defer until the core is compelling

Clocks/time echoes, crafting, many rooms, more creatures, large narrative,
cosmetic economies, user-generated content, real-time multiplayer, trading,
NFT collectibles, token rewards, wallets as entry gates, and a custom game-engine
framework. Most of these are unnecessary for this entry and should remain out.

### Definition of a successful prototype

With no verbal coaching, a new player starts, feeds successfully, recognizes a
mutation and changes their next action because of it. An observer understands
the resulting success or failure. If that does not happen, change the mechanic
or presentation before adding a chain layer or more ingredients.
