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
  /** Optional top-center HUD text a game supplies itself. */
  headline?: string;
  /** False for untimed levels (e.g. training) — the HUD shows -- instead of a countdown. */
  timed?: boolean;
  /** True for guided tutorials — the HUD hides the goals and tip so the lesson has a clean screen. */
  tutorial?: boolean;
  levelIndex: number;
  totalLevels: number;
  hint: string;
  wrongTries: number;
  /** 0 until the level is won, then 1-3. */
  stars: number;
  /** Short encouraging message (never a punishment), or null. */
  feedback: string | null;
  /** Level-specific goal rows (e.g. "Apples 3/5"); when present the HUD shows these instead of the daily goals. */
  goals?: { id: string; label: string; value: number; target: number; image?: string }[];
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
