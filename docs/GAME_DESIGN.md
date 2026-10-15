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

## The cannon — `feat/aim`, GAME_VERSION 6 (October 15, 2026)

FEAST (`docs/FEAST_BRIEF.md`) is still the game; this is what stage 6 changed
about the one verb, aiming. Decisions D139–D150; numbers in
`docs/qa/aim/STAGE6.md`.

**The problem.** The mouth is big and barely moves, every coin flew the same
way, and an overcharged shot came off the chain into the mouth for ×2. So
one barrel setting fed every coin for the whole shift, and the barrel was
set once.

**Every coin flies its own way.** Same launcher, three shots:

- **Bitcoin is heavy.** It falls hardest and needs a near-full charge to
  reach the mouth at all. Lob it.
- **Ether floats.** The slow, soft lob, and the charge moves where it lands
  a long way.
- **HEMI is straight.** Fast, and dead straight for its first 18 ticks with
  a jet behind it. Point it at the mouth; the charge barely matters.

At any one charge the three coins land at different angles, so the coin
the craving asks for decides where the barrel points. The barrel's lance
bends the way the loaded coin will fly over its first stretch (no
colliders, nowhere near the mouth); the first-shift guide is unchanged.
The default shot is a HEMI at −30°, and the page loads HEMI first.

**Blocks on the rail.** One at a time, a block (the rules: a crate) is
lowered through a hatch in the ceiling into the open air between the pan
and the creature's head, shuttles along a short rail and back, swinging on
its chain, and is hoisted away after five to seven seconds. The first comes
six seconds into a shift. It carries one coin's mark, in that coin's
colour, and says whose it is as it comes down (BITCOIN BLOCK.).
**Only that coin opens it**; any other glances off. Broken open, its three
coins pour into the mouth and are swallowed whole — no chew, each a full
serving at ×2, combo and all, so a block is often the fifth catch of a
FOMO. They are servings of that coin: they meet a craving, they count
toward its mutation, and fed into a full creature they gorge it. Where a
block is at any tick is a pure function of the block and the tick
(`crateAt`), so the guide, the probe, the bots and the replay all see it
coming exactly. The coins pop up out of the broken block one after
another and each drops into the middle of the mouth on its own lob, so the
pour reads as a pour.

The rail stays clear of the creature: it ends left of the head, and the
head takes the right end of it as the creature grows. Past about ×1.6
there is no room left and no more blocks come — the late shift is about
the creature, not the rail.

**What a shift asks of the barrel now.** Point HEMI at the mouth, lob
Bitcoin at full charge, float Ether; switch when it craves; swing up and
lead a block when one comes down, with the coin it wants. A barrel set once
and left alone feeds about a quarter of what an aiming player feeds and
scores about a tenth (`fixed` bot, `docs/qa/aim/STAGE6.md`). It still
breaks blocks by luck — a steep barrel's HEMI misses fly up through the
rail's stretch of room — but what it misses everywhere else costs far more.

## The loop that now exists — `feat/creature-loop`, GAME_VERSION 3

This section describes the game as implemented, not as planned. Everything above
it is the original brief and some of it has been superseded; where the two
disagree, this section and `docs/DECISION_REGISTER.md` are correct. The evidence
for every number is in `docs/qa/loop/ITERATION_LOG.md`.

### The loop

**Feed it → it changes → adapt.** You must feed the creature to survive, and
every serving makes it more dangerous. The shift is endless and the creature
always wins; the score is how long you kept it fed and what you did with the
time.

### The creature is the difficulty curve

Every accepted serving grows it, front-loaded, to a ×2.4 asymptote: a bigger
mouth, a shorter window to put something in it, a faster-emptying belly, and a
head that ends up filling the serving hatch. Growth pauses briefly when a craving
is satisfied, which is the only brake in the game.

Size plateaus; **appetite does not**. Every serving also raises a permanent
multiplier on how fast the belly empties, so there is no size at which a player
with perfect aim is safe. (A cap on both was tried and let a good player survive
indefinitely.)

