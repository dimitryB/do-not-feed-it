import type { ArcadeState, Ingredient } from '../game/arcade';

/**
 * The lore, in words. `docs/LORE.md` is the canon; this module is every line
 * of it the player reads. Nothing here is read by the rules: the rules keep
 * their kitchen words (MAGNET MOUTH, UTENSIL, DOUBLE BANK…) because their
 * traces and fixtures are frozen, and the screen translates on the way out.
 *
 * The double-meaning rule: every crypto word must also be literally true of
 * what is on screen. HARD FORK is a fork, SLIPPAGE is drool, TOKEN BURN is a
 * fire. A judge on a compressed stream who does not know the slang still sees
 * what happened. No prices, crashes, rugs, hacks or exploits; no real people.
 */

// ---- the coins and what they turn it into.

/** The three mutations, as the chips, the deck, the legend and the help name them. */
export const TOKEN_TRAITS: Record<Ingredient, string> = { metal: 'HODL jaws', balloon: 'Gas belly', pepper: 'Turbo breath' };

/** What it wants, by ticker. */
export const CRAVING_LINES: Record<Ingredient, string> = { metal: 'IT WANTS BTC.', balloon: 'IT WANTS ETH.', pepper: 'IT WANTS HEMI.' };

// ---- the rules' labels, translated.

/**
 * Rule labels to lore copy, applied in order as substring replacements, so a
 * suffix (×2, +500) rides through untouched. Longer phrases first.
 */
const PHRASES: readonly [string, string][] = [
  ['MAGNET MOUTH', 'HODL JAWS'],
  ['BALLOON BELLY', 'GAS BELLY'],
  ['FIRE BREATH', 'TURBO BREATH'],
  ['OFF THE BELLY', 'OFF THE GAS BELLY'],
  ['DOUBLE BANK', 'MULTI-HOP'],
  ['TRIPLE BANK', 'TRIPLE HOP'],
  // A piece of junk the renderer could not identify is a wallet; a known fork says HARD FORK (`CAPTIONS.fork`).
  ['UTENSIL', 'COLD STORAGE'],
  ['FORK IN THE WORKS', 'FORKED.'],
  ['BITTEN', 'FRONT-RUN'],
  ['TANTRUM', 'MAXI TANTRUM'],
  ['IT ATE THE VENT', 'EXTRACTOR: EATEN'],
  ['THE LAST SERVING', 'ONE TX PENDING'],
];
export function tokenCopy(label: string): string {
  let out = label;
  for (const [from, to] of PHRASES) if (out.includes(from)) out = out.split(from).join(to);
  return out;
}

// ---- the captions the renderer says on its own.

/**
 * One caption per thing that happens. `size` is the font size the renderer
 * draws it at, and `card` marks the boxed one-word cards; `tests/lore.test.mjs`
 * holds each to the width of the caption slot.
 */
export const CAPTIONS = {
  nom: 'NOM.',
  craved: 'ORDER FILLED.',
  stuffed: 'STUFFED.',
  gasSpike: 'GAS SPIKE.',
  reverted: 'REVERTED.',
  dropped: 'TX DROPPED.',
  fork: (points: number) => `HARD FORK +${points}`,
  wallet: (points: number) => `COLD STORAGE +${points}`,
  walletJam: 'TX STUCK.',
  turbo: "TURBO'D.",
  burn: 'TOKEN BURN.',
  inhale: 'IT INHALES',
  breath: 'TURBO BREATH',
  scaling: 'SCALING.',
  noRoom: 'BLOCK FULL.',
  tantrum: 'MAXI TANTRUM.',
  sneeze: 'SNEEZE.',
  slippage: 'SLIPPAGE.',
  lunge: 'IT IS COMING OUT.',
  frenzy: 'FOMO',
  combo: 'COMBO',
} as const;

// ---- the night's end.

/** The cause line, by the rules' failure reason. */
export const CAUSES: Record<NonNullable<ArcadeState['failureReason']>, string> = {
  'empty-belly': 'OUT OF GAS.',
  'kitchen-destroyed': 'THE KITCHEN GOT REKT.',
  'outgrew-the-kitchen': 'IT REACHED SUPERFINALITY.',
};

/**
 * One joke per ending, by `state.ending` (0–3, smallest to largest): gas money,
 * a block, the mempool, the chain. Nothing about anyone's holdings, treasuries
 * or foundations — with REKT and a report on screen those read as an exploit.
 */
export const ENDING_JOKES: readonly string[] = [
  'IT ATE THE GAS MONEY.',
  'IT ATE A WHOLE BLOCK.',
  'IT ATE THE MEMPOOL.',
  'IT ATE THE CHAIN.',
];

/** The wallet tier it ended the night at, by `state.ending`, with its line on the report. */
export const WALLET_TIERS: readonly { tier: string; line: string }[] = [
  { tier: 'Shrimp', line: 'Wallet tier: shrimp. Everyone starts somewhere.' },
  { tier: 'Dolphin', line: 'Wallet tier: dolphin. It is getting ideas.' },
  { tier: 'Shark', line: 'Wallet tier: shark. The whales have noticed.' },
  { tier: 'Whale', line: 'Wallet tier: whale. The whale alerts are about it now.' },
];

/** The report's headline: the night lost, or a new personal best (or the twelve-minute cap survived). */
export const HEADLINES = {
  over: ['IT’S SO', 'OVER.'],
  back: ['WE’RE SO', 'BACK.'],
} as const;

// ---- the extras.

/**
 * Press E. Contest 1's judges could not get a game's E key to work on stream
 * and it became the hosts' running joke ("Press E, Jeremy." "I pressed E. I
 * did it."). E does nothing to the rules; it only says so, a little more each
 * time.
 */
export const PRESS_E: readonly string[] = ['YOU PRESSED E.', 'IT WORKED.', 'E IS NOT A TOKEN.', 'STILL WORKS.'];
/** The line for the `count`-th press (1-based); the last line repeats. */
export const pressELine = (count: number) => PRESS_E[Math.min(PRESS_E.length - 1, Math.max(0, Math.floor(count) - 1))];

/** Halloween on the title (see `./season.ts`): the tag, the lede's first line and Munch's costume. */
export const HALLOWEEN = {
  tag: 'TRICK OR TOKEN',
  ledeFirst: 'Proposal #004 passed. Nobody enforces it.',
  costume: 'Costume: a whale. It is working on it.',
} as const;
