export interface MovementConfig {
  minX: number;
  maxX: number;
  /** px/s */
  maxSpeed: number;
  /** px/s² when speeding up toward the target. */
  acceleration: number;
  /** px/s² when slowing down / stopping. */
  deceleration: number;
  /** Slower than this (px/s) counts as standing still. */
  stillSpeed: number;
}

export const DEFAULT_MOVEMENT: MovementConfig = { minX: 0, maxX: 1280, maxSpeed: 620, acceleration: 2600, deceleration: 3400, stillSpeed: 40 };

export type Facing = "left" | "right" | "none";

/**
 * Moves a character toward a target x with real acceleration and braking —
 * it never teleports to where the body is. Speed eases in proportionally to
 * the remaining distance, so it glides to a stop instead of oscillating.
 */
export class DirectionalMovementController {
  x: number;
  velocity = 0;
  private target: number;
  private readonly config: MovementConfig;

  constructor(startX: number, config: Partial<MovementConfig> = {}) {
    this.config = { ...DEFAULT_MOVEMENT, ...config };
    this.x = this.target = startX;
  }

  setTarget(x: number): void {
    this.target = Math.min(this.config.maxX, Math.max(this.config.minX, x));
  }

  /** Stop where we are (tracking lost, level over). */
  hold(): void {
    this.target = this.x;
  }

  reset(x: number): void {
    this.x = this.target = x;
    this.velocity = 0;
  }

  update(deltaMs: number): number {
    const dt = Math.min(deltaMs, 50) / 1000;
    const { maxSpeed, acceleration, deceleration } = this.config;
    const distance = this.target - this.x;
    // Brake early enough to stop on the target: v² = 2·a·d.
    const brakeSpeed = Math.sqrt(2 * deceleration * Math.abs(distance)) * 0.8;
    const desired = Math.sign(distance) * Math.min(maxSpeed, brakeSpeed);
    const rate = Math.abs(desired) > Math.abs(this.velocity) && Math.sign(desired) === Math.sign(this.velocity || desired) ? acceleration : deceleration;
    const step = rate * dt;
    if (Math.abs(desired - this.velocity) <= step) this.velocity = desired;
    else this.velocity += Math.sign(desired - this.velocity) * step;

    this.x += this.velocity * dt;
    if (Math.abs(this.target - this.x) < 0.6 && Math.abs(this.velocity) < this.config.stillSpeed) {
      this.x = this.target;
      this.velocity = 0;
    }
    if (this.x <= this.config.minX || this.x >= this.config.maxX) {
      this.x = Math.min(this.config.maxX, Math.max(this.config.minX, this.x));
      this.velocity = 0;
    }
    return this.x;
  }

  facing(): Facing {
    if (Math.abs(this.velocity) < this.config.stillSpeed) return "none";
    return this.velocity < 0 ? "left" : "right";
  }
}
