import Phaser from "phaser";

const W = 214;
const H = 92;

/**
 * The "Lean Left / Lean Right" glass card from the reference: a little
 * figure, an arrow and a label. Lights up while the child is leaning that
 * way. Decorative teaching aid — it never changes gameplay.
 */
export class LeanCard extends Phaser.GameObjects.Container {
  private readonly frame: Phaser.GameObjects.Graphics;
  private lit = false;
  private readonly accent: number;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly side: "left" | "right") {
    super(scene, x, y);
    this.accent = side === "left" ? 0x59b8ff : 0xffa14a;
    this.frame = scene.add.graphics();
    const dir = side === "left" ? -1 : 1;

    const figure = scene.add.graphics();
    figure.fillStyle(this.accent, 1);
    figure.fillCircle(-dir * 60, -16, 9);
    figure.lineStyle(9, this.accent, 1);
    figure.lineBetween(-dir * 60, -6, -dir * 60 + dir * 10, 16);
    figure.lineBetween(-dir * 60 + dir * 10, 16, -dir * 60 - dir * 6, 34);
    figure.lineBetween(-dir * 60 + dir * 10, 16, -dir * 60 + dir * 26, 34);
    figure.lineBetween(-dir * 60 + dir * 4, 0, -dir * 60 - dir * 14, 12);
    figure.lineBetween(-dir * 60 + dir * 4, 0, -dir * 60 + dir * 18, 8);

    const arrow = scene.add.graphics();
    arrow.lineStyle(7, this.accent, 1);
    const ax = dir * 82;
    arrow.lineBetween(ax - dir * 22, 0, ax + dir * 14, 0);
    arrow.lineBetween(ax + dir * 14, 0, ax + dir * 2, -12);
    arrow.lineBetween(ax + dir * 14, 0, ax + dir * 2, 12);

    const label = scene.add
      .text(-dir * -2, 0, `Lean\n${side === "left" ? "Left" : "Right"}`, {
        fontFamily: '"Baloo 2", "Nunito", system-ui, sans-serif',
        fontSize: "26px",
        fontStyle: "700",
        color: "#ffffff",
        align: "center",
        lineSpacing: -6,
      })
      .setOrigin(0.5);

    this.add([this.frame, figure, arrow, label]);
    this.draw(0);
    scene.add.existing(this);
  }

  /** `amount` 0..1: how strongly the child is leaning this way right now. */
  setLit(amount: number): void {
    const on = amount > 0.5;
    if (on !== this.lit) {
      this.lit = on;
      this.draw(on ? 1 : 0);
    }
  }

  private draw(glow: number): void {
    const g = this.frame;
    g.clear();
    if (glow > 0) {
      g.lineStyle(10, this.accent, 0.3);
      g.strokeRoundedRect(-W / 2 - 4, -H / 2 - 4, W + 8, H + 8, 24);
    }
    g.fillStyle(0x10283c, 0.55);
    g.fillRoundedRect(-W / 2, -H / 2, W, H, 20);
    g.lineStyle(2.5, glow > 0 ? this.accent : 0xffffff, glow > 0 ? 0.95 : 0.4);
    g.strokeRoundedRect(-W / 2, -H / 2, W, H, 20);
  }
}
