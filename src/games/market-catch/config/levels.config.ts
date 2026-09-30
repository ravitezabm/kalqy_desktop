import { DEFAULT_SCORING, type ScoringConfig } from "../../../engine/mechanics/collection/ScoreManager";
import type { LaneStep } from "../../../engine/mechanics/movement/LaneLesson";
import type { SpawnConfig } from "../../../engine/mechanics/falling-objects/ObjectSpawner";
import type { ObjectRegistry } from "../../../engine/mechanics/falling-objects/ObjectRegistry";

export interface GoalTargetConfig {
  objectId: string;
  count: number;
  /** HUD row name, e.g. "Apples". */
  label: string;
}

export interface MarketLevelConfig {
  id: string;
  kind: "training" | "story";
  title: string;
  /** Top-center HUD title. */
  headline: string;
  hint: string;
  timed: boolean;
  timeLimitSeconds: number;
  /** Shown in the HUD tip box. */
  goal: { targets: GoalTargetConfig[] };
  spawning: Pick<SpawnConfig, "spawnIntervalMs" | "fallSpeed" | "maxObjects" | "wantedRatio" | "hazardRatio" | "guaranteeWantedMs"> & {
    /** Vertical variety: objects start this far above the top (min..max px). */
    spawnY?: [number, number];
    /** Extra downward acceleration, px/s². */
    gravity?: number;
  };
  /** Fresh fruit that is NOT a goal, and rotten fruit — ids into the ObjectRegistry. */
  distractors: string[];
  hazards: string[];
  scoring: ScoringConfig;
  /** Multiplies every object's size (larger for easy levels, slightly smaller for small fruit). */
  sizeScale: number;
  /** What the lion/turtle say when the child catches the wrong thing, per level. */
  wrongHint?: string;
  training?: { steps: LaneStep[]; holdMs: number };
}

const SPAWN_DEFAULT = { wantedRatio: 0.5, hazardRatio: 0, guaranteeWantedMs: 4500 } as const;
const FRESH = (...ids: string[]) => ids.map((id) => `${id}_fresh`);
const ROTTEN = (...ids: string[]) => ids.map((id) => `${id}_rotten`);

function story(n: number, config: Omit<MarketLevelConfig, "id" | "kind" | "timed" | "scoring" | "sizeScale"> & Partial<Pick<MarketLevelConfig, "scoring" | "sizeScale" | "timed">>): MarketLevelConfig {
  return { id: `market-story-${String(n).padStart(2, "0")}`, kind: "story", timed: true, scoring: DEFAULT_SCORING, sizeScale: 1, ...config };
}

