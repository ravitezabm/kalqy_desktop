import { motion, useReducedMotion } from "framer-motion";
import { Gamepad2, Tag, Compass } from "lucide-react";
import type { SearchableItem, SearchableItemType } from "../types/dashboard";
import styles from "./SearchResults.module.css";

const TYPE_LABEL: Record<SearchableItemType, string> = {
  game: "Games",
  category: "Categories",
  endeavour: "Endeavour",
};

const TYPE_ICON = {
  game: Gamepad2,
  category: Tag,
  endeavour: Compass,
} as const;

interface SearchResultsProps {
  results: SearchableItem[];
  highlightedIndex: number;
  onHighlight: (index: number) => void;
  onSelect: (item: SearchableItem) => void;
  listId: string;
}

export function SearchResults({
  results,
  highlightedIndex,
  onHighlight,
  onSelect,
  listId,
}: SearchResultsProps) {
  const reduceMotion = Boolean(useReducedMotion());

  const groups = results.reduce<Record<string, { item: SearchableItem; index: number }[]>>(
    (acc, item, index) => {
      const key = item.type;
      (acc[key] ??= []).push({ item, index });
      return acc;
    },
    {}
  );

  return (
    <motion.div
      className={styles.panel}
      initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      {results.length === 0 ? (
        <p className={styles.empty}>No results found</p>
      ) : (
        <ul className={styles.list} id={listId} role="listbox">
          {Object.entries(groups).map(([type, entries]) => (
            <li key={type} className={styles.group}>
              <p className={styles.groupLabel}>{TYPE_LABEL[type as SearchableItemType]}</p>
              <ul className={styles.groupList}>
                {entries.map(({ item, index }) => {
                  const Icon = TYPE_ICON[item.type];
                  const isHighlighted = index === highlightedIndex;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        id={`${listId}-option-${index}`}
                        role="option"
                        aria-selected={isHighlighted}
                        className={styles.result}
                        data-highlighted={isHighlighted}
                        onMouseEnter={() => onHighlight(index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onSelect(item)}
                      >
                        <span className={styles.resultIcon}>
                          <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                        </span>
                        <span className={styles.resultText}>
                          <span className={styles.resultTitle}>{item.title}</span>
                          {(item.category || item.description) && (
                            <span className={styles.resultMeta}>{item.category ?? item.description}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
