import { describe, expect, it } from "vitest";
import { RIVER_LEVELS, validateRiverLevel } from "./levels.config";

describe("River levels", () => {
  it("gives every story level at least two options to choose from", () => {
    expect(RIVER_LEVELS.slice(1).every((level) => level.targets.length >= 2)).toBe(true);
  });

  it("has training plus exactly five story levels in order", () => {
    expect(RIVER_LEVELS).toHaveLength(6);
    expect(RIVER_LEVELS[0].kind).toBe("training");
    expect(RIVER_LEVELS.slice(1).every((level) => level.kind === "story")).toBe(true);
    expect(RIVER_LEVELS.slice(1).map((level) => level.targets.find((t) => t.correct)?.visual)).toEqual([
      "dryPlant",
      "thirstyBird",
      "forestFire",
      "thirstyHuman",
      "waterPool",
    ]);
  });

  it.each(RIVER_LEVELS.map((level) => [level.id, level] as const))("%s is valid", (_id, level) => {
    expect(validateRiverLevel(level)).toEqual([]);
  });

  it("training is untimed, story levels are timed", () => {
    expect(RIVER_LEVELS[0].timed).toBe(false);
    expect(RIVER_LEVELS.slice(1).every((level) => level.timed)).toBe(true);
  });

  it("rejects a level with no correct answer or two", () => {
    const base = RIVER_LEVELS[2];
    expect(validateRiverLevel({ ...base, targets: base.targets.map((t) => ({ ...t, correct: false })) })).toContain(
      "expected exactly one correct target, found 0"
    );
    expect(validateRiverLevel({ ...base, targets: base.targets.map((t) => ({ ...t, correct: true, onCorrect: { effect: "happy" } })) })).toContain(
      "expected exactly one correct target, found 2"
    );
  });
});
