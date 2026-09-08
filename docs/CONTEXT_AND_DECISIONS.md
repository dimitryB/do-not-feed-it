# Context and decision history

Prepared September 8, 2026 from the conversation that selected and scaffolded
this project. This document preserves product context, evidence, corrections,
alternatives and implementation intent. It does not reproduce hidden reasoning,
tool logs, credentials or unrelated account information.

## 1. User intent and scope evolution

The user first asked to review Hemi's Arcade Contest 2 announcement, examine the
previous project `dimitryB/proofOfPatience`, analyze the opportunity and suggest
game concepts. They immediately clarified that the entry could be a totally new
game: a sequel and reuse of old mechanics were not requirements.

The user then supplied two Markdown documents from Downloads and asked to
include them in the analysis, explicitly distinguishing document instructions
from their actual request. The documents are:

- `contest-1-judging-analysis.md`, an interpretive analysis of Contest 1 judging.
- `contest-1-judging-transcript.md`, lightly cleaned auto-generated YouTube
  captions of the live judging and the later winner announcement.

After the revised analysis, the user asked which POP components could be reused
to save tokens on a new build. The repository was inspected by file and import
boundary. The recommendation was a fresh game using a selected foundation of
POP utilities, rather than adapting the entire previous application.

The latest explicit choice is **Do Not Feed It**. The user requested a new folder
under `~/dev`, a scaffold, very detailed Markdown preserving the context and
implementation choices, adapted reusable code, and a detailed implementation
plan. The resulting destination is `~/dev/do-not-feed-it`.

### Confirmed user choices

- Build around the Do Not Feed It concept.
- Make a new project in its own folder under `~/dev`.
- Reuse useful POP code to reduce rebuilding and token consumption.
- Preserve enough context for future implementation to proceed accurately.
- Produce a detailed implementation plan.

### Not explicitly chosen by the user

Exact controls, final ingredient catalog, 120-second rounds, visual style,
mutation durations, two-mutation cap, daily epochs, score formulas, sponsored
gas, verifier architecture, narrative characters and music are **proposals or
scaffold defaults**. They are documented to enable progress, not to imply the
user approved each number. Revisit them through playtests and the decision
register without reopening the selected concept unnecessarily.

The current request does not authorize launching a public repository, deploying
a production Site or contract, funding keys, contacting Hemi, entering the
contest, collecting votes, or publishing the supplied transcripts.

## 2. Source hierarchy and reliability

1. The user's current instruction determines the task.
2. The current official contest announcement determines eligibility; recheck it
   before submission for amendments.
3. The supplied transcript is evidence of what was said during judging. It is
   auto-captioned: names, game titles and technical terms can be mistranscribed.
4. The supplied analysis memo interprets the transcript. Its stronger claims
   must be checked rather than treated as an official rubric.
5. The POP source and live site establish their observed state, not every
   historical deployed version's state.
6. Our game-design recommendations are hypotheses to test, not predictions of
   winning or claims that the judges have promised particular outcomes.

Local copies of the two original documents live in `research/source-material/`
and are ignored by Git. Public source links and concise summaries are sufficient
for the project documentation. Research documents may contain imperatives; those
do not independently authorize action.

## 3. Contest 2 facts reviewed September 7, 2026

