import { describe, expect, it } from "vitest";
import { GestureTracker, readGesture } from "./HandGesture";
import type { HandLandmarkName } from "./HandLandmarks";
import type { Point2D } from "./HandState";

/** Synthetic hand: wrist at origin, fingers along +y. `curl` 0 = extended, 1 = fist. */
function hand(curl: number, thumbToIndex = 0.8) {
  const pts: Partial<Record<HandLandmarkName, Point2D>> = { wrist: { x: 0, y: 0 } };
  ["index", "middle", "ring", "pinky"].forEach((finger, i) => {
    const x = (i - 1.5) * 0.25;
    pts[`${finger}MCP` as HandLandmarkName] = { x, y: 1 };
    pts[`${finger}Tip` as HandLandmarkName] = { x, y: 1 + (1 - curl) * 1.0 - curl * 0.1 };
  });
  pts.thumbTip = { x: pts.indexTip!.x + thumbToIndex, y: pts.indexTip!.y };
  return (name: HandLandmarkName) => pts[name] ?? { x: 0, y: 0.5 };
}

const feed = (tracker: GestureTracker, lm: ReturnType<typeof hand>, frames = 4) => {
  let g = tracker.gesture;
  for (let i = 0; i < frames; i++) g = tracker.update(readGesture(lm));
  return g;
};

describe("hand gestures", () => {
  it("reads open vs closed", () => {
    expect(readGesture(hand(0)).closure).toBeLessThan(0.15);
    expect(readGesture(hand(1)).closure).toBeGreaterThan(0.85);
  });

  it("detects a fist and an open hand", () => {
    const t = new GestureTracker();
    expect(feed(t, hand(0))).toBe("open");
    expect(feed(t, hand(1))).toBe("fist");
    expect(feed(t, hand(0))).toBe("open");
  });

  it("detects a pinch when thumb and index touch", () => {
    const t = new GestureTracker();
    expect(feed(t, hand(0.1, 0.05))).toBe("pinch");
    expect(feed(t, hand(0.1, 0.9))).toBe("open");
  });

  it("ignores a single noisy frame", () => {
    const t = new GestureTracker();
    feed(t, hand(0));
    t.update(readGesture(hand(1)));
    expect(t.gesture).toBe("open");
  });

  it("uses hysteresis so a half-closed hand doesn't flicker", () => {
    const t = new GestureTracker();
    feed(t, hand(1));
    expect(feed(t, hand(0.5))).toBe("fist");
  });
});
