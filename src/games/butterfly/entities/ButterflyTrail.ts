import Phaser from "phaser";

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

const MAX_AGE_MS = 520;
const SPARK_EVERY_MS = 45;

/**
 * A glowing ribbon plus drifting sparkles behind the butterfly. Fed the
 * butterfly's position each frame; fades out on its own when it stops.
 */
export class ButterflyTrail {
  private readonly ribbon: Phaser.GameObjects.Graphics;
  private points: TrailPoint[] = [];
  private sinceSpark = 0;
  private color = 0xffffff;

  constructor(private readonly scene: Phaser.Scene, depth: number) {
    this.ribbon = scene.add.graphics().setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
  }

  setColor(color: number): void {
    this.color = color;
  }

  update(deltaMs: number, x: number, y: number, moving: boolean): void {
    this.points.forEach((p) => (p.age += deltaMs));
    this.points = this.points.filter((p) => p.age < MAX_AGE_MS);
    const last = this.points[this.points.length - 1];
    if (moving && (!last || Phaser.Math.Distance.Between(last.x, last.y, x, y) > 4)) this.points.push({ x, y, age: 0 });

    this.sinceSpark += deltaMs;
    if (moving && this.sinceSpark >= SPARK_EVERY_MS) {
      this.sinceSpark = 0;
      this.spawnSpark(x, y);
    }
    this.draw();
  }

  clear(): void {
    this.points = [];
    this.ribbon.clear();
  }

  destroy(): void {
    this.ribbon.destroy();
  }

  private draw(): void {
    const g = this.ribbon;
    g.clear();
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1];
      const b = this.points[i];
      const life = 1 - b.age / MAX_AGE_MS;
      g.lineStyle(16 * life + 2, this.color, 0.16 * life);
      g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(5 * life + 1, 0xffffff, 0.45 * life);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  private spawnSpark(x: number, y: number): void {
    const spark = this.scene.add
      .image(x + Phaser.Math.Between(-10, 10), y + Phaser.Math.Between(-6, 14), "spark")
      .setDepth(39)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(Math.random() < 0.5 ? this.color : 0xffffff)
      .setScale(Phaser.Math.FloatBetween(0.25, 0.5))
      .setAlpha(0.9);
    this.scene.tweens.add({
      targets: spark,
      y: spark.y + Phaser.Math.Between(20, 45),
      x: spark.x + Phaser.Math.Between(-18, 18),
      alpha: 0,
      scale: 0,
      duration: Phaser.Math.Between(500, 850),
      ease: "Sine.easeOut",
      onComplete: () => spark.destroy(),
    });
  }
}
