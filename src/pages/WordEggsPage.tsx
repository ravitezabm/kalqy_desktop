import { StoryGamePage } from "../engine/game/StoryGamePage";
import { WORD_EGGS_DEFINITION } from "../games/word-eggs/definition";

export function WordEggsPage() {
  return <StoryGamePage definition={WORD_EGGS_DEFINITION} />;
}
