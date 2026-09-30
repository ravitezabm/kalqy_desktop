const BASE = "/games/word-eggs";

/** Every Word Eggs asset by ID — gameplay code never contains raw paths. */
export const WORD_EGGS_ASSETS = {
  images: {
    background: `${BASE}/background.webp`,
    tree: `${BASE}/tree.webp`,
    leafTopLeft: `${BASE}/leaf-left-top.webp`,
    leftBush: `${BASE}/left-bush.webp`,
    rightBush: `${BASE}/right-bush.webp`,
    rightBushMiddle: `${BASE}/right-bush-middle.webp`,
    nestBack: `${BASE}/nest-back.webp`,
    nestFront: `${BASE}/nest-front.webp`,
  },
  atlases: {
    birdIdle: { image: `${BASE}/bird-idle.webp`, data: `${BASE}/bird-idle.json` },
    birdWin: { image: `${BASE}/bird-win.webp`, data: `${BASE}/bird-win.json` },
    birdSad: { image: `${BASE}/bird-sad.webp`, data: `${BASE}/bird-sad.json` },
  },
  /** The first story episode is shared with Butterfly and River. */
  episodeVideo: "/games/butterfly/episode/episode1.mp4",
  musicTrack: `${BASE}/audio/forest-loop.mp3`,
} as const;
