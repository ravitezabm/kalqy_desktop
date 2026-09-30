import type { Rng } from "./random";
import { contentKey, type AnswerOption, type ContentItem } from "./types";

export class OptionGenerationError extends Error {}

export interface OptionGeneratorInput {
  correct: ContentItem;
  /** Total options, including the correct one. */
  count: number;
  /** Everything a distractor may be drawn from. */
  pool: ContentItem[];
  rng: Rng;
  /** Reject a distractor that would ALSO be a valid answer (e.g. a letter that makes another real word). */
  isAlsoCorrect?: (candidate: ContentItem) => boolean;
  /** Distractors that look like the answer (b/d, 6/9...). Used first when `similar` is set. */
  confusables?: (correct: ContentItem) => ContentItem[];
  /** Prefer look-alike distractors (harder, less obvious). */
  similar?: boolean;
}

/**
 * Builds one correct option plus unique distractors, shuffled. Subject-blind:
 * it only sees content items, so the same generator serves letters, numbers,
 * shapes or anything else the pool contains.
 */
export function generateOptions(input: OptionGeneratorInput): AnswerOption[] {
  const { correct, count, pool, rng, isAlsoCorrect, confusables, similar } = input;
  if (count < 2) throw new OptionGenerationError("need at least 2 options");

  const correctKey = contentKey(correct);
  const usable = (item: ContentItem) => contentKey(item) !== correctKey && !(isAlsoCorrect?.(item) ?? false);

  const preferred = similar && confusables ? rng.shuffle(confusables(correct)).filter(usable) : [];
  const general = rng.shuffle(pool).filter(usable);

  const chosen: ContentItem[] = [];
  const seen = new Set<string>([correctKey]);
  for (const candidate of [...preferred, ...general]) {
    if (chosen.length >= count - 1) break;
    const key = contentKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    chosen.push(candidate);
  }
  if (chosen.length < count - 1) throw new OptionGenerationError("not enough distinct distractors");

  const options: AnswerOption[] = [
    { ...correct, id: optionId(correct), correct: true },
    ...chosen.map((item) => ({ ...item, id: optionId(item), correct: false })),
  ];
  return rng.shuffle(options);
}

const optionId = (item: ContentItem) => `${item.type}-${String(item.value).toLowerCase()}`;
