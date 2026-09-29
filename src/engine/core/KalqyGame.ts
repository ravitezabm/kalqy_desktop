import type { MotionEngine } from "../motion/MotionEngine";

export interface GameContext {
  motion: MotionEngine;
}

export interface GameProgress {
  status: "idle" | "playing" | "success" | "failed";
  holdProgress: number;
  score: number;
  streak: number;
  timeRemainingSeconds: number;
  levelId: string;
  levelTitle: string;
  levelIndex: number;
  totalLevels: number;
  hint: string;
  wrongTries: number;
  /** 0 until the level is won, then 1-3. */
  stars: number;
  /** Short encouraging message (never a punishment), or null. */
  feedback: string | null;
  /** True until the first hand is seen on this level; the timer doesn't run yet. */
  waitingForHand: boolean;
}

/** See PROMPT section 31. Only the subset Phase 1 (Butterfly Level 1) needs. */
export interface KalqyGame {
  id: string;
  initialize(context: GameContext): void;
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void;
  getProgress(): GameProgress;
}
