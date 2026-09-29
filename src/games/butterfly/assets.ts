const BASE = "/games/butterfly";

/**
 * Every Butterfly asset is referenced by ID from here — gameplay code never
 * contains raw paths (PROMPT section 35).
 */
export const BUTTERFLY_ASSETS = {
  images: {
    background: `${BASE}/background.webp`,
    tree: `${BASE}/tree.webp`,
    foreground: `${BASE}/foreground.webp`,
    flower: `${BASE}/flower.webp`,
    pot: `${BASE}/pot.webp`,
  },
  atlases: {
    kidIdle: { image: `${BASE}/kid-idle.webp`, data: `${BASE}/kid-idle.json` },
    kidWin: { image: `${BASE}/kid-win.webp`, data: `${BASE}/kid-win.json` },
    kidFail: { image: `${BASE}/kid-fail.webp`, data: `${BASE}/kid-fail.json` },
    butterfly: { image: `${BASE}/butterfly.webp`, data: `${BASE}/butterfly.json` },
  },
  episodeVideo: `${BASE}/episode/episode1.mp4`,
  /** Optional: drop a track here and it is used instead of the synthesized loop. */
  musicTrack: `${BASE}/audio/meadow-loop.mp3`,
} as const;

export type ImageId = keyof typeof BUTTERFLY_ASSETS.images;
export type AtlasId = keyof typeof BUTTERFLY_ASSETS.atlases;
