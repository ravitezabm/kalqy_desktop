import { X } from "lucide-react";
import { labelFor } from "../types/taxonomy";
import { FILTER_GROUPS } from "../types/game";
import type { GameFilterGroup, GameFilters } from "../types/game";
import styles from "./ActiveFilterChips.module.css";

interface ActiveFilterChipsProps {
  filters: GameFilters;
  onRemove: (group: GameFilterGroup, value: string) => void;
  onClear: () => void;
}

export function ActiveFilterChips({ filters, onRemove, onClear }: ActiveFilterChipsProps) {
  const chips = FILTER_GROUPS.flatMap((group) =>
    (filters[group] as string[]).map((value) => ({ group, value }))
  );

  if (chips.length === 0) return null;

  return (
    <div className={styles.row}>
      {chips.map(({ group, value }) => (
        <button
          key={`${group}:${value}`}
          type="button"
          className={styles.chip}
          onClick={() => onRemove(group, value)}
          aria-label={`Remove filter ${labelFor(value)}`}
        >
          {labelFor(value)}
          <X size={13} strokeWidth={2.4} aria-hidden="true" />
        </button>
      ))}

      <button type="button" className={styles.clear} onClick={onClear}>
        Clear all
      </button>
    </div>
  );
}
