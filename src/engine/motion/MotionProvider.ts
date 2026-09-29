import type { MotionConfig } from "./MotionConfig";
import type { TrackingSnapshot } from "./state/TrackingSnapshot";

/**
 * What MotionEngine talks to. MediaPipeMotionProvider and MockMotionProvider
 * both implement this — MediaPipe can be swapped for a different tracker
 * later without any game (or MotionEngine's public API) changing.
 * See PROMPT section 4.
 */
export interface MotionProvider {
  initialize(config: MotionConfig): Promise<void>;
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  getSnapshot(): TrackingSnapshot;
  destroy(): void;
}
