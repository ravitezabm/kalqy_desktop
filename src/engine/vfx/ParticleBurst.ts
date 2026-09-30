import Phaser from "phaser";

interface Particle {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
  startScale: number;
  endScale: number;
  spin: number;
  active: boolean;
}

export interface BurstOptions {
  texture?: "spark" | "puff" | "droplet";
  count: number;
  tint?: number | number[];
  /** Px/s speed range. */
  speed?: [number, number];
  /** Emission angle range in radians (default: all directions). */
  angle?: [number, number];
  gravity?: number;
  life?: [number, number];
  scale?: [number, number];
  endScale?: number;
  additive?: boolean;
  spread?: number;
}

/**
 * A fixed pool of image particles, reused for every burst (steam, sparkles,
 * petals, splashes...). Nothing is created or destroyed during play, so
 * repeated celebrations never churn memory. `quality` (0..1) thins bursts
 * out on slow machines.
 */
export class ParticleBurst {
  private readonly pool: Particle[] = [];
  quality = 1;

  constructor(scene: Phaser.Scene, depth: number, size = 160) {
    for (let i = 0; i < size; i++) {
      const sprite = scene.add.image(0, 0, "spark").setDepth(depth).setVisible(false);
      this.pool.push({ sprite, vx: 0, vy: 0, gravity: 0, life: 0, maxLife: 1, startScale: 1, endScale: 0, spin: 0, active: false });
    }
  }

  emit(x: number, y: number, options: BurstOptions): void {
    const count = Math.max(1, Math.round(options.count * this.quality));
    const tints = Array.isArray(options.tint) ? options.tint : [options.tint ?? 0xffffff];
    const [minSpeed, maxSpeed] = options.speed ?? [60, 220];
    const [minAngle, maxAngle] = options.angle ?? [0, Math.PI * 2];
    const [minLife, maxLife] = options.life ?? [0.7, 1.4];
    const [minScale, maxScale] = options.scale ?? [0.4, 0.9];

    for (let i = 0; i < count; i++) {
      const p = this.pool.find((candidate) => !candidate.active);
      if (!p) return;
      const angle = Phaser.Math.FloatBetween(minAngle, maxAngle);
      const speed = Phaser.Math.FloatBetween(minSpeed, maxSpeed);
      p.active = true;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.gravity = options.gravity ?? 0;
      p.maxLife = p.life = Phaser.Math.FloatBetween(minLife, maxLife);
      p.startScale = Phaser.Math.FloatBetween(minScale, maxScale);
      p.endScale = options.endScale ?? 0;
      p.spin = Phaser.Math.FloatBetween(-2, 2);
      const spread = options.spread ?? 0;
      p.sprite
        .setTexture(options.texture ?? "spark")
        .setPosition(x + Phaser.Math.FloatBetween(-spread, spread), y + Phaser.Math.FloatBetween(-spread, spread))
        .setTint(Phaser.Utils.Array.GetRandom(tints))
        .setBlendMode(options.additive === false ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD)
        .setAlpha(1)
        .setVisible(true);
    }
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.sprite.setVisible(false);
        continue;
      }
      p.vy += p.gravity * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.rotation += p.spin * dt;
      const t = 1 - p.life / p.maxLife;
      p.sprite.setScale(Phaser.Math.Linear(p.startScale, p.endScale, t));
      p.sprite.setAlpha(Math.min(1, p.life / p.maxLife * 2.2));
    }
  }

  destroy(): void {
    this.pool.forEach((p) => p.sprite.destroy());
    this.pool.length = 0;
  }
}
