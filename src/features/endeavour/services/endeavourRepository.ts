import { WORLD, ADVENTURE_DEFINITIONS } from "../data/worldCatalog";
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
}

interface ProgressRecord {
  stars: number;
  bestScore: number;
  playCount: number;
}

const NETWORK_DELAY_MS = 300;
const delay = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

/**
 * Per-profile completion records, keyed by adventure id. This is the part a
 * real backend would persist; everything else (art, position, order, unlock
 * graph) lives in the static catalog. Status is always derived here, never
 * stored directly, so it can never drift out of sync with completions.
 */
const progressStore = new Map<string, Map<string, ProgressRecord>>();

function getProfileProgress(profileId: string): Map<string, ProgressRecord> {
  let profileMap = progressStore.get(profileId);
  if (!profileMap) {
    profileMap = new Map();
    progressStore.set(profileId, profileMap);
  }
  return profileMap;
}

function deriveStatus(
  requiredAdventureId: string | null,
  own: ProgressRecord | undefined,
  requiredCompleted: boolean
): AdventureStatus {
  if (own) return "completed";
  if (requiredAdventureId === null || requiredCompleted) return "available";
  return "locked";
}

function buildAdventures(profileId: string): Adventure[] {
  const progress = getProfileProgress(profileId);

  return ADVENTURE_DEFINITIONS.map((definition) => {
    const own = progress.get(definition.id);
    const requiredCompleted =
      definition.requiredAdventureId === null || progress.has(definition.requiredAdventureId);
    const status = deriveStatus(definition.requiredAdventureId, own, requiredCompleted);

    return {
      ...definition,
      status,
      progress: status === "completed" ? 100 : 0,
      stars: own?.stars ?? 0,
      bestScore: own?.bestScore ?? null,
      playCount: own?.playCount ?? 0,
    };
  });
}

/**
 * "in_progress" is a first-class status a real backend would set while a
 * session is mid-adventure (autosave, partial score). The local mock has no
 * live game runtime to report that from, so it never produces it — the UI
 * still fully supports rendering/handling it once a real backend does.
 */
export const localEndeavourRepository: EndeavourRepository = {
  async getWorld(profileId) {
    await delay();
    return { world: WORLD, adventures: buildAdventures(profileId) };
  },

  async completeAdventure(profileId, adventureId, result) {
    await delay();
    const progress = getProfileProgress(profileId);
    const existing = progress.get(adventureId);
    progress.set(adventureId, {
      stars: Math.max(result.stars, existing?.stars ?? 0),
      bestScore: Math.max(result.score, existing?.bestScore ?? 0),
      playCount: (existing?.playCount ?? 0) + 1,
    });
    return { world: WORLD, adventures: buildAdventures(profileId) };
  },
};
