import { WORLD, ADVENTURE_DEFINITIONS } from "../data/worldCatalog";
import { LocalStorageAdapter } from "../../../engine/persistence/StorageAdapter";
import type {
  Adventure,
  AdventureCompletionResult,
  AdventureStatus,
  EndeavourWorldResponse,
} from "../types/endeavour";

export interface EndeavourRepository {
  getWorld(profileId: string): Promise<EndeavourWorldResponse>;
  completeAdventure(
    profileId: string,
    adventureId: string,
    result: AdventureCompletionResult
  ): Promise<EndeavourWorldResponse>;
  /** Partial progress (0-99) for an adventure the child has started but not finished. */
  reportProgress(profileId: string, adventureId: string, percent: number): Promise<void>;
}

interface ProgressRecord {
  stars: number;
  bestScore: number;
  playCount: number;
}

interface StoredProgress {
  completed: Record<string, ProgressRecord>;
  partial: Record<string, number>;
}

const NETWORK_DELAY_MS = 300;
const delay = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));
const storage = new LocalStorageAdapter();

const storageKey = (profileId: string) => `kalqy.endeavour.progress.${profileId}`;

function load(profileId: string): StoredProgress {
  return storage.get<StoredProgress>(storageKey(profileId)) ?? { completed: {}, partial: {} };
}

function save(profileId: string, progress: StoredProgress): void {
  storage.set(storageKey(profileId), progress);
}

/** The adventure whose game lives at `route` — lets a game report progress without hardcoding ids. */
export function adventureIdForRoute(route: string): string | null {
  return ADVENTURE_DEFINITIONS.find((definition) => definition.route === route)?.id ?? null;
}

function deriveStatus(unlocked: boolean, completed: boolean, partial: number): AdventureStatus {
  if (completed) return "completed";
  if (!unlocked) return "locked";
  return partial > 0 ? "in_progress" : "available";
}

/**
 * Status is always derived here from completions + the unlock graph, never
 * stored, so it can't drift out of sync (same as a real backend join).
 */
function buildAdventures(profileId: string): Adventure[] {
  const { completed, partial } = load(profileId);

  return ADVENTURE_DEFINITIONS.map((definition) => {
    const own = completed[definition.id];
    const unlocked = definition.requiredAdventureId === null || definition.requiredAdventureId in completed;
    const partialPercent = partial[definition.id] ?? 0;
    const status = deriveStatus(unlocked, Boolean(own), partialPercent);

    return {
      ...definition,
      status,
      progress: status === "completed" ? 100 : status === "in_progress" ? partialPercent : 0,
      stars: own?.stars ?? 0,
      bestScore: own?.bestScore ?? null,
      playCount: own?.playCount ?? 0,
    };
  });
}

/** Local stand-in for GET /api/endeavour/world; persisted so unlocks survive restarts. */
export const localEndeavourRepository: EndeavourRepository = {
  async getWorld(profileId) {
    await delay();
    return { world: WORLD, adventures: buildAdventures(profileId) };
  },

  async completeAdventure(profileId, adventureId, result) {
    await delay();
    const progress = load(profileId);
    const existing = progress.completed[adventureId];
    progress.completed[adventureId] = {
      stars: Math.max(result.stars, existing?.stars ?? 0),
      bestScore: Math.max(result.score, existing?.bestScore ?? 0),
      playCount: (existing?.playCount ?? 0) + 1,
    };
    delete progress.partial[adventureId];
    save(profileId, progress);
    return { world: WORLD, adventures: buildAdventures(profileId) };
  },

  async reportProgress(profileId, adventureId, percent) {
    const progress = load(profileId);
    if (adventureId in progress.completed) return;
    progress.partial[adventureId] = Math.max(0, Math.min(99, Math.round(percent)));
    save(profileId, progress);
  },
};
