/**
 * Development-only pose presets for the creature review harness.
 *
 * Each preset builds a synthetic `ArcadeState` — the same shape live play
 * produces — so the renderer is exercised through its real inputs. Nothing
 * here runs in production, and nothing here is used to produce a score or a
 * replay trace. `t` is seconds since the moment that defines the state, so a
 * caller can walk a preset forward to capture a motion strip.
 */
import { ARENA, createArcade, type ArcadeEvent, type ArcadeState, type Ingredient } from "../game/arcade";
import type { DevPose } from "./hook";

export const CREATURE_STATE_IDS = [
  "attract-idle",
  "hungry-mild",
  "hungry-severe",
  "tracking-far",
  "tracking-near",
  "gulp-metal",
  "gulp-balloon",
  "gulp-pepper",
  "miss-floor",
  "miss-vent",
  "irritation-1",
  "irritation-2",
  "irritation-3",
  "warn-metal",
  "warn-balloon",
  "warn-pepper",
  "active-metal",
  "active-balloon",
  "active-pepper",
  "recovery",
  "craving-satisfied",
  "off-menu",
  "end-survived",
  "end-starved",
  "end-enraged",
] as const;

export type CreatureStateId = (typeof CREATURE_STATE_IDS)[number];

const MUTATION_LABELS: Record<Ingredient, string> = {
  metal: "MAGNETIC TEETH · Metal curves toward its mouth",
  balloon: "BALLOON BELLY · Every snack feels lighter",
  pepper: "PRESSURE BURP · Watch for the next gust",
};

let eventId = 1;

function add(state: ArcadeState, type: ArcadeEvent["type"], ageTicks: number, label: string,
             extra?: { x?: number; y?: number; ingredient?: Ingredient; craved?: boolean }) {
  state.events.push({
    id: eventId++,
    tick: Math.round(state.tick - ageTicks),
    type,
    x: extra?.x ?? ARENA.mouth.x,
    y: extra?.y ?? ARENA.mouth.y,
    label,
    ...(extra?.ingredient ? { ingredient: extra.ingredient } : {}),
    ...(extra?.craved === undefined ? {} : { craved: extra.craved }),
  });
}

function shot(state: ArcadeState, ingredient: Ingredient, x: number, y: number, vx: number, vy: number, age: number) {
  state.projectiles.push({
    id: state.nextProjectileId++, ingredient, x, y, vx, vy,
    age, bounces: 0, hazardBounces: 0, assisted: false,
  });
}

function base(tick: number): ArcadeState {
  const state = createArcade(7);
  state.tick = tick;
  state.lastLaunchTick = tick - ARENA.cooldownTicks;
  state.score = 4820;
  state.totalFeeds = 9;
  state.shots = 14;
  return state;
}

/** The moment before a catch or a miss: the snack is still in the air. */
function approach(state: ArcadeState, ingredient: Ingredient, seconds: number) {
  // 13.6 px per tick along the flight, arriving at the mouth at t = 0.
  const away = Math.min(0.9, seconds) * 60 * 11.4;
  shot(state, ingredient, ARENA.mouth.x - away, ARENA.mouth.y - away * 0.16, 11.4, 1.8, 40);
  add(state, "launch", 40, ingredient, { x: 264, y: 494, ingredient });
}

/**
 * Builds one forced presentation frame. `t` is seconds since the defining
 * moment, and may be negative: a strip needs the run-up as well as the beat.
 */
