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

/**
 * How each coin flies, in plain words: the deck, the help and the legend say
 * it where the player picks a coin (tone rule 7: literal where you act).
 */
export const TOKEN_FLIGHT: Record<Ingredient, string> = { metal: 'Heavy', balloon: 'Floats', pepper: 'Straight' };

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
  // The rules' crates on the rail are blocks on a chain.
  ['CRATE', 'BLOCK'],
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
  craved: 'ORDER FILLED.',
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
  // The community's running answer to every "when?" — and the creature is, literally, coming out.
  lunge: 'IT IS STILL COMING.',
  // Max, Oct 7: "I wonder if there's something somebody could do in game where veHEMI is a weapon." The first breath of a shift.
  weapon: 'veHEMI IS A WEAPON.',
  // Max, Oct 7, on waiting for blocks: "just because Bitcoin being Bitcoin." Only ever said of a Bitcoin on the floor.
  btcMiss: 'BITCOIN BEING BITCOIN.',
  frenzy: 'FOMO',
  combo: 'COMBO',
  // A block on the chain under the ceiling, broken open by its own coin: the
  // coins inside pour into the mouth. A literal block, and a literal reward.
  blockReward: 'BLOCK REWARD.',
  // A block lowered out of the ceiling says whose it is (BLOCK_NAMES).
  bitcoinBlock: 'BITCOIN BLOCK.',
  etherBlock: 'ETHER BLOCK.',
  hemiBlock: 'HEMI BLOCK.',
  // A block nobody broke is hoisted back up through the ceiling: the block was missed.
  blockMissed: 'MISSED THE BLOCK.',
  // A coin that is not the block's own glances off it.
  wrongToken: 'WRONG TOKEN.',
} as const;

/** What each block says as it comes down: the coin that opens it. */
export const BLOCK_NAMES: Record<Ingredient, string> = {
  metal: CAPTIONS.bitcoinBlock, balloon: CAPTIONS.etherBlock, pepper: CAPTIONS.hemiBlock,
};

/**
 * The caption for a coin on the floor: Bitcoin being Bitcoin; anything else a
 * dropped transaction, except one miss in three, which gets the hosts' verdict
 * on running twenty minutes over (by event id, so a replay says the same).
 */
export function missCaption(ingredient?: Ingredient | null, seed = 2): string {
  if (ingredient === 'metal') return CAPTIONS.btcMiss;
  const k = Math.abs(Math.floor(seed)) % 3;
  return k === 0 ? TALKBACK.miss : k === 1 ? TALKBACK.shrug : CAPTIONS.dropped;
}

/** A craving ignored: MAXI TANTRUM., or every other time John's verdict on an idea he did not like. */
export function tantrumCaption(seed: number): string {
  return Math.abs(Math.floor(seed)) % 2 === 0 ? CAPTIONS.tantrum : TALKBACK.tantrum;
}

/**
 * The creature talks back in the hosts' own words. Where the old captions
 * said NOM., it spits back a line from Midweek with Max or the Office Hours:
 * the catch lines in turn (so a judge hears a new one each time), the stuffed
 * ones when it was not even hungry, Rick's "Oh, doctor" when FOMO starts.
 * Short enough for the caption slot, true of the moment, never a name; the
 * sources and timestamps are in docs/LORE.md ("The creature talks back").
 */
export const TALKBACK = {
  catch: [
    'HEY MAN, FIBER.',
    "WE'RE GAMING.",
    "THAT'S REALLY SICK.",
    'COMPETITIVE EATER.',
    'DING, DING, DING.',
    'THIS LOOKS GREAT.',
    "LET'S HAVE SOME FUN.",
    'I RESPECT IT.',
    'ENJOY IT. LOVE LIFE.',
    'FOR THE LOLS.',
    'PRETTY ON BRAND.',
    "THAT'S COMMITMENT.",
    'BUILD THE DEX.',
    'I DID IT.',
    'WELL PLAYED.',
    'OH MY GOODNESS.',
    'THE SOUND EFFECTS WORK.',
  ],
  stuffed: ["UNLESS IT'S OVERFLOWING.", 'GOT YOUR CARBS IN.', 'TWO FULL TURKEYS.'],
  frenzy: 'OH, DOCTOR.',
  miss: "WE'VE DONE WORSE.",
  shrug: 'WELL, WHATEVER.',
  tantrum: 'NOPE. HATE IT.',
} as const;

/** The `n`-th thing it says on a catch (0-based), from the stuffed lines when it was not hungry. */
export function catchLine(n: number, stuffed: boolean): string {
  const pool: readonly string[] = stuffed ? TALKBACK.stuffed : TALKBACK.catch;
  return pool[((Math.floor(n) % pool.length) + pool.length) % pool.length];
}

/**
 * The caption for a fork caught in its mouth. One in three is GLAMSTERDAM, the
 * next Ethereum hard fork, which the hosts cannot stop saying; the rest are
 * HARD FORK. `seed` is the event's id, so a replay says the same thing.
 */
