import type { Point2D } from "../hand/HandState";
import type { BodyJointName } from "./BodyLandmarks";

export type MovementDirection = "none" | "left" | "right" | "forward" | "backward";

/**
 * The only body shape a game ever sees. Everything is normalized (0..1),
 * mirrored so "step right" moves things right on screen, smoothed, and
 * scaled relative to the child's own body size (so a small child near the
 * camera and a tall one far away behave the same). See BodyAnalyzer.
 */
export interface BodyState {
  visible: boolean;
  confidence: number;

  joint(name: BodyJointName): Point2D;
  /** Smoothed torso center (shoulders + hips). */
  center(): Point2D;
  /** Torso-center velocity in body-widths per second. */
  centerVelocity(): Point2D;
  /** Shoulder width in normalized frame units — a proxy for distance to camera. */
  scale(): number;
  /** Interior angle in degrees at joint `b` formed by a-b-c. */
  angle(a: BodyJointName, b: BodyJointName, c: BodyJointName): number;

  isMoving(): boolean;
  movementDirection(): MovementDirection;
  isLeaningLeft(): boolean;
  isLeaningRight(): boolean;
  isReaching(): boolean;
  isSquatting(): boolean;
  isJumping(): boolean;
}

const ORIGIN: Point2D = { x: 0.5, y: 0.5 };

export const NO_BODY: BodyState = {
  visible: false,
  confidence: 0,
  joint: () => ORIGIN,
  center: () => ORIGIN,
  centerVelocity: () => ({ x: 0, y: 0 }),
  scale: () => 0,
  angle: () => 0,
  isMoving: () => false,
  movementDirection: () => "none",
  isLeaningLeft: () => false,
  isLeaningRight: () => false,
  isReaching: () => false,
  isSquatting: () => false,
  isJumping: () => false,
};
