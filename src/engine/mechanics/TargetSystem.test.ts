import { describe, expect, it } from "vitest";
import { TargetSystem } from "./TargetSystem";

const targets = [
  { id: "thirsty", correct: true, radius: 100, x: 300 },
  { id: "healthy", correct: false, radius: 100, x: 900 },
];

function hold(system: TargetSystem<(typeof targets)[number]>, at: number, ms: number) {
  let result = system.update((t) => Math.abs(at - t.x), 0);
  for (let elapsed = 0; elapsed < ms; elapsed += 100) result = system.update((t) => Math.abs(at - t.x), 100);
  return result;
}

describe("TargetSystem", () => {
  it("completes the correct choice after the full hold", () => {
    const system = new TargetSystem(targets, 2000);
    const result = hold(system, 300, 2000);
    expect(result.completed).toEqual({ id: "thirsty", correct: true });
  });

  it("reports a wrong choice without affecting the right one", () => {
    const system = new TargetSystem(targets, 2000);
    const result = hold(system, 900, 2000);
    expect(result.completed).toEqual({ id: "healthy", correct: false });
    expect(result.byId.get("thirsty")).toBe(0);
  });

  it("shows hold progress for the target being held", () => {
    const system = new TargetSystem(targets, 2000);
    const result = hold(system, 300, 1000);
    expect(result.progress).toBeCloseTo(0.5, 1);
    expect(result.completed).toBeNull();
  });

  it("resets progress when the probe leaves", () => {
    const system = new TargetSystem(targets, 2000);
    hold(system, 300, 1000);
    const away = hold(system, 600, 300);
    expect(away.progress).toBe(0);
  });
});
