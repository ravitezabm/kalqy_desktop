export type CharacterState = "idle" | "moving" | "happy" | "fail" | "success" | "celebrate";

/** States that play once and then fall back to idle/moving. */
const TRANSIENT: Partial<Record<CharacterState, number>> = { happy: 1600, fail: 1300, success: 1800 };

/**
 * A tiny controller for "which animation should this character be showing".
 * Gameplay drives it (`enter`), the view listens (`onChange`) and only
 * swaps animations on a real change — so animations never restart per frame.
 * `celebrate` is sticky (end of story); happy/fail/success expire.
 */
export class CharacterStateMachine {
  private current: CharacterState = "idle";
  private remainingMs = 0;
  private baseState: "idle" | "moving" = "idle";
  private listener: ((state: CharacterState, previous: CharacterState) => void) | null = null;

  onChange(listener: (state: CharacterState, previous: CharacterState) => void): void {
    this.listener = listener;
  }

  get state(): CharacterState {
    return this.current;
  }

  /** Continuous movement flag; only affects the resting state. */
  setMoving(moving: boolean): void {
    this.baseState = moving ? "moving" : "idle";
    if (this.current === "idle" || this.current === "moving") this.transition(this.baseState);
  }

  enter(state: CharacterState): void {
    if (this.current === "celebrate" && state !== "idle") return;
    this.remainingMs = TRANSIENT[state] ?? 0;
    this.transition(state);
  }

  /** End a happy/fail/success reaction early (e.g. the player started moving again). */
  release(): void {
    if (this.remainingMs <= 0) return;
    this.remainingMs = 0;
    this.transition(this.baseState);
  }

  reset(): void {
    this.baseState = "idle";
    this.remainingMs = 0;
    this.transition("idle");
  }

  update(deltaMs: number): void {
    if (this.remainingMs <= 0) return;
    this.remainingMs -= deltaMs;
    if (this.remainingMs <= 0) this.transition(this.baseState);
  }

  private transition(next: CharacterState): void {
    if (next === this.current) return;
    const previous = this.current;
    this.current = next;
    this.listener?.(next, previous);
  }
}