/** Training + the 10 story levels. Everything a level does is in this table — the scene has no per-level code. */
export const MARKET_LEVELS: MarketLevelConfig[] = [
  {
    id: "market-training",
    kind: "training",
    title: "Training",
    headline: "Let’s catch some fruit!",
    hint: "Move your body left and right",
    timed: false,
    timeLimitSeconds: 0,
    goal: { targets: [{ objectId: "apple_fresh", count: 1, label: "Apple" }] },
    spawning: { spawnIntervalMs: 99999, fallSpeed: [115, 115], maxObjects: 1, wantedRatio: 1, hazardRatio: 0, guaranteeWantedMs: 99999 },
    distractors: [],
    hazards: [],
    scoring: { correct: 0, wrong: 0, hazard: 0, extra: 0, streakOnMistake: "keep" },
    sizeScale: 1.1,
    training: { steps: ["left", "right", "center"], holdMs: 700 },
  },
  story(1, {
    title: "Apple Market",
    headline: "Catch the apples!",
    hint: "Move your body to catch the falling apples",
    timeLimitSeconds: 50,
    goal: { targets: [{ objectId: "apple_fresh", count: 5, label: "Apples" }] },
    spawning: { ...SPAWN_DEFAULT, spawnIntervalMs: 1500, fallSpeed: [120, 150], maxObjects: 4, wantedRatio: 0.6 },
    distractors: FRESH("banana"),
    hazards: [],
    scoring: { ...DEFAULT_SCORING, wrong: 0 },
    sizeScale: 1.1,
    wrongHint: "That’s not an apple — look for the red one!",
  }),
  story(2, {
    title: "Orange Market",
    headline: "Catch the oranges!",
    hint: "Only oranges count — other fruit loses points",
    timeLimitSeconds: 50,
    goal: { targets: [{ objectId: "orange_fresh", count: 5, label: "Oranges" }] },
    spawning: { ...SPAWN_DEFAULT, spawnIntervalMs: 1400, fallSpeed: [130, 170], maxObjects: 5, wantedRatio: 0.5 },
    distractors: FRESH("apple", "banana", "pear"),
    hazards: [],
    sizeScale: 1.05,
    wrongHint: "Oops! We need oranges!",
  }),
  story(3, {
    title: "Banana Market",
    headline: "Catch the bananas!",
    hint: "Watch out for rotten fruit!",
    timeLimitSeconds: 50,
    goal: { targets: [{ objectId: "banana_fresh", count: 5, label: "Bananas" }] },
    spawning: { ...SPAWN_DEFAULT, spawnIntervalMs: 1300, fallSpeed: [140, 180], maxObjects: 5, wantedRatio: 0.45, hazardRatio: 0.15 },
    distractors: FRESH("apple", "orange"),
    hazards: ROTTEN("apple", "orange", "pear"),
    wrongHint: "Oops! We need bananas!",
  }),
  story(4, {
    title: "Watermelon Market",
    headline: "Catch the watermelons!",
    hint: "Big, juicy watermelons — be quick!",
    timeLimitSeconds: 50,
    goal: { targets: [{ objectId: "watermelon_fresh", count: 5, label: "Watermelons" }] },
    spawning: { ...SPAWN_DEFAULT, spawnIntervalMs: 1350, fallSpeed: [150, 190], maxObjects: 5, wantedRatio: 0.45, hazardRatio: 0.12 },
    distractors: FRESH("apple", "banana", "orange", "pear"),
    hazards: ROTTEN("banana", "orange"),
    sizeScale: 1.15,
    wrongHint: "Oops! We need watermelons!",
  }),
  story(5, {
    title: "Strawberry Market",
    headline: "Catch the strawberries!",
    hint: "Fresh ones only — skip the rotten ones",
    timeLimitSeconds: 55,
    goal: { targets: [{ objectId: "strawberry_fresh", count: 5, label: "Strawberries" }] },
    spawning: { ...SPAWN_DEFAULT, spawnIntervalMs: 1200, fallSpeed: [170, 210], maxObjects: 6, wantedRatio: 0.45, hazardRatio: 0.2 },
    distractors: FRESH("apple", "orange", "grape"),
    hazards: ROTTEN("strawberry", "apple", "grape"),
    wrongHint: "Oops! We need strawberries!",
  }),
  story(6, {
    title: "Coconut Market",
    headline: "Catch the coconuts!",
    hint: "They fall from different heights",
    timeLimitSeconds: 55,
    goal: { targets: [{ objectId: "coconut_fresh", count: 5, label: "Coconuts" }] },
    spawning: { ...SPAWN_DEFAULT, spawnIntervalMs: 1150, fallSpeed: [190, 240], maxObjects: 6, wantedRatio: 0.45, hazardRatio: 0.22, spawnY: [60, 340], gravity: 40 },
    distractors: FRESH("apple", "banana", "pear"),
    hazards: ROTTEN("coconut", "banana"),
    wrongHint: "Oops! We need coconuts!",
  }),
  story(7, {
    title: "Pear Market",
    headline: "Catch the pears!",
    hint: "Lots of fruit are falling — find the pears",
    timeLimitSeconds: 55,
    goal: { targets: [{ objectId: "pear_fresh", count: 6, label: "Pears" }] },
    spawning: { ...SPAWN_DEFAULT, spawnIntervalMs: 1050, fallSpeed: [200, 250], maxObjects: 6, wantedRatio: 0.42, hazardRatio: 0.22, spawnY: [60, 260], gravity: 40 },
    distractors: FRESH("apple", "orange", "banana", "strawberry"),
    hazards: ROTTEN("pear", "apple", "strawberry"),
    wrongHint: "Oops! We need pears!",
  }),
  story(8, {
    title: "Grape Market",
    headline: "Catch the grapes!",
    hint: "Small and sweet — keep your eyes open",
    timeLimitSeconds: 55,
    goal: { targets: [{ objectId: "grape_fresh", count: 6, label: "Grapes" }] },
    spawning: { ...SPAWN_DEFAULT, spawnIntervalMs: 950, fallSpeed: [200, 250], maxObjects: 7, wantedRatio: 0.42, hazardRatio: 0.2, spawnY: [60, 260], gravity: 40 },
    distractors: FRESH("apple", "pear", "strawberry", "orange"),
    hazards: ROTTEN("grape", "pear", "orange"),
    sizeScale: 0.95,
    wrongHint: "Oops! We need grapes!",
  }),
  story(9, {
    title: "Fruit Basket",
    headline: "Fill the fruit basket!",
    hint: "Collect 3 apples, 3 oranges and 2 bananas",
    timeLimitSeconds: 60,
    goal: {
      targets: [
        { objectId: "apple_fresh", count: 3, label: "Apples" },
        { objectId: "orange_fresh", count: 3, label: "Oranges" },
        { objectId: "banana_fresh", count: 2, label: "Bananas" },
      ],
    },
    spawning: { ...SPAWN_DEFAULT, spawnIntervalMs: 1000, fallSpeed: [190, 240], maxObjects: 6, wantedRatio: 0.55, hazardRatio: 0.18, spawnY: [60, 240], gravity: 30 },
    distractors: FRESH("pear", "strawberry", "grape"),
    hazards: ROTTEN("apple", "orange", "banana"),
    wrongHint: "Oops! That one isn’t in our basket!",
  }),
  story(10, {
    title: "Market Festival",
    headline: "Market Festival!",
    hint: "Collect 2 apples, 2 oranges, 2 bananas and 2 strawberries",
    timeLimitSeconds: 60,
    goal: {
      targets: [
        { objectId: "apple_fresh", count: 2, label: "Apples" },
        { objectId: "orange_fresh", count: 2, label: "Oranges" },
        { objectId: "banana_fresh", count: 2, label: "Bananas" },
        { objectId: "strawberry_fresh", count: 2, label: "Strawberries" },
      ],
    },
    spawning: { ...SPAWN_DEFAULT, spawnIntervalMs: 850, fallSpeed: [210, 270], maxObjects: 7, wantedRatio: 0.5, hazardRatio: 0.2, spawnY: [60, 300], gravity: 40 },
    distractors: FRESH("pear", "grape", "coconut", "watermelon"),
    hazards: ROTTEN("apple", "orange", "banana", "strawberry", "pear"),
    wrongHint: "Oops! That one isn’t on our list!",
  }),
];

