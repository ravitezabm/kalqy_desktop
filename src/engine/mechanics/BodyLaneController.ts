import type { BodyState } from "../motion/body/BodyState";

export type Lane = "left" | "center" | "right";

export interface LaneConfig {
  /** Torso-center x range treated as "centered" (mirrored 0..1). */
  deadZone: { left: number; right: number };
  /** How far the child has to move: 1 = the whole frame width maps to the whole lane. */
  movementSensitivity: number;
  /** 0..1 per 60fps frame — how quickly the output follows the body. */
  followSpeed: number;
}

export const DEFAULT_LANE_CONFIG: LaneConfig = {
  deadZone: { left: 0.4, right: 0.6 },
  movementSensitivity: 1.7,
  followSpeed: 0.14,
};

/**
 * Turns the child's body position into a stable 0..1 control value and a
 * LEFT / CENTER / RIGHT lane. Leaning outside the dead zone pushes the value
 * toward that edge; standing in the dead zone eases it back to the middle,
 * never snapping. If the child steps out of view it holds its last value
 * (tracking-lost is handled by the game, not by lurching sideways).
 */
export class BodyLaneController {
  private value = 0.5;
  private target = 0.5;
  private lane: Lane = "center";
  private readonly config: LaneConfig;

  constructor(config: Partial<LaneConfig> = {}) {
    this.config = { ...DEFAULT_LANE_CONFIG, ...config, deadZone: { ...DEFAULT_LANE_CONFIG.deadZone, ...config.deadZone } };
  }

  /** @returns the smoothed lane position, 0 (far left) .. 1 (far right). */
  update(body: BodyState, deltaMs: number): number {
    if (body.visible) {
      this.target = this.targetFor(body.center().x);
      this.lane = body.isLeaningLeft() ? "left" : body.isLeaningRight() ? "right" : "center";
    }
    const follow = 1 - Math.pow(1 - this.config.followSpeed, deltaMs / (1000 / 60));
    this.value += (this.target - this.value) * follow;
    return this.value;
  }

  position(): number {
    return this.value;
  }

  currentLane(): Lane {
    return this.lane;
  }

  reset(): void {
    this.value = 0.5;
    this.target = 0.5;
    this.lane = "center";
  }

  private targetFor(x: number): number {
    const { left, right } = this.config.deadZone;
    if (x >= left && x <= right) return 0.5;
    const reach = 0.5 / this.config.movementSensitivity;
    const edge = x < left ? left : right;
    const deadHalf = Math.abs(edge - 0.5);
    const travel = Math.max(reach - deadHalf, 0.02);
    const t = Math.min(Math.abs(x - edge) / travel, 1);
    return x < left ? 0.5 - 0.5 * t : 0.5 + 0.5 * t;
  }
}
