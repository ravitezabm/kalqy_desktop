import type { Game, GameSortOption } from "../types/game";

const DIFFICULTY_ORDER: Record<string, number> = {
  beginner: 0,
  easy: 1,
  medium: 2,
  advanced: 3,
};

/** Pure, non-mutating sort — always returns a new array. */
export function sortGames(games: Game[], option: GameSortOption): Game[] {
  const sorted = [...games];

  switch (option) {
    case "popular":
      return sorted.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    case "recent":
      return sorted.sort(
        (a, b) => new Date(b.addedAt ?? 0).getTime() - new Date(a.addedAt ?? 0).getTime()
      );
    case "a-z":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "progress":
      return sorted.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
    case "difficulty":
      return sorted.sort(
        (a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 0) - (DIFFICULTY_ORDER[b.difficulty] ?? 0)
      );
    default:
      return sorted;
  }
}
