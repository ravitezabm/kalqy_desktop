const BASE = "/games/market-catch";

export const FRUIT_IDS = ["apple", "orange", "banana", "watermelon", "strawberry", "coconut", "pear", "grape"] as const;
export type FruitId = (typeof FRUIT_IDS)[number];

const fruitImages: Record<string, string> = {};
for (const fruit of FRUIT_IDS) for (const variant of ["fresh", "rotten"]) fruitImages[`${fruit}_${variant}`] = `${BASE}/fruits/${fruit}_${variant}.webp`;

const atlas = (name: string) => ({ image: `${BASE}/characters/${name}.webp`, data: `${BASE}/characters/${name}.json` });

/** Every Market Catch asset by ID — gameplay code never contains raw paths. */
export const MARKET_ASSETS = {
  images: { background: `${BASE}/background.webp` },
  /** Texture key is `fruit_<id>`. */
  fruits: fruitImages,
  atlases: {
    kidLeft: atlas("kid-left"),
    kidRight: atlas("kid-right"),
    kidWin: atlas("kid-win"),
    kidFail: atlas("kid-fail"),
    lionIdle: atlas("lion-idle"),
    lionWin: atlas("lion-win"),
    lionFail: atlas("lion-fail"),
    turtleIdle: atlas("turtle-idle"),
    turtleWin: atlas("turtle-win"),
    turtleFail: atlas("turtle-fail"),
  },
  /** The first story episode is shared with Butterfly and River. */
  episodeVideo: "/games/butterfly/episode/episode1.mp4",
  /** Optional: drop a track here and it replaces the synthesized loop. */
  musicTrack: `${BASE}/audio/market-loop.mp3`,
} as const;
