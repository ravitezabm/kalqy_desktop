import { LayoutGrid, Type, Calculator, FlaskConical, Music, Palette, Leaf, HeartHandshake } from "lucide-react";
import { SUBJECTS } from "../types/taxonomy";
import type { SubjectId } from "../types/taxonomy";
import styles from "./QuickSubjectFilters.module.css";

/** Icon + tint per subject, keyed by canonical id. */
const SUBJECT_STYLE: Record<string, { icon: typeof Type; color: string; tint: string }> = {
  mathematics: { icon: Calculator, color: "#f2913d", tint: "#fdf0e3" },
  "english-literacy": { icon: Type, color: "#d95fb0", tint: "#fdeaf5" },
  science: { icon: FlaskConical, color: "#2f9e5f", tint: "#e4f6ea" },
  music: { icon: Music, color: "#4a7ae8", tint: "#e8eefd" },
  "art-creativity": { icon: Palette, color: "#e0479a", tint: "#fdeaf4" },
  "life-skills": { icon: Leaf, color: "#2f9ec0", tint: "#e4f4fa" },
  "social-emotional": { icon: HeartHandshake, color: "#8b5cf6", tint: "#efe9fd" },
};

interface QuickSubjectFiltersProps {
  selected: SubjectId[];
  onSelect: (subjects: SubjectId[]) => void;
}

/**
 * Shortcut row — a thin layer over the same subjects filter group the
 * advanced panel writes to, so the two always stay in sync.
 */
export function QuickSubjectFilters({ selected, onSelect }: QuickSubjectFiltersProps) {
  const allActive = selected.length === 0;

  return (
    <div className={styles.row} role="group" aria-label="Filter by subject">
      <button
        type="button"
        className={styles.pill}
        data-active={allActive}
        onClick={() => onSelect([])}
        aria-pressed={allActive}
      >
        <span className={styles.iconSlot} style={{ background: "#efe9fd", color: "#6d3fc7" }}>
          <LayoutGrid size={16} strokeWidth={2} aria-hidden="true" />
        </span>
        All
      </button>

      {SUBJECTS.map((subject) => {
        const style = SUBJECT_STYLE[subject.id];
        const Icon = style?.icon ?? Type;
        const isActive = selected.includes(subject.id);

        return (
          <button
            key={subject.id}
            type="button"
            className={styles.pill}
            data-active={isActive}
            onClick={() => onSelect(isActive ? [] : [subject.id])}
            aria-pressed={isActive}
          >
            <span
              className={styles.iconSlot}
              style={{ background: style?.tint ?? "#f1f1f6", color: style?.color ?? "#6f6f7d" }}
            >
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
            </span>
            {subject.label}
          </button>
        );
      })}
    </div>
  );
}
