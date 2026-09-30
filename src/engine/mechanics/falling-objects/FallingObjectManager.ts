import Phaser from "phaser";
import type { ObjectDefinition } from "./ObjectDefinition";
import type { ObjectRegistry } from "./ObjectRegistry";
import type { SpawnRequest } from "./ObjectSpawner";
import { renderObject } from "./FallingObjectRenderer";

export interface FallingEntry {
  image: Phaser.Physics.Arcade.Image;
  definition: ObjectDefinition | null;
  role: SpawnRequest["role"];
  spin: number;
  /** In flight and collidable. */
  live: boolean;
  /** Taken from the pool (live, or playing its catch/miss animation). */
  busy: boolean;
}

export interface FallingObjectOptions {
  poolSize: number;
  depth: number;
  /** Extra downward acceleration (px/s²) on top of the start speed. */
  gravity: number;
  /** Objects leaving below this y count as missed. */
  missY: number;
}

/**
 * A fixed pool of physics sprites that fall, spin, collide with the catcher
 * and get recycled — nothing is created or destroyed per fruit. The manager
 * knows nothing about fruit or scoring: it reports catches and misses, and
 * the game decides what they mean.
 */
export class FallingObjectManager {
  private readonly pool: FallingEntry[] = [];
  onCatch: (entry: FallingEntry) => void = () => {};
  onMiss: (entry: FallingEntry) => void = () => {};

  constructor(private readonly scene: Phaser.Scene, private readonly registry: ObjectRegistry, private readonly options: FallingObjectOptions) {
    for (let i = 0; i < options.poolSize; i++) {
      const image = scene.physics.add.image(-500, -500, "spark").setDepth(options.depth).setVisible(false).setActive(false);
      const body = image.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.enable = false;
      this.pool.push({ image, definition: null, role: "distractor", spin: 0, live: false, busy: false });
    }
  }

  /** Objects that hit this body are reported through onCatch. */
  bindCatcher(catcher: Phaser.Physics.Arcade.Image): void {
    for (const entry of this.pool) {
      this.scene.physics.add.overlap(entry.image, catcher, () => {
        if (entry.live) this.onCatch(entry);
      });
    }
  }

  spawn(request: SpawnRequest, sizeScale = 1): FallingEntry | null {
    const definition = this.registry.get(request.objectId);
    const rendered = definition ? renderObject(this.scene, definition) : null;
    if (!definition || !rendered) {
      // An unknown or unloadable object is skipped — never a crash.
      console.warn(`Skipped spawn of "${request.objectId}"`);
      return null;
    }
    const entry = this.pool.find((candidate) => !candidate.busy);
    if (!entry) return null;

    const { image } = entry;
    const scale = ((definition.visual.displayHeight * sizeScale * request.scale) / rendered.frameHeight) || 1;
    image.setTexture(rendered.textureKey).setPosition(request.x, request.y).setScale(scale).setRotation(Phaser.Math.FloatBetween(-0.3, 0.3)).setAlpha(1).setVisible(true).setActive(true).clearTint();
    const body = image.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(request.x, request.y);
    body.setSize(image.width * 0.62, image.height * 0.62, true);
    body.setAllowGravity(this.options.gravity > 0);
    body.setGravityY(this.options.gravity);
    body.setVelocity(0, request.vy);

    entry.definition = definition;
    entry.role = request.role;
    entry.spin = Phaser.Math.DegToRad(request.spin);
    entry.live = true;
    entry.busy = true;
    return entry;
  }

  update(deltaMs: number, paused: boolean): void {
    if (paused) return;
    const dt = deltaMs / 1000;
    for (const entry of this.pool) {
      if (!entry.live) continue;
      entry.image.rotation += entry.spin * dt;
      if (entry.image.y > this.options.missY) {
        entry.live = false;
        this.onMiss(entry);
        this.release(entry);
      }
    }
  }

  liveEntries(): FallingEntry[] {
    return this.pool.filter((entry) => entry.live);
  }

  /** Stops collisions right away; the caller animates the image, then releases it. */
  retire(entry: FallingEntry): void {
    entry.live = false;
    const body = entry.image.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;
  }

  release(entry: FallingEntry): void {
    this.scene.tweens.killTweensOf(entry.image);
    entry.live = false;
    entry.busy = false;
    entry.definition = null;
    const body = entry.image.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    entry.image.setVisible(false).setActive(false).setPosition(-500, -500);
  }

  /** Fades every object out (level finished) and frees the pool. */
  clear(fade = true): void {
    for (const entry of this.pool) {
      if (!entry.busy) continue;
      this.retire(entry);
      if (!fade) {
        this.release(entry);
        continue;
      }
      this.scene.tweens.add({ targets: entry.image, alpha: 0, scale: entry.image.scale * 0.6, duration: 350, onComplete: () => this.release(entry) });
    }
  }

  destroy(): void {
    this.pool.forEach((entry) => {
      this.scene.tweens.killTweensOf(entry.image);
      entry.image.destroy();
    });
    this.pool.length = 0;
  }
}
