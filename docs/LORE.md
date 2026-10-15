# Lore — the canon (Oct 12, 2026)

The game's fiction, in one place. Everything the player reads — title, help,
captions, the epoch report — comes from this page, and the words themselves
live in `lib/render/lore.ts`. Where this page and an older doc disagree, this
page wins. The rules (`lib/game/arcade.ts`) keep their own kitchen words; the
screen translates them on the way out, so the traces and fixtures never move.

## The pitch

**Governance Proposal #004 — "Do not feed it" — passed. Nobody enforces it.**
The devs cooked, and this is what they cooked. It eats tokens. Yours. Feed it
anyway, and deal with what it becomes.

## The canon

**The DAO.** The Questionable Appetites DAO keeps a kitchen. Every protocol
has one: it is where the devs cook. One night they cooked something that
looked back. The DAO voted on it. Proposal #004, "Do not feed it", passed by
a landslide. It has never been enforced, because nobody can agree whose job
that is.

**The creature.** Specimen 04, "Munch". Friendly disposition. Unaudited.
Specimens 01 to 03 were deprecated, and nobody wants to talk about it. Munch
lives behind the hatch and eats coins. It eats Bitcoin and Ether in the same
bite, which everyone said could not be done, because it has a full Bitcoin
node where its stomach should be. HEMI makes it faster. Its belly is its gas
tank, and when it runs out of gas the night is over.

**You.** The night-shift keeper. Crypto never closes, so neither does the
kitchen. The only number anyone checks is your uptime. You have a launcher,
three coins and no instructions anyone follows.

**The three coins and what they do to it.** Enough of one coin changes it for
good; nothing wears off.

| Coin | Mutation | In the fiction |
| --- | --- | --- |
| Bitcoin | **HODL jaws** | It holds on to everything. Its jaws pull metal in from across the room — forks off the walls, hardware wallets out of drawers — and never let go. |
| Ether | **Gas belly** | Ether is gas, so the belly fills with it. It floats, and the belly bounces coins back up into its mouth. A bounce off it is a GAS SPIKE. |
| HEMI | **Turbo breath** | It breathes out heat. A coin through the breath comes out TURBO'D, worth double. A turbo'd coin that hits the bench burns. It locks up every HEMI it eats, so technically the breath is veHEMI — the only veHEMI that is also a weapon. |

**The room, translated.** The painting is a kitchen and stays one. Every
crypto word on screen has to be true of what the viewer sees in the kitchen
too (see the double-meaning rule below).

| What you see | What it is |
| --- | --- |
| The hook chain on the right | **The chain.** OFF THE CHAIN is exactly that. |
| Pan, shelf, lamp, pot | Props. A coin off two of them is a **MULTI-HOP**, off three a **TRIPLE HOP**. |
| The extractor vent | The **extractor** — where the MEV bots live. When it lunges and bites the vent off the wall: EXTRACTOR: EATEN. |
| Cutlery tearing off the walls | HODL jaws at work. A fork caught in its mouth is a **HARD FORK**; a fork in your launcher and you are **FORKED**. |
| The little dark rectangles in a storm | Hardware wallets. One in its mouth is **COLD STORAGE**; one in your launcher and your **TX** is **STUCK**. |
| A coin bouncing off its teeth | It was chewing, so the transaction **REVERTED**. |
| A coin on the floor | **TX DROPPED.** |
| Drool on the floor | **SLIPPAGE.** Everything slides now. |
| The bench on fire | A **TOKEN BURN.** |
| The creature growing | **SCALING.** When it outgrows the frame the **BLOCK** is **FULL**. |
| Five catches in a row | **FOMO.** Everything is worth triple and it swallows whole. |
| It wanted one coin and you sent another | A **MAXI TANTRUM.** It only wants the one coin. |
| A craving met | **ORDER FILLED.** It ordered; you filled it. |
| The last coin in the air when the belly empties | **ONE TX PENDING.** The night waits for it. |

**How the night ends.** One cause, one joke, one wallet tier.

