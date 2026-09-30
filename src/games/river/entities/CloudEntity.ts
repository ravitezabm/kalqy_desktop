import Phaser from "phaser";

export type CloudState = "idle" | "raining" | "happy" | "fail";

const ANIMS: Record<CloudState, string> = {
  idle: "cloud-idle",
  raining: "cloud-idle",
  happy: "cloud-happy",
  fail: "cloud-fail",
};
const DISPLAY_WIDTH = 250;

/**
 * The rain cloud the child steers. States switch animations only on a real
 * change (never re-played per frame); movement is smoothed elsewhere — this
 * just floats and tilts slightly toward where it is heading.
 */
export class CloudEntity extends Phaser.GameObjects.Sprite {
  private mode: CloudState = "idle";
  private bob = 0;
  private baseY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "cloudIdle", "frame_000");
    this.baseY = y;
    scene.add.existing(this);
    this.setMode("idle");
  }

  get cloudMode(): CloudState {
    return this.mode;
  }

  setMode(next: CloudState): void {
    if (next === this.mode && this.anims.isPlaying) return;
    this.mode = next;
    const key = ANIMS[next];
    const atlas = key === "cloud-idle" ? "cloudIdle" : key === "cloud-happy" ? "cloudHappy" : "cloudFail";
    this.setTexture(atlas, "frame_000");
    this.setScale(DISPLAY_WIDTH / this.width);
    this.play({ key, repeat: -1 });
  }

  followTo(x: number, deltaMs: number): void {
    const dx = x - this.x;
    this.rotation = Phaser.Math.Linear(this.rotation, Phaser.Math.Clamp(dx * 0.0016, -0.12, 0.12), 0.12);
    this.x = x;
    this.bob += deltaMs / 1000;
    this.y = this.baseY + Math.sin(this.bob * 1.6) * 8;
  }

  /** Underside of the cloud, where the rain leaves from. */
  get rainOriginY(): number {
    return this.y + this.displayHeight * 0.32;
  }
}
