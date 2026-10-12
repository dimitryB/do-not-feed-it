# Do Not Feed It — why it feels anemic, and what to change

Reviewed 2026-09-11 on branch `feat/creature-rig` (17 rig iterations, 31 capture sets, log at `docs/qa/creature/ITERATION_LOG.md`) plus a full read of `lib/game/arcade.ts`, which is the entire rule set.

## Where the two days went

The rig loop did what it was told and then told the truth: 25 authored states exist and are reachable, render cost is inside budget, and the fresh-context critics converged on an average of about 4.2/10 with a spread between critics larger than any iteration's change. The final report's own diagnosis is right — the remaining gap is head *position* and per-ingredient *material*, not more mouth shapes — but that is the wrong problem to keep spending on, because a more expressive face on this loop would still be an expressive face watching the player press Space.

## Why the game is anemic — read from the rules

The rules are deterministic and the seed is never used (`createArcade(seed)` stores it and nothing reads it), so every shift is identical. The launcher is fixed, the launch speed is fixed at 13.6, and the mouth is a fixed ellipse at (835, 280). That leaves one input dimension, the angle, and with fixed speed and a fixed target there is one correct answer. It is the default: at −40° the food arrives at y≈256, inside a mouth that spans 218–342. A player who never touches aim and presses Space every 0.7 s hits every shot. The trajectory preview then removes whatever aiming skill was left.

Cravings are not decisions. `wanted` cycles metal ×3 → balloon ×3 → pepper ×3 by feed count, so it is a fixed sequence, and off-menu food is accepted anyway for 150 fewer points. There is no risk in ignoring it and no reward for reading the creature.

Mutations are aim adjustments, not problems. Metal magnetism pulls metal food *into* the mouth (an assist). Balloon gravity means "aim lower", which the preview shows you. Pepper's gust is a periodic headwind. They last eight seconds, one at a time, on a fixed count, and then the kitchen resets. Nothing accumulates, nothing gets worse, nothing forces a change of plan. The title is a warning about consequences and the mechanics contain none: feeding never has a downside.

Failure is nearly unreachable. Hunger drains about 1.3/s after a 15-second grace and every feed restores 7–10; rage rises 7 per miss and falls 7 per feed. The scripted balance run survived at 66% accuracy. The 120-second shift has no ramp — POP's difficulty curve was the thing the judges felt, and here the only escalation is a vent flap at 40 s. There is no timing skill (the mouth is always open), no spectacle escalation, no jackpot, and the creature never acts on the player.

So the loop is: press Space on cooldown, occasionally press 1/2/3, read the bonus text. That is a clicker with a cannon skin.

## What the loop needs to become

The pitch is "feed it → it changes the rules → adapt". Make that literally true and make "Do Not Feed It" a real dilemma: **you must feed it to survive, and every feed makes it more dangerous.** The creature, not the food, should be what changes.

**Make the creature the difficulty curve.** Every accepted serving grows it a little (scale, reach, appetite). A bigger creature is a bigger mouth for a few seconds and then a worse problem: it leans closer, its mouth-open windows get shorter, it starts doing things. Hunger drain rises with size. The shift is not "survive 120 s" but "how long can you keep it fed before it grows out of the kitchen" — endless, with the creature always winning in the end, which is the title's joke and the ramp POP had. Score = time kept fed + feeds + style; "2:14" becomes the number people compare in Discord.

**Give the mouth a rhythm.** The mouth opens and closes; the open window is the timing skill, and it shrinks as the creature grows. The creature tracks and lunges toward incoming food when hungry, snaps at nothing when irritated. Now the same angle stops working, the player watches the creature instead of the trajectory line, and a spectator can see the near-misses. This is also the single most valuable "expressiveness" item — body-level motion tied to mechanics reads at stream resolution far better than any eyelid.

**Make mutations permanent for the shift and make them change the target, not the projectile.** Metal: teeth become magnetic and pull *everything* metal — food, but also loose kitchen metal that starts getting sucked in and blocking the mouth, and a metal shot now has to be curved in from off-axis. Balloon: the *creature* inflates and drifts upward, so the target moves and slowly rises out of reach until it burps it off. Pepper: it spits food back at the launcher — projectiles come *at* you, and a hit costs reload time or a chunk of rage. Stack them: a floating, magnetic, spitting monster by minute three is the spectacle the stream needs. Deterministic ordering for interactions, one escape rule per pair (the design doc already lists these).

**Make cravings a live dilemma.** Seeded-random cravings with a visible shrinking timer. Satisfy in time: big bonus, it calms, growth pauses. Ignore: it gets angry (rage up, tantrum — it swipes at the shelf, lights flicker, a bank of food falls). Feed it the wrong thing: it eats it *and* it counts toward that ingredient's mutation. The temptation is the point: it wants pepper, pepper is +300 right now, and pepper is what makes it spit. Let the player choose the bad decision the title invites.

**Add power, remove the training wheel.** Hold Space to charge (speed 9–16); the aim arc and power together are the aiming skill. Keep the trajectory preview only for the first 15 s of a player's first shift, then a short stub, then nothing. Keep the bank shot — it is the one genuinely fun thing in the current rules — and reward it more.

**Give the player a second verb.** A dodge/duck for the spit, or a "slam the hatch" that costs a few seconds of feeding but stops a lunge. One extra verb turns reaction into play; the judges backseat-drive exactly these moments ("switch! switch!").

**Escalating spectacle the creature does on its own.** Between shots: sneezes that knock food off the bench, a lunge that bites the vent off (the vent hazard becomes a *consequence* rather than a scheduled flap), eating the "employee of the month" frame, drooling on the floor so bank shots slide differently. Each is a cheap physics event and a laugh line for the stream.

**Keep the copy voice, and make the ending the payoff.** "STILL EMPLOYED" and "It has eaten the employee handbook" are the right voice. Under an endless ramp every run ends with the creature winning, so the fail screens are the reward: three or four escalating endings by size ("It has eaten the shift supervisor" / "It has eaten the kitchen" / "It has been promoted"), which is what the judges quoted from POP.

**Community layer, now with something to feed.** The communal diet decides the creature's *starting size and trait* — "the community fed it 61% metal this week; it starts magnetic and already large". That makes the shared state visible on the title screen for triage and gives players a reason to check back: the monster they left is the monster the next person inherits.

## What this does to the existing code

`arcade.ts` stays the single source of truth and stays deterministic — use the seed for cravings and creature beats, keep the fixed tick, keep the command trace, and the replay verification path survives unchanged in shape. The rig work is not wasted: head position and body scale become mechanic-driven inputs (lunge, float, grow, spit) rather than authored poses, which is exactly what the critics kept asking for. Score/replay/trace changes must move together and bump the game version.

## Suggested order (about a week, before any chain work)

1. Growth + mouth rhythm + hunger scaling with size, endless ramp. Play it for ten minutes. If it isn't already more fun than the current build, stop and rethink.
2. Seeded cravings with timers and consequences; power charge; preview reduced to a first-run aid.
3. Mutations rewritten as creature changes that persist and stack (metal → magnetic mess, balloon → drifting target, pepper → spit + dodge).
4. Autonomous creature beats and the endings by size.
5. Headless balance harness: bots at three skill levels, target ~2 min median survival for a moderate player, deaths spread across minutes 1–4 like POP's tuning.
6. Only then: the rig's head-position pass (now driven by lunge/float/grow), and the minimal chain layer from the second-entry assessment.

Test for "fixed": a new player, uncoached, should make a visibly bad decision by their second shift and laugh at what it did.