| Cause (rules) | On screen |
| --- | --- |
| The belly empties | **OUT OF GAS.** |
| Irritation maxes out | **THE KITCHEN GOT REKT.** (Rekt here is the kitchen, wrecked. Never a trade.) |
| It survives the twelve-minute cap | **IT REACHED SUPERFINALITY.** |

| Size at the end | Wallet tier | Joke |
| --- | --- | --- |
| smallest | Shrimp — everyone starts somewhere | IT ATE THE GAS MONEY. |
| | Dolphin — it is getting ideas | IT ATE A WHOLE BLOCK. |
| | Shark — the whales have noticed | IT ATE THE MEMPOOL. |
| largest | Whale — the whale alerts are about it now | IT ATE THE CHAIN. |

The headline is **IT'S SO OVER.**, or **WE'RE SO BACK.** on a new personal
best or on reaching superfinality. The report is the **epoch report**, the
time is **uptime**, the help is the **whitepaper**, restart is **Ape back in**.

The jokes climb through things a chain is made of — gas money, a block, the
mempool, the chain — and never through anyone's holdings, a treasury, a
foundation or governance. With REKT and a report on screen, a ladder of
treasury → governance vote → foundation reads as an exploit write-up, and
"the foundation" reads as a jab at a real one.

## Hemi, specifically

The Hemi references are the creature's biology, not a claim about Hemi's
products. Hemi's virtual machine runs a full Bitcoin node inside an EVM, so
one contract can read both worlds; Munch is that idea as an animal (Bitcoin
and Ether in the same bite, a Bitcoin node for a stomach). Superfinality is
Hemi's word for the point at which its state, published into Bitcoin, cannot
realistically be reversed; IT REACHED SUPERFINALITY is the creature surviving
to the very end. TURBO is the contest's own name (Turbo Edition). Do not put
numbers on any of this in the game — block counts and minutes vary by source
and by version.

Do not put the monster inside anything real that holds people's coins. A
creature living in a bridge or a tunnel that eats deposits reads as a joke
about an exploit, and it would land on the sponsor.

## What the Hemi team said (office hours, Sept 9 and Oct 7)

