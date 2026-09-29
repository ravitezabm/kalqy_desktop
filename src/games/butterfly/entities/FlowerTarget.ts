import Phaser from "phaser";
import type { FlowerColorId } from "../config/levels.config";

/** Where the stem meets the pot rim, measured on the supplied pot art (px from its top). */
const STEM_SOCKET_Y = 25;

/**
 * A potted flower built from the supplied pot + flower art. The flower
 * texture is the white original recolored per colorId (see tintTexture), so
 * there's one source image no matter how many colors a level uses.
 * (x, y) is the bottom-center of the pot.
 */
export class FlowerTarget extends Phaser.GameObjects.Container {
  readonly interactionRadius: number;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly bloomHead: Phaser.GameObjects.Image;
  private readonly headOffsetY: number;
  private sway = Math.random() * Math.PI * 2;
  private pulse = 0;
  private highlighted = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly targetId: string,
    readonly colorId: FlowerColorId,
    scale: number,
    interactionRadius: number
  ) {
    super(scene, x, y);
    this.interactionRadius = interactionRadius;

    const pot = scene.add.image(0, 0, "pot").setOrigin(0.5, 1);
    this.bloomHead = scene.add.image(0, -(pot.height - STEM_SOCKET_Y), `flower-${colorId}`).setOrigin(0.5, 1);
    this.headOffsetY = -(pot.height - STEM_SOCKET_Y) - this.bloomHead.height * 0.7;

    this.glow = scene.add.graphics();
    this.glow.setPosition(0, this.headOffsetY);
    this.ring = scene.add.graphics();
    this.ring.setPosition(0, this.headOffsetY);

    const shadow = scene.add.image(0, -6, "shadow").setOrigin(0.5, 0.5).setAlpha(0.85);
    shadow.setDisplaySize(pot.width * 1.5, pot.width * 0.5);

    this.add([shadow, this.glow, pot, this.bloomHead, this.ring]);
    this.setScale(scale);
    scene.add.existing(this);
  }

  /** World-space center of the blossom — what the butterfly has to reach. */
  get headX(): number {
    return this.x;
  }

  get headY(): number {
    return this.y + this.headOffsetY * this.scaleY;
  }

  setHighlighted(on: boolean): void {
    this.highlighted = on;
    if (!on) this.glow.clear();
  }

  update(deltaSeconds: number, holdPercent: number): void {
    this.sway += deltaSeconds * 1.4;
    this.bloomHead.rotation = Math.sin(this.sway) * 0.03;
    this.drawRing(holdPercent);
    this.drawGlow(deltaSeconds);
  }

  playBloom(): void {
    this.scene.tweens.add({
      targets: this.bloomHead,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 260,
      yoyo: true,
      ease: "Sine.easeOut",
    });
  }

  /** A soft wobble for "try another flower" — never a harsh shake. */
  playWobble(): void {
    this.scene.tweens.add({
      targets: this.bloomHead,
      angle: { from: -6, to: 6 },
      duration: 90,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.bloomHead.angle = 0;
      },
    });
  }

  /** Red flash, a head shake and an expanding red ring — clearly "not this one", still gentle. */
  playWrong(): void {
    const scene = this.scene;
    this.bloomHead.setTint(0xff8a8a);
    scene.time.delayedCall(450, () => this.bloomHead.clearTint());
    scene.tweens.add({
      targets: this.bloomHead,
      x: { from: -14, to: 14 },
      duration: 55,
      yoyo: true,
      repeat: 5,
      onComplete: () => (this.bloomHead.x = 0),
    });
    const flash = scene.add.graphics();
    flash.setPosition(0, this.headOffsetY);
    this.add(flash);
    const radius = this.bloomHead.width * 0.6;
    flash.lineStyle(12, 0xff4d4d, 0.95);
    flash.strokeCircle(0, 0, radius);
    flash.lineBetween(-radius * 0.45, -radius * 0.45, radius * 0.45, radius * 0.45);
    flash.lineBetween(radius * 0.45, -radius * 0.45, -radius * 0.45, radius * 0.45);
    scene.tweens.add({ targets: flash, alpha: 0, scale: 1.25, duration: 800, ease: "Cubic.easeOut", onComplete: () => flash.destroy() });
  }

  private drawGlow(deltaSeconds: number): void {
    if (!this.highlighted) return;
    this.pulse += deltaSeconds * 3;
    const radius = this.bloomHead.width * (0.75 + Math.sin(this.pulse) * 0.06);
    this.glow.clear();
    this.glow.fillStyle(0xffe27a, 0.22 + Math.sin(this.pulse) * 0.08);
    this.glow.fillCircle(0, 0, radius);
  }

  private drawRing(holdPercent: number): void {
    const g = this.ring;
    g.clear();
    if (holdPercent <= 0) return;

    const radius = this.bloomHead.width * 0.6;
    g.lineStyle(10, 0xffffff, 0.25);
    g.strokeCircle(0, 0, radius);
    g.lineStyle(10, 0xffd166, 0.95);
    g.beginPath();
    g.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * holdPercent);
    g.strokePath();
  }
}
