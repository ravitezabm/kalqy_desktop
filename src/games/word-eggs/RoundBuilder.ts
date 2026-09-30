import { createRng, type Rng } from "../../engine/content/random";
import { generateOptions, OptionGenerationError } from "../../engine/content/OptionGenerator";
import { PromptSequence } from "../../engine/content/PromptSequence";
import { validateRound } from "../../engine/content/ContentValidator";
import type { AnswerOption, ContentItem } from "../../engine/content/types";
import { ALPHABET, LOOKALIKES, VALID_WORDS, WORD_BANK } from "./config/wordBank";
import { MAX_STORY_WORD_LENGTH, type WordEggsLevelConfig } from "./config/levels.config";

export interface Round {
  word: string;
  missingIndex: number;
  prompt: PromptSequence;
  options: AnswerOption[];
  /** Seed that produced it — paste it into ?seed= to replay a bug. */
  seed: number;
}

const letter = (value: string): ContentItem => ({ type: "text", value });

const SAFE_FALLBACK = (seed: number): Round => {
  const expected = letter("A");
  return {
    word: "CAT",
    missingIndex: 1,
    prompt: PromptSequence.fromValues(["C", null, "T"], "text", expected),
    options: [
      { ...expected, id: "text-a", correct: true },
      { ...letter("O"), id: "text-o", correct: false },
    ],
    seed,
  };
};

function pickWord(level: WordEggsLevelConfig, rng: Rng, avoid?: string): string {
  const { content } = level;
  if (content.fixedWord) return content.fixedWord.toUpperCase();
  const lengths: number[] = [];
  for (let n = content.wordLength.min; n <= Math.min(content.wordLength.max, MAX_STORY_WORD_LENGTH); n++) lengths.push(n);
  const pool = lengths.flatMap((n) => WORD_BANK[n] ?? []);
  const candidates = pool.filter((w) => w !== avoid);
  return rng.pick(candidates.length > 0 ? candidates : pool);
}

function buildOnce(level: WordEggsLevelConfig, rng: Rng, seed: number, avoid?: string): Round {
  const word = pickWord(level, rng, avoid);
  const { missingPosition, optionCount, similarDistractors } = level.content;
  const missingIndex = missingPosition === "random" ? rng.int(0, word.length - 1) : Math.min(missingPosition, word.length - 1);
  const answer = word[missingIndex];
  const count = typeof optionCount === "number" ? optionCount : rng.int(optionCount.min, optionCount.max);

  const expected = letter(answer);
  const letters = [...word].map((ch, i) => (i === missingIndex ? null : ch));
  const prompt = PromptSequence.fromValues(letters, "text", expected);

  const options = generateOptions({
    correct: expected,
    count,
    pool: ALPHABET.map(letter),
    rng,
    similar: similarDistractors,
    confusables: (correct) => [...(LOOKALIKES[String(correct.value)] ?? "")].map(letter),
    // A letter that spells a different real word would be a second right answer.
    isAlsoCorrect: (candidate) => {
      const swapped = word.slice(0, missingIndex) + String(candidate.value) + word.slice(missingIndex + 1);
      return VALID_WORDS.has(swapped);
    },
  });
  return { word, missingIndex, prompt, options, seed };
}

/**
 * Builds one playable round for a level: a word, the missing position, the
 * answer and unique distractors. Always validated; if a level somehow can't
 * produce a valid round it falls back to a known-good one — it never throws.
 */
export function buildRound(level: WordEggsLevelConfig, seed: number = Math.floor(Math.random() * 2 ** 31), avoidWord?: string): Round {
  for (let attempt = 0; attempt < 30; attempt++) {
    const attemptSeed = seed + attempt;
    try {
      const round = buildOnce(level, createRng(attemptSeed), attemptSeed, avoidWord);
      if (round.word.length <= MAX_STORY_WORD_LENGTH && validateRound(round.prompt, round.options).length === 0) return round;
    } catch (error) {
      if (!(error instanceof OptionGenerationError)) throw error;
    }
  }
  console.error(`Could not build a valid round for ${level.id}; using the safe fallback.`);
  return SAFE_FALLBACK(seed);
}