The two engineering office hours before judging bear on the lore (source:
the transcripts in the user's "hemi-game-contest" project).

- **"Unaudited" stays, by the user's call.** On Sept 9 the team answered two
  community questions about the Genesis drop claim contract, exploited
  through a re-entrancy bug after it was modified under deadline without the
  full audit process. The specimen card ("Friendly disposition. Unaudited.")
  and the whitepaper eyebrow ("UNAUDITED BUT FRIENDLY") keep the word anyway
  — the user decided, knowing this, and asked that it stay friendly. So
  "Unaudited" is always about Munch, always next to "friendly", and never
  near a contract, a claim, an exploit or Hemi. Nothing else on screen says
  claim, airdrop, re-entrancy or drained.
- **They do this kind of joke themselves.** Jeremy's own demo is "proof of
  stake → what if we staked some vampires": a crypto term made literal in
  the game. That is the double-meaning rule, from the judges' side.
- **veHEMI as a weapon.** On Oct 7 Max said it would be funny if a game made
  veHEMI a weapon. Munch's HEMI mutation is a breath weapon, so the help says
  it locks up every HEMI it eats and the breath is, technically, veHEMI.
- **No prices, no financial advice.** "We are not here to discuss prices of
  anything nor can we give financial advice" (Sept 9). The title's "Not
  financial advice" is their own line back at them.
- **No real people.** Another entrant's game has Rick (the host) eating
  everything in a plaza. Munch is not Rick and is never drawn or written as
  anyone on the team; the eating is ours, the in-joke is theirs.
- **Judging is Oct 29, 4 PM EDT, just before Halloween**, with the hosts in
  costume. Best Horror is a category. Nothing in the lore depends on it.

## Hemi's own lines (the lore bible, Oct 13–14)

The judges are the hosts, so the best lore is their own words, played back
affectionately. `hemi-lore-bible.md` (in the Claude project and in the
ignored `research/source-material/`) collects five weeks of Midweek with Max
and office hours, with timestamps. What made it into the game, and why each
one passes the rules (a direct callback, names nobody, true of what is on
screen):

| Line on screen | Where | From |
| --- | --- | --- |
| veHEMI IS A WEAPON. | the first turbo breath of a shift | Max, Oct 7: "something … in game where veHEMI is a weapon … That'd be funny." The breath is the weapon; the help already says it is veHEMI |
| IT IS STILL COMING. | the lunge telegraph (was IT IS COMING OUT.) | the community's answer to every "when?" (VBK, the OG role). The creature is, literally, coming |
| BITCOIN BEING BITCOIN. | a Bitcoin on the floor (other coins still say TX DROPPED.) | Max, Oct 7, on waiting for blocks: "just because Bitcoin being Bitcoin" |
| GLAMSTERDAM +500 | one fork in three caught in its mouth (the rest HARD FORK +500) | the next Ethereum hard fork; Rick: "sounds like a Dutch rave", Max loves saying it. It is a hard fork; it is a fork |
| Paused. The ZK talk will continue until you come back. | the pause screen | Max: "The ZK talk will continue until questions come in." Judges pause to talk |
| ✦ Ding, ding, ding. New personal best. | the epoch report, on a new best | Rick, Oct 13, on what makes an arcade game: "Flashing lights and loud noises. Ding, ding, ding." |
| Free play. Keep your pocket full of quarters. | under Ape back in | John, Oct 13: "we get a pocket full of quarters … make us want to keep giving those games quarters" |
| One mouth. Zero restraint. Maximum commitment. | the title strip (was Three tokens. Unusual side effects.) | an homage to Blind Life Simulator's "one transaction, zero vision, maximum commitment", the Contest 1 game the hosts replayed on Oct 7 |
| Tuned for the hand-eye coordination of a sloth. | the whitepaper, step 1 | Max, about himself, twice: "I have the hand-eye coordination of a sloth." It is also true: pillar 1 tunes for him |
| Press E | the end of the title's note line, so the joke gets found | "Press E", the running gag since Contest 1 |

**Considered and left out**, with the reason:

- *The creature is the Tunnel* (hBitVM, "send Bitcoin to an address, magic
  happens"). A monster that eats what goes into the bridge reads as an
  exploit, and hBitVM may slip to early Q1 — a joke about an unshipped
  product lands badly. FastTrack / MinerFi / FastBridge renames: same.
- *The finality counter* (combo from −9 to 0, frenzy as SUPERFINALITY, nine
  blocks). A negative combo is unreadable on a compressed stream and the
  frenzy starts at five catches, not nine; FOMO and ×N stay. SUPERFINALITY
  is already the twelve-minute ending. "Bitcoin being Bitcoin" is the part
  that survived.
- *Mutation renames* (FASTTRACK, AUTO-RELOCK, TURBO EDITION). The names have
  to say what the viewer sees and which coin did it; HODL jaws / Gas belly /
  Turbo breath do, product names do not.
- *TUMMY STAKE, the epoch clock, phase-named levels.* A label on the belly bar
  and an epoch counter put text back on the HUD (pillar 6), and "tummy stake"
  is the auto-captions mishearing hemiStake, not something anyone said.
- *Anything that names or draws a person* ("when Joshua gets back", "Jeremy
  abruptly ended the stream", lawn care, the soundboard, hard water, "it has a
  neck"). Quote them, never name them; no jokes about falls or weight; the
  Rick-eats-everything bit is another entrant's.
- *New props and art* (the flamingo, the banana, the getHeaderN appliance,
  Detritus's bin, the cup as a bouncer, fangs and eye lasers, the hat). Each
  needs new art or a rules change two weeks before the deadline; the
  bouncers are rules geometry. Sacred Waste and Mentora stay friendly by
  staying out.

## Extras

**Press E.** Contest 1's judges could not get a game's E key to work on
stream, and "Press E" has been the hosts' running joke since ("Press E,
Jeremy." "I pressed E. I did it."). In this game E does nothing to the rules
and is never recorded in the trace; it only says so, a little more each time:
YOU PRESSED E. → IT WORKED. → E IS NOT A TOKEN. → STILL WORKS. On the title
it sits low on the left; during a shift, in the caption slot.

**Halloween** (October 15 to November 2, local time; `?season=halloween`
previews it, `?season=none` turns it off). The judging stream is October 29
with the hosts in costume. On the title only: the tag reads TRICK OR TOKEN,
the lede opens "Proposal #004 passed. Nobody enforces it.", the accent ("IT.")
and the tag go pumpkin orange, Munch's card adds "Costume: a whale. It is
working on it." (the top wallet tier, which it is always growing toward), and
now and then the lamps flicker — darker only, two dips a burst, at most 28 %,
never under reduced motion. Gameplay and the report are unchanged.

## Tone rules

1. **The double-meaning rule.** Every crypto word must also be literally true
   of what is on screen. HARD FORK is a fork. SLIPPAGE is drool. TOKEN BURN is
   fire. SCALING is it getting bigger. If the kitchen meaning is false, the
   caption reads as noise to anyone who does not know the slang, and a judge
   on a compressed stream must be able to name what happened without it.
2. **Affectionate, never at anyone's expense.** No prices, charts, crashes,
   rugs, hacks, exploits, scams or liquidations — not about BTC, ETH or HEMI,
   and not about other chains. Nothing about anyone's holdings (bags), lost
   seed phrases, treasuries, foundations or governance votes: people have
   really lost those, and next to REKT they read as an exploit. The creature
   is the joke; the coins are what it eats.
3. **No real people.** No founders, hosts or influencers by name or likeness.
   Quote them, never name them (`tests/lore.test.mjs` checks the page and the
   captions for the hosts' names). It is "Turbo Edition", never "season two".
   No claim, airdrop or drain jokes either (see above); "Unaudited" on the
   specimen card and the whitepaper is the one audit word, and it stays.
4. **No endorsement.** The game is a fan-made contest entry. The DAO, the
   proposal and the specimens are fictional; nothing implies Hemi made or
   approved them.
5. **The marks are untouched.** See `docs/ART_PROVENANCE.md` and D122.
6. **Captions are short, big, few and funny — never instructions.** Uppercase,
   end on a full stop (score pops and mutation cards excepted), one crypto
   term per caption. Cards (SCALING., BLOCK FULL.) fit in 18 characters;
   other captions in 24. `tests/lore.test.mjs` counts them and
   `scripts/lore-shots.mjs` measures them in the canvas face.
7. **Plain words where the player has to act.** Controls, the keyboard guide,
   aria labels and the help's control lines stay literal. The one flavoured
   control is "Ape back in": it is the only button on the report, under a
   screen that has just said the night is over. "Not financial advice" is the
   only disclaimer, and it is a joke that is also true.

## Copy, old → new

Stage 4 (the coins, `docs/qa/feast/STAGE4-TOKENS.md`) mostly stands and is
not repeated here: Bitcoin / Ether / HEMI, HODL jaws / Gas belly / Turbo
breath, IT WANTS BTC., COLD STORAGE, GAS SPIKE. Three stage-4 lines changed
and are in the table.

| Where | Old | New |
| --- | --- | --- |
| masthead | DEPARTMENT OF QUESTIONABLE APPETITES | QUESTIONABLE APPETITES DAO |
| title tag | YOUR SHIFT STARTS HERE | PROPOSAL #004 · PASSED |
| title lede | It's hungry. You're on duty. | It passed. Nobody enforces it. |
| title note | Endless · No wallet needed · Mildly inadvisable | Endless · No wallet needed · Not financial advice · Press E |
| specimen card | Friendly disposition. Unverified. | Friendly disposition. Unaudited. |
| HUD timer, idle / play / end | NIGHT SHIFT · 004 / TIME ON SHIFT / SHIFT LASTED | BEST UPTIME / UPTIME / FINAL UPTIME |
| title strip | AIM. FEED. ADAPT. | AIM. HODL. FEED. |
| help eyebrow, title | EMPLOYEE HANDBOOK · SECTOR 04 / A very questionable job. | WHITEPAPER · UNAUDITED BUT FRIENDLY / A very questionable protocol. |
| help, HEMI | HEMI gives it turbo breath that cooks coins for double. | … It locks up every HEMI it eats, so technically that breath is veHEMI. |
| footer | Field guide ↗ | Whitepaper ↗ |
| pause | Your shift is paused. The creature can wait. | Paused. The ZK talk will continue until you come back. |
| ambience | Low ventilation and the kitchen's electrical hum. | Low ventilation and the hum of the Bitcoin node inside it. |
| catch, craved | THAT ONE. YES. | ORDER FILLED. |
| clank | CLANK. | REVERTED. |
| miss | ON THE FLOOR. | TX DROPPED. (a Bitcoin: BITCOIN BEING BITCOIN.) |
| two / three banks | DOUBLE BANK ×N / TRIPLE BANK ×N | MULTI-HOP ×N / TRIPLE HOP ×N |
| fork caught | UTENSIL +500 | HARD FORK +500 |
| fork in launcher | FORK IN THE WORKS | FORKED. |
| wallet in launcher (stage 4) | SEED PHRASE LOST. | TX STUCK. |
| turbo'd coin (stage 4) | TURBO'D ×2 | TURBO'D. (the ×2 read as "HEMI 2x" on a HEMI coin; the score pop carries the value) |
| bench fire | THE KITCHEN IS CONGESTED. | TOKEN BURN. |
| growth card | BIGGER. | SCALING. |
| camera pull-back card | IT NO LONGER FITS. | BLOCK FULL. |
| frenzy banner | FRENZY | FOMO |
| tantrum | TANTRUM. | MAXI TANTRUM. |
| drool | DROOL. | SLIPPAGE. |
| lunge bites launcher | BITTEN | FRONT-RUN |
| lunge bites vent | IT ATE THE VENT. | EXTRACTOR: EATEN. |
| last serving | THE LAST SERVING. | ONE TX PENDING. |
| report tag | SHIFT REPORT | EPOCH REPORT |
| report headline | YOU'RE THE SNACK. / STILL EMPLOYED. | IT'S SO OVER. / WE'RE SO BACK. (new best, or superfinality) |
| report cause | IT WENT HUNGRY. / IT WRECKED THE KITCHEN. / IT OUTGREW THE KITCHEN. | OUT OF GAS. / THE KITCHEN GOT REKT. / IT REACHED SUPERFINALITY. |
| report line | the rules' ending ("…It has eaten the employee handbook.") | the wallet tier ("Wallet tier: shark. The whales have noticed.") |
| ending jokes | PETTY CASH / YOUR BAGS / THE TREASURY / THE FOUNDATION (stage 4) | IT ATE THE GAS MONEY. / A WHOLE BLOCK. / THE MEMPOOL. / THE CHAIN. |
| report stats | ON SHIFT · FRENZIES | UPTIME · FOMO |
| restart | Another shift ↗ | Ape back in ↗, with "Free play. Keep your pocket full of quarters." under it |
| new best | ✦ New personal best | ✦ Ding, ding, ding. New personal best. |
| title coin strip | Three tokens. Unusual side effects. | One mouth. Zero restraint. Maximum commitment. |
| lunge telegraph | IT IS COMING OUT. | IT IS STILL COMING. |
| first breath of a shift | FIRE BREATH | veHEMI IS A WEAPON. (later breaths: TURBO BREATH) |
| fork caught, one in three | UTENSIL +500 | GLAMSTERDAM +500 (the rest: HARD FORK +500) |

Kept on purpose: NOM., STUFFED., SNEEZE., IT INHALES,
SINGED, COMBO, HATCH SHUT, IT TOOK THE TRAY., the prop names (OFF THE PAN, OFF THE
CHAIN…), "Start your shift", "Clock in", and every control label. They are
already right, already crypto, or the player has to act on them.
