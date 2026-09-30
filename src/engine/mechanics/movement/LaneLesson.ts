export type LaneStep = "left" | "right" | "center";

const ZONES: Record<LaneStep, (position: number) => boolean> = {
  left: (p) => p < 0.3,
  right: (p) => p > 0.7,
  center: (p) => Math.abs(p - 0.5) < 0.1,
};

/** Normalized lane position (0..1) where each step's goal sits — for guides and rings. */
export const LANE_STEP_POSITION: Record<LaneStep, number> = { left: 0.12, center: 0.5, right: 0.88 };

export interface LessonUpdate {
  step: LaneStep;
  index: number;
  inZone: boolean;
  /** 0..1 of the hold needed to finish this step. */
  holdProgress: number;
  stepCompleted: boolean;
  done: boolean;
}

/**
 * The "move left / move right / come back" tutorial as a tiny state machine:
 * stay in a step's zone for `holdMs` to finish it; leaving the zone drains
 * the progress (twice as fast) instead of resetting harshly.
 */
export class LaneLesson {
  private index = 0;
  private heldMs = 0;

  constructor(readonly steps: readonly LaneStep[], private readonly holdMs: number) {}

  get currentIndex(): number {
    return this.index;
  }

  get done(): boolean {
    return this.index >= this.steps.length;
  }

  reset(): void {
    this.index = 0;
    this.heldMs = 0;
  }

  update(position: number, deltaMs: number): LessonUpdate {
    if (this.done) return { step: this.steps[this.steps.length - 1], index: this.index, inZone: true, holdProgress: 1, stepCompleted: false, done: true };
    const step = this.steps[this.index];
    const inZone = ZONES[step](position);
    this.heldMs = inZone ? this.heldMs + deltaMs : Math.max(0, this.heldMs - deltaMs * 2);
    const holdProgress = Math.min(1, this.heldMs / this.holdMs);
    if (holdProgress < 1) return { step, index: this.index, inZone, holdProgress, stepCompleted: false, done: false };

    this.heldMs = 0;
    this.index += 1;
    return { step, index: this.index - 1, inZone, holdProgress: 1, stepCompleted: true, done: this.done };
  }
}
