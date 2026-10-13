# FEAST — stage 4: the tokens

The three snacks are crypto tokens and the title is the joke: *do not feed it
your tokens*. Metal is Bitcoin, balloon is Ether, pepper is HEMI. The player
feeds the creature coins; the mutations are HODL JAWS, GAS BELLY and TURBO
BREATH (the contest is the Turbo Edition). This is a presentation and copy
pass: `lib/game/arcade.ts` is untouched, the ingredient keys, the trace and
the fixtures are exactly what they were, and the 41 tests pass with the same
three frozen traces. Decisions D121–D127 in `docs/DECISION_REGISTER.md`;
provenance and the brand rule in `docs/ART_PROVENANCE.md`; the capture set
is `docs/qa/loop/iter-200` (moderate bot, seed 20260911, 353 s, 474 feeds,
16 frenzies, best combo 27, died empty-belly at ×2.40 with every mutation at
3 — the same shift as `iter-102`, so the two sets compare frame for frame).

## What changed

- **`lib/render/tokens.ts`** (new). The token table (`TOKENS`: id, name,
  source files, effect tint, mark fraction, plate colours), the mark loader
  (`markFor`, one decode per token per page, shared by the canvas and the
  DOM), the coin sprites (`createTokenSprites`: plate plus mark rasterised
  once at 56 / 112 / 224 device px, drawn with a clamped tilt and a glint
  running round the rim), the HEMI stand-in, and the copy: `tokenCopy`
  (rule labels → token labels), `TOKEN_TRAITS`, `CRAVING_LINES`,
  `ENDING_JOKES`.
- **`lib/render/scene.ts`.** `ingredients.png` is gone from the renderer.
  Projectiles, the launcher's loaded coin, the coin on the floor and the
  craving ring all draw through `coin()`. Captions are translated on the way
  to the screen. A bounce off the belly says GAS SPIKE. Cutlery storms carry
  the occasional hardware wallet (a dark rectangle with a lit screen, hashed
  from the projectile id, about one piece in five); the catch caption says
  COLD STORAGE +500 for a wallet and UTENSIL +500 for a fork, and a wallet
  through the launcher says SEED PHRASE LOST. (the renderer remembers where
  each piece of junk was last frame and finds the one that vanished nearest
  the event). The turbo'd coin carries a hot ring outside the mark.
  `ready()` waits for the marks; `hemiFromKit()` says which HEMI is on
  screen.
- **`app/page.tsx`, `app/globals.css`.** `TokenMark` draws a coin in the DOM:
  the SVG as an `<img>` inside a round `.item-art` plate, no blend mode, no
  filter; the HEMI stand-in is a `<b>H</b>` on an orange disc. Chips, the
  control deck, the title strip and the legend strip use it. Help modal,
  strapline, legend, chips, ending joke and the stat label rewritten. The
  community-diet line renders under the title legend when there is data.
- **`lib/engine/audio.ts`.** `clink-btc` / `clink-eth` / `clink-hemi`: a coin
  clink on every launch and every catch, pitched by token, under the
  existing cues. Nothing else changed.
- **`lib/community/diet.ts`** (new). The `communityDiet` stub (null) and
  `communityDietLine`. Nothing is wired to the chain.
- **`tests/tokens.test.mjs`** (new). Pins the label translation, the token
  table and the diet line.

## The brand rule, as implemented

Hemi asked that its logo not be modified in look and feel; the same rule is
applied to all three marks. Every mark is drawn as delivered: no recolouring,
tinting, skewing, horizontal squash, outline, drop shadow on the mark or
cropping. The coin is a disc behind the mark in the game's palette (BTC: a
dark rim at 92 % — its own mark is the coin; ETH: a pale plate at 64 %,
because the grey Ξ vanished on dark enamel at 960 px; HEMI: dark enamel with
an orange rim at 72 %). The mark only translates, tilts toward its heading
by at most ±15° (`MARK_TILT`; it reads as thrown and is never upside down),
lies at 15° on the floor (never squashed), and scales uniformly with the
camera. The spin is a glint running round the rim outside the mark; the
tail, glow, selection ring, turbo ring, flame trail and magnet arcs are
around it. The shadow is cast by the plate.

The HEMI kit file (`public/art/tokens/hemi.svg` or `.png`) **had not landed**
when this pass was captured (`git fetch origin feat/feast` at the end: already
up to date, `public/art/tokens/` holds `btc.svg` and `eth.svg`). The loader
tries both names and otherwise draws the stand-in — an orange disc with a
white H in the display font, on the same plate the real mark will sit on —
and logs nothing. Every HEMI coin in `iter-200` is the stand-in. When the
file lands it is used with no code change; re-capture then.

## Copy, old → new