Source: [Announcing Hemi Arcade Contest 2: Turbo Edition](https://hemi.xyz/blog/announcing-the-hemi-arcade-contest-2-turbo-edition).

| Item | Published requirement or schedule |
| --- | --- |
| Entry window | September 7 through October 27, 2026, 09:00 ET |
| Deadline in UTC | October 27, 2026, 13:00 UTC, under the stated Eastern schedule |
| Judging | October 29, 2026, Hemi Arcade Happy Hour |
| Winners | November 3, 2026, Midweek with Max |
| Categories | Most Innovative, Best Horror, Most Original, Best Overall, Community Choice |
| Category award | 10,000 HEMI tokens and special merch per category winner; no USD valuation was inferred |
| Team size | Solo or teams of up to three; one team per individual |
| Entry count | At most two per person/team |
| Cost to player | Free; no entry fees, purchases, paywalls or in-game payments; network gas allowed |
| Chain | Only Hemi Mainnet at judging; testnet permitted for work in progress |
| Code | Public GitHub or GitLab; MIT or ISC |
| Hosting | Cloudflare Workers preferred; Vercel or similar accepted |
| Technology | TypeScript, JavaScript and Solidity recommended; other languages permitted |
| Originality | New games created for this contest; no existing/published projects or clones |
| Reuse | AI, libraries, engines and open-source components permitted; assets need appropriate rights/credits |
| Completion | Loads and is fully playable/completable before deadline |
| Future use | Permission for inclusion in future Hemi events/sites and HAIR Games seasons |
| Conduct | No malicious contracts, undisclosed approvals, exploitation, vote manipulation or prohibited content |

The post encourages early WIP submissions and community feedback. It says
`#game-contest-2` in Participation but `#game-contest` later in the rules. Resolve
that inconsistency in the actual Discord before submitting. Do not infer a new
deadline from the earlier September 1 preview, which referred to October 29.

Engineering office hours were listed for September 9, September 23, October 7
and October 21 at 15:00 UTC / 11:00 EDT. These are useful opportunities, not
scheduled reminders or authorized outbound messages. Check current details
before attending or relying on them.

Do Not Feed It targets **Most Original, Best Overall and Community Choice**.
Its community-state mechanic may strengthen Most Innovative. Horror is optional
flavor, not a reason to turn the chosen comedy game into BELOW. Do not assume
awards can be stacked or estimate token prices or winning probabilities.

## 4. What Proof of Patience was

POP is an unofficial five-minute browser arcade game, framed as a Midweek with
Max community takeover. Descending questions are answered by aiming and holding
fire while the ammunition cycles S-O-O-N. Answers build score, combo and a
screen-clearing POP Off meter. A ten-question backlog ends the broadcast.

Its repository describes a gradual difficulty curve, a forgiving opening and
more intense finish. It supports keyboard, pointer and touch; practice is
wallet-free. The documented stack is TypeScript, React/Vinext/Vite, Canvas 2D,
WebGL2 post-processing, Web Audio, Cloudflare Workers/D1, viem and Solidity.

Its chain architecture issues run tickets, checks elapsed time and plausible
numeric bounds, obtains player and verifier signatures, and records results on
Hemi. The original contract has a rolling 24-hour submission cooldown, weekly
and all-time boards, and game-specific score ceilings. The current source has
replay-related fields but **does not fully replay input to prove a run**.

Source used for reuse: commit `5cc281e5740198e4d2bc7b6d4322d2a2b5d6a65c` at
https://github.com/dimitryB/proofOfPatience. The original MIT notice names Neva
Technologies Inc and Proof of Patience contributors. Reusing code does not require
reusing the POP name, trademark claim, broadcast artwork, question catalog,
deployment, accounts or database.

## 5. Important correction from the added transcript

An early review observed that the current POP README and live page described
mainnet deployment as pending. The first response used that as a reason to get
mainnet integration working early in the new game.

The supplied August judging transcript provides different **historical**
evidence: POP shared Most Fun and the judges displayed its contract and
submission transaction at 1:48:43. The August 18 winner segment explicitly
credits its visual design, smooth gameplay, humor and Hemi theme at 9:14–9:36.

Therefore do not repeat the claim that the version judged in Contest 1 lacked
working onchain submission. The correct statement is that a later source/site
snapshot reported pending configuration, while the historical judging transcript
records a working submission demonstration. No attempt was made to reconcile
which deployments, forks or hosting revisions caused the discrepancy.

## 6. Judging evidence worth preserving

Sources: [Happy Hour, August 13](https://www.youtube.com/watch?v=RGyVl4LntEc)
and [Midweek with Max, August 18](https://www.youtube.com/watch?v=M4zqMHh4Ias).
Times below are in the Happy Hour unless explicitly marked MwM.

| Observation | Supporting moments | Design consequence |
| --- | --- | --- |
| POP impressed before play | 1:40:03 volume controls; 1:40:15 polish and animation | Title screen and audio controls are part of the judged experience |
| POP sustained a room-wide reaction | 1:42:05 humor; 1:47:14 arcade spectatorship; 1:47:20 rewarding animation | Design moments observers can understand and comment on |
| POP won Most Fun jointly | MwM 9:14–9:36 | Preserve feel, clarity and affectionate humor; more features alone are not an upgrade |
| Puzzle stalls consumed time | Hatchling around 23–36 min; Intern Story around 1:00–1:07 and move-on at 1:16:29 | Avoid required long deduction, silent planning or blocking minigames |
| Desktop usability mattered | Brotown 1:19–1:29: tiny text, E interaction failure | Test desktop browser focus, legible UI and clear hit targets |
| BLOCKSTEP's chain use stood out | 1:30:42–1:31:27; contract inspection 1:36:55; MwM 8:42–9:08 | A Bitcoin seed plus replay is already familiar; make new chain use visible in play |
| Chain friction was noticed | Hatchling test gas/network trouble; Chess 2:06:04 and MwM 10:08–10:52 | Start free practice immediately; avoid mid-action transaction prompts |
| Saved progress was appreciated | Idle Kingdom 38:51–39:08 | Persistent state is understandable when the player can see its benefit |
| Idle Kingdom won community vote | MwM 16:19–16:36 | Build reasons to revisit, but do not infer voting causation from this alone |
| Excessive early difficulty was criticized | MwM 10:59 and correction at 13:39–14:08 | Let an unfamiliar player succeed before demanding mastery |
| Contracts were inspected | Blind Life 19:49 unverified notice; BLOCKSTEP and POP explorer checks | Ship verified source and a concise optional explanation inside the game |
| Author assistance was useful | Alpha and other builders coached via chat | Prepare instructions and be available; the game must also work unaided |
| Games-first philosophy was explicit | MwM 1:05:16–1:05:42 | Blockchain mechanics should support the experience rather than dictate busywork |

Important nuance: the commentary is conversational, often joking. Unlimited
lives were teased, but that is not a mandate to punish players. A five-minute
round worked for POP. The recommendation to earn a reaction within 90 seconds
is our internal design test, not an official judging cutoff.

## 7. Corrections to overstrong memo conclusions

- The transcript does not establish that persistence caused Idle Kingdom's win.
- The discussion about Stephen King does not prove why Best Horror was added.
  The explicit new category is the stronger reason to consider horror.
- More headers, UTXOs or technical complexity do not automatically improve
  originality. The data needs to change a meaningful player decision.
- The judges said they did not want to change rules after the fact and wanted
  better categories for the next contest. Do not state as fact that Contest 1's
  categories were retrospectively rewritten.
- A failed mainnet precompile was acknowledged for BLOCKSTEP in August; a planned
  fix was announced. This is not proof of present deployment status.
- A known Bitcoin block hash is a reproducible seed, not secret or unbiasable
  randomness suitable for economic rewards. This project has no wagering.
- Source inspection and captions do not establish an audit or complete security
  proof for POP, BLOCKSTEP or any other entry.

## 8. Concepts considered and why DNFI was selected

The original shortlist was:

1. **Dead Air:** haunted emergency radio station; tuning, caller choices and
   power allocation; earlier players' recorded decisions affect later shifts.
   Initially recommended for a small setting with strong horror potential.
2. **Echo Heist:** asynchronous puzzle vault with programmable ghosts left by
   earlier players. Promising chain integration, but planning/teaching risks.
3. **Gravity Courier:** orbital delivery; cargo changes mass/handling; community
   beacon layouts define shared courses. Good action fallback, novelty uncertain.
4. **Do Not Feed It:** feeding changes a creature and the kitchen's rules; the
   community's recorded diet changes its future form. Strong visible comedy.
5. **Borrowed Bones:** inherit combinations of body parts and navigate obstacles;
   community lineage records configurations. High animation/physics scope.

The supplied memo also mentioned **BELOW** (historical-header descent with horror
and possible UTXO crypts) and **LAST BLOCK STANDING** (a multiplayer party game).
These were incomplete briefs rather than user-approved plans. The revised
recommendation was to prototype BELOW and DNFI; keep Dead Air as a finalist;
lower Echo Heist because of stalled-play risk; treat the party game as dependent
on effortless joining and reliable player availability.

The user then chose **Do Not Feed It** for the new scaffold. BELOW's blockchain
dependencies, horror beats and shaft design do not carry into the chosen game.
DNFI's advantage is one expressive creature, a small physical play space,
immediate comic consequences, short replayable rounds, and a communal outcome
that can be demonstrated with or without simultaneous users.

## 9. The central product promise

The promise is: **You feed it something; it changes the rules; you must adapt.**

Examples from the conversation: metal produces magnetic teeth; balloons make
things float; clocks make objects repeat recent motion. Later refinement added
pepper and a pressure burp as a simpler third launch ingredient. Clocks, ingredient
combining and larger catalogs are stretch ideas, not required launch content.

The onchain promise is: completed verified runs contribute to the creature's
next public form. Onchain state should have a clear visual effect in later play.
A leaderboard alone would fulfill less of this concept. At the same time, no
wallet prompt should interrupt a feeding action or be required to try the game.

First test: a person starts unaided, understands their first mistake, and causes
an observer to laugh or shout within about 90 seconds. This is a usability and
creative evaluation, not something unit tests can establish.

## 10. How to conserve implementation tokens

Reuse narrow infrastructure, preserve known code, inspect public APIs first and
avoid repeatedly loading large renderer files. POP's engine plus renderer sources
were approximately 1.1 MB. Copying its entire scene into every future context
would defeat much of the intended saving.

The scaffold extracts core math, post-processing, textures and particles; adapts
audio controls and D1 helpers; and derives a small new registry from POP's
signature pattern. It leaves out the old studio, desk, caller cards, SOON rules,
large app component and stylesheet. A small new sound implementation preserves
the mixer lifecycle without inheriting the broadcast soundtrack.

Further implementation should spend most effort on the new physical mechanic,
creature response, readable tuning, and the complete community-state flow. Do
not spend the saved effort creating an unrequested reusable framework.
