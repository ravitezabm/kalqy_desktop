import { parsePattern, validatePattern, type RhythmPattern } from "../../../engine/rhythm/RhythmPattern";
import { DEFAULT_RHYTHM_SCORING, type RhythmScoring } from "../../../engine/rhythm/RhythmScore";
import type { TimingWindows } from "../../../engine/rhythm/RhythmValidator";
import type { HandZoneConfig } from "../../../engine/mechanics/hand-zones/HandZoneHitDetector";
import type { StrokeId } from "../assets";

/** One hand is enough: the game reads the child's main hand only. Set to 2 for left/right patterns (the engine supports them). */
export const TABLA_INPUT = { hands: 1 as 1 | 2 };

/** Which tabla plays which stroke. Index = tabla number - 1. */
export const TABLA_STROKES: StrokeId[] = ["ga", "na", "tin", "dha"];

export interface LessonStep {
  text: string;
  hint: string;
  /** Tablas to hit (0-based). */
  targets: number[];
  /** any: any hand · otherHand: the hand not used in the last step · both: one hand on each target together. */
  rule: "any" | "otherHand" | "both";
}

export type GoalMetric = "notes" | "perfect" | "twoHands";

export interface TablaLevelConfig {
  id: string;
  kind: "training" | "story";
  title: string;
  /** Top-center HUD text. */
  headline: string;
  hint: string;
  pattern: RhythmPattern;
  tablaCount: number;
  windows: TimingWindows;
  countInBeats: number;
  /** Glow the next tabla a little before it is due. */
  showNextBeat: boolean;
  /** Fraction of the notes that must be hit to move on; otherwise the pattern is demonstrated again. */
  passRatio: number;
  maxAttempts: number;
  timed: boolean;
  timeLimitSeconds: number;
  scoring: RhythmScoring;
  goals: GoalMetric[];
  /** Hit-zone size relative to the drum's width. */
  hitRadiusScale: number;
  hit?: Partial<HandZoneConfig>;
  lesson?: LessonStep[];
}

const windows = (perfectMs: number, goodMs: number, nearMs: number, simultaneousMs: number): TimingWindows => ({ perfectMs, goodMs, nearMs, simultaneousMs });

function story(n: number, config: Omit<TablaLevelConfig, "id" | "kind" | "timed" | "scoring" | "maxAttempts" | "passRatio" | "goals" | "countInBeats" | "timeLimitSeconds"> & Partial<Pick<TablaLevelConfig, "countInBeats" | "goals" | "maxAttempts" | "passRatio" | "timeLimitSeconds">>): TablaLevelConfig {
  return {
    id: `tabla-story-${String(n).padStart(2, "0")}`,
    kind: "story",
    timed: true,
    timeLimitSeconds: 150,
    scoring: DEFAULT_RHYTHM_SCORING,
    maxAttempts: 3,
    passRatio: 0.6,
    goals: ["notes", "perfect"],
    countInBeats: 4,
    ...config,
  };
}

