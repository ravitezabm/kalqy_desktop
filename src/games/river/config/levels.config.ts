import type { RiverImageId } from "../assets";

/** What a correct choice does to its target once the hold completes. */
export type SuccessEffect = "bloom" | "happy" | "extinguish" | "pour";

export interface RiverTargetConfig {
  id: string;
  /** Texture shown before the hold completes. */
  visual: RiverImageId | "waterPool";
  /** Normalized 0..1 position of the object's base center. */
  x: number;
  y: number;
  /** Multiplier of the source art's natural width. */
  scale: number;
  correct: boolean;
  /** Correct targets only: how they change, and what they change into. */
  onCorrect?: { effect: SuccessEffect; swapTo?: RiverImageId };
  /** Wrong targets only: the gentle nudge shown when the child lingers here. */
  wrongHint?: string;
}

/** Scenery the water acts on but the child never chooses (e.g. the fire in the last level). */
export interface RiverPropConfig {
  id: string;
  visual: RiverImageId;
  x: number;
  y: number;
  scale: number;
  /** Put this prop out when the correct target succeeds. */
  extinguishOnSuccess?: boolean;
}

export type RiverMechanicType = "lane-training" | "water-target" | "choice-water" | "extinguish-fire" | "choose-resource";

export type TrainingStep = "left" | "center" | "right";

export interface RiverLevelConfig {
  id: string;
  title: string;
  kind: "training" | "story";
  /** Top-center HUD text. */
  headline: string;
  /** HUD instruction line. */
  hint: string;
  timeLimitSeconds: number;
  timed: boolean;
  mechanic: {
    type: RiverMechanicType;
    holdDurationMs: number;
    /** Horizontal distance (fraction of screen width) within which the stream counts as on target. */
    alignmentTolerance: number;
    /** How far the child has to move — higher means smaller movements travel further. */
    movementSensitivity: number;
    trainingSteps?: TrainingStep[];
  };
  cloud: { enabled: boolean };
  targets: RiverTargetConfig[];
  props: RiverPropConfig[];
  /** Smoky, dim scene that clears on success (forest fire levels). */
  smoky?: boolean;
  /** Message shown while a level is in progress and nothing has happened yet. */
  successMessage: string;
}

const HOLD_MS = 2500;
const SENSITIVITY = 1.7;

/**
 * Story Mode, in order: training then five levels. Fully config-driven so a
 * backend can later supply the same shape (positions, visuals, timers,
 * tolerances, copy) with no game code changing.
 */
