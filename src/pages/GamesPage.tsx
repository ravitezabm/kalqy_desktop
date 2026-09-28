import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import { AppShell } from "../layouts/AppShell";
import { PrimaryButton } from "../components/PrimaryButton";
import { GameGrid } from "../features/games/components/GameGrid";
import { QuickSubjectFilters } from "../features/games/components/QuickSubjectFilters";
import { FilterPanel } from "../features/games/components/FilterPanel";
import { ActiveFilterChips } from "../features/games/components/ActiveFilterChips";
import { useGamesExplorer } from "../features/games/hooks/useGamesExplorer";
import { launchGame } from "../features/games/services/gameLaunchService";
import { SORT_OPTIONS } from "../features/games/types/game";
import type { Game, GameSortOption } from "../features/games/types/game";
import type { SubjectId } from "../features/games/types/taxonomy";
import { profileRepository } from "../features/profile/services/profileRepository";
import { useOnboarding } from "../context/OnboardingContext";
import type { Profile } from "../types/profile";
import styles from "./GamesPage.module.css";

export function GamesPage() {
  const navigate = useNavigate();
  const { activeProfileId } = useOnboarding();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const explorer = useGamesExplorer(activeProfileId);

  useEffect(() => {
    let cancelled = false;
    if (!activeProfileId) return;
    profileRepository.getProfile(activeProfileId).then((result) => {
      if (!cancelled) setProfile(result);
    });
    return () => {
      cancelled = true;
    };
  }, [activeProfileId]);

  const handleLaunch = useCallback(
    (game: Game) => {
      navigate(launchGame(game).route);
    },
    [navigate]
  );

  const hasQueryOrFilters = explorer.query.trim().length > 0 || explorer.activeFilterCount > 0;
  const resultLabel = hasQueryOrFilters
    ? `${explorer.games.length} ${explorer.games.length === 1 ? "game" : "games"} matching your filters`
    : `${explorer.games.length} ${explorer.games.length === 1 ? "game" : "games"}`;

  return (
    <AppShell profile={profile}>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>Games</h1>
            <p className={styles.subtitle}>Play, learn and grow with Kalqy and friends</p>
          </div>

          <div className={styles.controls}>
            <div className={styles.searchWrap}>
              <label className={styles.srOnly} htmlFor="games-search">
                Search games
              </label>
              <input
                id="games-search"
                type="search"
                className={styles.searchInput}
                placeholder="Search games..."
                value={explorer.query}
                onChange={(event) => explorer.setQuery(event.target.value)}
              />
              <Search className={styles.searchIcon} size={20} strokeWidth={1.8} aria-hidden="true" />
            </div>

            <div className={styles.sortWrap}>
              <label className={styles.srOnly} htmlFor="games-sort">
                Sort games
              </label>
              <select
                id="games-sort"
                className={styles.sortSelect}
                value={explorer.sort}
                onChange={(event) => explorer.setSort(event.target.value as GameSortOption)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    Sort by: {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className={styles.sortIcon} size={18} strokeWidth={2} aria-hidden="true" />
            </div>
          </div>
        </header>

        <div className={styles.filterRow}>
          <QuickSubjectFilters
            selected={explorer.filters.subjects}
            onSelect={(subjects: SubjectId[]) => explorer.setFilterGroup("subjects", subjects)}
          />

          <button
            type="button"
            className={styles.filtersButton}
            onClick={() => setFiltersOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal size={17} strokeWidth={2} aria-hidden="true" />
            Filters
            {explorer.activeFilterCount > 0 && (
              <span className={styles.filterCount}>{explorer.activeFilterCount}</span>
            )}
          </button>
        </div>

        <ActiveFilterChips
          filters={explorer.filters}
          onRemove={explorer.toggleFilter}
          onClear={explorer.clearFilters}
        />

        {explorer.status === "error" && (
          <div className={styles.errorState} role="alert">
            <p className={styles.errorTitle}>Something went wrong</p>
            <p className={styles.errorText}>We couldn&rsquo;t load the game library.</p>
            <PrimaryButton variant="purple" onClick={explorer.retry} className={styles.errorButton}>
              Try again
            </PrimaryButton>
          </div>
        )}

        {explorer.status === "loading" && (
          <div className={styles.skeletonGrid} role="status" aria-label="Loading games">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
              <span key={index} className={styles.skeletonCard} />
            ))}
          </div>
        )}

        {explorer.status === "ready" && (
          <section className={styles.results}>
            <div className={styles.resultsHeader}>
              <h2 className={styles.sectionTitle}>
                {hasQueryOrFilters ? "Results" : "Recommended for You"}
              </h2>
              <p className={styles.resultCount}>{resultLabel}</p>
            </div>

            <GameGrid
              games={hasQueryOrFilters ? explorer.games : explorer.recommended}
              onLaunch={handleLaunch}
              emptyActionLabel={explorer.activeFilterCount > 0 ? "Clear filters" : undefined}
              onEmptyAction={explorer.activeFilterCount > 0 ? explorer.clearFilters : undefined}
            />
          </section>
        )}

        {filtersOpen && (
          <FilterPanel
            filters={explorer.filters}
            activeCount={explorer.activeFilterCount}
            onToggle={explorer.toggleFilter}
            onClear={explorer.clearFilters}
            onClose={() => setFiltersOpen(false)}
          />
        )}
      </div>
    </AppShell>
  );
}
