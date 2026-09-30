import { StoryGamePage } from "../engine/game/StoryGamePage";
import { MARKET_DEFINITION } from "../games/market-catch/definition";

export function MarketCatchPage() {
  return <StoryGamePage definition={MARKET_DEFINITION} />;
}
