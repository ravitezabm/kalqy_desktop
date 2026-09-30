import Phaser from "phaser";

/**
 * A row of glowing dots, one per beat of the bar. `pulse(i)` lights beat i
 * (the first beat is bigger); everything eases back on its own. Purely visual —
 * the rhythm engine decides when a beat happens.
 */
export class BeatIndicator {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly energy: number[];
  private current = -1;
  private visible = true;

  constructor(scene: Phaser.Scene, private readonly x: number, private readonly y: number, private readonly beats: number, depth: number, private readonly color = 0xffd166) {
    this.g = scene.add.graphics().setDepth(depth);
    this.energy = Array.from({ length: beats }, () => 0);
  }

  pulse(beatInBar: number): void {
    this.current = beatInBar;
    this.energy[beatInBar] = 1;
  }

  /** Dim everything (between patterns). */
  clear(): void {
    this.current = -1;
    this.energy.fill(0);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (!visible) this.g.clear();
  }

  update(deltaMs: number): void {
    if (!this.visible) return;
    const decay = Math.pow(0.0015, deltaMs / 1000);
    const g = this.g;
    g.clear();
    const gap = 44;
    for (let i = 0; i < this.beats; i++) {
      this.energy[i] *= decay;
      const e = this.energy[i];
      const cx = this.x + (i - (this.beats - 1) / 2) * gap;
      const base = i === 0 ? 11 : 9;
      g.fillStyle(0xffffff, 0.28);
      g.fillCircle(cx, this.y, base);
      if (e > 0.02) {
        g.fillStyle(this.color, 0.25 * e);
        g.fillCircle(cx, this.y, base + 12 * e);
        g.fillStyle(this.color, 0.55 + 0.45 * e);
        g.fillCircle(cx, this.y, base * (0.8 + 0.5 * e));
      }
      if (i === this.current && e > 0.3) {
        g.lineStyle(3, 0xffffff, 0.6 * e);
        g.strokeCircle(cx, this.y, base + 6);
      }
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}
