# FEAST — the revival brief (Oct 12, 2026)

Read this before `docs/dnfi-loop-redesign.md`; where they differ, this wins.

## Why the game is still not fun, after 39 loop iterations

Captured and reviewed from `docs/qa/loop/iter-100` (moderate bot, real browser):

1. **It became an instrument panel.** The MOUTH / BELLY / IRRITATION readout with "NOW → 1.5 s", "SHUT THEN", "DRAINING FASTER 60% → 32%" asks the player to read a dashboard and time a shot against a timeline bar. The readability work that filled iterations 27–39 added text to a game whose only joy is the creature. Judges on a shared stream will not read any of it.
2. **The core verb is slow and punishing.** One shot every 1.33 s, a mouth-open window of 0.17–0.77 s, a flight time near a second: the player has to lead a window that has not opened. The moderate bot lands 28%; the naive bot lands **zero** feeds in 200 runs. A judge "with the hand-eye coordination of a sloth" misses nearly everything, and a miss does nothing but tick a bar. POP won on "animations that make you feel like you're doing good even when you aren't"; this is the opposite.
3. **Every consequence is punishment.** Magnet clogs, balloon lifts the target away, pepper spits at you; the only escapes are chores. Nothing the player does ever feels great. "Consequence 9" on the critic sheet is a 9 for suffering.
4. **Nothing happens on screen.** Food is a 30-px sprite on a dotted line. No hit-stop, no shake, no burst, no combo pop, no frenzy. Growth ×1.3 → ×1.8 is invisible at stream size. The cutlery stuck to the belly reads as debug art.

The bots' gates were met. The gates measured fairness, not fun.

## The game FEAST is

A fast, generous, escalating physics feast with a creature that reacts to everything. You cannot stop feeding it; feeding it makes the kitchen go wild; the wildness is the show.

**Pillar 1 — Easy to hit, constant action.** Cooldown ~0.5 s (30 ticks), up to 6 snacks in flight. The mouth is open by default and *chews* for ~0.6 s after every catch with a telegraphed chomp; a snack arriving mid-chew bounces off the teeth (no penalty beyond losing it, a CLANK pop). Timing is "don't shoot into a chewing mouth", not "hit a 300 ms window". Moderate accuracy target ≥ 55%, naive ≥ 25%.

**Pillar 2 — The kitchen is a playground.** Hanging pans, a hook chain, a shelf edge, the lamp, the pot rim: static bouncers with real restitution. A bank off anything multiplies the serving (OFF THE PAN ×2, DOUBLE BANK ×3, OFF THE LAMP ×4), named in a big pop. Skill = trick shots, not timing.

**Pillar 3 — Frenzy is the power fantasy.** A combo counter (consecutive catches). At 5: FRENZY for 6 s — mouth gapes huge, cooldown halves, everything ×3, screen rumble, big word, music lifts. A miss ends the combo. The player should hit their first frenzy inside the first minute.

**Pillar 4 — Mutations are chaos with an upside, permanent and stacking.**
- Metal → MAGNET MOUTH: metal snacks curve in from anywhere (assist, feels powerful); loose kitchen metal tears off the walls and flies in storms — a fork caught in the mouth is a +500 "UTENSIL" bonus, a fork hitting the launcher jams it for a second. Chaos, not chore.
- Balloon → it inflates and floats, bobbing; the target moves (harder) but its belly becomes a trampoline: a snack off the belly bounces up into the mouth (new easy route). The belly also now *blocks nothing*: it bounces.
- Pepper → FIRE BREATH: every few seconds it exhales a telegraphed flame cone; a snack passing through it is COOKED (×2 and a flame trail); a cooked snack that misses sets the bench on fire for a few seconds (shots from the launcher launch "through fire" = cooked for free but irritation rises). The launcher can be singed → short jam.
- Levels (3 servings each, max 3) raise the intensity (more cutlery, stronger lift, more flames). Nothing wears off.

**Pillar 5 — Escalation is the creature.** Every serving grows it (visibly: the body scale must reach ×2 by minute two at stream size), belly drains faster with size and appetite, beats come faster (lunge, sneeze, tantrum, a bite that eats a prop). Endless; it always wins. Deaths: belly empty (STARVED) or the kitchen wrecked (irritation). Keep the ending escalation by size.

**Pillar 6 — The creature is the HUD.** Delete the MOUTH/BELLY/IRRITATION instrument box and every "→ 1.5 s" prediction. On screen during play: score (big, left), time (right), three mutation chips (top centre), craving ring (as now), combo counter near the launcher that grows with the combo, and ONE slim belly bar under the creature (no numbers). Hunger shows as drool, sag, eyes on the launcher; irritation as flush and brows (already rigged). Captions: short, big, few, and funny — never instructions.

**Pillar 7 — Juice on everything.** Catch: 3-frame hit-stop, squash, NOM burst of particles, score pop scaled by value. Bank: a ring flash at the bounce point. Frenzy: rumble, vignette, big type. Miss: a small sad clank. Growth level-ups: a screen-wide pulse and a one-word card (BIGGER.). All effects respect reduced motion by falling back to colour and pose.

## Keep

Pure deterministic `lib/game/arcade.ts` (fixed tick, seeded, bounded trace, replay exact), the `ArcadeCommand` trace (launch angle/power, hatch), the creature rig (scale, aperture, lift, flush, brows), the cravings with clocks and the growth-pause reward, the beats, the endings by size, procedural audio, title/result screens, the bot harness and the capture harness. Bump `GAME_VERSION` to 4.

## Drop

The hatch as a core verb (keep it in the trace for compatibility, make it rarely needed — a flame/spit can be dodged by just not firing). The cutlery-clog mechanic (replaced by cutlery storms with catch bonuses). The "SHUT THEN" mouth timeline and all prediction markers. The pay multiplier HUD (fold it into score pops). The belly-blocks-everything silhouette.

## Gates (bots, 200 shifts, pure sim)

- naive median survival 40–80 s and ≥ 6 feeds (a beginner must see a mutation and a frenzy);
- moderate median 100–180 s, accuracy ≥ 55%, ≥ 1 frenzy per run on average, deaths spread (no 30-s bucket > 40%);
- good median ≥ 1.8× naive;
- decision density ≥ 6/min; replay fixtures exact.

## Critic rubric (fresh context, 960-px captures only)

Agency, Consequence, **Spectacle** (did something big and legible happen in every 20-s strip?), **Power** (is there a moment the player looks great?), Readability (can you name what's happening without any text?), Comedy, Fairness. Exit: every criterion ≥ 7 twice, Spectacle and Power ≥ 8.
