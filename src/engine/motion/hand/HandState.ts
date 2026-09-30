import type { HandLandmarkName } from "./HandLandmarks";
import type { HandGesture } from "./HandGesture";

export interface Point2D {
  x: number;
  y: number;
}

export type Handedness = "left" | "right";

/**
 * The only hand shape a game ever sees. Everything here is already
 * normalized (0..1, mirrored for a natural "move your hand, see it move
 * the same way" feel) and smoothed — see CoordinateMapper/OneEuroFilter.
 */
export interface HandState {
  visible: boolean;
  handedness: Handedness;
  confidence: number;

  /** Smoothed wrist position — what most games should drive movement from. */
  position: Point2D;
  velocity: Point2D;
  speed: number;

  /** Radians, 0 = pointing right. Direction of current velocity. */
  direction: number;

  /** Stable (hysteresis + confirmation) open / pinch / fist. */
  gesture: HandGesture;
  /** 0 open .. 1 fist. */
  closure: number;

  landmark(name: HandLandmarkName): Point2D;
}

export const NO_HAND: HandState = {
  visible: false,
  handedness: "right",
  confidence: 0,
  position: { x: 0.5, y: 0.5 },
  velocity: { x: 0, y: 0 },
  speed: 0,
  direction: 0,
  gesture: "open",
  closure: 0,
  landmark: () => ({ x: 0.5, y: 0.5 }),
};
