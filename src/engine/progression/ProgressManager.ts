import { LocalStorageAdapter, type StorageAdapter } from "../persistence/StorageAdapter";

export interface LevelRecord {
  stars: number;
  bestScore: number;
  attempts: number;
}

export interface StoryProgress {
  trainingCompleted: boolean;
  levels: Record<string, LevelRecord>;
  lastPlayedLevelId: string | null;
  successfulMatches: number;
  wrongMatches: number;
}

// A fresh object every time — sharing one `levels` map between managers would leak progress across profiles.
const emptyProgress = (): StoryProgress => ({
  trainingCompleted: false,
  levels: {},
  lastPlayedLevelId: null,
  successfulMatches: 0,
  wrongMatches: 0,
});

export interface ProgressScope {
  /** Storage namespace, e.g. "butterfly" → kalqy.butterfly.progress.<profile>. */
  gameKey: string;
  trainingLevelId: string;
}

/** Per-profile story-mode progress, shared by every story game. */
export class ProgressManager {
  private data: StoryProgress;
  private readonly key: string;

  constructor(
    profileId: string | null,
    private readonly scope: ProgressScope,
    private readonly storage: StorageAdapter = new LocalStorageAdapter()
  ) {
    this.key = `kalqy.${scope.gameKey}.progress.${profileId ?? "guest"}`;
    this.data = { ...emptyProgress(), ...(this.storage.get<StoryProgress>(this.key) ?? {}) };
  }

  snapshot(): StoryProgress {
    return this.data;
  }

  isCompleted(levelId: string): boolean {
    return levelId === this.scope.trainingLevelId ? this.data.trainingCompleted : levelId in this.data.levels;
  }

  recordSuccess(levelId: string, stars: number, score: number, wrongTries: number): void {
    if (levelId === this.scope.trainingLevelId) {
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
