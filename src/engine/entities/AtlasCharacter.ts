import Phaser from "phaser";
import { CharacterStateMachine, type CharacterState } from "../mechanics/CharacterStateMachine";

/** An animation built at preload (`createAtlasAnimation`) and the atlas texture it plays from. */
export interface CharacterAnim {
  key: string;
  texture: string;
}

export interface CharacterAnimSet {
  idle: CharacterAnim;
  /** Walking; a facing-specific entry wins over `moving`. */
  moving?: CharacterAnim;
  movingLeft?: CharacterAnim;
  movingRight?: CharacterAnim;
  happy?: CharacterAnim;
  fail?: CharacterAnim;
  celebrate?: CharacterAnim;
}

/**
 * A sprite-sheet character driven by a CharacterStateMachine: the game says
 * "happy" or "fail", this picks the animation, keeps the feet planted and
 * the height constant even though each sheet has a different cell size.
 * Animations only restart when the state really changes.
 */
export class AtlasCharacter {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly machine = new CharacterStateMachine();
  private facing: "left" | "right" = "right";
  private currentKey = "";
  private bobPhase = Math.random() * 6;
  private baseScale = 1;

  constructor(scene: Phaser.Scene, x: number, feetY: number, private readonly displayHeight: number, private readonly anims: CharacterAnimSet) {
    this.sprite = scene.add.sprite(x, feetY, anims.idle.texture, "frame_000").setOrigin(0.5, 1);
    this.machine.onChange(() => this.refresh());
    this.refresh();
  }

  get x(): number {
    return this.sprite.x;
  }

  setX(x: number): void {
    this.sprite.x = x;
  }

  setDepth(depth: number): this {
    this.sprite.setDepth(depth);
    return this;
  }

  /** Walking direction, or "none" to stand still. */
  setMoveDirection(direction: "left" | "right" | "none"): void {
    if (direction !== "none") this.facing = direction;
    this.machine.setMoving(direction !== "none");
    this.refresh();
  }

  update(deltaMs: number): void {
    this.machine.update(deltaMs);
    // A gentle breathing bob while standing — never distorts the art.
    if (this.machine.state === "idle") {
      this.bobPhase += deltaMs / 1000 * 2.2;
      this.sprite.setScale(this.baseScale, this.baseScale * (1 + Math.sin(this.bobPhase) * 0.012));
    } else {
      this.sprite.setScale(this.baseScale);
    }
  }

  private animFor(state: CharacterState): CharacterAnim {
    const { anims } = this;
    switch (state) {
      case "moving":
        return (this.facing === "left" ? anims.movingLeft : anims.movingRight) ?? anims.moving ?? anims.idle;
      case "happy":
      case "success":
        return anims.happy ?? anims.idle;
      case "fail":
        return anims.fail ?? anims.idle;
      case "celebrate":
        return anims.celebrate ?? anims.happy ?? anims.idle;
      default:
        return anims.idle;
    }
  }

  private refresh(): void {
    const anim = this.animFor(this.machine.state);
    if (anim.key === this.currentKey) return;
    this.currentKey = anim.key;
    this.sprite.play(anim.key);
    const frame = this.sprite.scene.textures.get(anim.texture).get("frame_000");
    this.baseScale = this.displayHeight / frame.realHeight;
    this.sprite.setScale(this.baseScale);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
