import { contentKey, type AnswerOption } from "./types";
import type { PromptSequence } from "./PromptSequence";

export interface RoundLimits {
  maxPromptLength: number;
  minPromptLength: number;
  minOptions: number;
  maxOptions: number;
}

export const DEFAULT_LIMITS: RoundLimits = { maxPromptLength: 5, minPromptLength: 2, minOptions: 2, maxOptions: 5 };

/** Everything wrong with a round, or [] if it's safe to play. Used before every level starts. */
export function validateRound(prompt: PromptSequence, options: AnswerOption[], limits: Partial<RoundLimits> = {}): string[] {
  const l = { ...DEFAULT_LIMITS, ...limits };
  const problems: string[] = [];

  if (prompt.length < l.minPromptLength || prompt.length > l.maxPromptLength) problems.push(`prompt length ${prompt.length} out of range`);
  const missing = prompt.missingIndexes();
  if (missing.length === 0) problems.push("no missing piece");
  if (options.length < l.minOptions || options.length > l.maxOptions) problems.push(`option count ${options.length} out of range`);

  const keys = options.map(contentKey);
  if (new Set(keys).size !== keys.length) problems.push("duplicate options");
  if (new Set(options.map((o) => o.id)).size !== options.length) problems.push("duplicate option ids");

  const correct = options.filter((o) => o.correct);
  if (correct.length !== 1) problems.push(`expected exactly one correct option, found ${correct.length}`);
  for (const index of missing) {
    const item = prompt.items[index];
    if (item.kind === "missing" && correct[0] && contentKey(correct[0]) !== contentKey(item.expected)) {
      problems.push("the correct option does not match what the missing slot expects");
    }
  }
  return problems;
}
