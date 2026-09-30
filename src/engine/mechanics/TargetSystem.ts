import { PlacementSystem } from "./PlacementSystem";

export interface HoldTarget {
  id: string;
  /** True for the answer that completes the level. */
  correct: boolean;
  /** How close the probe has to get (same units as the distance you pass in). */
  radius: number;
}

export interface TargetUpdate {
  /** Highest hold progress across all targets, 0..1 — what the HUD bar shows. */
  progress: number;
  /** Set on the frame a target's hold completes. */
  completed: { id: string; correct: boolean } | null;
  /** Per-target hold progress (for rings). */
  byId: ReadonlyMap<string, number>;
}

/**
 * Generic "hold the probe over a target" mechanic with choices: every target
 * runs its own hold ring, the one marked `correct` wins, the others report a
 * wrong choice. Knows nothing about water, butterflies or rendering — the
 * game says how far the probe is from each target, this says what happened.
 */
export class TargetSystem<T extends HoldTarget = HoldTarget> {
  private readonly holds = new Map<string, PlacementSystem>();
  private readonly progressById = new Map<string, number>();

  constructor(
    readonly targets: T[],
    holdDurationMs: number
  ) {
    targets.forEach((target) => this.holds.set(target.id, new PlacementSystem(holdDurationMs)));
  }

  update(distanceTo: (target: T) => number, deltaMs: number): TargetUpdate {
    let progress = 0;
    let completed: TargetUpdate["completed"] = null;

    for (const target of this.targets) {
      const result = this.holds.get(target.id)!.update(distanceTo(target), target.radius, deltaMs);
      this.progressById.set(target.id, result.progress);
      progress = Math.max(progress, result.progress);
      // A correct answer always wins over a simultaneous wrong one.
      if (result.completed && (!completed || target.correct)) completed = { id: target.id, correct: target.correct };
    }
    return { progress, completed, byId: this.progressById };
  }

  reset(): void {
    this.holds.forEach((hold) => hold.reset());
    this.progressById.clear();
  }
}
