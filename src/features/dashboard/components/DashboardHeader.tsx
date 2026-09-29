import { useId, useRef } from "react";
import type { KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { SearchResults } from "./SearchResults";
import type { SearchableItem } from "../types/dashboard";
import type { Profile } from "../../../types/profile";
import styles from "./DashboardHeader.module.css";

interface DashboardHeaderProps {
  profile: Profile | null;
  search: {
    query: string;
    setQuery: (value: string) => void;
    results: SearchableItem[];
    isOpen: boolean;
    open: () => void;
    close: () => void;
    highlightedIndex: number;
    setHighlightedIndex: (index: number) => void;
    moveHighlight: (delta: number) => void;
    highlightedItem: SearchableItem | undefined;
  };
  onSelectResult: (item: SearchableItem) => void;
}

export function DashboardHeader({ profile, search, onSelectResult }: DashboardHeaderProps) {
  const inputId = useId();
  const listId = `${inputId}-results`;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      search.close();
      inputRef.current?.blur();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      search.open();
      search.moveHighlight(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      search.moveHighlight(-1);
      return;
    }
    if (event.key === "Enter") {
      if (search.highlightedItem) {
        event.preventDefault();
        onSelectResult(search.highlightedItem);
      }
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.greetingBlock}>
        <h1 className={styles.greeting}>Hello , {profile?.name ?? "there"} !</h1>
        <p className={styles.subtitle}>Ready for today&rsquo;s adventure ?</p>
      </div>

      <div className={styles.searchArea}>
        <div className={styles.searchWrap}>
          <label className={styles.srOnly} htmlFor={inputId}>
            Search games and adventures
          </label>
          <input
            id={inputId}
            ref={inputRef}
            type="search"
            className={styles.searchInput}
            placeholder="Search games, adventures..."
            value={search.query}
            onChange={(event) => {
              search.setQuery(event.target.value);
              search.open();
            }}
            onFocus={search.open}
            onBlur={search.close}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={search.isOpen}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              search.isOpen && search.results.length > 0
                ? `${listId}-option-${search.highlightedIndex}`
                : undefined
            }
          />
          <Search className={styles.searchIcon} size={20} strokeWidth={1.8} aria-hidden="true" />

          {search.isOpen && (
            <SearchResults
              results={search.results}
              highlightedIndex={search.highlightedIndex}
              onHighlight={search.setHighlightedIndex}
              onSelect={onSelectResult}
              listId={listId}
            />
          )}
        </div>

        {profile && <img className={styles.headerAvatar} src={profile.image} alt="" />}
      </div>
    </header>
  );
}
