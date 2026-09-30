import { describe, expect, it } from "vitest";
import { buildRound } from "./RoundBuilder";
import { validateRound } from "../../engine/content/ContentValidator";
import { validateAnswer } from "../../engine/mechanics/answer/AnswerValidator";
import { validateWordEggsLevel, WORD_EGGS_LEVELS } from "./config/levels.config";
import { VALID_WORDS, WORD_BANK } from "./config/wordBank";

describe("Word Eggs levels", () => {
  it("has training plus exactly 10 story levels, all valid", () => {
    expect(WORD_EGGS_LEVELS).toHaveLength(11);
    expect(WORD_EGGS_LEVELS[0].kind).toBe("training");
    expect(WORD_EGGS_LEVELS.filter((l) => l.kind === "story")).toHaveLength(10);
    WORD_EGGS_LEVELS.forEach((l) => expect(validateWordEggsLevel(l)).toEqual([]));
  });

  it("never allows a story word longer than 5 letters", () => {
    Object.entries(WORD_BANK).forEach(([len, words]) => {
      if (Number(len) > 5) expect(words).toHaveLength(0);
      words.forEach((w) => expect(w.length).toBe(Number(len)));
    });
    expect(validateWordEggsLevel({ ...WORD_EGGS_LEVELS[1], content: { ...WORD_EGGS_LEVELS[1].content, wordLength: { min: 3, max: 6 } } })).toContain(
      "word length must be within 2-5"
    );
  });

  it("follows the requested difficulty ramp", () => {
    const story = WORD_EGGS_LEVELS.slice(1);
    expect(story.map((l) => l.content.wordLength.min)).toEqual([3, 3, 3, 4, 4, 4, 5, 5, 5, 5]);
    const counts = story.map((l) => (typeof l.content.optionCount === "number" ? l.content.optionCount : l.content.optionCount.max));
    expect(counts).toEqual([2, 3, 3, 3, 4, 4, 3, 4, 4, 5]);
  });
});

describe("buildRound", () => {
  it("makes a valid, solvable round for every level across many seeds", () => {
    for (const level of WORD_EGGS_LEVELS) {
      for (let seed = 1; seed <= 150; seed++) {
        const round = buildRound(level, seed * 101);
        expect(validateRound(round.prompt, round.options)).toEqual([]);
        expect(round.word.length).toBeLessThanOrEqual(5);
        expect(round.prompt.length).toBe(round.word.length);

        // The one correct option belongs in the slot; every distractor doesn't.
        const slot = round.prompt.items[round.missingIndex];
        expect(slot.kind).toBe("missing");
        if (slot.kind !== "missing") continue;
        for (const option of round.options) {
          expect(validateAnswer(option, { id: slot.id, expected: slot.expected })).toBe(option.correct ? "correct" : "incorrect");
        }
        // Completing the word with the right answer spells the word.
        expect(round.prompt.completed().map((c) => c.value).join("")).toBe(round.word);
      }
    }
  });

  it("never offers a letter that spells a different real word", () => {
    for (let seed = 1; seed <= 400; seed++) {
      const round = buildRound(WORD_EGGS_LEVELS[2], seed);
      for (const option of round.options.filter((o) => !o.correct)) {
        const swapped = round.word.slice(0, round.missingIndex) + option.value + round.word.slice(round.missingIndex + 1);
        expect(VALID_WORDS.has(swapped)).toBe(false);
      }
    }
  });

  it("randomises the missing position and the word", () => {
    const positions = new Set<number>();
    const words = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) {
      const r = buildRound(WORD_EGGS_LEVELS[4], seed);
      positions.add(r.missingIndex);
      words.add(r.word);
    }
    expect(positions.size).toBeGreaterThan(2);
    expect(words.size).toBeGreaterThan(4);
  });

  it("is reproducible from its seed and honours a fixed word", () => {
    expect(buildRound(WORD_EGGS_LEVELS[5], 77)).toEqual(buildRound(WORD_EGGS_LEVELS[5], 77));
    const training = buildRound(WORD_EGGS_LEVELS[0], 5);
    expect(training.word).toBe("CAT");
    expect(training.missingIndex).toBe(1);
  });

  it("avoids repeating the previous word on replay", () => {
    for (let seed = 1; seed <= 60; seed++) expect(buildRound(WORD_EGGS_LEVELS[1], seed, "CAT").word).not.toBe("CAT");
  });
});
