import Phaser from "phaser";

export interface PhysicsOptionConfig {
  enabled: boolean;
  gravity: number;
  bounce: number;
  /** Horizontal damping so eggs settle instead of sliding forever. */
  drag: number;
  /** Play area the pieces may rest in (px). */
  bounds: { left: number; right: number; top: number; floor: number };
}

/**
 * Real Arcade physics for the loose pieces on the ground (gravity, bounce,
 * collisions, settling) — and only for those. A piece being dragged, returning
 * or placed is taken out of physics (`setSimulated(false)`) so the hand is in
 * full control, then put back with `drop`.
 */
export class PhysicsOptionController {
  private readonly bodies = new Set<Phaser.Physics.Arcade.Sprite>();
  private collider: Phaser.Physics.Arcade.Collider | null = null;

  constructor(private readonly scene: Phaser.Scene, private config: PhysicsOptionConfig) {
    scene.physics.world.gravity.y = config.enabled ? config.gravity : 0;
    scene.physics.world.setBounds(config.bounds.left, config.bounds.top, config.bounds.right - config.bounds.left, config.bounds.floor - config.bounds.top);
  }

  add(sprite: Phaser.Physics.Arcade.Sprite, radius: number): void {
    this.scene.physics.add.existing(sprite);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setCircle(radius, sprite.width / 2 - radius, sprite.height / 2 - radius + 10);
    body.setBounce(this.config.bounce);
    body.setDragX(this.config.drag);
    body.setCollideWorldBounds(true);
    body.setAllowGravity(this.config.enabled);
    this.bodies.add(sprite);
    this.collider?.destroy();
    this.collider = this.scene.physics.add.collider([...this.bodies], [...this.bodies]);
  }

  /** Hand the piece to the player (true = released back to physics). */
  setSimulated(sprite: Phaser.Physics.Arcade.Sprite, simulated: boolean): void {
    const body = sprite.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    body.enable = simulated;
    if (!simulated) body.setVelocity(0, 0);
  }

  /** Put the piece at (x, y) and let it fall and settle. */
  drop(sprite: Phaser.Physics.Arcade.Sprite, x: number, y: number, vx = 0): void {
    const body = sprite.body as Phaser.Physics.Arcade.Body | null;
    sprite.setPosition(x, y);
    if (!body) return;
    body.enable = true;
    body.reset(x, y);
    body.setVelocity(vx, 0);
  }

  remove(sprite: Phaser.Physics.Arcade.Sprite): void {
    this.bodies.delete(sprite);
  }

  destroy(): void {
    this.collider?.destroy();
    this.collider = null;
    this.bodies.clear();
  }
}
