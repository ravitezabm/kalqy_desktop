import type { Point2D } from "./HandState";
import type { HandLandmarkName } from "./HandLandmarks";

export type HandGesture = "open" | "pinch" | "fist";

export interface GestureReading {
  /** 0 = fingers fully extended, 1 = tight fist. */
  closure: number;
  /** Thumb-tip to index-tip distance in hand sizes (small = pinching). */
  pinchDistance: number;
}

const dist = (a: Point2D, b: Point2D) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Reads how closed the hand is from its landmarks. Everything is relative
 * to the hand's own size, so it works the same near or far from the camera.
 * Pure (no MediaPipe) so it is unit-testable.
 */
export function readGesture(landmark: (name: HandLandmarkName) => Point2D): GestureReading {
  const wrist = landmark("wrist");
  const size = Math.max(dist(wrist, landmark("middleMCP")), 1e-4);

  const fingers: [HandLandmarkName, HandLandmarkName][] = [
    ["indexTip", "indexMCP"],
    ["middleTip", "middleMCP"],
    ["ringTip", "ringMCP"],
    ["pinkyTip", "pinkyMCP"],
  ];
  // An extended finger's tip is ~1.9x as far from the wrist as its knuckle; a curled one ~0.9x.
  const closures = fingers.map(([tip, mcp]) => {
    const ratio = dist(wrist, landmark(tip)) / Math.max(dist(wrist, landmark(mcp)), 1e-4);
    return Math.min(1, Math.max(0, (1.9 - ratio) / 0.9));
  });
  return {
    closure: closures.reduce((a, b) => a + b, 0) / closures.length,
    pinchDistance: dist(landmark("thumbTip"), landmark("indexTip")) / size,
  };
}

export interface GestureThresholds {
  fistOn: number;
  fistOff: number;
  pinchOn: number;
  pinchOff: number;
  /** Consecutive frames a change must persist before it is reported. */
  confirmFrames: number;
}

export const DEFAULT_GESTURE_THRESHOLDS: GestureThresholds = {
  fistOn: 0.6,
  fistOff: 0.4,
  pinchOn: 0.3,
  pinchOff: 0.5,
  confirmFrames: 2,
};

/** Turns noisy per-frame readings into a stable gesture (hysteresis + confirmation). */
export class GestureTracker {
  private current: HandGesture = "open";
  private candidate: HandGesture = "open";
  private candidateFrames = 0;

  constructor(private readonly thresholds: GestureThresholds = DEFAULT_GESTURE_THRESHOLDS) {}

  update(reading: GestureReading): HandGesture {
    const t = this.thresholds;
    const wasFist = this.current === "fist";
    const wasPinch = this.current === "pinch";

    const fist = wasFist ? reading.closure > t.fistOff : reading.closure > t.fistOn;
    const pinch = !fist && (wasPinch ? reading.pinchDistance < t.pinchOff : reading.pinchDistance < t.pinchOn);
    const next: HandGesture = fist ? "fist" : pinch ? "pinch" : "open";

    if (next === this.current) {
      this.candidate = next;
      this.candidateFrames = 0;
    } else {
      if (next !== this.candidate) {
        this.candidate = next;
        this.candidateFrames = 0;
      }
      this.candidateFrames += 1;
      if (this.candidateFrames >= t.confirmFrames) {
        this.current = next;
        this.candidateFrames = 0;
      }
    }
    return this.current;
  }

  get gesture(): HandGesture {
    return this.current;
  }

  reset(): void {
    this.current = "open";
    this.candidate = "open";
    this.candidateFrames = 0;
  }
}
