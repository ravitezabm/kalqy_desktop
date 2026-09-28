import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import {
  SUBJECTS,
  SKILLS,
  DEVELOPMENT_AREAS,
  GAME_TYPES,
  INPUT_TYPES,
  DIFFICULTIES,
  AGE_RANGES,
} from "../types/taxonomy";
import type { TaxonomyTerm } from "../types/taxonomy";
import type { GameFilterGroup, GameFilters } from "../types/game";
import styles from "./FilterPanel.module.css";

interface FilterSection {
  group: GameFilterGroup;
  title: string;
  terms: readonly TaxonomyTerm[];
}

/** Sections are generated from the taxonomy — no duplicated label strings. */
const SECTIONS: FilterSection[] = [
  { group: "subjects", title: "Subjects", terms: SUBJECTS },
  { group: "skills", title: "Learning Skills", terms: SKILLS },
  { group: "developmentAreas", title: "Development", terms: DEVELOPMENT_AREAS },
  { group: "gameTypes", title: "Game Type", terms: GAME_TYPES },
  { group: "inputTypes", title: "Input", terms: INPUT_TYPES },
  { group: "ageRanges", title: "Age", terms: AGE_RANGES },
  { group: "difficulties", title: "Difficulty", terms: DIFFICULTIES },
];

interface FilterPanelProps {
  filters: GameFilters;
  activeCount: number;
  onToggle: (group: GameFilterGroup, value: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function FilterPanel({ filters, activeCount, onToggle, onClear, onClose }: FilterPanelProps) {
  const reduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />

      <motion.aside
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Filter games"
        initial={{ opacity: 0, x: reduceMotion ? 0 : 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>Filters</h2>
          <div className={styles.headerActions}>
            {activeCount > 0 && (
              <button type="button" className={styles.clearButton} onClick={onClear}>
                Clear all
              </button>
            )}
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close filters"
            >
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className={styles.body}>
          {SECTIONS.map((section) => (
            <section key={section.group} className={styles.section}>
              <h3 className={styles.sectionTitle}>{section.title}</h3>
              <ul className={styles.options}>
                {section.terms.map((term) => {
                  const checked = (filters[section.group] as string[]).includes(term.id);
                  return (
                    <li key={term.id}>
                      <label className={styles.option}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={checked}
                          onChange={() => onToggle(section.group, term.id)}
                        />
                        <span>{term.label}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </motion.aside>
    </>
  );
}
