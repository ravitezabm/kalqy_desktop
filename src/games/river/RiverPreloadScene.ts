import Phaser from "phaser";
import { RIVER_ASSETS } from "./assets";
import { createAtlasAnimation } from "../../engine/assets/atlasAnimations";
import { createEffectTextures } from "../../engine/vfx/effectTextures";

export const RIVER_PRELOAD_KEY = "RiverPreload";

const ANIMATIONS: { key: string; atlas: keyof typeof RIVER_ASSETS.atlases }[] = [
  { key: "cloud-idle", atlas: "cloudIdle" },
  { key: "cloud-happy", atlas: "cloudHappy" },
  { key: "cloud-fail", atlas: "cloudFail" },
  { key: "fish-idle", atlas: "fishIdle" },
  { key: "fish-happy", atlas: "fishHappy" },
  { key: "fish-fail", atlas: "fishFail" },
];

/** Loads every real River asset, builds the character animations once, then hands over to the game. */
export class RiverPreloadScene extends Phaser.Scene {
  constructor(private readonly onLoadError: (message: string) => void) {
    super(RIVER_PRELOAD_KEY);
  }

  preload(): void {
    const { width, height } = this.scale;
    const track = this.add.rectangle(width / 2, height / 2 + 60, 360, 10, 0xffffff, 0.25);
    const bar = this.add.rectangle(track.x - 180, track.y, 0, 10, 0x6fd6ff).setOrigin(0, 0.5);
    this.load.on("progress", (value: number) => {
      bar.width = 360 * value;
    });
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      // A missing required asset is a development error, but never a blank screen.
      console.error(`River asset failed to load: ${file.key} (${file.url})`);
      this.onLoadError(`Could not load ${file.key}`);
    });

    for (const [id, url] of Object.entries(RIVER_ASSETS.images)) this.load.image(id, url);
    for (const [id, atlas] of Object.entries(RIVER_ASSETS.atlases)) {
      this.load.atlas(id, atlas.image, atlas.data);
      this.load.json(`${id}-data`, atlas.data);
    }
  }

  create(): void {
    createEffectTextures(this.textures);
    for (const { key, atlas } of ANIMATIONS) createAtlasAnimation(this, key, atlas, `${atlas}-data`, true);
    this.createWaterPool();
    this.scene.start("RiverGame");
  }

  /** The "water" choice in the last level has no supplied art yet — a drawn pool, matching the other props' size. */
  private createWaterPool(): void {
    if (this.textures.exists("waterPool")) return;
    const w = 454;
    const h = 392;
    const tex = this.textures.createCanvas("waterPool", w, h)!;
    const ctx = tex.getContext();

    // A pool of clear water with a rocky rim.
    ctx.fillStyle = "#5b4a3f";
    ctx.beginPath();
    ctx.ellipse(w / 2, h - 90, 190, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    const grad = ctx.createLinearGradient(0, h - 150, 0, h - 40);
    grad.addColorStop(0, "#9be4ff");
    grad.addColorStop(1, "#2f9be0");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(w / 2, h - 96, 170, 56, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 4;
    for (const r of [44, 90, 132]) {
      ctx.beginPath();
      ctx.ellipse(w / 2, h - 96, r, r * 0.33, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // A big friendly droplet rising from the pool.
    const drop = ctx.createRadialGradient(w / 2 - 22, h - 250, 8, w / 2, h - 230, 96);
    drop.addColorStop(0, "#e8fbff");
    drop.addColorStop(0.55, "#6fd0ff");
    drop.addColorStop(1, "#2a8ee0");
    ctx.fillStyle = drop;
    ctx.beginPath();
    ctx.moveTo(w / 2, h - 340);
    ctx.bezierCurveTo(w / 2 + 92, h - 250, w / 2 + 90, h - 200, w / 2, h - 170);
    ctx.bezierCurveTo(w / 2 - 90, h - 200, w / 2 - 92, h - 250, w / 2, h - 340);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(w / 2 - 30, h - 240, 12, 26, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // Happy face.
    ctx.fillStyle = "#12324f";
    ctx.beginPath();
    ctx.arc(w / 2 - 22, h - 210, 8, 0, Math.PI * 2);
    ctx.arc(w / 2 + 22, h - 210, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#12324f";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(w / 2, h - 198, 22, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    tex.refresh();
  }
}
