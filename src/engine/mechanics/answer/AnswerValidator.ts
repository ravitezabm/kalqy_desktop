import { contentKey, type AnswerOption, type ContentItem } from "../../content/types";

export type AnswerVerdict = "correct" | "incorrect" | "invalid";

export interface AnswerTarget {
  id: string;
  expected: ContentItem;
}

/**
 * Decides whether an option belongs in a target by comparing normalised
 * content — never by how either one looks, and never with `if (letter === "A")`.
 */
export function validateAnswer(option: AnswerOption | null, target: AnswerTarget | null): AnswerVerdict {
  if (!option || !target) return "invalid";
  if (option.value === "" || target.expected.value === "") return "invalid";
  return contentKey(option) === contentKey(target.expected) ? "correct" : "incorrect";
}
