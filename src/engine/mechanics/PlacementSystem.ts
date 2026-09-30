/**
 * The core Butterfly mechanic (PROMPT sections 43/44/108): butterfly enters
 * a target's interaction radius, holds for holdDurationMs, then succeeds.
 * Leaving the radius resets the hold — but never from a single stray frame,
 * so tiny tracking jitter at the boundary doesn't feel unfair.
 */
export class PlacementSystem {
  private holdMs = 0;
  private insideStreakMs = 0;
  private outsideStreakMs = 0;

  constructor(private readonly holdDurationMs: number) {}

  /** @returns hold progress 0..1, and whether this update just completed the hold. */
  update(distance: number, interactionRadius: number, deltaMs: number): { progress: number; completed: boolean } {
    const inside = distance <= interactionRadius;

    if (inside) {
      this.insideStreakMs += deltaMs;
      this.outsideStreakMs = 0;
    } else {
      this.outsideStreakMs += deltaMs;
      this.insideStreakMs = 0;
      // Only reset progress after a brief real exit, not a single jittery frame.
      if (this.outsideStreakMs > 120) {
        this.holdMs = 0;
      }
    }

    if (inside) {
      this.holdMs += deltaMs;
    }

    const progress = Math.min(1, this.holdMs / this.holdDurationMs);
    const completed = progress >= 1;
    if (completed) this.holdMs = 0;

    return { progress: completed ? 1 : progress, completed };
  }

  reset(): void {
    this.holdMs = 0;
    this.insideStreakMs = 0;
    this.outsideStreakMs = 0;
  }
}
