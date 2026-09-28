import { useCallback, useEffect, useMemo, useState } from "react";
import { buildSearchIndex, searchItems } from "../services/searchService";
import type { DashboardData, SearchableItem } from "../types/dashboard";

const DEBOUNCE_MS = 180;

export function useDashboardSearch(dashboard: DashboardData | null) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const index = useMemo(() => buildSearchIndex(dashboard), [dashboard]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => searchItems(index, debouncedQuery), [index, debouncedQuery]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [debouncedQuery]);

  const close = useCallback(() => setIsOpen(false), []);
  const open = useCallback(() => setIsOpen(true), []);

  const moveHighlight = useCallback(
    (delta: number) => {
      setHighlightedIndex((current) => {
        if (results.length === 0) return 0;
        return (current + delta + results.length) % results.length;
      });
    },
    [results.length]
  );

  const clear = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setIsOpen(false);
  }, []);

  const hasQuery = debouncedQuery.trim().length > 0;

  return {
    query,
    setQuery,
    results,
    hasQuery,
    isOpen: isOpen && hasQuery,
    open,
    close,
    clear,
    highlightedIndex,
    setHighlightedIndex,
    moveHighlight,
    highlightedItem: results[highlightedIndex] as SearchableItem | undefined,
  };
}
