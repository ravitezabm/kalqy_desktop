import { describe, expect, it } from "vitest";
import { BUTTERFLY_LEVELS, validateLevel, type ButterflyLevelConfig } from "./levels.config";

const base = BUTTERFLY_LEVELS[1];
const withTargets = (targets: ButterflyLevelConfig["targets"]): ButterflyLevelConfig => ({ ...base, targets });

describe("BUTTERFLY_LEVELS", () => {
  it("ships only valid levels with unique ids", () => {
    for (const level of BUTTERFLY_LEVELS) expect(validateLevel(level)).toEqual([]);
    const ids = BUTTERFLY_LEVELS.map((level) => level.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ramps from 1 to 5 flowers across the story levels", () => {
    expect(BUTTERFLY_LEVELS.slice(1).map((level) => level.targets.length)).toEqual([1, 2, 3, 4, 5]);
  });

  it("never highlights the answer in story mode", () => {
    for (const level of BUTTERFLY_LEVELS.filter((l) => l.kind === "story")) expect(level.highlightCorrect).toBe(false);
  });
});

describe("validateLevel", () => {
  it("rejects duplicate target ids", () => {
    const t = base.targets[0];
    expect(validateLevel(withTargets([t, { ...t }]))).toContain(`duplicate target id ${t.id}`);
  });

  it("rejects a level with no matching flower", () => {
    const t = base.targets[0];
    expect(validateLevel(withTargets([{ ...t, colorId: "blue" }])).some((p) => p.includes("matching"))).toBe(true);
  });

  it("rejects out-of-range positions and bad mechanics", () => {
    const t = base.targets[0];
    const problems = validateLevel({ ...withTargets([{ ...t, x: 1.4 }]), mechanics: { holdDurationMs: 0, interactionRadius: 10 } });
    expect(problems.some((p) => p.includes("out of range"))).toBe(true);
    expect(problems).toContain("invalid holdDurationMs");
  });
});
