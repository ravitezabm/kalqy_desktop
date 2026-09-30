import Phaser from "phaser";
import type { ParallaxSystem } from "../../engine/vfx/ParallaxSystem";

/**
 * The River scene's dressing: the shared meadow backdrop, fireflies,
 * foreground flowers and a smoke veil for the forest-fire level. Layers
 * are separate objects so they take different parallax strengths.
 */
export class RiverEnvironment {
  private readonly smoke: Phaser.GameObjects.Rectangle;
  private readonly light: Phaser.GameObjects.Rectangle;
  private readonly fireflies: { sprite: Phaser.GameObjects.Image; phase: number; speed: number; ox: number; oy: number }[] = [];
  private elapsed = 0;
  private quality = 1;

  constructor(private readonly scene: Phaser.Scene, parallax: ParallaxSystem) {
    const { width, height } = scene.scale;

    const background = scene.add.image(width / 2, height / 2, "background").setDepth(0);
    background.setScale(Math.max((width + 40) / background.width, (height + 24) / background.height));
    parallax.add(background, 14);

    // A warm wash so the cool river reads as the same sunset as the meadow.
    scene.add.rectangle(width / 2, height / 2, width + 40, height + 24, 0xffb36b, 0.08).setDepth(1);

    this.smoke = scene.add.rectangle(width / 2, height / 2, width + 40, height + 24, 0x3a1f10, 0).setDepth(28);
    this.light = scene.add.rectangle(width / 2, height / 2, width + 40, height + 24, 0xfff2b0, 0).setDepth(29).setBlendMode(Phaser.BlendModes.ADD);

    for (let i = 0; i < 14; i++) {
      const sprite = scene.add
        .image(0, 0, "spark")
        .setDepth(27)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xfff0a0)
        .setScale(0.25 + Math.random() * 0.2)
        .setAlpha(0);
      this.fireflies.push({ sprite, phase: Math.random() * 6, speed: 0.3 + Math.random() * 0.5, ox: Math.random() * width, oy: height * (0.3 + Math.random() * 0.45) });
    }

    const left = scene.add.image(-30, height + 20, "leftBush").setOrigin(0, 1).setDepth(31);
    left.setScale((width * 0.3) / left.width);
    parallax.add(left, 70);
    const right = scene.add.image(width + 30, height + 20, "rightBush").setOrigin(1, 1).setDepth(31);
    right.setScale((width * 0.3) / right.width);
    parallax.add(right, 90);
  }

  /** Lower-end machines get fewer fireflies. */
  setQuality(quality: number): void {
    this.quality = Phaser.Math.Clamp(quality, 0.2, 1);
  }

  /** How thick the smoke veil is, 0..1 (fades on success). */
  setSmoke(amount: number, fadeMs = 0): void {
    if (fadeMs <= 0) this.smoke.setAlpha(amount * 0.42);
    else this.scene.tweens.add({ targets: this.smoke, alpha: amount * 0.42, duration: fadeMs, ease: "Sine.easeInOut" });
  }

  flashLight(): void {
    this.light.setAlpha(0.28);
    this.scene.tweens.add({ targets: this.light, alpha: 0, duration: 1400, ease: "Sine.easeOut" });
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.elapsed += dt;
    const visible = Math.round(this.fireflies.length * this.quality);
    this.fireflies.forEach((f, i) => {
      if (i >= visible) return f.sprite.setAlpha(0);
      f.phase += dt * f.speed;
      f.sprite.setPosition(f.ox + Math.sin(f.phase * 1.3) * 60, f.oy + Math.cos(f.phase) * 30);
      f.sprite.setAlpha(0.2 + 0.5 * (0.5 + 0.5 * Math.sin(f.phase * 3)));
    });
  }
}
