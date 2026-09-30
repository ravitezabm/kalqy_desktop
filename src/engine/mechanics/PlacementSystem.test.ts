import { describe, expect, it } from "vitest";
import { PlacementSystem } from "./PlacementSystem";

const RADIUS = 100;

describe("PlacementSystem", () => {
  it("completes after holding inside the radius for the full duration", () => {
    const placement = new PlacementSystem(3000);
    let result = { progress: 0, completed: false };
    for (let t = 0; t < 3000; t += 100) result = placement.update(10, RADIUS, 100);
    expect(result.completed).toBe(true);
    expect(result.progress).toBe(1);
  });

  it("reports partial progress while holding", () => {
    const placement = new PlacementSystem(3000);
    const { progress, completed } = placement.update(0, RADIUS, 1500);
    expect(progress).toBeCloseTo(0.5);
    expect(completed).toBe(false);
  });

  it("does not reset from a single jittery frame outside the radius", () => {
    const placement = new PlacementSystem(3000);
    placement.update(0, RADIUS, 1000);
    placement.update(500, RADIUS, 16);
    const { progress } = placement.update(0, RADIUS, 16);
    expect(progress).toBeGreaterThan(0.3);
  });

  it("resets after really leaving the target", () => {
    const placement = new PlacementSystem(3000);
    placement.update(0, RADIUS, 1000);
    placement.update(500, RADIUS, 200);
    expect(placement.update(500, RADIUS, 200).progress).toBe(0);
  });

  it("never completes while outside the radius", () => {
    const placement = new PlacementSystem(3000);
    for (let i = 0; i < 100; i++) expect(placement.update(500, RADIUS, 100).completed).toBe(false);
  });
});
