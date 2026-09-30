import { TRACKING_PROFILES } from "../../engine/motion/TrackingProfiles";
import type { StoryGameDefinition } from "../../engine/game/StoryGame";
import { MARKET_ASSETS } from "./assets";
import { MARKET_BODY_CONFIG } from "./bodyConfig";
import { MARKET_LEVELS } from "./config/levels.config";
import { MarketCatchGame, MARKET_GAME_ID } from "./MarketCatchGame";
import { MarketPreloadScene } from "./MarketPreloadScene";

export const MARKET_DEFINITION: StoryGameDefinition = {
  gameId: MARKET_GAME_ID,
  route: "/games/market-catch",
  progressKey: "market-catch",
  levelIds: MARKET_LEVELS.map((level) => level.id),
  trackingProfile: TRACKING_PROFILES.BODY_MOTION,
  bodyConfig: MARKET_BODY_CONFIG,
  episodeVideo: MARKET_ASSETS.episodeVideo,
  musicTrack: MARKET_ASSETS.musicTrack,
  tip: "Move left and right to catch the fruit!",
  readyIcon: "body",
  phaserConfig: { physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } } },
  copy: {
    loading: "Opening the market...",
    readyTitle: "Let’s get ready!",
    readyBody: "Stand where I can see you",
    lostTitle: "Come back into view!",
    lostHint: "Come back into view!",
    idleMessage: "Move your body to catch the fruit",
    trainingDoneTitle: "Great catch!",
    trainingDoneBody: "You’re ready for the market.",
    storyDoneTitle: "Market Master!",
    storyDoneBody: "You caught every fruit!",
    exitTitle: "Leave the market?",
  },
  headline: (progress) => progress.headline ?? progress.levelTitle,
  isTracked: (motion) => motion.body().visible,
  createScenes: ({ context, audio, onProgress, startIndex, onLoadError }) => {
    const game = new MarketCatchGame(context, audio, onProgress, startIndex);
    return { scenes: [new MarketPreloadScene(onLoadError), game], game };
  },
};