/** Training + the 10 story levels. Everything a level does is in this table — the scene has no per-level code. */
export const TABLA_LEVELS: TablaLevelConfig[] = [
  {
    id: "tabla-training",
    kind: "training",
    title: "Training",
    headline: "Let’s play the tabla!",
    hint: "Move your hand over the glowing tabla",
    pattern: parsePattern(60, ["1", "2", "1", "3"]),
    tablaCount: 4,
    windows: windows(220, 360, 520, 320),
    countInBeats: 2,
    showNextBeat: true,
    passRatio: 0.5,
    maxAttempts: 2,
    timed: false,
    timeLimitSeconds: 0,
    scoring: { perfect: 0, good: 0, near: 0, miss: 0, twoHandBonus: 0, streakOnMiss: "keep" },
    goals: ["notes"],
    hitRadiusScale: 0.62,
    hit: { minEnterSpeed: 0.05, minHitIntervalMs: 140 },
    lesson: [
      { text: "Move your hand over the tabla!", hint: "Move your hand over the glowing tabla", targets: [1], rule: "any" },
      { text: "Now another one!", hint: "Move your hand to the next glowing tabla", targets: [2], rule: "any" },
      { text: "And one more!", hint: "Touch the glowing tabla", targets: [0], rule: "any" },
    ],
  },
  // Very simple to medium: slow tempos, short patterns, big hit zones, generous timing, hints on almost everywhere.
  story(1, { title: "First Beats", headline: "Follow the rhythm!", hint: "Touch the drum when it glows", pattern: parsePattern(50, ["1", "2", "1"]), tablaCount: 2, windows: windows(260, 420, 600, 300), showNextBeat: true, hitRadiusScale: 0.68, countInBeats: 2, passRatio: 0.5, maxAttempts: 2 }),
  story(2, { title: "Two Drums", headline: "Listen carefully!", hint: "Copy the beat you just heard", pattern: parsePattern(50, ["1", "2", "2", "1"]), tablaCount: 2, windows: windows(250, 410, 590, 300), showNextBeat: true, hitRadiusScale: 0.68, countInBeats: 2, passRatio: 0.5, maxAttempts: 2 }),
  story(3, { title: "Three Drums", headline: "Follow the rhythm!", hint: "One, two, three", pattern: parsePattern(55, ["1", "2", "3"]), tablaCount: 3, windows: windows(245, 405, 580, 300), showNextBeat: true, hitRadiusScale: 0.66, countInBeats: 2, passRatio: 0.5, maxAttempts: 2 }),
  story(4, { title: "Back and Forth", headline: "Can you copy the beat?", hint: "Go there and back again", pattern: parsePattern(55, ["1", "2", "3", "2"]), tablaCount: 3, windows: windows(240, 400, 570, 290), showNextBeat: true, hitRadiusScale: 0.66, countInBeats: 2, passRatio: 0.5, maxAttempts: 2 }),
  story(5, { title: "Double Beat", headline: "Listen carefully!", hint: "The first drum plays twice", pattern: parsePattern(60, ["1", "1", "2", "3"]), tablaCount: 3, windows: windows(235, 390, 560, 290), showNextBeat: true, hitRadiusScale: 0.66, countInBeats: 2, passRatio: 0.5, maxAttempts: 2 }),
  story(6, { title: "Four Drums", headline: "Follow the rhythm!", hint: "Play all four drums in order", pattern: parsePattern(60, ["1", "2", "3", "4"]), tablaCount: 4, windows: windows(230, 380, 550, 280), showNextBeat: true, hitRadiusScale: 0.64, countInBeats: 3, passRatio: 0.5, maxAttempts: 2 }),
  story(7, { title: "A Little Pause", headline: "Listen carefully!", hint: "Wait for the quiet beat", pattern: parsePattern(65, ["1", "2", "-", "3", "4"]), tablaCount: 4, windows: windows(225, 370, 540, 280), showNextBeat: true, hitRadiusScale: 0.62, countInBeats: 3, passRatio: 0.5, maxAttempts: 2 }),
  story(8, { title: "Backwards", headline: "Can you copy the beat?", hint: "This time it goes backwards", pattern: parsePattern(65, ["4", "3", "2", "1", "2"]), tablaCount: 4, windows: windows(220, 360, 530, 270), showNextBeat: true, hitRadiusScale: 0.62, countInBeats: 3, passRatio: 0.5, maxAttempts: 2 }),
  story(9, { title: "Little Song", headline: "Listen carefully!", hint: "A short song with a pause", pattern: parsePattern(70, ["1", "2", "1", "3", "-", "4"]), tablaCount: 4, windows: windows(210, 350, 520, 270), showNextBeat: true, hitRadiusScale: 0.6, countInBeats: 3, passRatio: 0.5, maxAttempts: 2 }),
  story(10, { title: "Tabla Festival", headline: "Rhythm Master!", hint: "Play the whole song!", pattern: parsePattern(70, ["1", "2", "3", "4", "3", "2", "1", "4"]), tablaCount: 4, windows: windows(200, 340, 500, 260), showNextBeat: false, hitRadiusScale: 0.6, countInBeats: 3, passRatio: 0.5, maxAttempts: 2, timeLimitSeconds: 180 }),
];

/** Problems that would make a level unsafe to start (empty = fine). Checked before every level. */
export function validateTablaLevel(level: TablaLevelConfig): string[] {
  const problems = validatePattern(level.pattern, level.tablaCount);
  if (level.tablaCount < 1 || level.tablaCount > TABLA_STROKES.length) problems.push(`tablaCount must be 1..${TABLA_STROKES.length}`);
  const { perfectMs, goodMs, nearMs, simultaneousMs } = level.windows;
  if (!(perfectMs > 0 && perfectMs <= goodMs && goodMs <= nearMs)) problems.push("timing windows must grow: perfect <= good <= near");
  if (!(simultaneousMs > 0)) problems.push("simultaneousMs must be positive");
  if (!(level.passRatio > 0 && level.passRatio <= 1)) problems.push("passRatio must be in (0, 1]");
  if (level.timed && !(level.timeLimitSeconds > 0)) problems.push("timed level needs a positive time limit");
  for (const step of level.lesson ?? []) for (const t of step.targets) if (t < 0 || t >= level.tablaCount) problems.push(`lesson "${step.text}": tabla ${t + 1} does not exist`);
  return problems;
}

/** Used if a (future, backend-supplied) level fails validation. */
export const SAFE_FALLBACK_LEVEL: TablaLevelConfig = TABLA_LEVELS[1];
