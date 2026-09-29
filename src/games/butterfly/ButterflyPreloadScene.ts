import Phaser from "phaser";
import { BUTTERFLY_ASSETS, type AtlasId } from "./assets";
import { BUTTERFLY_LEVELS, FLOWER_COLORS, type FlowerColorId } from "./config/levels.config";
import { createEffectTextures } from "./effects";
import { createTintedAtlas, createTintedTexture } from "../../engine/vfx/tintTexture";

export const PRELOAD_SCENE_KEY = "ButterflyPreload";

interface AtlasAnimation {
  key: string;
  atlas: AtlasId;
  loop: boolean;
}

const KID_ANIMATIONS: AtlasAnimation[] = [
  { key: "kid-idle", atlas: "kidIdle", loop: true },
  { key: "kid-win", atlas: "kidWin", loop: false },
  { key: "kid-fail", atlas: "kidFail", loop: false },
];

const PETAL_TINT = { maxSaturation: 0.3, minBrightness: 130 };
const WING_TINT = { maxSaturation: 0.28, minBrightness: 150 };

/**
 * Loads every real Butterfly asset before gameplay starts, builds the
 * animations straight from each atlas's own per-frame durations, and makes
 * the recolored flower/butterfly textures the levels need.
 */
export class ButterflyPreloadScene extends Phaser.Scene {
  constructor(private readonly onLoadError: (message: string) => void) {
    super(PRELOAD_SCENE_KEY);
  }

  preload(): void {
    const { width, height } = this.scale;
    const track = this.add.rectangle(width / 2, height / 2 + 60, 360, 10, 0xffffff, 0.25);
    const bar = this.add.rectangle(track.x - 180, track.y, 0, 10, 0xffd166).setOrigin(0, 0.5);
    this.load.on("progress", (value: number) => {
      bar.width = 360 * value;
    });
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      this.onLoadError(`Could not load ${file.key}`);
    });

    for (const [id, url] of Object.entries(BUTTERFLY_ASSETS.images)) this.load.image(id, url);
    for (const [id, atlas] of Object.entries(BUTTERFLY_ASSETS.atlases)) {
      this.load.atlas(id, atlas.image, atlas.data);
      // Phaser doesn't keep atlas JSON around, and we need its per-frame durations.
      this.load.json(`${id}-data`, atlas.data);
    }
  }

  create(): void {
    createEffectTextures(this.textures);
    for (const { key, atlas, loop } of KID_ANIMATIONS) this.createAnimation(key, atlas, atlas, loop);

    (Object.keys(FLOWER_COLORS) as FlowerColorId[]).forEach((colorId) =>
      createTintedTexture(this.textures, "flower", FLOWER_COLORS[colorId], `flower-${colorId}`, PETAL_TINT)
    );

    // Only recolor the butterfly sheet for colors some level actually uses.
    const butterflyColors = new Set(BUTTERFLY_LEVELS.map((level) => level.butterfly.colorId));
    butterflyColors.forEach((colorId) => {
      const key = createTintedAtlas(this.textures, "butterfly", FLOWER_COLORS[colorId], `butterfly-${colorId}`, WING_TINT);
      this.createAnimation(`butterfly-fly-${colorId}`, "butterfly", key, true);
    });

    this.scene.start("ButterflyGame");
  }

  /** `durationsAtlas` names the atlas whose JSON holds the frame durations. */
  private createAnimation(key: string, durationsAtlas: AtlasId, textureKey: string, loop: boolean): void {
    const frames = this.textures.get(textureKey).getFrameNames().sort();
    const data = this.cache.json.get(`${durationsAtlas}-data`) as { frames: Record<string, { duration?: number }> };
    const frameDuration = data.frames[frames[0]]?.duration ?? 100;
    this.anims.create({
      key,
      frames: frames.map((frame) => ({ key: textureKey, frame })),
      frameRate: 1000 / frameDuration,
      repeat: loop ? -1 : 0,
    });
  }
}
