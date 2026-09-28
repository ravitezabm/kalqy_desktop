import type { Game } from "../types/game";

export interface RecommendationService {
  getRecommended(games: Game[], profileId: string | null, limit?: number): Game[];
}

const DEFAULT_LIMIT = 8;

/**
 * Local strategy: featured games first, then most popular. A backend
 * recommender (learning analytics, age, recent play) can replace this
 * without the Games page changing.
 */
export const localRecommendationService: RecommendationService = {
  getRecommended(games, _profileId, limit = DEFAULT_LIMIT) {
    return [...games]
      .sort((a, b) => {
        const featured = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
        if (featured !== 0) return featured;
        return (b.popularity ?? 0) - (a.popularity ?? 0);
      })
      .slice(0, limit);
  },
};

export const recommendationService: RecommendationService = localRecommendationService;
