export type CatchOutcome = "correct" | "wrong" | "hazard" | "extra";

export interface ScoringConfig {
  correct: number;
  wrong: number;
  hazard: number;
  /** A right object after its target was already full — harmless by default. */
  extra: number;
  /** What a mistake does to the streak. */
  streakOnMistake: "reset" | "decrease" | "keep";
}

export const DEFAULT_SCORING: ScoringConfig = { correct: 10, wrong: -5, hazard: -10, extra: 0, streakOnMistake: "reset" };

/** Score + streak for one level, driven entirely by a ScoringConfig. Score never drops below zero. */
export class ScoreManager {
  score: number;
  streak: number;
  correct = 0;
  mistakes = 0;

  constructor(private readonly config: ScoringConfig = DEFAULT_SCORING, startScore = 0, startStreak = 0) {
    this.score = startScore;
    this.streak = startStreak;
  }

  apply(outcome: CatchOutcome): number {
    const points = this.config[outcome];
    this.score = Math.max(0, this.score + points);
    if (outcome === "correct") {
      this.correct += 1;
      this.streak += 1;
    } else if (outcome === "wrong" || outcome === "hazard") {
      this.mistakes += 1;
      if (this.config.streakOnMistake === "reset") this.streak = 0;
      else if (this.config.streakOnMistake === "decrease") this.streak = Math.max(0, this.streak - 1);
    }
    return points;
  }

  add(bonus: number): void {
    this.score = Math.max(0, this.score + bonus);
  }
}
