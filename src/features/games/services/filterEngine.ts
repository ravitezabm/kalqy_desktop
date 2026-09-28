import { ageRangeById } from "../types/taxonomy";
import type { Game, GameFilters } from "../types/game";

/** True when any selected value is present on the game (OR within a group). */
function matchesGroup(selected: string[], gameValues: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((value) => gameValues.includes(value));
}

/** A game matches an age filter when the ranges overlap at all. */
function matchesAge(selectedAgeRangeIds: string[], game: Game): boolean {
  if (selectedAgeRangeIds.length === 0) return true;

  return selectedAgeRangeIds.some((id) => {
    const range = ageRangeById(id);
    if (!range) return false;
    return range.min <= game.ageRange.max && range.max >= game.ageRange.min;
  });
}

/**
 * Pure filter engine.
 *
 * Semantics: OR *within* a filter group, AND *between* groups. So
 * subjects [mathematics, science] + developmentAreas [motor-skills] means
 * (Mathematics OR Science) AND (Motor Skills).
 */
export function filterGames(games: Game[], filters: GameFilters): Game[] {
  return games.filter(
    (game) =>
      matchesGroup(filters.subjects, game.subjects) &&
      matchesGroup(filters.skills, game.skills) &&
      matchesGroup(filters.developmentAreas, game.developmentAreas) &&
      matchesGroup(filters.gameTypes, game.gameTypes) &&
      matchesGroup(filters.inputTypes, game.inputTypes) &&
      matchesGroup(filters.difficulties, [game.difficulty]) &&
      matchesAge(filters.ageRanges, game)
  );
}
