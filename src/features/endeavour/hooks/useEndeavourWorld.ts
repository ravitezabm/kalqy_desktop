import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { endeavourRepository } from "../services";
import { LocalStorageAdapter } from "../../../engine/persistence/StorageAdapter";
import type { Adventure, AdventureCompletionResult, EndeavourWorld } from "../types/endeavour";

const storage = new LocalStorageAdapter();

/**
 * Islands that became playable since the child last looked at the map (e.g.
 * after finishing a game elsewhere). The first-ever visit just records the
 * baseline so nothing is celebrated for what was already open.
 */
function findNewlyUnlocked(profileId: string, adventures: Adventure[]): string | null {
  const key = `kalqy.endeavour.seen.${profileId}`;
  const seen = storage.get<string[]>(key);
  const unlocked = adventures.filter((a) => a.status !== "locked").map((a) => a.id);
  storage.set(key, unlocked);
  if (!seen) return null;
  return unlocked.find((id) => !seen.includes(id)) ?? null;
}

export type EndeavourStatus = "loading" | "ready" | "error";

/**
 * The current/next playable adventure is never flagged by the backend —
 * it's derived here as the first adventure that is in_progress, falling
 * back to the first available one. See PROMPT section 7.
 */
function deriveActiveAdventureId(adventures: Adventure[]): string | null {
  const inProgress = adventures.find((adventure) => adventure.status === "in_progress");
  if (inProgress) return inProgress.id;
  const available = adventures.find((adventure) => adventure.status === "available");
  return available?.id ?? null;
}

export function useEndeavourWorld(profileId: string | null) {
  const [world, setWorld] = useState<EndeavourWorld | null>(null);
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [status, setStatus] = useState<EndeavourStatus>("loading");
  const [justUnlockedId, setJustUnlockedId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!profileId) return;
    const requestId = ++requestIdRef.current;
    setStatus("loading");
    try {
      const response = await endeavourRepository.getWorld(profileId);
      if (requestId !== requestIdRef.current) return;
      setWorld(response.world);
      setAdventures(response.adventures);
      setJustUnlockedId(findNewlyUnlocked(profileId, response.adventures));
      setStatus("ready");
    } catch {
      if (requestId !== requestIdRef.current) return;
      setStatus("error");
    }
  }, [profileId]);

  useEffect(() => {
    load();
    return () => {
      requestIdRef.current++;
    };
  }, [load]);

  const completeAdventure = useCallback(
    async (adventureId: string, result: AdventureCompletionResult) => {
      if (!profileId) return;
      const previouslyLocked = new Set(
        adventures.filter((adventure) => adventure.status === "locked").map((adventure) => adventure.id)
      );

      const response = await endeavourRepository.completeAdventure(profileId, adventureId, result);
      setWorld(response.world);
      setAdventures(response.adventures);

      const newlyUnlocked = response.adventures.find(
        (adventure) => previouslyLocked.has(adventure.id) && adventure.status === "available"
      );
      if (newlyUnlocked) {
        setJustUnlockedId(newlyUnlocked.id);
      }
    },
    [profileId, adventures]
  );

  const clearJustUnlocked = useCallback(() => setJustUnlockedId(null), []);

  const activeAdventureId = useMemo(() => deriveActiveAdventureId(adventures), [adventures]);

  return {
    world,
    adventures,
    status,
    retry: load,
    activeAdventureId,
    justUnlockedId,
    clearJustUnlocked,
    completeAdventure,
  };
}
