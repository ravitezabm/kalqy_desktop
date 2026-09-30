import Phaser from "phaser";
import type { RiverTargetConfig } from "../config/levels.config";

/** Textures are ~454px wide; `scale` in config is relative to that. */
const NATURAL_WIDTH = 454;
/** Every choice sits in the same size circle (like the reference), whatever the art's shape. */
const ORB_RADIUS = 104;

/**
 * One thing the child can give water to (plant, bird, fire, human, ice...).
 * Purely a view: it shows a texture, a hold ring, a glow, and reacts
 * (swap / shake / bloom / extinguish). Whether it's correct is the
 * TargetSystem's business, not this class's. (x, y) is the base center.
 */
export class RiverTarget extends Phaser.GameObjects.Container {
  private readonly shadow: Phaser.GameObjects.Image;
  private visual: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly halo: Phaser.GameObjects.Image;
  private readonly orb: Phaser.GameObjects.Graphics;
  private orbRadius = 0;
  private glowPulse = Math.random() * 6;
  private glowOn = false;
  private stage: boolean;
  readonly baseWidth: number;

  /** `stage` puts the object in a softly glowing circle — that's how choices are shown. */
  constructor(scene: Phaser.Scene, readonly config: RiverTargetConfig, textureKey: string, x: number, y: number, stage = false) {
    super(scene, x, y);
    this.baseWidth = NATURAL_WIDTH * config.scale;
    this.stage = stage;

    this.shadow = scene.add.image(0, -4, "shadow").setAlpha(0.8);
    this.shadow.setDisplaySize(this.baseWidth * 0.95, this.baseWidth * 0.26);

    this.visual = this.makeVisual(textureKey);
    this.orbRadius = ORB_RADIUS;
    this.halo = scene.add.image(0, -ORB_RADIUS, "spark").setTint(0xffe27a).setBlendMode(Phaser.BlendModes.ADD);
    this.halo.setDisplaySize(this.orbRadius * 3.1, this.orbRadius * 3.1).setVisible(stage);
    this.orb = scene.add.graphics();
    this.glow = scene.add.graphics();
    this.ring = scene.add.graphics();
    this.add([this.halo, this.orb, this.shadow, this.glow, this.visual, this.ring]);
    this.shadow.setVisible(!stage);
    scene.add.existing(this);
  }

  get id(): string {
    return this.config.id;
  }

  /** Where the water should land — the top of the object. */
  get headX(): number {
    return this.x;
  }

  get headY(): number {
    return this.stage ? this.y - ORB_RADIUS * 1.55 : this.y - this.visual.displayHeight * 0.72;
  }

  setGlow(on: boolean): void {
    this.glowOn = on;
    if (!on) this.glow.clear();
  }

  update(deltaSeconds: number, holdProgress: number): void {
    this.drawRing(holdProgress);
    if (this.stage) this.drawOrb(deltaSeconds, holdProgress);
    if (!this.glowOn) return;
    this.glowPulse += deltaSeconds * 3;
    this.glow.clear();
    this.glow.fillStyle(0x9be7ff, 0.14 + Math.sin(this.glowPulse) * 0.06);
    this.glow.fillEllipse(0, -this.visual.displayHeight * 0.4, this.baseWidth * 1.05, this.visual.displayHeight * 0.95);
  }

  /** Crossfade to another texture (dry plant -> bloomed, thirsty -> happy). */
  swapTo(textureKey: string): Promise<void> {
    return new Promise((resolve) => {
      const next = this.makeVisual(textureKey).setAlpha(0);
      this.addAt(next, this.getIndex(this.visual) + 1);
      const previous = this.visual;
      this.visual = next;
      this.scene.tweens.add({ targets: previous, alpha: 0, duration: 700, ease: "Sine.easeInOut", onComplete: () => previous.destroy() });
      this.scene.tweens.add({ targets: next, alpha: 1, duration: 700, ease: "Sine.easeInOut", onComplete: () => resolve() });
    });
  }

