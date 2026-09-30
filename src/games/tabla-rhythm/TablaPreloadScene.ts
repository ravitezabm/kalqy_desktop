import Phaser from "phaser";
import type { AudioManager } from "../../engine/audio/AudioManager";
import { createAtlasAnimation } from "../../engine/assets/atlasAnimations";
import { createEffectTextures } from "../../engine/vfx/effectTextures";
import { TABLA_ASSETS } from "./assets";

export const TABLA_PRELOAD_KEY = "TablaPreload";

/**
 * Loads the art, builds the kid's animations once, and decodes every tabla
 * stroke BEFORE the game starts — so no hit ever waits on a file.
 */
export class TablaPreloadScene extends Phaser.Scene {
  constructor(private readonly audio: AudioManager, private readonly onLoadError: (message: string) => void) {
    super(TABLA_PRELOAD_KEY);
  }

  preload(): void {
    const { width, height } = this.scale;
    const track = this.add.rectangle(width / 2, height / 2 + 60, 360, 10, 0xffffff, 0.25);
    const bar = this.add.rectangle(track.x - 180, track.y, 0, 10, 0xffb347).setOrigin(0, 0.5);
    this.load.on("progress", (value: number) => {
      bar.width = 360 * value * 0.8;
    });
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.error(`Tabla asset failed to load: ${file.key} (${file.url})`);
      this.onLoadError(`Could not load ${file.key}`);
    });

    for (const [id, url] of Object.entries(TABLA_ASSETS.images)) this.load.image(id, url);
    for (const [id, atlas] of Object.entries(TABLA_ASSETS.atlases)) {
      this.load.atlas(id, atlas.image, atlas.data);
      this.load.json(`${id}-data`, atlas.data);
    }
  }

  create(): void {
    createEffectTextures(this.textures);
    createAtlasAnimation(this, "kid-idle", "kidIdle", "kidIdle-data", true);
    createAtlasAnimation(this, "kid-win", "kidWin", "kidWin-data", false);

    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 + 100, "Tuning the tablas...", { fontFamily: "system-ui, sans-serif", fontSize: "22px", color: "#ffffff" }).setOrigin(0.5);
    this.audio
      .loadSamples(TABLA_ASSETS.samples)
      .then(() => this.scene.start("TablaRhythmGame"))
      .catch((error) => {
        console.error(error);
        this.onLoadError("Could not load the tabla sounds");
      });
  }
}
