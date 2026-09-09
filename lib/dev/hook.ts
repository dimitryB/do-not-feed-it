/**
 * Development-only inspection hooks.
 *
 * `DEV_HOOKS` folds to `false` in a production build, so every guarded block
 * (and the dynamic imports behind it) is dropped by the bundler. Nothing here
 * is imported by `lib/game/`, and nothing here can change a rule or a replay.
 */
import type { ArcadeState, Ingredient } from "../game/arcade";

export const DEV_HOOKS = process.env.NODE_ENV !== "production";

/** A forced presentation frame: the renderer draws this instead of live play. */
export interface DevPose {
  state: ArcadeState;
  playing: boolean;
  angle: number;
  selected: Ingredient;
}

export interface DevRenderControl {
  /** Frozen render clock in seconds, or null to use the real clock. */
  clock: number | null;
  /** Forced reduced-motion flag, or null to use the player setting. */
  reduced: boolean | null;
  /** Forced presentation frame, or null for live play. */
  pose: DevPose | null;
  /** Hides the aim guide and target ring, so a capture shows only the creature. */
  hideAim: boolean;
  /** Holds the eyes open: a blink landing on a capture reads as a missing face. */
  holdBlink: boolean;
  /** Rolling scene-draw cost in milliseconds. */
  timing: { samples: number; total: number; max: number; last: number };
}

export const devRender: DevRenderControl = {
  clock: null,
  reduced: null,
  pose: null,
  hideAim: false,
  holdBlink: false,
  timing: { samples: 0, total: 0, max: 0, last: 0 },
};

export function recordDrawCost(milliseconds: number) {
  const timing = devRender.timing;
  timing.samples++;
  timing.total += milliseconds;
  timing.last = milliseconds;
  if (milliseconds > timing.max) timing.max = milliseconds;
}

export function resetDrawCost() {
  devRender.timing = { samples: 0, total: 0, max: 0, last: 0 };
}

type HookBag = Record<string, unknown>;

/** Returns the shared `window.__dnfi` bag in development, otherwise null. */
export function devHookBag(): HookBag | null {
  if (!DEV_HOOKS || typeof window === "undefined") return null;
  const holder = window as unknown as { __dnfi?: HookBag };
  holder.__dnfi ??= {};
  return holder.__dnfi;
}
