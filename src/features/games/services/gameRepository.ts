import { GAME_CATALOG } from "../data/gameCatalog";
import { searchGames } from "./searchEngine";
import {
  SUBJECTS,
  SKILLS,
  DEVELOPMENT_AREAS,
  GAME_TYPES,
  INPUT_TYPES,
  DIFFICULTIES,
  AGE_RANGES,
} from "../types/taxonomy";
import type { TaxonomyTerm, AgeRangeTerm } from "../types/taxonomy";
import type { Game } from "../types/game";

export interface GameTaxonomy {
  subjects: readonly TaxonomyTerm[];
  skills: readonly TaxonomyTerm[];
  developmentAreas: readonly TaxonomyTerm[];
  gameTypes: readonly TaxonomyTerm[];
  inputTypes: readonly TaxonomyTerm[];
  difficulties: readonly TaxonomyTerm[];
  ageRanges: readonly AgeRangeTerm[];
}

export interface GameRepository {
  getGames(): Promise<Game[]>;
  getGame(idOrSlug: string): Promise<Game | null>;
  searchGames(query: string): Promise<Game[]>;
  getTaxonomy(): Promise<GameTaxonomy>;
}

const NETWORK_DELAY_MS = 300;

const delay = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

/**
 * Local implementation. Filtering/sorting currently happens client-side in
 * the explorer hook; when the backend grows query support the same
 * interface can forward to GET /games?subject=…&development=… instead.
 */
export const localGameRepository: GameRepository = {
  async getGames() {
    await delay();
    return GAME_CATALOG;
  },

  async getGame(idOrSlug) {
    await delay();
    return GAME_CATALOG.find((game) => game.id === idOrSlug || game.slug === idOrSlug) ?? null;
  },

  async searchGames(query) {
    await delay();
    return searchGames(GAME_CATALOG, query);
  },

  async getTaxonomy() {
    return {
      subjects: SUBJECTS,
      skills: SKILLS,
      developmentAreas: DEVELOPMENT_AREAS,
      gameTypes: GAME_TYPES,
      inputTypes: INPUT_TYPES,
      difficulties: DIFFICULTIES,
      ageRanges: AGE_RANGES,
    };
  },
};

/** Single swap point — replace with ApiGameRepository when the API lands. */
export const gameRepository: GameRepository = localGameRepository;
