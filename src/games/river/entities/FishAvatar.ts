import Phaser from "phaser";
import { CharacterStateMachine, type CharacterState } from "../../../engine/mechanics/CharacterStateMachine";

const DISPLAY_HEIGHT = 240;
const ATLAS: Record<CharacterState, { atlas: string; anim: string }> = {
  idle: { atlas: "fishIdle", anim: "fish-idle" },
  moving: { atlas: "fishIdle", anim: "fish-idle" },
  happy: { atlas: "fishHappy", anim: "fish-happy" },
  success: { atlas: "fishHappy", anim: "fish-happy" },
  celebrate: { atlas: "fishHappy", anim: "fish-happy" },
  fail: { atlas: "fishFail", anim: "fish-fail" },
};

/**
 * The child's avatar, swimming in a bubble along the river. It mirrors the
 * cloud's lane position with a little lag, bobs, and turns toward where it
 * is going. Animation choice comes from a CharacterStateMachine.
 */
export class FishAvatar extends Phaser.GameObjects.Container {
  readonly machine = new CharacterStateMachine();
  private readonly bubble: Phaser.GameObjects.Graphics;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private bob = 0;
  private readonly baseY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.baseY = y;
    this.bubble = scene.add.graphics();
    this.drawBubble();
    this.sprite = scene.add.sprite(0, 0, "fishIdle", "frame_000");
    this.add([this.bubble, this.sprite]);
    scene.add.existing(this);

    this.machine.onChange((state, previous) => this.show(state, previous));
    this.show("idle", "idle");
  }

  /** The fish swims along with the cloud (same lane), leaning into its direction of travel. */
  followTo(cloudX: number, deltaMs: number): void {
    const dx = cloudX - this.x;
    this.machine.setMoving(Math.abs(dx) > 0.6);
    this.machine.update(deltaMs);
    this.rotation = Phaser.Math.Linear(this.rotation, Phaser.Math.Clamp(dx * 0.006, -0.25, 0.25), 0.1);
    this.x = Phaser.Math.Linear(this.x, cloudX, 0.14);
    this.bob += deltaMs / 1000;
    this.y = this.baseY + Math.sin(this.bob * 2.1) * 7;
  }

  private show(state: CharacterState, previous: CharacterState): void {
    const { atlas, anim } = ATLAS[state];
    const prev = ATLAS[previous];
    if (prev.anim === anim && this.sprite.anims.isPlaying) return;
    this.sprite.setTexture(atlas, "frame_000");
    this.sprite.setScale(DISPLAY_HEIGHT / this.sprite.height);
    this.sprite.play(anim);
  }

  private drawBubble(): void {
    const g = this.bubble;
    g.fillStyle(0xcdeeff, 0.16);
    g.fillCircle(0, 0, 100);
    g.lineStyle(4, 0xffffff, 0.45);
    g.strokeCircle(0, 0, 100);
    g.fillStyle(0xffffff, 0.35);
    g.fillEllipse(-40, -52, 28, 16);
  }
}