/** Problems that would make a level unsafe to start (empty = fine). Checked before every level. */
export function validateMarketLevel(level: MarketLevelConfig, registry: ObjectRegistry, assetExists: (key: string) => boolean = () => true): string[] {
  const problems: string[] = [];
  const { goal, spawning, scoring } = level;
  if (goal.targets.length === 0) problems.push("goal has no targets");
  for (const target of goal.targets) {
    if (!(target.count > 0)) problems.push(`target ${target.objectId}: count must be positive`);
    problems.push(...registry.validate(target.objectId, assetExists));
  }
  for (const id of [...level.distractors, ...level.hazards]) problems.push(...registry.validate(id, assetExists));
  if (level.kind === "story") {
    if (!(spawning.spawnIntervalMs >= 300)) problems.push("spawnIntervalMs must be at least 300");
    if (!(spawning.maxObjects >= 1)) problems.push("maxObjects must be at least 1");
    if (!(spawning.fallSpeed[0] > 0 && spawning.fallSpeed[1] >= spawning.fallSpeed[0])) problems.push("fallSpeed must be a positive, ordered range");
    if (level.timed && !(level.timeLimitSeconds > 0)) problems.push("timed level needs a positive time limit");
    if (spawning.hazardRatio > 0 && level.hazards.length === 0) problems.push("hazardRatio is set but there are no hazards");
  }
  if (![scoring.correct, scoring.wrong, scoring.hazard, scoring.extra].every(Number.isFinite)) problems.push("scoring values must be numbers");
  if (level.kind === "training" && !level.training?.steps.length) problems.push("training needs steps");
  return problems;
}

/** Used when a (future, backend-supplied) level fails validation: the first story level, which is always safe. */
export const SAFE_FALLBACK_LEVEL: MarketLevelConfig = MARKET_LEVELS[1];