export const RIVER_LEVELS: RiverLevelConfig[] = [
  {
    id: "river-training",
    title: "Training",
    kind: "training",
    headline: "Let’s practice!",
    hint: "Lean or step left and right to move the cloud.",
    timeLimitSeconds: 0,
    timed: false,
    mechanic: {
      type: "lane-training",
      holdDurationMs: 900,
      alignmentTolerance: 0.08,
      movementSensitivity: SENSITIVITY,
      trainingSteps: ["left", "center", "right", "center"],
    },
    cloud: { enabled: true },
    targets: [],
    props: [],
    successMessage: "Great!",
  },
  {
    id: "river-story-01",
    title: "Level 1",
    kind: "story",
    headline: "Who needs water?",
    hint: "Find the thirsty plant.",
    timeLimitSeconds: 45,
    timed: true,
    mechanic: { type: "water-target", holdDurationMs: HOLD_MS, alignmentTolerance: 0.1, movementSensitivity: SENSITIVITY },
    cloud: { enabled: true },
    targets: [
      {
        id: "healthy-plant",
        visual: "bloomedPlant",
        x: 0.27,
        y: 0.64,
        scale: 0.44,
        correct: false,
        wrongHint: "Look carefully! This plant is already healthy.",
      },
      {
        id: "plant",
        visual: "dryPlant",
        x: 0.73,
        y: 0.64,
        scale: 0.44,
        correct: true,
        onCorrect: { effect: "bloom", swapTo: "bloomedPlant" },
      },
    ],
    props: [],
    successMessage: "Look! It grew!",
  },
  {
    id: "river-story-02",
    title: "Level 2",
    kind: "story",
    headline: "Who needs water?",
    hint: "Give the thirsty bird some water.",
    timeLimitSeconds: 45,
    timed: true,
    mechanic: { type: "choice-water", holdDurationMs: HOLD_MS, alignmentTolerance: 0.085, movementSensitivity: SENSITIVITY },
    cloud: { enabled: true },
    targets: [
      {
        id: "thirsty-bird",
        visual: "thirstyBird",
        x: 0.27,
        y: 0.64,
        scale: 0.52,
        correct: true,
        onCorrect: { effect: "happy", swapTo: "happyBird" },
      },
      {
        id: "healthy-bird",
        visual: "happyBird",
        x: 0.73,
        y: 0.64,
        scale: 0.52,
        correct: false,
        wrongHint: "Look carefully! This bird already had a drink.",
      },
    ],
    props: [],
    successMessage: "The bird is happy!",
  },
  {
    id: "river-story-03",
    title: "Level 3",
    kind: "story",
    headline: "Save the forest!",
    hint: "Which forest needs the rain?",
    timeLimitSeconds: 45,
    timed: true,
    mechanic: { type: "extinguish-fire", holdDurationMs: HOLD_MS, alignmentTolerance: 0.1, movementSensitivity: SENSITIVITY },
    cloud: { enabled: true },
    targets: [
      {
        id: "forest-fire",
        visual: "forestFire",
        x: 0.27,
        y: 0.64,
        scale: 0.42,
        correct: true,
        onCorrect: { effect: "extinguish", swapTo: "forest" },
      },
      {
        id: "safe-forest",
        visual: "forest",
        x: 0.73,
        y: 0.64,
        scale: 0.42,
        correct: false,
        wrongHint: "Look carefully! This forest is already safe.",
      },
    ],
    props: [],
    smoky: true,
    successMessage: "The forest is safe!",
  },
  {
    id: "river-story-04",
    title: "Level 4",
    kind: "story",
    headline: "Who needs water?",
    hint: "Help the thirsty one!",
    timeLimitSeconds: 45,
    timed: true,
    mechanic: { type: "choice-water", holdDurationMs: HOLD_MS, alignmentTolerance: 0.085, movementSensitivity: SENSITIVITY },
    cloud: { enabled: true },
    targets: [
      {
        id: "thirsty-human",
        visual: "thirstyHuman",
        x: 0.73,
        y: 0.64,
        scale: 0.5,
        correct: true,
        onCorrect: { effect: "happy", swapTo: "swimmingHuman" },
      },
      {
        id: "swimming-human",
        visual: "swimmingHuman",
        x: 0.27,
        y: 0.64,
        scale: 0.5,
        correct: false,
        wrongHint: "Look carefully! This one is already splashing in the water.",
      },
    ],
    props: [],
    successMessage: "Refreshing!",
  },
  {
    id: "river-story-05",
    title: "Level 5",
    kind: "story",
    headline: "What can put out the fire?",
    hint: "Pick the one that can help.",
    timeLimitSeconds: 45,
    timed: true,
    mechanic: { type: "choose-resource", holdDurationMs: HOLD_MS, alignmentTolerance: 0.085, movementSensitivity: SENSITIVITY },
    cloud: { enabled: true },
    targets: [
      {
        id: "water",
        visual: "waterPool",
        x: 0.27,
        y: 0.64,
        scale: 0.44,
        correct: true,
        onCorrect: { effect: "pour" },
      },
      {
        id: "ice",
        visual: "ice",
        x: 0.73,
        y: 0.64,
        scale: 0.46,
        correct: false,
        wrongHint: "Look carefully! Ice is cold, but it isn’t the best helper here.",
      },
    ],
    props: [{ id: "fire", visual: "fire", x: 0.5, y: 0.6, scale: 0.4, extinguishOnSuccess: true }],
    successMessage: "Water saved the day!",
  },
];

/** Catches a malformed level early instead of crashing mid-game. */
export function validateRiverLevel(level: RiverLevelConfig): string[] {
  const problems: string[] = [];
  const { mechanic, targets } = level;

  if (mechanic.holdDurationMs <= 0) problems.push("holdDurationMs must be positive");
  if (mechanic.alignmentTolerance <= 0 || mechanic.alignmentTolerance > 0.5) problems.push("alignmentTolerance out of range");
  if (level.timed && level.timeLimitSeconds <= 0) problems.push("timed level needs a time limit");

  if (mechanic.type === "lane-training") {
    if (!mechanic.trainingSteps?.length) problems.push("training needs steps");
    return problems;
  }

  const ids = new Set<string>();
  for (const target of targets) {
    if (ids.has(target.id)) problems.push(`duplicate target id ${target.id}`);
    ids.add(target.id);
    if (target.x < 0 || target.x > 1 || target.y < 0 || target.y > 1) problems.push(`position out of range on ${target.id}`);
    if (target.correct && !target.onCorrect) problems.push(`correct target ${target.id} needs onCorrect`);
  }
  const correct = targets.filter((t) => t.correct).length;
  if (correct !== 1) problems.push(`expected exactly one correct target, found ${correct}`);
  if (targets.some((t) => t.correct && t.onCorrect?.effect === "pour") && !level.props.some((p) => p.extinguishOnSuccess)) {
    problems.push("a 'pour' target needs a prop to extinguish");
  }
  return problems;
}
