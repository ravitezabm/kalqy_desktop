import { StoryGamePage } from "../engine/game/StoryGamePage";
import { RIVER_DEFINITION } from "../games/river/definition";

export function RiverPage() {
  return <StoryGamePage definition={RIVER_DEFINITION} />;
}
