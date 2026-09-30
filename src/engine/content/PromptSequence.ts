import type { ContentItem, ContentType, PromptItem } from "./types";

/** An ordered row of prompt pieces, some fixed and some missing (to be filled by the child). */
export class PromptSequence {
  constructor(readonly items: PromptItem[]) {}

  /** ["C", null, "T"] → C _ T. `null` marks the missing piece; `expected` is what belongs there. */
  static fromValues(
    values: (string | number | null)[],
    type: ContentType,
    expected: ContentItem,
    slotId = "answer-slot"
  ): PromptSequence {
    return new PromptSequence(
      values.map((value) =>
        value === null ? { kind: "missing", id: slotId, expected } : { kind: "fixed", content: { type, value } }
      )
    );
  }

  get length(): number {
    return this.items.length;
  }

  missingIndexes(): number[] {
    return this.items.flatMap((item, i) => (item.kind === "missing" ? [i] : []));
  }

  /** The sequence as it reads once every missing piece holds its expected content. */
  completed(): ContentItem[] {
    return this.items.map((item) => (item.kind === "fixed" ? item.content : item.expected));
  }
}
