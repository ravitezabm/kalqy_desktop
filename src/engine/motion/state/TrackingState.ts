/** See PROMPT section 21 — the same lifecycle every motion-driven game reads. */
export type TrackingState =
  | "initializing"
  | "ready"
  | "tracking"
  | "degraded"
  | "lost"
  | "paused"
  | "stopped"
  | "error";

export interface TrackingQuality {
  overall: number;
  hand: number;
  fps: number;
  latencyMs: number;
}
