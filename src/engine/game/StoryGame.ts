import type Phaser from "phaser";
import type { GameContext, GameProgress } from "../core/KalqyGame";
import type { AudioManager } from "../audio/AudioManager";
import type { MotionEngine } from "../motion/MotionEngine";
import type { TrackingProfile } from "../motion/TrackingProfiles";
import type { BodyMotionConfig } from "../motion/body/BodyAnalyzer";

/** What StoryGamePage needs from a game's Phaser scene — every story game implements this. */
export interface StoryScene {
  /** Loads the level at `index` (0 = training) without reloading Phaser. */
  startLevelAt(index: number): void;
  setPaused(paused: boolean): void;
  getProgress(): GameProgress;
}

export interface StorySceneDeps {
  context: GameContext;
  audio: AudioManager;
  onProgress: (progress: GameProgress) => void;
  startIndex: number;
  onLoadError: (message: string) => void;
}

export interface StoryGameCopy {
  loading: string;
  readyTitle: string;
  readyBody: string;
  /** Popup title when the player drops out of view mid-level. */
  lostTitle: string;
  /** Shown in the HUD and prompt whenever the player isn't being tracked. */
  lostHint: string;
  idleMessage: string;
  trainingDoneTitle: string;
  trainingDoneBody: string;
  storyDoneTitle: string;
  storyDoneBody: string;
  exitTitle: string;
}

/**
 * Everything that makes one story game different from another. The page,
 * HUD, episode, pause/exit, persistence and Endeavour reporting are shared
 * (StoryGamePage) and driven from this.
 */
export interface StoryGameDefinition {
  gameId: string;
  route: string;
  progressKey: string;
  /** Ordered; index 0 is the training level. */
  levelIds: string[];
  trackingProfile: TrackingProfile;
  bodyConfig?: Partial<BodyMotionConfig>;
  episodeVideo: string;
  musicTrack: string;
  /** false: don't fall back to the generic synthesized loop when there's no track (a game that makes its own music). */
  synthMusic?: boolean;
  tip: string;
  copy: StoryGameCopy;
  readyIcon: "hand" | "body";
  /** Hide HUD parts a game doesn't use. Both default to shown. */
  hud?: { goals?: boolean; holdBar?: boolean };
  /** Extra Phaser config, e.g. Arcade physics for games that need it. */
  phaserConfig?: Partial<Phaser.Types.Core.GameConfig>;
  headline(progress: GameProgress): string;
  /** True while the game's tracker currently sees the player. */
  isTracked(motion: MotionEngine): boolean;
  createScenes(deps: StorySceneDeps): { scenes: Phaser.Scene[]; game: StoryScene };
}

export const TRAINING_INDEX = 0;
export const FIRST_STORY_INDEX = 1;
