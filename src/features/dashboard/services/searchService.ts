import { labelFor } from "../../games/types/taxonomy";
import type { DashboardData, Game, SearchableItem } from "../types/dashboard";

/** Endeavour content is not backed by a repository yet; keep it declarative. */
const ENDEAVOUR_ITEMS: SearchableItem[] = [
  {
    id: "endeavour-reading-quest",
    type: "endeavour",
    title: "Reading Quest",
    description: "Daily reading streak",
    route: "/endeavour",
  },
  {
    id: "endeavour-math-adventure",
    type: "endeavour",
    title: "Math Adventure",
    description: "Practice numbers and counting",
    route: "/endeavour",
  },
];

export function gameRoute(game: Pick<Game, "slug" | "route">): string {
  return game.route ?? `/games/${game.slug}`;
}

/** Builds the search index from whatever the repository returned. */
export function buildSearchIndex(dashboard: DashboardData | null): SearchableItem[] {
  if (!dashboard) return ENDEAVOUR_ITEMS;

  const games: SearchableItem[] = dashboard.continuePlaying.map((game) => ({
    id: `game-${game.id}`,
    type: "game",
    title: game.title,
    description: game.level !== undefined ? `Level ${game.level}` : game.description,
    category: labelFor(game.subjects[0] ?? ""),
    image: game.image,
    route: gameRoute(game),
  }));

  // Subjects double as searchable categories, linking into the Games explorer.
  const categories: SearchableItem[] = Array.from(
    new Set(dashboard.continuePlaying.flatMap((game) => game.subjects))
  ).map((subjectId) => ({
    id: `category-${subjectId}`,
    type: "category",
    title: labelFor(subjectId),
    description: "Subject",
    route: `/games?subject=${encodeURIComponent(subjectId)}`,
  }));

  const challenge: SearchableItem[] = dashboard.dailyChallenge
    ? [
        {
          id: `challenge-${dashboard.dailyChallenge.id}`,
          type: "endeavour",
          title: dashboard.dailyChallenge.title,
          description: "Daily Challenge",
          route: dashboard.dailyChallenge.gameId
            ? `/games/${dashboard.dailyChallenge.gameId}`
            : "/endeavour",
        },
      ]
    : [];

  return [...games, ...categories, ...challenge, ...ENDEAVOUR_ITEMS];
}

/**
 * Case-insensitive, trimmed substring match across the structured fields.
 * Title matches rank above category/description matches.
 */
export function searchItems(index: SearchableItem[], rawQuery: string): SearchableItem[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const scored: { item: SearchableItem; score: number }[] = [];

  for (const item of index) {
    const title = item.title.toLowerCase();
    const category = item.category?.toLowerCase() ?? "";
    const description = item.description?.toLowerCase() ?? "";

    let score = -1;
    if (title.startsWith(query)) score = 0;
    else if (title.includes(query)) score = 1;
    else if (category.includes(query)) score = 2;
    else if (description.includes(query)) score = 3;

    if (score >= 0) scored.push({ item, score });
  }

  return scored.sort((a, b) => a.score - b.score).map((entry) => entry.item);
}
