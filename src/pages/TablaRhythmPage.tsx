import { StoryGamePage } from "../engine/game/StoryGamePage";
import { TABLA_DEFINITION } from "../games/tabla-rhythm/definition";

export function TablaRhythmPage() {
  return <StoryGamePage definition={TABLA_DEFINITION} />;
}
