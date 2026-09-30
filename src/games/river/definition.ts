import { TRACKING_PROFILES } from "../../engine/motion/TrackingProfiles";
import type { StoryGameDefinition } from "../../engine/game/StoryGame";
import { RIVER_ASSETS } from "./assets";
import { RIVER_BODY_CONFIG } from "./bodyConfig";
import { RIVER_LEVELS } from "./config/levels.config";
import { RiverGame, RIVER_GAME_ID } from "./RiverGame";
import { RiverPreloadScene } from "./RiverPreloadScene";

export const RIVER_DEFINITION: StoryGameDefinition = {
  gameId: RIVER_GAME_ID,
  route: "/games/river-adventure",
  progressKey: "river",
  levelIds: RIVER_LEVELS.map((level) => level.id),
  trackingProfile: TRACKING_PROFILES.BODY_MOTION,
  bodyConfig: RIVER_BODY_CONFIG,
  episodeVideo: RIVER_ASSETS.episodeVideo,
  musicTrack: RIVER_ASSETS.musicTrack,
  tip: "Lean or step left and right to steer the rain cloud, then hold it over the right spot.",
  readyIcon: "body",
  copy: {
    loading: "Getting the river ready...",
    readyTitle: "Let’s get ready!",
    readyBody: "Stand where I can see you",
    lostTitle: "Come back into view!",
    lostHint: "Come back into view!",
    idleMessage: "Move to steer the rain",
    trainingDoneTitle: "Great moves!",
    trainingDoneBody: "You’re ready to help the river.",
    storyDoneTitle: "Wonderful!",
    storyDoneBody: "You helped everyone!",
    exitTitle: "Exit this adventure?",
  },
  headline: (progress) => progress.headline ?? progress.levelTitle,
  isTracked: (motion) => motion.body().visible,
  createScenes: ({ context, audio, onProgress, startIndex, onLoadError }) => {
    const game = new RiverGame(context, audio, onProgress, startIndex);
    return { scenes: [new RiverPreloadScene(onLoadError), game], game };
  },
};