| where | old | new |
| --- | --- | --- |
| snack names (deck, legend) | Tin can / Air puff / Hot pepper | Bitcoin / Ether / HEMI |
| traits (chips, deck, legend) | Magnet mouth / Balloon belly / Fire breath | HODL jaws / Gas belly / Turbo breath |
| mutation card | MAGNET MOUTH ×N / BALLOON BELLY ×N / FIRE BREATH ×N | HODL JAWS ×N / GAS BELLY ×N / TURBO BREATH ×N |
| craving | IT WANTS TIN. / AIR. / PEPPER. | IT WANTS BTC. / ETH. / HEMI. |
| belly bank | OFF THE BELLY ×2 | OFF THE GAS BELLY ×2 |
| belly bounce | — | GAS SPIKE. |
| junk caught | UTENSIL +500 | COLD STORAGE +500 (a wallet) · UTENSIL +500 (a fork) |
| junk in the launcher | FORK IN THE WORKS | SEED PHRASE LOST. (a wallet) · FORK IN THE WORKS (a fork) |
| cooked | COOKED | TURBO'D ×2 |
| flame | FIRE BREATH | TURBO BREATH (IT INHALES stays) |
| bench fire | IT IS ON FIRE. | THE KITCHEN IS CONGESTED. |
| singe | SINGED | SINGED |
| strapline | Feed the creature. Deal with what it becomes. | Feed it your tokens. Deal with what it becomes. |
| title strip | Three snacks. Unusual side effects. | Three tokens. Unusual side effects. (+ the diet line when present) |
| legend strip | 1 Tin can · Magnet mouth … | 1 Bitcoin · HODL jaws · 2 Ether · Gas belly · 3 HEMI · Turbo breath |
| help | three paragraphs about snacks | rewritten: tokens, three controls, the three mutations, "There is no refund." |
| ending | IT WENT HUNGRY. + the rules' line | + one joke by ending: IT ATE THE PETTY CASH. / IT ATE YOUR BAGS. / IT ATE THE TREASURY. / IT ATE THE FOUNDATION. IT IS THE FOUNDATION NOW. |
| report stat | SNACKS FED | TOKENS FED |

The rules' own strings (`MUTATION_LABELS`, `ENDINGS`, event labels) are not
edited; `state.announcement` still reads "Empty belly. It no longer fits
behind the counter." under the joke.

## Render timing

- `scripts/render-budget.mjs --only typical --runs 2 --seconds 6` (×2.0,
  metal 2 / balloon 2 / pepper 1, lift 9, 1920×1080): **3.90 ms median**,
  4.35 ms mean, 7.80 ms p95, 383 warp cells (stage 3: 4.65 median). The
  coins are three `drawImage` calls of a prebuilt bitmap plus two arcs; they
  do not register.
- The capture harness (`iter-200`): 4.30 ms median / 6.10 p95 / 4.51 mean /
  7.80 max over 59 frames (`iter-102`: 4.50 / 7.6).

## What the captures showed

`hud-title`: the coins in the title strip (₿ on orange, Ξ on a pale plate, the
H stand-in on orange) read at 960 px; the strapline carries the joke.
`hud-0020`: a Bitcoin in the breech, one just fired, the craving ring with ₿.
`hud-0100`: three chips (HODL jaws ×1 · Gas belly ×1 · Turbo breath ×1) with
coin icons, no overlap, the H in the craving ring and in the launcher.
`clip-first-frenzy`: the TURBO BREATH ×1 card, IT WANTS HEMI., TURBO BREATH
on the cone, UTENSIL +500 on a fork. `hud-0200`: GAS SPIKE. on an Ether coin
off the belly with the camera pulled back; the coins scale with it. `hud-end`:
the joke line under IT WENT HUNGRY., TOKENS FED 474. Nothing needed a second
run.

## What is weak

- **The HEMI coin is a stand-in.** Until the kit file lands the H is a
  placeholder drawn in the game's own font. The plate and layout will not
  change when the real mark arrives, but the look will, and the title strip
  and chips should be re-captured then.
- **Two orange coins.** Bitcoin and the HEMI stand-in are both orange discs
  at 960 px; the ₿ and the H separate them, and the plate rims differ, but a
  judge glancing at a storm of coins will tell them apart by glyph, not
  colour. The effect tints (lime, mint, coral) are unchanged, so the trail
  still says which is which.
- **The wallet is rare and small.** About one piece of junk in five, 36 × 22
  arena px; at 960 px it is a dark chip with a mint dot. It is a joke for the
  catch caption more than a thing seen in flight.
- **Caption detection after a fast-forward.** The catch and jam captions
  identify the piece from last frame's junk; when the harness skips 600
  ticks a frame the renderer cannot tell and says COLD STORAGE / FORK IN THE
  WORKS. In real play every frame is drawn, so the question does not arise.
- **The launch frame shows two coins** — the one leaving the muzzle and the
  next one already in the breech. The snacks did the same; it reads as a
  reload, but it is a little busy.
- **No fresh-context critic pass** was run on `iter-200`; the stage 2 prompt
  still applies, pointed at `iter-200/*-stream.png`.

## Verification

`npm run typecheck`, `npm run lint`, `npm run build` and
`node --experimental-strip-types --test tests/*.test.mjs` (41 tests) pass.
The hardhat contract test was not run (it downloads the compiler). The
capture: `node --experimental-strip-types scripts/loop-shots.mjs --iter 200`
(16.5 min on this machine).