**Feeding a creature that is not hungry is the bad decision the title is named
after.** Above 82 % fullness a serving returns 8 % of its nourishment and grows
the creature four times as fast. This single rule is what separates a player who
rations from one who fires on cooldown.

### The mouth is a rhythm and a slot

The mouth opens and closes on a rhythm drawn from the seed, and food is only
accepted while it is at least half open. An open mouth is a *slot* — as wide as
the face, only as tall as the mouth is open — so a shot that arrives early meets
a gap too narrow to fit through. Aim and timing are therefore one skill, not two.

Anything inside the face but outside the gap is **snubbed**: it bounces off, costs
a little composure once, and can still be banked back in through the next window.
Anything that falls short hits the **chest** and drops. The creature is a solid
object.

One seeded **temperament** per shift decides how generous the mouth is, so a seed
has a character and two equally good shifts last different lengths. About one
cycle in five it simply is not interested and holds the mouth shut far longer
than the rhythm has trained you to expect.

### Mutations are permanent, and they stack

Three servings of an ingredient is one level, three levels is the cap, and
nothing ever wears off.

- **Metal — a magnetic mouth.** It pulls metal food, and it drags loose kitchen
  metal off the shelves into its own teeth, which narrows the gap without
  changing the rhythm. A metal serving arriving *flat* is caught by the teeth and
  clogs it further: metal has to be curved in.
- **Balloon — it inflates and floats.** The mouth rises off the counter and the
  pressure builds until it burps, drops, and shoves everything in the air.
- **Pepper — it spits servings back at the launcher.** A hit jams the launcher
  and costs composure. The spit is telegraphed.

**One escape per pair, and every escape is a serving of the other ingredient**,
so the way out of a problem is always another decision about what to feed it —
and taking it deepens the mutation you escaped with. Metal is ballast for a
floating creature; pepper makes it sneeze a clogged mouth clear; a serving it
spits back vents the balloon's pressure. Forces resolve in ingredient order,
metal → balloon → pepper.

### Cravings are dilemmas

A seeded craving with a visible shrinking timer. Satisfied in time: a large
bonus, it calms, and growth pauses. Ignored: composure and a tantrum that knocks
the bench about and costs launcher time. Off-menu food is eaten anyway and still
counts toward that ingredient's mutation — which is the temptation. It wants
pepper, pepper is worth three hundred right now, and pepper is what makes it
spit.

### Two inputs and one reaction

- **Aim and charge.** Hold Space (or the Launch button) to charge the launch
  speed from 9 to 16. At a single fixed charge only two or three angles land, so
  the arc and the charge together are the aim.
- **Slam the hatch** (S, or Down). It shuts the serving hatch for 1.4 seconds.
  Nothing can be launched while it is shut — that is the cost, and it is a real
  one when the belly is low — and in exchange a serving it spits back bounces off
  the hatch instead of your launcher, and a lunge is stopped before it takes the
  vent off the wall. Pressing it on nothing still costs the lockout.

The trajectory guide is a first-shift aid: a full arc for fifteen seconds of a
player's first shift, a stub for the rest of it, a shorter stub on the second,
and nothing after that. What stays is the barrel's own aim stub and the charge
drawn along it.

### What it does on its own

A seeded beat roughly every eight seconds, more often as it grows:

- a **sneeze** that scatters whatever is in the air and costs bench time;
- a **lunge**, telegraphed, that takes the extractor vent off the wall if nobody
  slams the hatch — after which the vent is a permanent moving hazard, because it
  is damage rather than a schedule;
- **drool**, which makes the floor slick for eleven seconds: snacks keep more of
  their speed and get a second bounce, so the bank shot gets better.

### How a shift ends

Never by a clock. An empty belly, or a kitchen destroyed by accumulated
irritation, or — at twelve minutes, which nobody has reached — outgrowing the
door. Which of four endings you get is decided by **how big you let it become**:

> Shift over. It has eaten the employee handbook.
> Shift over. It has eaten the shift supervisor.
> Shift over. It no longer fits behind the counter.
> Shift over. It no longer fits through the door. It has been promoted.

