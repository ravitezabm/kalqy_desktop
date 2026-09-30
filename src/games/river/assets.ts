const BASE = "/games/river";

/** Every River asset by ID — gameplay code never contains raw paths. */
export const RIVER_ASSETS = {
  images: {
    dryPlant: `${BASE}/dryplant.webp`,
    bloomedPlant: `${BASE}/bloomedplant.webp`,
    fire: `${BASE}/fire.webp`,
    forestFire: `${BASE}/forestfire.webp`,
    forest: `${BASE}/forest.webp`,
    thirstyBird: `${BASE}/thirstybird.webp`,
    happyBird: `${BASE}/not-thirstybird.webp`,
    thirstyHuman: `${BASE}/thirstyhuman.webp`,
    swimmingHuman: `${BASE}/notthirstyhuman.webp`,
    ice: `${BASE}/ice.webp`,
    leftBush: `${BASE}/left-bush.webp`,
    rightBush: `${BASE}/right-bush.webp`,
    background: `${BASE}/background.webp`,
  },
  atlases: {
    cloudIdle: { image: `${BASE}/cloud-idle.webp`, data: `${BASE}/cloud-idle.json` },
    cloudHappy: { image: `${BASE}/cloud-happy.webp`, data: `${BASE}/cloud-happy.json` },
    cloudFail: { image: `${BASE}/cloud-fail.webp`, data: `${BASE}/cloud-fail.json` },
    fishIdle: { image: `${BASE}/fish-idle.webp`, data: `${BASE}/fish-idle.json` },
    fishHappy: { image: `${BASE}/fish-win.webp`, data: `${BASE}/fish-win.json` },
    fishFail: { image: `${BASE}/fish-fail.webp`, data: `${BASE}/fish-fail.json` },
  },
  /** The first story episode is shared with Butterfly (swap the file to update both). */
  episodeVideo: "/games/butterfly/episode/episode1.mp4",
  /** Optional: drop a track here and it replaces the synthesized loop. */
  musicTrack: `${BASE}/audio/river-loop.mp3`,
} as const;

export type RiverImageId = keyof typeof RIVER_ASSETS.images;
export type RiverAtlasId = keyof typeof RIVER_ASSETS.atlases;
