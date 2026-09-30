import Phaser from "phaser";

export type CursorGesture = "open" | "pinch" | "fist";

/**
 * A soft glowing hand that follows the player's real hand (the reference's
 * glowing hand), open or closed. Purely visual — the actual interaction
 * comes from the Motion Engine. `ghost` draws the same hand translucent for tutorials.
 */
export class HandCursor extends Phaser.GameObjects.Container {
  private readonly glow: Phaser.GameObjects.Image;
  private readonly hand: Phaser.GameObjects.Graphics;
  private gesture: CursorGesture = "open";

  constructor(scene: Phaser.Scene, private readonly ghost = false, glowColor = 0x9fdcff) {
    super(scene, 0, 0);
    this.glow = scene.add.image(0, 0, "spark").setTint(glowColor).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(170, 170).setAlpha(ghost ? 0.25 : 0.4);
    this.hand = scene.add.graphics();
    this.add([this.glow, this.hand]);
    this.draw();
    scene.add.existing(this);
  }

  setGesture(gesture: CursorGesture): void {
    if (gesture === this.gesture) return;
    this.gesture = gesture;
    this.draw();
  }

  private draw(): void {
    const g = this.hand;
    g.clear();
    const alpha = this.ghost ? 0.6 : 0.92;
    const fill = 0xeaf7ff;
    const edge = 0x7cc8ff;
    const closed = this.gesture !== "open";

    const finger = (x: number, top: number, len: number, w: number) => {
      g.fillStyle(fill, alpha);
      g.fillRoundedRect(x - w / 2, top, w, len, w / 2);
      g.lineStyle(3, edge, alpha);
      g.strokeRoundedRect(x - w / 2, top, w, len, w / 2);
    };

    if (closed) {
      // Fist: a rounded block with knuckle bumps and the thumb across.
      g.fillStyle(fill, alpha);
      g.fillRoundedRect(-30, -22, 60, 54, 20);
      g.lineStyle(3, edge, alpha);
      g.strokeRoundedRect(-30, -22, 60, 54, 20);
      for (let i = 0; i < 4; i++) g.lineBetween(-22 + i * 15, -18, -22 + i * 15, 0);
      g.fillStyle(fill, alpha);
      g.fillRoundedRect(-28, 8, 40, 16, 8);
      g.strokeRoundedRect(-28, 8, 40, 16, 8);
    } else {
      finger(-21, -52, 44, 15);
      finger(-7, -62, 52, 15);
      finger(7, -60, 50, 15);
      finger(21, -48, 40, 14);
      g.fillStyle(fill, alpha);
      g.fillRoundedRect(-30, -14, 60, 52, 18);
      g.lineStyle(3, edge, alpha);
      g.strokeRoundedRect(-30, -14, 60, 52, 18);
      g.save();
      g.translateCanvas(-30, 14);
      g.rotateCanvas(-0.9);
      finger(0, -8, 38, 16);
      g.restore();
    }
  }
}
