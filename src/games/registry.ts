import type { StoryGameDefinition } from "../engine/game/StoryGame";
import { BUTTERFLY_DEFINITION } from "./butterfly/definition";
import { MARKET_DEFINITION } from "./market-catch/definition";
import { RIVER_DEFINITION } from "./river/definition";
import { TABLA_DEFINITION } from "./tabla-rhythm/definition";
import { WORD_EGGS_DEFINITION } from "./word-eggs/definition";

/** Every playable story game, by route slug. Launching a game = looking up its definition. */
export const GAME_REGISTRY: Record<string, StoryGameDefinition> = {
  "butterfly-meadow": BUTTERFLY_DEFINITION,
  "river-adventure": RIVER_DEFINITION,
  "word-eggs": WORD_EGGS_DEFINITION,
  "market-catch": MARKET_DEFINITION,
  "tabla-rhythm": TABLA_DEFINITION,
};