The cause of death is a separate sentence in front of it — "Empty belly." or
"Too many missed shots." — and **no ending may name a cause**. The third line
used to be "It has eaten the kitchen.", chosen on size alone, so a shift that
ended on an empty belly announced the other failure state's own name in the same
sentence as the meters that contradicted it.

**STILL EMPLOYED** is kept for a run that beats the player's own best time.

A shift may not end on a tick the player was locked out of. While the hatch is
shut — the player's own reaction verb, which costs them the launcher for 84
ticks — the hunger drain accumulates as a debt instead of being applied, and is
taken back at triple rate the moment the launcher is available again; the bar
reads HELD and then CATCHING UP. Nothing is forgiven, so the economy over a shift
is unchanged. And once a shift, **THE LAST SERVING**: if the belly empties while
one of the player's servings is still in the air, the shift waits for it to land.
Once, because granting it on every crossing was measured and it rewarded firing
on every cooldown, which is the strategy this whole redesign exists to kill.

### Determinism

`lib/game/arcade.ts` is the whole rule set. Fixed 1/60-second tick, no wall
clock, no `Math.random`, every value quantized to four decimals. The seed drives
the mouth's rhythm, the temperament, the cravings, the spits, the loose metal and
the beats, through a counter-based hash with one stream per subsystem — so adding
a draw in one place cannot shift the sequence in another. A command trace of
launches (ingredient, angle, power) and hatches replays to a byte-identical final
state; three bot traces are frozen in `tests/fixtures/loop-traces.json` and the
test suite fails loudly whenever a rule changes without them being regenerated.

### What the player is choosing, drawn where they are looking

The two choices — where the launcher points and how hard it throws — are one
drawing on the launcher itself: a lance out of the muzzle with a crossbar at the
distance the current charge stands for. The loaded serving sits in the breech
whether or not it can be fired, dimmed over a dark pocket while a ring fills
around it through the reload, so the wait is an event with a visible end rather
than an empty counter. The two meters that end a shift own a band on the counter
that no verdict label may enter. What a mutation *does* is a three-second banner
across the top in that ingredient's colour, not nine-pixel text in a corner.

### The numbers

All tuning lives in one `TUNING` object at the top of `arcade.ts`, so an
iteration changes a rule rather than hunting a constant. The collision mouth is
not chosen but measured: `scripts/mouth-calibrate.mjs` reads the mouth the rig
actually draws at five sizes and fits `ARENA.mouth` and the growth constants to
it, so the lit target ring and the painted mouth are the same object to within
two pixels at every size. Re-run it after any change to the pose's growth
channels or to the warp.

## September 9 playable local implementation (superseded)

The section below describes the V1 scaffold that the loop redesign replaced. It
is kept as a record of what the contest entry looked like before the rewrite.

The new physical game is in `lib/game/arcade.ts`; the V0 matching harness remains
as a historical test fixture. The actual local rules now accept every ingredient
at the mouth, with a150-point craving bonus rather than refusing off-menu food.
A successful catch scores100 base +40 per prior streak step (max5) + craving150,
precision50, floor rebound75, or mutation assist40 when applicable. No chain
schema has been migrated to this scoring.

Logical mouth center(835,280), radii85×62 matches the generated creature artwork.
Aim is an integer degree from−65 to−5, default−40. Food speed13.6 units/tick,
normal gravity0.16; positions/velocities round to four decimal places. Max8 foods,
42-tick reload,240-tick lifetime, one floor rebound and one vent deflection.

Three accepted servings of an ingredient trigger a90-tick warning then480 active
ticks. Metal attracts only metal; balloon reduces every food's gravity to0.025;
pepper applies periodic headwinds after a visible cheek warning. Only one effect
can run; crossings while one is active do not queue or replace it. A moving vent
flap warns at38 seconds and becomes solid at40, with a5-second vertical cycle.
Its collision and future positions are included in the partial trajectory guide.

Rendering, animation, procedural sound and input timing never score independently.
Pause is allowed in local practice. Actual browser and review evidence is in
LOCAL_PLAYTEST.md. The original full shared-world promise remains future work.
