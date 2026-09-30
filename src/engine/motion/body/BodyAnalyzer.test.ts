import { describe, expect, it } from "vitest";
import { BodyAnalyzer } from "./BodyAnalyzer";
import { syntheticPose } from "../mock/MockMotionProvider";

const FRAME = 1 / 30;

function run(analyzer: BodyAnalyzer, from: number, to: number, seconds: number) {
  const frames = Math.round(seconds / FRAME);
  for (let i = 1; i <= frames; i++) analyzer.update(syntheticPose(from + ((to - from) * i) / frames), FRAME);
}

describe("BodyAnalyzer", () => {
  it("reports nothing when nobody is in view", () => {
    const analyzer = new BodyAnalyzer();
    analyzer.update(null, FRAME);
    expect(analyzer.state().visible).toBe(false);
  });

  it("finds the torso center and stays 'not leaning' inside the dead zone", () => {
    const analyzer = new BodyAnalyzer();
    run(analyzer, 0.5, 0.5, 0.5);
    const body = analyzer.state();
    expect(body.center().x).toBeCloseTo(0.5, 2);
    expect(body.isLeaningLeft() || body.isLeaningRight()).toBe(false);
    expect(body.movementDirection()).toBe("none");
  });

  it("detects a lean left and right from the configurable dead zone", () => {
    const analyzer = new BodyAnalyzer();
    run(analyzer, 0.5, 0.15, 1);
    expect(analyzer.state().isLeaningLeft()).toBe(true);
    run(analyzer, 0.15, 0.85, 1.5);
    expect(analyzer.state().isLeaningRight()).toBe(true);

    const wide = new BodyAnalyzer({ deadZone: { left: 0.1, right: 0.9 } });
    run(wide, 0.5, 0.2, 1);
    expect(wide.state().isLeaningLeft()).toBe(false);
  });

  it("only reports a direction after sustained movement, and releases when it stops", () => {
    const analyzer = new BodyAnalyzer();
    run(analyzer, 0.5, 0.5, 0.3);
    // One noisy frame must not flip the direction.
    analyzer.update(syntheticPose(0.54), FRAME);
    expect(analyzer.state().movementDirection()).toBe("none");

    run(analyzer, 0.5, 0.15, 0.6);
    expect(analyzer.state().movementDirection()).toBe("left");
    run(analyzer, 0.15, 0.15, 0.5);
    expect(analyzer.state().movementDirection()).toBe("none");
  });

  it("normalizes movement by body size", () => {
    const near = new BodyAnalyzer();
    const far = new BodyAnalyzer();
    for (let i = 0; i <= 15; i++) {
      near.update(syntheticPose(0.5 - i * 0.012, 0.5, 0.3), FRAME);
      far.update(syntheticPose(0.5 - i * 0.006, 0.5, 0.15), FRAME);
    }
    expect(near.state().centerVelocity().x).toBeCloseTo(far.state().centerVelocity().x, 1);
  });

  it("recovers cleanly after leaving the frame", () => {
    const analyzer = new BodyAnalyzer();
    run(analyzer, 0.3, 0.3, 0.3);
    analyzer.update(null, FRAME);
    expect(analyzer.state().visible).toBe(false);
    analyzer.update(syntheticPose(0.8), FRAME);
    expect(analyzer.state().visible).toBe(true);
    expect(analyzer.state().center().x).toBeCloseTo(0.8, 2);
  });
});
