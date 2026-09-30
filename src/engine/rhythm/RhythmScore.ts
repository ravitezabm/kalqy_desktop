import type { EventResult, Grade } from "./RhythmValidator";

export interface RhythmScoring {
  perfect: number;
  good: number;
  near: number;
  miss: number;
  /** Extra for a two-hand event played well (good or better). */
  twoHandBonus: number;
  /** What a missed event does to the streak. */
  streakOnMiss: "reset" | "decrease" | "keep";
}

export const DEFAULT_RHYTHM_SCORING: RhythmScoring = { perfect: 10, good: 7, near: 4, miss: 0, twoHandBonus: 5, streakOnMiss: "reset" };

/** Score, streak and the goal counters for one level, from a RhythmScoring config. Score never goes below zero. */
export class RhythmScore {
  score: number;
  streak: number;
  bestStreak = 0;
  notes = 0;
  perfect = 0;
  twoHandHits = 0;
  misses = 0;

  constructor(private readonly config: RhythmScoring = DEFAULT_RHYTHM_SCORING, startScore = 0, startStreak = 0) {
    this.score = startScore;
    this.streak = startStreak;
  }

  /** @returns points earned by this event. */
  apply(result: EventResult): number {
    const grade: Grade = result.grade;
    if (grade === "miss") {
      this.misses += 1;
      if (this.config.streakOnMiss === "reset") this.streak = 0;
      else if (this.config.streakOnMiss === "decrease") this.streak = Math.max(0, this.streak - 1);
      return 0;
    }
    const hits = Math.max(1, result.offsetsMs.length);
    let points = this.config[grade] * hits;
    this.notes += 1;
    if (grade === "perfect") this.perfect += 1;
    if (result.twoHands && grade !== "near") {
      points += this.config.twoHandBonus;
      this.twoHandHits += 1;
    }
    this.streak += result.twoHands ? 2 : 1;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.score += points;
    return points;
  }

  add(bonus: number): void {
    this.score = Math.max(0, this.score + bonus);
  }
}
