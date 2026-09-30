import Phaser from "phaser";

interface Droplet {
  sprite: Phaser.GameObjects.Image;
  t: number;
  speed: number;
  offset: number;
  active: boolean;
}

interface Splash {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  active: boolean;
}

export interface WaterStreamOptions {
  depth: number;
  color?: number;
  /** Ribbon width in px at the source. */
  width?: number;
  /** Droplet pool size at full quality. */
  maxDroplets?: number;
}

const DROPLET_LIFETIME_S = 0.75;

/**
 * A soft, glowing stream of water from `origin` to `target` — a faint
 * tapered ribbon plus a pool of droplets riding a gentle curve, with little
 * splashes on arrival. Everything is pooled up front (no per-frame
 * allocation) and `quality` (0..1) scales the particle count so it degrades
 * gracefully on slow machines. Reusable by any game (River, future rain, etc.).
 */
export class WaterStream {
  private readonly ribbon: Phaser.GameObjects.Graphics;
  private readonly droplets: Droplet[] = [];
  private readonly splashes: Splash[] = [];
  private readonly color: number;
  private readonly width: number;

  private origin = new Phaser.Math.Vector2();
  private target = new Phaser.Math.Vector2();
  private flowing = false;
  private flow = 0;
  private quality = 1;
  private spawnCarry = 0;
  private elapsed = 0;

  constructor(scene: Phaser.Scene, options: WaterStreamOptions) {
    this.color = options.color ?? 0x6fc8ff;
    this.width = options.width ?? 46;
    this.ribbon = scene.add.graphics().setDepth(options.depth);

    const count = options.maxDroplets ?? 70;
    for (let i = 0; i < count; i++) {
      const sprite = scene.add.image(0, 0, "droplet").setDepth(options.depth + 1).setVisible(false);
      this.droplets.push({ sprite, t: 0, speed: 1, offset: 0, active: false });
    }
    for (let i = 0; i < 24; i++) {
      const sprite = scene.add.image(0, 0, "droplet").setDepth(options.depth + 1).setVisible(false).setScale(0.3);
      this.splashes.push({ sprite, vx: 0, vy: 0, life: 0, active: false });
    }
  }

  setEndpoints(originX: number, originY: number, targetX: number, targetY: number): void {
    this.origin.set(originX, originY);
    this.target.set(targetX, targetY);
  }

  setFlowing(flowing: boolean): void {
    this.flowing = flowing;
  }

  /** 0..1 — fewer droplets when the machine is struggling. */
  setQuality(quality: number): void {
    this.quality = Phaser.Math.Clamp(quality, 0.15, 1);
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.elapsed += dt;
    this.flow = Phaser.Math.Linear(this.flow, this.flowing ? 1 : 0, 1 - Math.pow(0.0005, dt));

    if (this.flow > 0.03) {
      this.spawn(dt);
      this.drawRibbon();
    } else {
      this.ribbon.clear();
    }
    this.stepDroplets(dt);
    this.stepSplashes(dt);
  }

  destroy(): void {
    this.ribbon.destroy();
    this.droplets.forEach((d) => d.sprite.destroy());
    this.splashes.forEach((s) => s.sprite.destroy());
    this.droplets.length = 0;
    this.splashes.length = 0;
  }

  /** Quadratic curve with a slow sideways sway so it never looks like a ruler line. */
  private pointAt(t: number, offset: number, out: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const sway = Math.sin(this.elapsed * 3.2 + t * 4) * 10 * (1 - t * 0.4);
    const cx = (this.origin.x + this.target.x) / 2 + sway;
    const cy = (this.origin.y + this.target.y) / 2;
    const u = 1 - t;
    const x = u * u * this.origin.x + 2 * u * t * cx + t * t * this.target.x;
    const y = u * u * this.origin.y + 2 * u * t * cy + t * t * this.target.y;
    return out.set(x + offset * (1 - t * 0.5), y);
  }

  private spawn(dt: number): void {
    const perSecond = (this.droplets.length * this.quality * this.flow) / DROPLET_LIFETIME_S;
    this.spawnCarry += perSecond * dt;
    while (this.spawnCarry >= 1) {
      this.spawnCarry -= 1;
      const free = this.droplets.find((d) => !d.active);
      if (!free) return;
      free.active = true;
      free.t = 0;
      free.speed = Phaser.Math.FloatBetween(0.85, 1.25) / DROPLET_LIFETIME_S;
      free.offset = Phaser.Math.FloatBetween(-this.width * 0.4, this.width * 0.4);
      free.sprite.setVisible(true).setTint(Math.random() < 0.3 ? 0xffffff : this.color);
    }
  }

  private stepDroplets(dt: number): void {
    const point = new Phaser.Math.Vector2();
    for (const d of this.droplets) {
      if (!d.active) continue;
      d.t += d.speed * dt;
      if (d.t >= 1) {
        d.active = false;
        d.sprite.setVisible(false);
        this.emitSplash(this.target.x + d.offset * 0.4, this.target.y);
        continue;
      }
      this.pointAt(d.t, d.offset, point);
      const fall = Phaser.Math.Easing.Sine.In(d.t);
      point.y += fall * 8;
      d.sprite.setPosition(point.x, point.y);
      d.sprite.setScale(0.55 + d.t * 0.25);
      d.sprite.setAlpha(Math.min(1, d.t * 6) * (1 - Math.max(0, d.t - 0.85) * 6) * 0.9);
    }
  }

  private emitSplash(x: number, y: number): void {
    if (Math.random() > this.quality) return;
    const free = this.splashes.find((s) => !s.active);
    if (!free) return;
    free.active = true;
    free.life = 0.45;
    free.vx = Phaser.Math.FloatBetween(-90, 90);
    free.vy = Phaser.Math.FloatBetween(-190, -90);
    free.sprite.setPosition(x, y).setVisible(true).setAlpha(0.9);
  }

  private stepSplashes(dt: number): void {
    for (const s of this.splashes) {
      if (!s.active) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.active = false;
        s.sprite.setVisible(false);
        continue;
      }
      s.vy += 520 * dt;
      s.sprite.x += s.vx * dt;
      s.sprite.y += s.vy * dt;
      s.sprite.setAlpha(Math.min(1, s.life * 3) * 0.9);
    }
  }

  private drawRibbon(): void {
    const g = this.ribbon;
    g.clear();
    const point = new Phaser.Math.Vector2();
    const segments = 14;
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const a = this.pointAt(t0, 0, new Phaser.Math.Vector2());
      const b = this.pointAt(t1, 0, point);
      const taper = 1 - t0 * 0.55;
      g.lineStyle(this.width * taper, this.color, 0.13 * this.flow);
      g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(this.width * taper * 0.4, 0xffffff, 0.2 * this.flow);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }
}
