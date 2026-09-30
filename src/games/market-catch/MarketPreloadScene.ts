import Phaser from "phaser";
import { MARKET_ASSETS } from "./assets";
import { fruitTexture } from "./objects";
import { createAtlasAnimation } from "../../engine/assets/atlasAnimations";
import { createEffectTextures } from "../../engine/vfx/effectTextures";

export const MARKET_PRELOAD_KEY = "MarketPreload";

type AtlasId = keyof typeof MARKET_ASSETS.atlases;
/** key, atlas, loops? — built once here, never per frame. */
const ANIMATIONS: { key: string; atlas: AtlasId; loop: boolean }[] = [
  { key: "kid-left", atlas: "kidLeft", loop: true },
  { key: "kid-right", atlas: "kidRight", loop: true },
  { key: "kid-win", atlas: "kidWin", loop: false },
  { key: "kid-fail", atlas: "kidFail", loop: false },
  { key: "lion-idle", atlas: "lionIdle", loop: true },
  { key: "lion-win", atlas: "lionWin", loop: false },
  { key: "lion-fail", atlas: "lionFail", loop: false },
  { key: "turtle-idle", atlas: "turtleIdle", loop: true },
  { key: "turtle-win", atlas: "turtleWin", loop: false },
  { key: "turtle-fail", atlas: "turtleFail", loop: false },
];

/** Loads every real Market Catch asset, builds the character animations once, then hands over to the game. */
export class MarketPreloadScene extends Phaser.Scene {
  constructor(private readonly onLoadError: (message: string) => void) {
    super(MARKET_PRELOAD_KEY);
  }

  preload(): void {
    const { width, height } = this.scale;
    const track = this.add.rectangle(width / 2, height / 2 + 60, 360, 10, 0xffffff, 0.25);
    const bar = this.add.rectangle(track.x - 180, track.y, 0, 10, 0xffc04d).setOrigin(0, 0.5);
    this.load.on("progress", (value: number) => {
      bar.width = 360 * value;
    });
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.error(`Market asset failed to load: ${file.key} (${file.url})`);
      this.onLoadError(`Could not load ${file.key}`);
    });

    for (const [id, url] of Object.entries(MARKET_ASSETS.images)) this.load.image(id, url);
    for (const [id, url] of Object.entries(MARKET_ASSETS.fruits)) this.load.image(fruitTexture(id), url);
    for (const [id, atlas] of Object.entries(MARKET_ASSETS.atlases)) {
      this.load.atlas(id, atlas.image, atlas.data);
      this.load.json(`${id}-data`, atlas.data);
    }
  }

  create(): void {
    createEffectTextures(this.textures);
    for (const { key, atlas, loop } of ANIMATIONS) createAtlasAnimation(this, key, atlas, `${atlas}-data`, loop);
    // The kid stands still on the first frame of the walk cycle.
    if (!this.anims.exists("kid-idle")) this.anims.create({ key: "kid-idle", frames: [{ key: "kidLeft", frame: "frame_000" }], frameRate: 1, repeat: -1 });
    this.scene.start("MarketCatchGame");
  }
}
