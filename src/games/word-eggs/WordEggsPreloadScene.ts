import Phaser from "phaser";
import { WORD_EGGS_ASSETS } from "./assets";
import { createAtlasAnimation } from "../../engine/assets/atlasAnimations";
import { createEffectTextures } from "../../engine/vfx/effectTextures";

export const WORD_EGGS_PRELOAD_KEY = "WordEggsPreload";

/** Loads every real Word Eggs asset, builds the bird animations once, waits for the game font, then starts the game. */
export class WordEggsPreloadScene extends Phaser.Scene {
  constructor(private readonly onLoadError: (message: string) => void) {
    super(WORD_EGGS_PRELOAD_KEY);
  }

  preload(): void {
    const { width, height } = this.scale;
    const track = this.add.rectangle(width / 2, height / 2 + 60, 360, 10, 0xffffff, 0.25);
    const bar = this.add.rectangle(track.x - 180, track.y, 0, 10, 0xffd166).setOrigin(0, 0.5);
    this.load.on("progress", (value: number) => {
      bar.width = 360 * value;
    });
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.error(`Word Eggs asset failed to load: ${file.key} (${file.url})`);
      this.onLoadError(`Could not load ${file.key}`);
    });

    for (const [id, url] of Object.entries(WORD_EGGS_ASSETS.images)) this.load.image(id, url);
    for (const [id, atlas] of Object.entries(WORD_EGGS_ASSETS.atlases)) {
      this.load.atlas(id, atlas.image, atlas.data);
      this.load.json(`${id}-data`, atlas.data);
    }
  }

  create(): void {
    createEffectTextures(this.textures);
    createAtlasAnimation(this, "bird-idle", "birdIdle", "birdIdle-data", true);
    createAtlasAnimation(this, "bird-win", "birdWin", "birdWin-data", false);
    createAtlasAnimation(this, "bird-sad", "birdSad", "birdSad-data", false);

    // Eggs draw their letters onto a canvas, so the font has to be ready first.
    const fontReady = document.fonts?.load('800 100px "Baloo 2"') ?? Promise.resolve();
    Promise.race([fontReady, new Promise((resolve) => setTimeout(resolve, 1200))]).then(() => this.scene.start("WordEggsGame"));
  }
}
