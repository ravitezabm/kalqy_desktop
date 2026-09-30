import { describe, expect, it } from "vitest";
import { createRng } from "./random";
import { generateOptions, OptionGenerationError } from "./OptionGenerator";
import { PromptSequence } from "./PromptSequence";
import { validateRound } from "./ContentValidator";
import { validateAnswer } from "../mechanics/answer/AnswerValidator";
import { loadWithFallback, LocalGameConfigProvider, RemoteGameConfigProvider } from "./GameConfigProvider";
import type { ContentItem } from "./types";
import type { StorageAdapter } from "../persistence/StorageAdapter";

const letters = (s: string): ContentItem[] => [...s].map((value) => ({ type: "text", value }));
const numbers = (...n: number[]): ContentItem[] => n.map((value) => ({ type: "number", value }));

describe("OptionGenerator", () => {
  it("makes unique options with exactly one correct, for letters", () => {
    for (let seed = 1; seed < 200; seed++) {
      const options = generateOptions({ correct: { type: "text", value: "R" }, count: 4, pool: letters("ABCDEFGHIJKLMNOPQRSTUVWXYZ"), rng: createRng(seed) });
      expect(options).toHaveLength(4);
      expect(options.filter((o) => o.correct)).toHaveLength(1);
      expect(new Set(options.map((o) => o.value)).size).toBe(4);
    }
  });

  it("works unchanged for numbers", () => {
    const options = generateOptions({ correct: { type: "number", value: 6 }, count: 3, pool: numbers(1, 2, 3, 4, 5, 6, 7, 8, 9), rng: createRng(3) });
    expect(options.find((o) => o.correct)?.value).toBe(6);
  });

  it("rejects distractors that would also be correct", () => {
    const options = generateOptions({
      correct: { type: "text", value: "A" },
      count: 3,
      pool: letters("AUOE"),
      rng: createRng(1),
      isAlsoCorrect: (c) => c.value === "U",
    });
    expect(options.map((o) => o.value)).not.toContain("U");
  });

  it("prefers look-alikes when asked", () => {
    const options = generateOptions({
      correct: { type: "text", value: "B" },
      count: 2,
      pool: letters("ACEGIKMOQSUWY"),
      rng: createRng(5),
      similar: true,
      confusables: () => letters("D"),
    });
    expect(options.map((o) => o.value).sort()).toEqual(["B", "D"]);
  });

  it("throws when it cannot make enough distinct options", () => {
    expect(() => generateOptions({ correct: { type: "text", value: "A" }, count: 4, pool: letters("AB"), rng: createRng(1) })).toThrow(OptionGenerationError);
  });

  it("is reproducible from its seed", () => {
    const run = () => generateOptions({ correct: { type: "text", value: "R" }, count: 4, pool: letters("ABCDEFGH"), rng: createRng(42) }).map((o) => o.value);
    expect(run()).toEqual(run());
  });
});

describe("validateAnswer", () => {
  const target = { id: "slot", expected: { type: "text", value: "r" } as ContentItem };
  it("compares normalised content, not appearance", () => {
    expect(validateAnswer({ type: "text", value: "R", id: "x", correct: true }, target)).toBe("correct");
    expect(validateAnswer({ type: "text", value: "L", id: "y", correct: false }, target)).toBe("incorrect");
    expect(validateAnswer(null, target)).toBe("invalid");
  });
  it("treats 7 and '7' as the same number", () => {
    const numTarget = { id: "s", expected: { type: "number", value: 7 } as ContentItem };
    expect(validateAnswer({ type: "number", value: "7", id: "a", correct: true }, numTarget)).toBe("correct");
  });
});

describe("PromptSequence + validateRound", () => {
  const expected: ContentItem = { type: "text", value: "A" };
  const prompt = PromptSequence.fromValues(["C", null, "T"], "text", expected);

  it("finds the missing slot and completes the word", () => {
    expect(prompt.missingIndexes()).toEqual([1]);
    expect(prompt.completed().map((c) => c.value).join("")).toBe("CAT");
  });

  it("accepts a good round and rejects broken ones", () => {
    const options = generateOptions({ correct: expected, count: 3, pool: letters("ABCDEFG"), rng: createRng(2) });
    expect(validateRound(prompt, options)).toEqual([]);
    expect(validateRound(prompt, options.map((o) => ({ ...o, correct: false })))).toContain("expected exactly one correct option, found 0");
    expect(validateRound(prompt, [options[0], options[0]])).toContain("duplicate options");
    const long = PromptSequence.fromValues(["A", "B", "C", "D", "E", "F", null], "text", expected);
    expect(validateRound(long, options).some((p) => p.includes("prompt length"))).toBe(true);
  });
});

describe("config providers", () => {
  const memory = (): StorageAdapter => {
    const map = new Map<string, unknown>();
    return { get: <T,>(k: string) => (map.has(k) ? (map.get(k) as T) : null), set: (k, v) => void map.set(k, v), remove: (k) => void map.delete(k) };
  };
  const isNum = (d: unknown): d is number => typeof d === "number";

  it("falls back remote → local → default", async () => {
    const failing = new RemoteGameConfigProvider<number>("http://x", isNum, memory(), "k", (async () => { throw new Error("offline"); }) as unknown as typeof fetch);
    expect(await loadWithFallback([failing, new LocalGameConfigProvider(7)], 1)).toBe(7);
    expect(await loadWithFallback([failing], 1)).toBe(1);
  });

  it("caches a valid remote response and rejects an invalid one", async () => {
    const storage = memory();
    const ok = new RemoteGameConfigProvider<number>("http://x", isNum, storage, "k", (async () => ({ ok: true, json: async () => 5 })) as unknown as typeof fetch);
    expect(await ok.load()).toBe(5);
    expect(storage.get("k")).toBe(5);
    const bad = new RemoteGameConfigProvider<number>("http://x", isNum, storage, "k", (async () => ({ ok: true, json: async () => "nope" })) as unknown as typeof fetch);
    await expect(bad.load()).rejects.toThrow();
  });
});
