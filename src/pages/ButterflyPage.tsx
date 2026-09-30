import { StoryGamePage } from "../engine/game/StoryGamePage";
import { BUTTERFLY_DEFINITION } from "../games/butterfly/definition";

export function ButterflyPage() {
  return <StoryGamePage definition={BUTTERFLY_DEFINITION} />;
}
