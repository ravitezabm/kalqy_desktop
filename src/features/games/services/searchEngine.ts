import { labelFor } from "../types/taxonomy";
import type { Game } from "../types/game";

/**
 * Synonyms let natural words reach canonical taxonomy terms — "math" finds
 * Mathematics, "brain" finds cognitive/logic/memory games, "motor" finds
 * the motor-skill development areas.
 */
const SYNONYMS: Record<string, string[]> = {
  math: ["mathematics", "counting"],
  maths: ["mathematics", "counting"],
  literacy: ["english-literacy", "reading", "vocabulary", "language-development"],
  english: ["english-literacy", "reading", "vocabulary"],
  brain: ["cognitive-skills", "logic", "memory", "problem-solving", "brain-game", "reasoning"],
  motor: ["motor-skills", "fine-motor-skills", "gross-motor-skills", "hand-eye-coordination"],
  physical: ["physical-development", "gross-motor-skills", "full-body-movement", "movement"],
  spatial: ["spatial-awareness"],
  music: ["music", "rhythm"],
  art: ["art-creativity", "creativity", "creative-development"],
  movement: ["movement", "full-body-movement", "physical-development"],
  social: ["social-emotional", "social-skills", "communication"],
};

/** Every string a game should be findable by, lower-cased. */
function haystackFor(game: Game): string {
  const taxonomyIds = [
    ...game.subjects,
    ...game.skills,
    ...game.developmentAreas,
    ...game.gameTypes,
    ...game.inputTypes,
    game.difficulty,
  ];

  return [
    game.title,
    game.description,
    ...taxonomyIds,
    ...taxonomyIds.map(labelFor),
    `${game.ageRange.min}-${game.ageRange.max}`,
  ]
    .join(" ")
    .toLowerCase();
}

export function searchGames(games: Game[], rawQuery: string): Game[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return games;

  const terms = [query, ...(SYNONYMS[query] ?? [])];

  return games.filter((game) => {
    const haystack = haystackFor(game);
    return terms.some((term) => haystack.includes(term));
  });
}
