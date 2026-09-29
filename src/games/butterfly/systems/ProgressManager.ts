import { LocalStorageAdapter, type StorageAdapter } from "../../../engine/persistence/StorageAdapter";

export interface LevelRecord {
  stars: number;
  bestScore: number;
  attempts: number;
}

export interface ButterflyProgress {
  trainingCompleted: boolean;
  levels: Record<string, LevelRecord>;
  lastPlayedLevelId: string | null;
  successfulMatches: number;
  wrongMatches: number;
}

// A fresh object every time — sharing one `levels` map between managers would leak progress across profiles.
const emptyProgress = (): ButterflyProgress => ({
  trainingCompleted: false,
  levels: {},
  lastPlayedLevelId: null,
  successfulMatches: 0,
  wrongMatches: 0,
});

/** Per-profile Butterfly progress (PROMPT section 77). */
export class ProgressManager {
  private data: ButterflyProgress;
  private readonly key: string;

  constructor(profileId: string | null, private readonly storage: StorageAdapter = new LocalStorageAdapter()) {
    this.key = `kalqy.butterfly.progress.${profileId ?? "guest"}`;
    this.data = { ...emptyProgress(), ...(this.storage.get<ButterflyProgress>(this.key) ?? {}) };
  }

  snapshot(): ButterflyProgress {
    return this.data;
  }

  isCompleted(levelId: string): boolean {
    return levelId === "butterfly-training" ? this.data.trainingCompleted : levelId in this.data.levels;
  }

  recordSuccess(levelId: string, stars: number, score: number, wrongTries: number): void {
    if (levelId === "butterfly-training") {
      this.data.trainingCompleted = true;
    } else {
      const existing = this.data.levels[levelId];
      this.data.levels[levelId] = {
        stars: Math.max(stars, existing?.stars ?? 0),
        bestScore: Math.max(score, existing?.bestScore ?? 0),
        attempts: (existing?.attempts ?? 0) + 1,
      };
    }
    this.data.successfulMatches += 1;
    this.data.wrongMatches += wrongTries;
    this.data.lastPlayedLevelId = levelId;
    this.save();
  }

  reset(): void {
    this.data = emptyProgress();
    this.storage.remove(this.key);
  }

  private save(): void {
    this.storage.set(this.key, this.data);
  }
}
