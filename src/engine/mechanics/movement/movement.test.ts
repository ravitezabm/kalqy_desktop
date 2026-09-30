import { describe, expect, it } from "vitest";
import { DirectionalMovementController } from "./DirectionalMovementController";
import { LaneLesson } from "./LaneLesson";

function run(c: DirectionalMovementController, ms: number): void {
  for (let t = 0; t < ms; t += 16) c.update(16);
}

describe("DirectionalMovementController", () => {
  it("accelerates toward the target instead of teleporting", () => {
    const c = new DirectionalMovementController(640, { minX: 300, maxX: 980 });
    c.setTarget(980);
    c.update(16);
    expect(c.x).toBeGreaterThan(640);
    expect(c.x).toBeLessThan(660);
    expect(c.facing()).toBe("right");
  });

  it("arrives and stops on the target without overshooting", () => {
    const c = new DirectionalMovementController(640, { minX: 300, maxX: 980 });
    c.setTarget(400);
    let min = c.x;
    for (let i = 0; i < 300; i++) {
      c.update(16);
      min = Math.min(min, c.x);
    }
    expect(c.x).toBe(400);
    expect(min).toBeGreaterThanOrEqual(399.9);
    expect(c.facing()).toBe("none");
  });

  it("stays inside its bounds and brakes when told to hold", () => {
    const c = new DirectionalMovementController(640, { minX: 300, maxX: 980 });
    c.setTarget(5000);
    run(c, 3000);
    expect(c.x).toBeLessThanOrEqual(980);
    c.reset(500);
    c.setTarget(900);
    run(c, 200);
    c.hold();
    run(c, 1000);
    expect(c.x).toBeLessThan(900);
    expect(c.velocity).toBe(0);
  });
});

describe("LaneLesson", () => {
  it("finishes each step after the position is held, in order", () => {
    const lesson = new LaneLesson(["left", "right", "center"], 500);
    expect(lesson.update(0.1, 300).stepCompleted).toBe(false);
    expect(lesson.update(0.1, 300)).toMatchObject({ stepCompleted: true, step: "left", done: false });
    expect(lesson.update(0.9, 600)).toMatchObject({ stepCompleted: true, step: "right" });
    expect(lesson.update(0.5, 600)).toMatchObject({ stepCompleted: true, step: "center", done: true });
    expect(lesson.done).toBe(true);
  });

  it("drains progress when the child leaves the zone", () => {
    const lesson = new LaneLesson(["left"], 1000);
    expect(lesson.update(0.1, 500).holdProgress).toBeCloseTo(0.5);
    expect(lesson.update(0.6, 100).holdProgress).toBeCloseTo(0.3);
  });

  it("does not count the wrong side", () => {
    const lesson = new LaneLesson(["left"], 400);
    expect(lesson.update(0.9, 1000).stepCompleted).toBe(false);
  });
});
