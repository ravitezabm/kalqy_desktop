import { describe, expect, it } from "vitest";
import { BodyLaneController } from "./BodyLaneController";
import { BodyAnalyzer } from "../motion/body/BodyAnalyzer";
import { syntheticPose } from "../motion/mock/MockMotionProvider";

/** Runs the real analyzer + lane controller for `seconds` with the body at `x`. */
function settle(lane: BodyLaneController, analyzer: BodyAnalyzer, x: number, seconds = 2): number {
  let position = lane.position();
  for (let i = 0; i < seconds * 60; i++) {
    analyzer.update(syntheticPose(x), 1 / 60);
    position = lane.update(analyzer.state(), 1000 / 60);
  }
  return position;
}

describe("BodyLaneController", () => {
  it("stays centered inside the dead zone", () => {
    const lane = new BodyLaneController();
    const analyzer = new BodyAnalyzer();
    expect(settle(lane, analyzer, 0.5)).toBeCloseTo(0.5, 2);
    expect(settle(lane, analyzer, 0.55)).toBeCloseTo(0.5, 2);
  });

  it("follows the body left and right, reaching the edges with a modest movement", () => {
    const lane = new BodyLaneController();
    const analyzer = new BodyAnalyzer();
    expect(settle(lane, analyzer, 0.15, 3)).toBeLessThan(0.05);
    expect(lane.currentLane()).toBe("left");
    expect(settle(lane, analyzer, 0.85, 4)).toBeGreaterThan(0.95);
    expect(lane.currentLane()).toBe("right");
  });

  it("eases back to center instead of snapping", () => {
    const lane = new BodyLaneController();
    const analyzer = new BodyAnalyzer();
    settle(lane, analyzer, 0.85, 3);
    const first = settle(lane, analyzer, 0.5, 0.05);
    expect(first).toBeGreaterThan(0.6);
    expect(settle(lane, analyzer, 0.5, 3)).toBeCloseTo(0.5, 1);
  });

  it("holds its last position when the child steps out of view", () => {
    const lane = new BodyLaneController();
    const analyzer = new BodyAnalyzer();
    settle(lane, analyzer, 0.15, 3);
    const before = lane.position();
    for (let i = 0; i < 60; i++) {
      analyzer.update(null, 1 / 60);
      lane.update(analyzer.state(), 1000 / 60);
    }
    expect(lane.position()).toBeCloseTo(before, 2);
  });

  it("respects a configurable dead zone", () => {
    const lane = new BodyLaneController({ deadZone: { left: 0.2, right: 0.8 } });
    const analyzer = new BodyAnalyzer({ deadZone: { left: 0.2, right: 0.8 } });
    expect(settle(lane, analyzer, 0.3, 2)).toBeCloseTo(0.5, 2);
  });
});
