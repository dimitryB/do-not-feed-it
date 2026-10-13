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
| HEMI | **Turbo breath** | It breathes out heat. A coin through the breath comes out TURBO'D, worth double. A turbo'd coin that hits the bench burns. |

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
foundation or governance. With REKT, "Unaudited" and a report on screen, a
ladder of treasury → governance vote → foundation reads as an exploit
write-up, and "the foundation" reads as a jab at a real one.

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
| title note | Endless · No wallet needed · Mildly inadvisable | Endless · No wallet needed · Not financial advice |
| specimen card | Friendly disposition. Unverified. | Friendly disposition. Unaudited. |
| HUD timer, idle / play / end | NIGHT SHIFT · 004 / TIME ON SHIFT / SHIFT LASTED | BEST UPTIME / UPTIME / FINAL UPTIME |
| title strip | AIM. FEED. ADAPT. | AIM. HODL. FEED. |
| help eyebrow, title | EMPLOYEE HANDBOOK · SECTOR 04 / A very questionable job. | WHITEPAPER · SPECIMEN 04 · UNAUDITED / A very questionable protocol. |
| footer | Field guide ↗ | Whitepaper ↗ |
| pause | Your shift is paused. The creature can wait. | Paused. Blocks keep coming. The creature can wait. |
| ambience | Low ventilation and the kitchen's electrical hum. | Low ventilation and the hum of the Bitcoin node inside it. |
| catch, craved | THAT ONE. YES. | ORDER FILLED. |
| clank | CLANK. | REVERTED. |
| miss | ON THE FLOOR. | TX DROPPED. |
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
| restart | Another shift ↗ | Ape back in ↗ |

Kept on purpose: NOM., STUFFED., SNEEZE., IT IS COMING OUT., IT INHALES,
SINGED, COMBO, HATCH SHUT, IT TOOK THE TRAY., the prop names (OFF THE PAN, OFF THE
CHAIN…), "Start your shift", "Clock in", and every control label. They are
already right, already crypto, or the player has to act on them.
