export type AnalyticsEvent =
  | { name: "game_viewed"; gameId: string }
  | { name: "game_launched"; gameId: string }
  | { name: "search_performed"; query: string; resultCount: number }
  | { name: "filter_selected"; group: string; value: string }
  | { name: "filters_cleared" }
  | { name: "sort_changed"; sort: string }
  // In-game events. Never contains camera frames — gameplay metadata only.
  | { name: "game_started"; gameId: string }
  | { name: "episode_skipped"; gameId: string }
  | { name: "level_started"; gameId: string; levelId: string }
  | { name: "correct_match"; gameId: string; levelId: string }
  | { name: "wrong_match"; gameId: string; levelId: string }
  | { name: "level_completed"; gameId: string; levelId: string; stars: number; score: number }
  | { name: "level_failed"; gameId: string; levelId: string }
  | { name: "story_completed"; gameId: string }
  | { name: "camera_permission_denied"; gameId: string }
  | { name: "tracking_lost"; gameId: string }
  | { name: "tracking_recovered"; gameId: string }
  | { name: "game_paused"; gameId: string }
  | { name: "game_resumed"; gameId: string }
  | { name: "game_exited"; gameId: string; levelId: string };

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
