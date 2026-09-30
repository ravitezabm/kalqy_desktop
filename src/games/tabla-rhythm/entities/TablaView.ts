import Phaser from "phaser";

export type HitGrade = "perfect" | "good" | "near" | "neutral";

const GRADE_STYLE: Record<HitGrade, { tint: number; size: number; sparks: number }> = {
  perfect: { tint: 0xffe27a, size: 1.25, sparks: 14 },
  good: { tint: 0xfff0b0, size: 1, sparks: 9 },
  near: { tint: 0xffffff, size: 0.8, sparks: 5 },
  neutral: { tint: 0xffffff, size: 0.85, sparks: 6 },
};

/**
 * One tabla: the supplied drum art on a soft shadow, plus code-made light on
 * its playing face — a pulsing glow when it is the target, a faint hint glow
 * for what is coming, a flash and ripples when it is hit, and a small bounce.
 * Visual states: idle · active · hit · cooldown.
 */
export class TablaView {
  readonly image: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly flash: Phaser.GameObjects.Image;
  private readonly halo: Phaser.GameObjects.Image;
  private readonly marker: Phaser.GameObjects.Graphics;
  private faceW = 0;
  private faceH = 0;
  private readonly ripples: Phaser.GameObjects.Arc[] = [];
  private nextRipple = 0;
  private activeUntil = 0;
  private hint = 0;
  private flashEnergy = 0;
  private pulse = Math.random() * 6;
  private readonly baseScale: number;

  /** Center of the playing face — where the hit zone sits. */
  readonly faceX: number;
  readonly faceY: number;
  readonly width: number;

  constructor(private readonly scene: Phaser.Scene, textureKey: string, x: number, centerY: number, width: number, private readonly glowColor: number, depth: number) {
    this.width = width;
    this.image = scene.add.image(x, centerY, textureKey).setDepth(depth);
    this.baseScale = width / this.image.width;
    this.image.setScale(this.baseScale);
    const height = this.image.displayHeight;
    this.shadow = scene.add.image(x, centerY + height * 0.47, "shadow").setDepth(depth - 1).setDisplaySize(width * 1.25, width * 0.38).setAlpha(0.75);
    this.faceX = x;
    this.faceY = centerY - height * 0.29;

    const faceW = width * 0.74;
    const faceH = height * 0.3;
    this.faceW = faceW;
    this.faceH = faceH;
    // A wide soft halo behind the drum plus a tighter, brighter glow on the face itself.
    this.halo = scene.add.image(this.faceX, this.faceY + faceH * 0.5, "spark").setTint(glowColor).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth - 0.5).setAlpha(0).setDisplaySize(width * 1.9, width * 1.5);
    this.glow = scene.add.image(this.faceX, this.faceY, "spark").setTint(glowColor).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 1).setAlpha(0).setDisplaySize(faceW * 2.2, faceH * 2.8);
    this.marker = scene.add.graphics().setDepth(depth + 3);
    this.flash = scene.add.image(this.faceX, this.faceY, "spark").setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 2).setAlpha(0).setDisplaySize(faceW * 1.25, faceH * 1.5);
    for (let i = 0; i < 3; i++) {
      this.ripples.push(scene.add.circle(this.faceX, this.faceY, faceW * 0.5).setStrokeStyle(5, 0xffffff, 1).setDepth(depth + 2).setAlpha(0).setScale(1, 0.42));
    }
  }

  /** Light the face for `ms` (target to hit, or being demonstrated). */
  setActive(ms: number): void {
    this.activeUntil = this.scene.time.now + ms;
  }

  clearActive(): void {
    this.activeUntil = 0;
  }

  get active(): boolean {
    return this.scene.time.now < this.activeUntil;
  }

  /** 0..1 faint "this is next" glow. */
  setHint(strength: number): void {
    this.hint = strength;
  }

  hit(grade: HitGrade): void {
    const style = GRADE_STYLE[grade];
    const scene = this.scene;

    // A small bounce: the drum dips and springs back.
    scene.tweens.killTweensOf(this.image);
    this.image.setScale(this.baseScale * 0.94, this.baseScale * 0.92);
    scene.tweens.add({ targets: this.image, scaleX: this.baseScale, scaleY: this.baseScale, duration: 240, ease: "Back.easeOut" });

    this.flash.setTint(style.tint);
    this.flashEnergy = 1;

    const ripple = this.ripples[this.nextRipple++ % this.ripples.length];
    scene.tweens.killTweensOf(ripple);
    ripple.setStrokeStyle(5, style.tint, 1).setAlpha(0.9).setScale(0.7, 0.3);
    scene.tweens.add({ targets: ripple, scaleX: 1.9 * style.size, scaleY: 0.8 * style.size, alpha: 0, duration: 520, ease: "Sine.easeOut" });
  }

  /** A quiet dim when the beat was missed — nothing sharp. */
  miss(): void {
    this.scene.tweens.killTweensOf(this.glow);
    this.glow.setTint(0x9aa0b8).setAlpha(0.35);
    this.scene.tweens.add({ targets: this.glow, alpha: 0, duration: 450, onComplete: () => this.glow.setTint(this.glowColor) });
  }

  update(deltaMs: number): void {
    this.pulse += deltaMs / 1000 * 7;
    const now = this.scene.time.now;
    const isActive = now < this.activeUntil;
    const beat = 0.5 + 0.5 * Math.sin(this.pulse);
    // Active = "play me": unmistakable. Hint = "you're next": clear but calmer.
    const strength = isActive ? 1 : this.hint;
    let glowAlpha = 0;
    if (isActive) glowAlpha = 0.85 + 0.15 * beat;
    else if (this.hint > 0) glowAlpha = this.hint * (0.6 + 0.2 * beat);
    if (!this.scene.tweens.isTweening(this.glow)) this.glow.setAlpha(glowAlpha);
    this.halo.setAlpha(strength * (0.55 + 0.25 * beat));

    // A bright pulsing ring on the playing face, and a bouncing arrow above the drum.
    const g = this.marker;
    g.clear();
    if (strength > 0.05) {
      const grow = 1 + 0.06 * beat;
      g.lineStyle(9, 0xffffff, 0.35 * strength);
      g.strokeEllipse(this.faceX, this.faceY, this.faceW * 1.02 * grow, this.faceH * 1.02 * grow);
      g.lineStyle(5, this.glowColor, (0.75 + 0.25 * beat) * strength);
      g.strokeEllipse(this.faceX, this.faceY, this.faceW * 1.02 * grow, this.faceH * 1.02 * grow);
      const bob = Math.sin(this.pulse * 0.9) * 9;
      const ay = this.faceY - this.image.displayHeight * 0.36 - 26 + bob;
      g.fillStyle(0x3a1a06, 0.55 * strength);
      g.fillTriangle(this.faceX - 25, ay - 26, this.faceX + 25, ay - 26, this.faceX, ay + 14);
      g.fillStyle(0xffffff, 0.95 * strength);
      g.fillTriangle(this.faceX - 20, ay - 22, this.faceX + 20, ay - 22, this.faceX, ay + 8);
    }

    this.flashEnergy *= Math.pow(0.004, deltaMs / 1000);
    this.flash.setAlpha(this.flashEnergy * 0.9);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf([this.image, this.glow, ...this.ripples]);
    this.image.destroy();
    this.shadow.destroy();
    this.glow.destroy();
    this.halo.destroy();
    this.marker.destroy();
    this.flash.destroy();
    this.ripples.forEach((r) => r.destroy());
  }
}
