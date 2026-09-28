import { analytics } from "./analytics";
import type { Game } from "../types/game";

export interface LaunchTarget {
  route: string;
}

export function gameRoute(game: Pick<Game, "slug" | "route">): string {
  return game.route ?? `/games/${game.slug}`;
}

/**
 * Single entry point for "open this game". Today every game resolves to an
 * in-app route; later this can hand off to a local game runtime without
 * callers changing.
 */
export function launchGame(game: Game): LaunchTarget {
  analytics.track({ name: "game_launched", gameId: game.id });
  return { route: gameRoute(game) };
}

export function launchGameById(gameId: string): LaunchTarget {
  analytics.track({ name: "game_launched", gameId });
  return { route: `/games/${gameId}` };
}
