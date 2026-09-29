import type { MotionProvider } from "./MotionProvider";
import type { MotionConfig } from "./MotionConfig";
import type { HandState } from "./hand/HandState";
import type { TrackingQuality, TrackingState } from "./state/TrackingState";

export type HandSelector = "primary" | "left" | "right";

/**
 * The only thing a game ever talks to. Wraps whichever MotionProvider is
 * actually running (MediaPipe or Mock) so games never know or care which
 * one it is — see PROMPT sections 5/13/98.
 */
export class MotionEngine {
  constructor(private readonly provider: MotionProvider) {}

  async initialize(config: MotionConfig): Promise<void> {
    await this.provider.initialize(config);
  }

  async start(): Promise<void> {
    await this.provider.start();
  }

  pause(): void {
    this.provider.pause();
  }

  resume(): void {
    this.provider.resume();
  }

  stop(): void {
    this.provider.stop();
  }

  destroy(): void {
    this.provider.destroy();
  }

  state(): TrackingState {
    return this.provider.getSnapshot().state;
  }

  isReady(): boolean {
    const state = this.state();
    return state !== "initializing" && state !== "error";
  }

  isTracking(): boolean {
    return this.state() === "tracking";
  }

  quality(): TrackingQuality {
    return this.provider.getSnapshot().quality;
  }

  hand(which: HandSelector = "primary"): HandState {
    const snapshot = this.provider.getSnapshot();
    if (which === "left") return snapshot.leftHand;
    if (which === "right") return snapshot.rightHand;
    return snapshot.primaryHand;
  }

  snapshot() {
    return this.provider.getSnapshot();
  }
}
