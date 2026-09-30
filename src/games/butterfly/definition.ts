import { TRACKING_PROFILES } from "../../engine/motion/TrackingProfiles";
import type { StoryGameDefinition } from "../../engine/game/StoryGame";
import { BUTTERFLY_ASSETS } from "./assets";
import { BUTTERFLY_LEVELS } from "./config/levels.config";
import { ButterflyGame, BUTTERFLY_GAME_ID } from "./ButterflyGame";
import { ButterflyPreloadScene } from "./ButterflyPreloadScene";

export const BUTTERFLY_DEFINITION: StoryGameDefinition = {
  gameId: BUTTERFLY_GAME_ID,
  route: "/games/butterfly-meadow",
  progressKey: "butterfly",
  levelIds: BUTTERFLY_LEVELS.map((level) => level.id),
  trackingProfile: TRACKING_PROFILES.HAND_BASIC,
  episodeVideo: BUTTERFLY_ASSETS.episodeVideo,
  musicTrack: BUTTERFLY_ASSETS.musicTrack,
  tip: "Hold the butterfly over the matching flower for 3 seconds.",
  readyIcon: "hand",
  copy: {
    loading: "Getting the meadow ready...",
    readyTitle: "Let’s get ready!",
    readyBody: "Show your hand to the camera",
    lostTitle: "Let’s get ready!",
    lostHint: "Show your hand to the camera",
    idleMessage: "Find the matching flower",
    trainingDoneTitle: "You did it!",
    trainingDoneBody: "You’re ready for the real levels.",
    storyDoneTitle: "Amazing!",
    storyDoneBody: "You helped the butterfly find all the flowers!",
    exitTitle: "Exit this level?",
  },
  headline: (progress) => `${progress.levelTitle} · Follow the butterfly!`,
  isTracked: (motion) => motion.hand("primary").visible,
  createScenes: ({ context, audio, onProgress, startIndex, onLoadError }) => {
    const game = new ButterflyGame(context, audio, onProgress, {
      config: BUTTERFLY_LEVELS[startIndex],
      index: startIndex,
      total: BUTTERFLY_LEVELS.length,
    });
    return { scenes: [new ButterflyPreloadScene(onLoadError), game], game };
  },
};