  /** Soft hop + squash, for "happy" and "bloom". */
  bounce(): void {
    const s = this.visual.scaleX;
    this.scene.tweens.add({
      targets: this.visual,
      scaleY: { from: s, to: s * 1.1 },
      scaleX: { from: s, to: s * 0.95 },
      duration: 240,
      yoyo: true,
      repeat: 2,
      ease: "Quad.easeOut",
      onComplete: () => this.visual.setScale(s),
    });
  }

  /** "Not this one": a gentle side shake and a soft red ring — never harsh. */
  shakeWrong(): void {
    this.scene.tweens.add({
      targets: this.visual,
      x: { from: -12, to: 12 },
      duration: 60,
      yoyo: true,
      repeat: 4,
      onComplete: () => (this.visual.x = 0),
    });
    const flash = this.scene.add.graphics();
    flash.setPosition(0, this.stage ? -ORB_RADIUS : -this.visual.displayHeight * 0.45);
    this.add(flash);
    const radius = this.stage ? this.orbRadius : this.baseWidth * 0.5;
    flash.lineStyle(10, 0xff5a5a, 0.9);
    flash.strokeCircle(0, 0, radius);
    flash.lineBetween(-radius * 0.4, -radius * 0.4, radius * 0.4, radius * 0.4);
    flash.lineBetween(radius * 0.4, -radius * 0.4, -radius * 0.4, radius * 0.4);
    this.scene.tweens.add({ targets: flash, alpha: 0, scale: 1.2, duration: 800, ease: "Cubic.easeOut", onComplete: () => flash.destroy() });
  }

  /** Fire dies down: shrink + fade, leaving room for the swapped-in texture. */
  fadeOutAndShrink(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.visual,
        alpha: 0,
        scaleX: this.visual.scaleX * 0.7,
        scaleY: this.visual.scaleY * 0.5,
        duration: 1400,
        ease: "Sine.easeIn",
        onComplete: () => resolve(),
      });
    });
  }

  private makeVisual(textureKey: string): Phaser.GameObjects.Image {
    const image = this.scene.add.image(0, this.stage ? -ORB_RADIUS : 0, textureKey).setOrigin(0.5, this.stage ? 0.55 : 1);
    image.setScale(this.baseWidth / image.width);
    return image;
  }

  /** Breathing golden ring, soft halo and a few orbiting sparkles — the same for every choice, so it never gives the answer away. */
  private drawOrb(deltaSeconds: number, holdProgress: number): void {
    this.glowPulse += deltaSeconds * 2.2;
    const breathe = 0.5 + 0.5 * Math.sin(this.glowPulse);
    const cy = -ORB_RADIUS;
    const r = this.orbRadius;
    const g = this.orb;
    g.clear();
    g.fillStyle(0xffffff, 0.09 + 0.03 * breathe);
    g.fillCircle(0, cy, r);
    g.lineStyle(10, 0xffe27a, 0.16 + 0.1 * breathe);
    g.strokeCircle(0, cy, r + 6 + breathe * 5);
    g.lineStyle(5, 0xfff2b0, 0.75 + 0.2 * breathe);
    g.strokeCircle(0, cy, r);
    for (let i = 0; i < 6; i++) {
      const a = this.glowPulse * 0.6 + (i * Math.PI * 2) / 6;
      const flicker = 0.5 + 0.5 * Math.sin(this.glowPulse * 2 + i * 1.7);
      g.fillStyle(0xfff6c8, 0.35 + 0.5 * flicker);
      g.fillCircle(Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2), 2.5 + flicker * 2.5);
    }
    this.halo.setAlpha(0.28 + 0.14 * breathe + holdProgress * 0.25);
  }

  private drawRing(holdProgress: number): void {
    const g = this.ring;
    g.clear();
    if (holdProgress <= 0) return;
    const radius = this.stage ? this.orbRadius + 12 : this.baseWidth * 0.42;
    const cy = this.stage ? -ORB_RADIUS : -this.visual.displayHeight * 0.45;
    g.lineStyle(10, 0xffffff, 0.25);
    g.strokeCircle(0, cy, radius);
    g.lineStyle(10, 0x6fd6ff, 0.95);
    g.beginPath();
    g.arc(0, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * holdProgress);
    g.strokePath();
  }
}
