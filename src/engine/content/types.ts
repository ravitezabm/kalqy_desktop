/**
 * What an answer or prompt piece IS — independent of how it looks. A letter,
 * a number, a shape and a sprite are all just content; a "skin" (egg, card,
 * circle...) decides the visuals. No gameplay code checks the subject.
 */
export type ContentType = "text" | "number" | "shape" | "sprite" | "icon";

export interface ContentItem {
  type: ContentType;
  /** Text/number value, shape name, or asset id. */
  value: string | number;
}

export interface AnswerOption extends ContentItem {
  id: string;
  correct: boolean;
}

export type PromptItem =
  | { kind: "fixed"; content: ContentItem }
  | { kind: "missing"; id: string; expected: ContentItem };

/** Normalised identity used to compare answers ("r" === "R", 7 === "7"). */
export function contentKey(item: ContentItem): string {
  return `${item.type}:${String(item.value).trim().toUpperCase()}`;
}
