import { TRACKING_PROFILES } from "../../engine/motion/TrackingProfiles";
import type { StoryGameDefinition } from "../../engine/game/StoryGame";
import { TABLA_ASSETS } from "./assets";
import { TABLA_INPUT, TABLA_LEVELS } from "./config/levels.config";
import { TablaPreloadScene } from "./TablaPreloadScene";
import { TablaRhythmGame, TABLA_GAME_ID } from "./TablaRhythmGame";

export const TABLA_DEFINITION: StoryGameDefinition = {
  gameId: TABLA_GAME_ID,
  route: "/games/tabla-festival",
  progressKey: "tabla-rhythm",
  levelIds: TABLA_LEVELS.map((level) => level.id),
  // One hand is enough (HAND_PRECISE tracks two if TABLA_INPUT.hands is set to 2). No body model.
  trackingProfile: TABLA_INPUT.hands === 2 ? TRACKING_PROFILES.HAND_PRECISE : TRACKING_PROFILES.HAND_BASIC,
  episodeVideo: TABLA_ASSETS.episodeVideo,
  musicTrack: TABLA_ASSETS.musicTrack,
  synthMusic: false,
  tip: "Listen carefully, then copy the beat!",
  readyIcon: "hand",
  copy: {
    loading: "Tuning the tablas...",
    readyTitle: "Let’s get ready!",
    readyBody: TABLA_INPUT.hands === 2 ? "Show both hands to the camera" : "Show your hand to the camera",
    lostTitle: "Show your hand!",
    lostHint: "Show your hand!",
    idleMessage: "Play the tabla with your hand",
    trainingDoneTitle: "Great rhythm!",
    trainingDoneBody: "You’re ready for the festival.",
    storyDoneTitle: "Rhythm Master!",
    storyDoneBody: "You played the whole festival!",
    exitTitle: "Leave the rhythm game?",
  },
  headline: (progress) => progress.headline ?? progress.levelTitle,
  isTracked: (motion) => (TABLA_INPUT.hands === 2 ? motion.hand("left").visible || motion.hand("right").visible : motion.hand("primary").visible),
  createScenes: ({ context, audio, onProgress, startIndex, onLoadError }) => {
    const game = new TablaRhythmGame(context, audio, onProgress, startIndex);
    return { scenes: [new TablaPreloadScene(audio, onLoadError), game], game };
  },
};
