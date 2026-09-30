import Phaser from "phaser";

/** Pooled "+10" / "-5" popups that rise and fade — the same few Text objects are reused forever. */
export class FloatingText {
  private readonly pool: Phaser.GameObjects.Text[] = [];
  private next = 0;

  constructor(private readonly scene: Phaser.Scene, depth: number, size = 8) {
    for (let i = 0; i < size; i++) {
      this.pool.push(
        scene.add
          .text(0, 0, "", { fontFamily: '"Baloo 2", "Nunito", system-ui, sans-serif', fontSize: "44px", fontStyle: "800", color: "#ffffff", stroke: "#3a2208", strokeThickness: 8 })
          .setOrigin(0.5)
          .setDepth(depth)
          .setVisible(false)
      );
    }
  }

  show(x: number, y: number, text: string, color = "#ffe066"): void {
    const label = this.pool[this.next++ % this.pool.length];
    this.scene.tweens.killTweensOf(label);
    label.setText(text).setColor(color).setPosition(x, y).setAlpha(1).setScale(0.6).setVisible(true);
    this.scene.tweens.add({ targets: label, scale: 1.1, duration: 160, ease: "Back.easeOut" });
    this.scene.tweens.add({ targets: label, y: y - 90, alpha: 0, duration: 900, delay: 120, ease: "Sine.easeOut", onComplete: () => label.setVisible(false) });
  }

  destroy(): void {
    this.pool.forEach((label) => {
      this.scene.tweens.killTweensOf(label);
      label.destroy();
    });
    this.pool.length = 0;
  }
}
