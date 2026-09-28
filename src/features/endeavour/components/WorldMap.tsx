import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { WorldBackground } from "./WorldBackground";
import { WorldPath } from "./WorldPath";
import { AdventureIsland } from "./AdventureIsland";
import { AdventureTooltip } from "./AdventureTooltip";
import { AdventureContinueOverlay } from "./AdventureContinueOverlay";
import { WorldLoading } from "./WorldLoading";
import { WorldError } from "./WorldError";
import type { Adventure, EndeavourWorld } from "../types/endeavour";
import styles from "./WorldMap.module.css";

interface WorldMapProps {
  world: EndeavourWorld | null;
  adventures: Adventure[];
  status: "loading" | "ready" | "error";
  activeAdventureId: string | null;
  justUnlockedId: string | null;
  reduceMotion: boolean;
  onRetry: () => void;
  onSelectAdventure: (adventure: Adventure) => void;
}

const LOCKED_TOOLTIP_TIMEOUT_MS = 2600;

/**
 * Composes the whole world: background, path, every island, the continue
 * overlay and the lightweight locked-island tooltip. This is the only place
 * that turns a click into "open / continue / replay / explain" — see PROMPT
 * section 10. Nothing here is specific to any one adventure.
 */
export function WorldMap({
  world,
  adventures,
  status,
  activeAdventureId,
  justUnlockedId,
  reduceMotion,
  onRetry,
  onSelectAdventure,
}: WorldMapProps) {
  const [lockedTooltipId, setLockedTooltipId] = useState<string | null>(null);

  useEffect(() => {
    if (!lockedTooltipId) return;
    const timeout = window.setTimeout(() => setLockedTooltipId(null), LOCKED_TOOLTIP_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [lockedTooltipId]);

  const byId = useMemo(() => new Map(adventures.map((adventure) => [adventure.id, adventure])), [adventures]);
  const inProgress = adventures.find((adventure) => adventure.status === "in_progress") ?? null;
  const lockedTooltipAdventure = lockedTooltipId ? byId.get(lockedTooltipId) ?? null : null;

  const handleSelect = (adventure: Adventure) => {
    if (adventure.status === "locked") {
      setLockedTooltipId(adventure.id);
      return;
    }
    setLockedTooltipId(null);
    onSelectAdventure(adventure);
  };

  return (
    <div className={styles.stage}>
      {world && <WorldBackground src={world.backgroundImage} />}

      {status === "ready" && (
        <>
          <WorldPath adventures={adventures} />

          {adventures.map((adventure) => (
            <AdventureIsland
              key={adventure.id}
              adventure={adventure}
              highlighted={adventure.id === activeAdventureId}
              justUnlocked={adventure.id === justUnlockedId}
              reduceMotion={reduceMotion}
              onSelect={handleSelect}
            />
          ))}

          <AnimatePresence>
            {lockedTooltipAdventure && (
              <AdventureTooltip
                key={lockedTooltipAdventure.id}
                adventure={lockedTooltipAdventure}
                requiredTitle={
                  lockedTooltipAdventure.requiredAdventureId
                    ? byId.get(lockedTooltipAdventure.requiredAdventureId)?.title ?? null
                    : null
                }
              />
            )}
          </AnimatePresence>

          {inProgress && <AdventureContinueOverlay adventure={inProgress} onContinue={onSelectAdventure} />}
        </>
      )}

      {status === "loading" && <WorldLoading />}
      {status === "error" && <WorldError onRetry={onRetry} />}
    </div>
  );
}
