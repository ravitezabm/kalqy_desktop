import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { gameRepository } from "../services/gameRepository";
import { filterGames } from "../services/filterEngine";
import { searchGames } from "../services/searchEngine";
import { sortGames } from "../services/sortEngine";
import { recommendationService } from "../services/recommendationService";
import { analytics } from "../services/analytics";
import { EMPTY_FILTERS, FILTER_GROUPS, countActiveFilters } from "../types/game";
import type { Game, GameFilterGroup, GameFilters, GameSortOption } from "../types/game";

const SEARCH_DEBOUNCE_MS = 200;

/** Query-param key per filter group, so /games?subject=…&development=… works. */
const PARAM_KEYS: Record<GameFilterGroup, string> = {
  subjects: "subject",
  skills: "skill",
  developmentAreas: "development",
  gameTypes: "type",
  inputTypes: "input",
  ageRanges: "age",
  difficulties: "difficulty",
};

function filtersFromParams(params: URLSearchParams): GameFilters {
  const next = { ...EMPTY_FILTERS };
  for (const group of FILTER_GROUPS) {
    const raw = params.get(PARAM_KEYS[group]);
    next[group] = raw ? (raw.split(",").filter(Boolean) as never[]) : [];
  }
  return next;
}

export type GamesStatus = "loading" | "ready" | "error";

export function useGamesExplorer(profileId: string | null) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [allGames, setAllGames] = useState<Game[]>([]);
  const [status, setStatus] = useState<GamesStatus>("loading");

  const query = searchParams.get("q") ?? "";
  const sort = (searchParams.get("sort") as GameSortOption) || "popular";
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);

  const [queryDraft, setQueryDraft] = useState(query);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const games = await gameRepository.getGames();
      setAllGames(games);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce typing, then push the settled value into the URL.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(queryDraft), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [queryDraft]);

  useEffect(() => {
    if (debouncedQuery === query) return;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (debouncedQuery.trim()) next.set("q", debouncedQuery);
        else next.delete("q");
        return next;
      },
      { replace: true }
    );
  }, [debouncedQuery, query, setSearchParams]);

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          mutate(next);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setFilterGroup = useCallback(
    (group: GameFilterGroup, values: string[]) => {
      updateParams((params) => {
        if (values.length > 0) params.set(PARAM_KEYS[group], values.join(","));
        else params.delete(PARAM_KEYS[group]);
      });
    },
    [updateParams]
  );

  const toggleFilter = useCallback(
    (group: GameFilterGroup, value: string) => {
      const current = filters[group] as string[];
      const isRemoving = current.includes(value);
      const next = isRemoving ? current.filter((item) => item !== value) : [...current, value];
      if (!isRemoving) analytics.track({ name: "filter_selected", group, value });
      setFilterGroup(group, next);
    },
    [filters, setFilterGroup]
  );

  const clearFilters = useCallback(() => {
    analytics.track({ name: "filters_cleared" });
    updateParams((params) => {
      for (const group of FILTER_GROUPS) params.delete(PARAM_KEYS[group]);
    });
  }, [updateParams]);

  const setSort = useCallback(
    (option: GameSortOption) => {
      analytics.track({ name: "sort_changed", sort: option });
      updateParams((params) => params.set("sort", option));
    },
    [updateParams]
  );

  /** backend games → search → filters → sort → render */
  const visibleGames = useMemo(() => {
    const searched = searchGames(allGames, debouncedQuery);
    const filtered = filterGames(searched, filters);
    return sortGames(filtered, sort);
  }, [allGames, debouncedQuery, filters, sort]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      analytics.track({
        name: "search_performed",
        query: debouncedQuery,
        resultCount: visibleGames.length,
      });
    }
    // Only report when the settled query changes, not on every recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const recommended = useMemo(
    () => recommendationService.getRecommended(visibleGames, profileId),
    [visibleGames, profileId]
  );

  return {
    status,
    retry: load,
    allGames,
    games: visibleGames,
    recommended,
    query: queryDraft,
    setQuery: setQueryDraft,
    filters,
    toggleFilter,
    setFilterGroup,
    clearFilters,
    activeFilterCount: countActiveFilters(filters),
    sort,
    setSort,
  };
}
