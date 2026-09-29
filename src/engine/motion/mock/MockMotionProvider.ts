import type { MotionProvider } from "../MotionProvider";
import type { MotionConfig } from "../MotionConfig";
import type { TrackingSnapshot } from "../state/TrackingSnapshot";
import type { TrackingState } from "../state/TrackingState";
import type { HandState, Point2D } from "../hand/HandState";
import { NO_HAND } from "../hand/HandState";

/**
 * Simulates a hand drifting in a smooth path — lets a game (or an
 * automated test) run with no webcam at all. Also exposes moveTo() so
 * tests can drive the "hand" to a specific target deliberately
 * (PROMPT sections 25/26/94: "move hand to target, hold 3 seconds, success").
 */
export class MockMotionProvider implements MotionProvider {
  private state: TrackingState = "initializing";
  private rafId: number | null = null;
  private startedAt = 0;
  private target: Point2D | null = null;
  private position: Point2D = { x: 0.5, y: 0.5 };

  async initialize(_config: MotionConfig): Promise<void> {
    this.state = "ready";
  }

  async start(): Promise<void> {
    this.state = "tracking";
    this.startedAt = performance.now();
    this.loop();
  }

  pause(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.state = "paused";
  }

  resume(): void {
    if (this.state === "paused") {
      this.state = "tracking";
      this.loop();
    }
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.state = "stopped";
  }

  destroy(): void {
    this.stop();
  }

  /** Drives the simulated hand toward a normalized (0..1) target — for tests. */
  moveTo(target: Point2D): void {
    this.target = target;
  }

  getSnapshot(): TrackingSnapshot {
    const hand: HandState = {
      visible: this.state === "tracking",
      handedness: "right",
      confidence: 1,
      position: this.position,
      velocity: { x: 0, y: 0 },
      speed: 0,
      direction: 0,
      landmark: () => this.position,
    };

    return {
      state: this.state,
      quality: { overall: 1, hand: 1, fps: 60, latencyMs: 0 },
      primaryHand: this.state === "tracking" ? hand : NO_HAND,
      leftHand: NO_HAND,
      rightHand: this.state === "tracking" ? hand : NO_HAND,
    };
  }

  private loop = (): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const elapsed = (performance.now() - this.startedAt) / 1000;

    if (this.target) {
      this.position = {
        x: this.position.x + (this.target.x - this.position.x) * 0.12,
        y: this.position.y + (this.target.y - this.position.y) * 0.12,
      };
    } else {
      // Gentle idle drift so a mock-driven scene still feels alive.
      this.position = {
        x: 0.5 + Math.sin(elapsed * 0.6) * 0.18,
        y: 0.5 + Math.sin(elapsed * 0.9) * 0.12,
      };
    }
  };
}
