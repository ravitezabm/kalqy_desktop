import { TRACKING_PROFILES } from "../../engine/motion/TrackingProfiles";
import type { StoryGameDefinition } from "../../engine/game/StoryGame";
import { WORD_EGGS_ASSETS } from "./assets";
import { WORD_EGGS_LEVELS } from "./config/levels.config";
import { WordEggsGame, WORD_EGGS_GAME_ID } from "./WordEggsGame";
import { WordEggsPreloadScene } from "./WordEggsPreloadScene";

/** `?seed=123` (dev only) replays the exact same words and egg layout — for reproducing a bug. */
function devSeed(): number | undefined {
  if (!import.meta.env.DEV) return undefined;
  const raw = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("seed");
  const seed = raw === null ? NaN : Number(raw);
  return Number.isFinite(seed) ? seed : undefined;
}

export const WORD_EGGS_DEFINITION: StoryGameDefinition = {
  gameId: WORD_EGGS_GAME_ID,
  route: "/games/word-eggs",
  progressKey: "word-eggs",
  levelIds: WORD_EGGS_LEVELS.map((level) => level.id),
  trackingProfile: TRACKING_PROFILES.HAND_BASIC,
  episodeVideo: WORD_EGGS_ASSETS.episodeVideo,
  musicTrack: WORD_EGGS_ASSETS.musicTrack,
  tip: "Drag the correct egg to the empty nest to complete the word!",
  readyIcon: "hand",
  hud: { goals: false, holdBar: false },
  phaserConfig: { physics: { default: "arcade", arcade: { gravity: { x: 0, y: 900 }, debug: false } } },
  copy: {
    loading: "Getting the forest ready...",
    readyTitle: "Let’s get ready!",
    readyBody: "Show your hand to the camera",
    lostTitle: "Let’s get ready!",
    lostHint: "Show your hand to the camera",
    idleMessage: "Drag the egg to the nest",
    trainingDoneTitle: "You did it!",
    trainingDoneBody: "You’re ready for the real words.",
    storyDoneTitle: "Wonderful!",
    storyDoneBody: "You completed every word!",
    exitTitle: "Exit this level?",
  },
  headline: (progress) => progress.headline ?? progress.levelTitle,
  isTracked: (motion) => motion.hand("primary").visible,
  createScenes: ({ context, audio, onProgress, startIndex, onLoadError }) => {
    const game = new WordEggsGame(context, audio, onProgress, startIndex, devSeed());
    return { scenes: [new WordEggsPreloadScene(onLoadError), game], game };
  },
};