export function forkCaption(seed: number, points: number): string {
  return Math.abs(Math.floor(seed)) % 3 === 0 ? `GLAMSTERDAM +${points}` : CAPTIONS.fork(points);
}

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
 * did it."). Now and then the creature spits out a PRESS E sign
 * (`./pressE.ts`); pressing E while it is up is a hit (PRESS_E_HIT, a burst of
 * coins, ding ding ding). Pressing E any other time gets these, a little drier
 * each time. E never touches the rules.
 */
export const PRESS_E: readonly string[] = ['YOU PRESSED E.', 'NOTHING HAPPENED.', 'E IS NOT A TOKEN.', 'WAIT FOR IT.'];
/** What a hit says, as a card. */
export const PRESS_E_HIT = 'IT WORKED.';
/** The line for the `count`-th press (1-based); the last line repeats. */
export const pressELine = (count: number) => PRESS_E[Math.min(PRESS_E.length - 1, Math.max(0, Math.floor(count) - 1))];

/** Halloween on the title (see `./season.ts`): the tag, the lede's first line and Munch's costume. */
export const HALLOWEEN = {
  tag: 'TRICK OR TOKEN',
  ledeFirst: 'Proposal #004 passed. Nobody enforces it.',
  costume: 'Costume: a whale. It is working on it.',
} as const;

// ---- scripture.

/**
 * The hosts' own words, set as verses: the speaker is the book and the stream
 * timestamp is chapter and verse, so "Max 13:06" reads like scripture. Every
 * line is from the auto-captions of a Hemi stream (stutters removed), cited
 * at the start of its passage. Lines about the work, the game or the speaker
 * themselves, in good humour; nothing religious and nothing at anyone's
 * expense. They go where people read for a moment (title, pause, help, the
 * report, the sound mix), never in a caption. When the speaker is not certain
 * the book is the show. See docs/LORE.md, "Scripture".
 */
export interface Verse {
  text: string;
  /** The book: who said it, or the show when that is not certain. */
  who: string;
  /** Chapter and verse: minutes and seconds into the stream. */
  at: string;
  show: 'Midweek with Max' | 'Office Hours';
  date: string;
}
const verse = (text: string, who: string, at: string, show: Verse['show'], date: string): Verse => ({ text, who, at, show, date });

export const VERSES = {
  /** One per visit, under the title. */
  title: [
    verse('A new lens to look at Bitcoin through.', 'Max', '18:30', 'Midweek with Max', 'Oct 6'),
    verse("So they exist. Let's use it. Let's have some fun.", 'Marco', '11:49', 'Midweek with Max', 'Sept 15'),
    verse('So a guy walks into a blockchain.', 'Jeremy', '46:31', 'Office Hours', 'Sept 23'),
    verse("Art does not need utility. If it has to have utility, it's not art.", 'John', '7:37', 'Midweek with Max', 'Oct 13'),
  ],
  /** One per pause. Judges pause to talk. */
  pause: [
    verse('The ZK talk will continue until questions come in.', 'Max', '13:06', 'Midweek with Max', 'Sept 15'),
    verse('Me, derailed? Never. Come on.', 'Max', '28:44', 'Midweek with Max', 'Sept 29'),
    verse('Complex systems are complex.', 'John', '52:07', 'Midweek with Max', 'Oct 6'),
  ],
  /** The whitepaper's epigraph. */
  help: verse('Whatever you do with the tokens is cool, but the biggest thing is make a good game.', 'John', '28:24', 'Midweek with Max', 'Oct 13'),
  /** Cited in the whitepaper's first step. */
  sloth: verse('I have the hand-eye coordination of a sloth.', 'Max', '29:25', 'Office Hours', 'Oct 7'),
  /** Under the restart button. */
  restart: verse('Your job is to make us want to keep giving those games quarters.', 'John', '29:29', 'Midweek with Max', 'Oct 13'),
  /** Cited on a new personal best. The speaker is not certain (Rick answers it), so the book is the show. */
  newBest: verse('Flashing lights and loud noises. Ding, ding, ding, ding, ding.', 'Midweek with Max', '29:46', 'Midweek with Max', 'Oct 13'),
  /** The sound mix: the music is original, and nothing is sampled. */
  sound: verse('The real horror is copyright strikes.', 'Office Hours', '16:10', 'Office Hours', 'Oct 7'),
} as const;

/** Every verse, for the tests and the docs. */
export const ALL_VERSES: readonly Verse[] = [
  ...VERSES.title, ...VERSES.pause, VERSES.help, VERSES.sloth, VERSES.restart, VERSES.newBest, VERSES.sound,
];

/** The `n`-th verse of a list, wrapping. */
export const verseAt = (list: readonly Verse[], n: number): Verse => list[((Math.floor(n) % list.length) + list.length) % list.length];
