import Phaser from "phaser";
import type { FlowerColorId } from "../config/levels.config";

const DISPLAY_WIDTH = 130;

/**
 * The supplied flying-butterfly sprite sheet, with its cream wings recolored
 * per logical colorId (textures/animations built in ButterflyPreloadScene).
 * Wing-flap speed follows how fast it's being moved.
 */
export class Butterfly extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, colorId: FlowerColorId) {
    super(scene, x, y, `butterfly-${colorId}`, "frame_000");
    scene.add.existing(this);
    this.setColorId(colorId);
  }

  setColorId(colorId: FlowerColorId): void {
    this.setTexture(`butterfly-${colorId}`, "frame_000");
    this.setScale(DISPLAY_WIDTH / this.width);
    this.play(`butterfly-fly-${colorId}`);
  }

  flyTo(x: number, y: number, deltaSeconds: number): void {
    const dx = x - this.x;
    const speed = Math.hypot(dx, y - this.y) / Math.max(deltaSeconds, 0.001);

    this.rotation = Phaser.Math.Linear(this.rotation, Phaser.Math.Clamp(dx * 0.02, -0.35, 0.35), 0.15);
    this.anims.timeScale = Phaser.Math.Clamp(1 + speed / 500, 1, 2.4);

    this.x = x;
    this.y = y;
  }

  settle(): void {
    this.rotation = Phaser.Math.Linear(this.rotation, 0, 0.1);
    this.anims.timeScale = 1;
  }
}