export function buildPose(id: CreatureStateId, t = 0): DevPose {
  const ticks = Math.round(Math.max(0, t) * 60);
  const before = t < 0 ? -t : 0;
  let playing = true;
  let selected: Ingredient = "metal";
  let angle: number = ARENA.defaultAngle;
  const state = base(720 + ticks);

  switch (id) {
    case "attract-idle": {
      playing = false;
      state.tick = ticks;
      state.hunger = 78;
      break;
    }
    case "hungry-mild": {
      state.hunger = 44;
      break;
    }
    case "hungry-severe": {
      state.hunger = 7;
      break;
    }
    case "tracking-far": {
      selected = "balloon";
      angle = -46;
      shot(state, "balloon", 402, 372, 9.4, -3.1, 22);
      add(state, "launch", 22, "balloon", { x: 264, y: 494, ingredient: "balloon" });
      break;
    }
    case "tracking-near": {
      selected = "balloon";
      angle = -46;
      // On the mouth's centreline and close enough to be about to arrive. At
      // its old position the snack sat out on the cheek, which reads as a
      // sprite stuck to the face rather than as food in flight.
      shot(state, "balloon", 774, 291, 9.4, 0.4, 44);
      add(state, "launch", 44, "balloon", { x: 264, y: 494, ingredient: "balloon" });
      break;
    }
    case "gulp-metal":
    case "gulp-balloon":
    case "gulp-pepper": {
      const ingredient = id.slice(5) as Ingredient;
      selected = ingredient;
      state.tick = 720 + ticks;
      state.combo = 3;
      const points = { metal: 260, balloon: 180, pepper: 305 }[ingredient];
      if (before) approach(state, ingredient, before);
      else add(state, "feed", ticks, `TASTY +${points}`, { x: 838, y: 286, ingredient, craved: false });
      break;
    }
    case "craving-satisfied": {
      state.tick = 720 + ticks;
      state.combo = 4;
      state.wanted = "balloon";
      selected = "balloon";
      if (before) approach(state, "balloon", before);
      else add(state, "feed", ticks, "CRAVING +410", { x: 838, y: 282, ingredient: "balloon", craved: true });
      break;
    }
    case "off-menu": {
      state.tick = 720 + ticks;
      state.combo = 1;
      state.wanted = "pepper";
      selected = "metal";
      if (before) approach(state, "metal", before);
      else add(state, "feed", ticks, "TASTY +140", { x: 838, y: 282, ingredient: "metal", craved: false });
      break;
    }
    case "miss-floor": {
      selected = "pepper";
      state.misses = 4;
      state.rage = 28;
      if (before) {
        // A miss is on a losing line the whole way, not a catch that failed at
        // the last moment.
        const away = Math.min(0.9, before) * 60 * 11.4;
        shot(state, "pepper", ARENA.mouth.x - away, ARENA.mouth.y + 110 - away * 0.02, 11.4, 5.4, 46);
        add(state, "launch", 46, "pepper", { x: 264, y: 494, ingredient: "pepper" });
      } else add(state, "miss", ticks, "SNACK DOWN", { x: 690, y: 612, ingredient: "pepper" });
      break;
    }
    case "miss-vent": {
      state.tick = 2600 + ticks;
      state.lastLaunchTick = state.tick - ARENA.cooldownTicks;
      selected = "metal";
      state.misses = 5;
      state.rage = 34;
      add(state, "bounce", ticks, "VENT DEFLECTION", { x: 556, y: 296, ingredient: "metal" });
      break;
    }
    case "irritation-1": {
      state.rage = 30;
      state.misses = 4;
      break;
    }
    case "irritation-2": {
      state.rage = 62;
      state.misses = 9;
      break;
    }
    case "irritation-3": {
      state.rage = 93;
      state.misses = 14;
      break;
    }
    case "warn-metal":
    case "warn-balloon":
    case "warn-pepper": {
      const ingredient = id.slice(5) as Ingredient;
      selected = ingredient;
      state.servings[ingredient] = 3;
      // The warning is a 90-tick build. Past that the mutation actually lands:
      // a strip that stops at the end of the build can only ever show a ramp,
      // never the snap the ramp is anticipating, which is what made all three
      // onset strips read as linear.
      const startsAt = state.tick + 90 - ticks;
      state.mutation = {
        ingredient, phase: ticks >= 90 ? "active" : "warning",
        startsAt,
        endsAt: state.tick + 570 - ticks,
        gustWarning: false, gustActive: false,
      };
      state.announcement = MUTATION_LABELS[ingredient];
      add(state, ticks >= 90 ? "mutation" : "warning", Math.max(0, ticks - 90),
          MUTATION_LABELS[ingredient], { ingredient });
      break;
    }
    case "active-metal":
    case "active-balloon": {
      const ingredient = id.slice(7) as Ingredient;
      selected = ingredient;
      state.servings[ingredient] = 3;
      state.mutation = {
        ingredient, phase: "active",
        startsAt: state.tick - ticks - 30,
        endsAt: state.tick + 400,
        gustWarning: false, gustActive: false,
      };
      state.announcement = MUTATION_LABELS[ingredient];
      add(state, "mutation", ticks + 30, MUTATION_LABELS[ingredient], { ingredient });
      break;
    }
    case "active-pepper": {
      selected = "pepper";
      state.servings.pepper = 3;
      // Sits inside the deterministic 180-tick gust cycle: warning window is
      // ticks 0-29 and the exhale itself is ticks 30-71.
      const startsAt = state.tick - 24 - ticks;
      const cycle = ((state.tick - startsAt) % 180 + 180) % 180;
      state.mutation = {
        ingredient: "pepper", phase: "active",
        startsAt, endsAt: state.tick + 400,
        gustWarning: cycle < 30, gustActive: cycle >= 30 && cycle < 72,
      };
      state.announcement = MUTATION_LABELS.pepper;
      add(state, "gust", Math.max(0, cycle - 30), "BURP! HEADWIND", { ingredient: "pepper" });
      break;
    }
    case "recovery": {
      selected = "balloon";
      state.servings.balloon = 3;
      add(state, "recovery", ticks, "KITCHEN BACK TO NORMAL", { ingredient: "balloon" });
      break;
    }
    case "end-survived": {
      playing = false;
      state.tick = ARENA.roundTicks;
      state.phase = "survived";
      state.hunger = 71;
      state.score = 12440;
      state.announcement = "Shift complete. Somehow, you are still on the menu.";
      add(state, "end", ticks, state.announcement);
      break;
    }
    case "end-starved": {
      playing = false;
      state.phase = "lost";
      state.failureReason = "empty-belly";
      state.hunger = 0;
      state.announcement = "Empty belly. It has eaten the employee handbook.";
      add(state, "end", ticks, state.announcement);
      break;
    }
    case "end-enraged": {
      playing = false;
      state.phase = "lost";
      state.failureReason = "too-many-missed-shots";
      state.rage = 100;
      state.hunger = 38;
      state.announcement = "Too many missed shots. The kitchen has been politely destroyed.";
      add(state, "end", ticks, state.announcement);
      break;
    }
  }

  return { state, playing, angle, selected };
}
