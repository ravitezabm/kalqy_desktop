import type { MotionProvider } from "./MotionProvider";
import type { MotionConfig } from "./MotionConfig";
import type { BodyState } from "./body/BodyState";
import type { HandState } from "./hand/HandState";
import type { TrackingQuality, TrackingState } from "./state/TrackingState";

export type MotionEvent = "bodyDetected" | "bodyLost" | "bodyRecovered" | "movementLeft" | "movementRight" | "movementStopped";

export type HandSelector = "primary" | "left" | "right";

/**
 * The only thing a game ever talks to. Wraps whichever MotionProvider is
 * actually running (MediaPipe or Mock) so games never know or care which
 * one it is — see PROMPT sections 5/13/98.
 */
export class MotionEngine {
  private listeners = new Map<MotionEvent, Set<() => void>>();
  private eventTimer: number | null = null;
  private bodyEverSeen = false;
  private bodyWasVisible = false;
  private lastDirection = "none";

  constructor(private readonly provider: MotionProvider) {}

  /** Subscribe to derived motion events; returns an unsubscribe function. */
  on(event: MotionEvent, callback: () => void): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(callback);
    this.listeners.set(event, set);
    return () => set.delete(callback);
  }

  private emit(event: MotionEvent): void {
    this.listeners.get(event)?.forEach((callback) => callback());
  }

  private pollEvents = (): void => {
    const body = this.body();
    if (body.visible !== this.bodyWasVisible) {
      if (body.visible) this.emit(this.bodyEverSeen ? "bodyRecovered" : "bodyDetected");
      else this.emit("bodyLost");
      if (body.visible) this.bodyEverSeen = true;
      this.bodyWasVisible = body.visible;
    }
    const direction = body.visible ? body.movementDirection() : "none";
    if (direction !== this.lastDirection) {
      if (direction === "left") this.emit("movementLeft");
      else if (direction === "right") this.emit("movementRight");
      else if (direction === "none") this.emit("movementStopped");
      this.lastDirection = direction;
    }
  };

  async initialize(config: MotionConfig): Promise<void> {
    await this.provider.initialize(config);
  }

  async start(): Promise<void> {
    await this.provider.start();
    this.eventTimer ??= window.setInterval(this.pollEvents, 50);
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
    if (this.eventTimer !== null) window.clearInterval(this.eventTimer);
    this.eventTimer = null;
    this.listeners.clear();
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

  /** Smoothed, normalized full-body state; NO_BODY-like (visible=false) when nobody is in view. */
  body(): BodyState {
    return this.provider.getSnapshot().body;
  }

  snapshot() {
    return this.provider.getSnapshot();
  }
}
