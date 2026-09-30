import type { OptionSkinStyle } from "../../../engine/content/skins/OptionSkin";

export type DragGesture = "grab" | "pinch" | "either";

export interface WordEggsLevelConfig {
  id: string;
  title: string;
  kind: "training" | "story";
  subject: "english";
  activity: "missing-letter";

  /** Copy lives in config (and later the backend) — the engine has no hardcoded strings. */
  headline: string;
  hint: string;

  timeLimitSeconds: number;
  timed: boolean;

  content: {
    /** Pick from the word bank within this length range (never more than 5 in Story Mode)... */
    wordLength: { min: number; max: number };
    /** ...or use exactly this word. */
    fixedWord?: string;
    missingPosition: "random" | number;
    optionCount: number | { min: number; max: number };
    /** Offer look-alike letters as distractors (b/d, m/n...). */
    similarDistractors: boolean;
  };

  /** Visual skin for the options; colours come from this palette. */
  skin: { id: "egg"; palette: Pick<OptionSkinStyle, "primaryColor" | "secondaryColor">[]; scale: number };

  physics: { enabled: boolean; gravity: number; bounce: number; drag: number; spawnJitter: number };

  interaction: {
    dragGesture: DragGesture;
    /** Px (in the 1280x720 game space). */
    magnetRadius: number;
    magnetStrength: number;
    dropRadius: number;
    pickRadiusScale: number;
  };
}

export const EGG_PALETTE: WordEggsLevelConfig["skin"]["palette"] = [
  { primaryColor: "#C86BFF", secondaryColor: "#F2C8FF" },
  { primaryColor: "#FF5C9A", secondaryColor: "#FFC6DC" },
  { primaryColor: "#6B8BFF", secondaryColor: "#CAD6FF" },
  { primaryColor: "#2FC7B4", secondaryColor: "#C2F3EB" },
  { primaryColor: "#FF9A3C", secondaryColor: "#FFE1BC" },
];

type Tuning = Partial<Pick<WordEggsLevelConfig["interaction"], "magnetRadius" | "dropRadius" | "magnetStrength">> & {
  eggScale: number;
  jitter?: number;
  bounce?: number;
};

function story(
  n: number,
  wordLength: number,
  optionCount: number | { min: number; max: number },
  timeLimitSeconds: number,
  similarDistractors: boolean,
  tuning: Tuning
): WordEggsLevelConfig {
  return {
    id: `word-eggs-story-${String(n).padStart(2, "0")}`,
    title: `Level ${n}`,
    kind: "story",
    subject: "english",
    activity: "missing-letter",
    headline: "Fill the missing letter!",
    hint: "Choose the correct egg to complete the word",
    timeLimitSeconds,
    timed: true,
    content: { wordLength: { min: wordLength, max: wordLength }, missingPosition: "random", optionCount, similarDistractors },
    skin: { id: "egg", palette: EGG_PALETTE, scale: tuning.eggScale },
    physics: { enabled: true, gravity: 900, bounce: tuning.bounce ?? 0.25, drag: 260, spawnJitter: tuning.jitter ?? 20 },
    interaction: {
      dragGesture: "either",
      magnetRadius: tuning.magnetRadius ?? 130,
      magnetStrength: tuning.magnetStrength ?? 0.45,
      dropRadius: tuning.dropRadius ?? 120,
      pickRadiusScale: 1,
    },
  };
}

/**
 * Training, then exactly 10 hardcoded Story Mode levels. The *slots* are fixed;
 * the word, missing position, distractors and egg placement are randomised per play.
 * Difficulty rises through word length, option count and look-alike distractors —
 * not just smaller targets.
 */
export const WORD_EGGS_LEVELS: WordEggsLevelConfig[] = [
  {
    ...story(0, 3, 2, 0, false, { eggScale: 1.2, dropRadius: 150, magnetRadius: 170, magnetStrength: 0.55 }),
    id: "word-eggs-training",
    title: "Training",
    kind: "training",
    headline: "Let’s practice!",
    hint: "Pick up the egg and drop it in the empty nest",
    timed: false,
    content: { wordLength: { min: 3, max: 3 }, fixedWord: "CAT", missingPosition: 1, optionCount: 2, similarDistractors: false },
  },
  story(1, 3, 2, 60, false, { eggScale: 1.2, dropRadius: 150, magnetRadius: 170, magnetStrength: 0.55 }),
  story(2, 3, 3, 60, false, { eggScale: 1.15, dropRadius: 140 }),
  story(3, 3, 3, 55, false, { eggScale: 1.1, dropRadius: 135, jitter: 40 }),
  story(4, 4, 3, 55, false, { eggScale: 1.05, dropRadius: 120 }),
  story(5, 4, { min: 3, max: 4 }, 50, false, { eggScale: 1.0, dropRadius: 115, jitter: 40, bounce: 0.35 }),
  story(6, 4, 4, 50, true, { eggScale: 1.0, dropRadius: 110 }),
  story(7, 5, 3, 50, false, { eggScale: 0.95, dropRadius: 105 }),
  story(8, 5, 4, 45, false, { eggScale: 0.95, dropRadius: 100 }),
  story(9, 5, 4, 45, true, { eggScale: 0.92, dropRadius: 100 }),
  story(10, 5, 5, 45, true, { eggScale: 0.9, dropRadius: 95 }),
];

export const MAX_STORY_WORD_LENGTH = 5;

/** Catch a malformed level early (also the gate for any level a backend supplies). */
export function validateWordEggsLevel(level: WordEggsLevelConfig): string[] {
  const problems: string[] = [];
  const { content } = level;
  if (content.wordLength.min < 2 || content.wordLength.max > MAX_STORY_WORD_LENGTH || content.wordLength.min > content.wordLength.max) {
    problems.push("word length must be within 2-5");
  }
  if (content.fixedWord && (content.fixedWord.length < 2 || content.fixedWord.length > MAX_STORY_WORD_LENGTH)) problems.push("fixed word must be 2-5 letters");
  const counts = typeof content.optionCount === "number" ? [content.optionCount] : [content.optionCount.min, content.optionCount.max];
  if (counts.some((c) => c < 2 || c > 5)) problems.push("option count must be 2-5");
  if (level.timed && level.timeLimitSeconds <= 0) problems.push("timed level needs a time limit");
  if (level.skin.palette.length === 0) problems.push("skin palette is empty");
  if (level.interaction.dropRadius <= 0) problems.push("dropRadius must be positive");
  return problems;
}
