export type AnalyticsEvent =
  | { name: "game_viewed"; gameId: string }
  | { name: "game_launched"; gameId: string }
  | { name: "search_performed"; query: string; resultCount: number }
  | { name: "filter_selected"; group: string; value: string }
  | { name: "filters_cleared" }
  | { name: "sort_changed"; sort: string };

export interface AnalyticsSink {
  track(event: AnalyticsEvent): void;
}

/**
 * Thin seam so the Games screen can emit product events today without
 * pulling in a third-party provider. Swap the sink for a real one later.
 */
const noopSink: AnalyticsSink = {
  track() {
    /* intentionally does nothing until a provider is chosen */
  },
};

export const analytics: AnalyticsSink = noopSink;
