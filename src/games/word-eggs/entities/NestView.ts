import Phaser from "phaser";

/**
 * One nest on the branch, built from the supplied art as three layers —
 * back of the nest, the egg, then the front lip — so an egg really sits
 * *in* it. An empty nest pulses softly to show where an egg goes.
 */
export class NestView {
  readonly back: Phaser.GameObjects.Image;
  readonly front: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Graphics;
  private pulse = Math.random() * 6;
  private attract = 0;
  private empty = false;

  /** Where an egg's center sits when it is in this nest. */
  readonly eggX: number;
  readonly eggY: number;
  readonly width: number;

  constructor(scene: Phaser.Scene, x: number, bottomY: number, width: number, depth: number) {
    this.width = width;
    this.back = scene.add.image(x, bottomY, "nestBack").setOrigin(0.5, 1).setDepth(depth);
    this.back.setScale(width / this.back.width);
    this.front = scene.add.image(x, bottomY, "nestFront").setOrigin(0.5, 1).setDepth(depth + 2);
    this.front.setScale(width / this.front.width);

    const height = this.back.displayHeight;
    this.eggX = x;
    this.eggY = bottomY - height * 0.78;

    this.glow = scene.add.image(x, this.eggY, "spark").setTint(0xfff0a0).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 3).setAlpha(0).setDisplaySize(width * 1.6, width * 1.3);
    this.ring = scene.add.graphics().setDepth(depth + 3);
  }

  setEmpty(empty: boolean): void {
    this.empty = empty;
    if (!empty) {
      this.glow.setAlpha(0);
      this.ring.clear();
    }
  }

  /** 0..1: a matching egg is close, so the target lights up more. */
  setAttraction(amount: number): void {
    this.attract = amount;
  }

  update(deltaSeconds: number): void {
    if (!this.empty) return;
    this.pulse += deltaSeconds * 2.4;
    const breathe = 0.5 + 0.5 * Math.sin(this.pulse);
    const strength = 0.25 + breathe * 0.2 + this.attract * 0.5;
    this.glow.setAlpha(strength);
    const g = this.ring;
    g.clear();
    g.lineStyle(6, 0xfff2b0, 0.5 + 0.4 * breathe + this.attract * 0.1);
    g.strokeEllipse(this.eggX, this.eggY - this.width * 0.05, this.width * (0.62 + 0.04 * breathe + this.attract * 0.06), this.width * 0.42);
  }

  /** Flash when an egg settles in. */
  celebrate(scene: Phaser.Scene): void {
    this.glow.setAlpha(0.9);
    scene.tweens.add({ targets: this.glow, alpha: 0, duration: 900, ease: "Sine.easeOut" });
  }

  destroy(): void {
    this.back.destroy();
    this.front.destroy();
    this.glow.destroy();
    this.ring.destroy();
  }
}
