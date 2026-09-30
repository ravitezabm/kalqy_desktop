import type { Rng } from "../../content/random";

export type SpawnRole = "wanted" | "distractor" | "hazard";

export interface SpawnConfig {
  spawnIntervalMs: number;
  /** px/s, picked per object. */
  fallSpeed: [number, number];
  maxObjects: number;
  /** Horizontal range objects may appear in — kept inside what the player can reach. */
  minX: number;
  maxX: number;
  /** Objects start this many px above the top; a range gives vertical variety. */
  spawnY: [number, number];
  /** Two objects still near the top never sit closer than this (px). */
  minSeparation: number;
  wantedRatio: number;
  hazardRatio: number;
  /** If no wanted object was sent for this long, the next one is wanted. */
  guaranteeWantedMs: number;
  /** Max spin in degrees/second (sign is random). */
  spin: number;
}

export interface SpawnPools {
  wanted: readonly string[];
  distractors: readonly string[];
  hazards: readonly string[];
}

export interface SpawnContext {
  /** Live falling objects, to keep spawns apart. */
  active: readonly { x: number; y: number }[];
  playerX: number;
  /** How fast the player can cross the screen (px/s) — decides what is reachable. */
  playerSpeed: number;
  /** Y where objects meet the player. */
  catchY: number;
  /** Half width of the catch area (px). */
  catchHalfWidth: number;
  /** Ids (from pools.wanted) that still advance the goal and aren't already on their way. */
  neededIds: readonly string[];
}

export interface SpawnRequest {
  objectId: string;
  role: SpawnRole;
  x: number;
  y: number;
  vy: number;
  spin: number;
  /** Small random size variation, ~0.92..1.08. */
  scale: number;
}

/**
 * Decides *when* and *what* to drop — pure logic, no Phaser. It keeps play
 * fair: never more than `maxObjects`, never two objects stacked on the same
 * spot, and every wanted object is placed where the player can still reach
 * it in time. A wanted object is also guaranteed regularly so a level can
 * never stall.
 */
export class ObjectSpawner {
  private sinceSpawn = 0;
  private sinceWanted = 0;
  private nextDelay: number;

  constructor(private readonly config: SpawnConfig, private pools: SpawnPools, private readonly rng: Rng) {
    this.nextDelay = config.spawnIntervalMs * 0.5;
  }

  reset(): void {
    this.sinceSpawn = 0;
    this.sinceWanted = 0;
    this.nextDelay = this.config.spawnIntervalMs * 0.5;
  }

  update(deltaMs: number, context: SpawnContext): SpawnRequest | null {
    this.sinceSpawn += deltaMs;
    this.sinceWanted += deltaMs;
    if (this.sinceSpawn < this.nextDelay || context.active.length >= this.config.maxObjects) return null;

    const role = this.pickRole(context);
    const pool = this.poolFor(role, context);
    if (pool.length === 0) return null;

    const objectId = this.rng.pick(pool);
    const [minSpeed, maxSpeed] = this.config.fallSpeed;
    const vy = minSpeed + this.rng.next() * (maxSpeed - minSpeed);
    const y = -this.config.spawnY[0] - this.rng.next() * (this.config.spawnY[1] - this.config.spawnY[0]);
    const x = this.pickX(role, y, vy, context);

    this.sinceSpawn = 0;
    if (role === "wanted") this.sinceWanted = 0;
    this.nextDelay = this.config.spawnIntervalMs * (0.85 + this.rng.next() * 0.3);
    return { objectId, role, x, y, vy, spin: (this.rng.next() * 2 - 1) * this.config.spin, scale: 0.92 + this.rng.next() * 0.16 };
  }

  private pickRole(context: SpawnContext): SpawnRole {
    if (context.neededIds.length > 0 && this.sinceWanted >= this.config.guaranteeWantedMs) return "wanted";
    const roll = this.rng.next();
    if (roll < this.config.hazardRatio && this.pools.hazards.length > 0) return "hazard";
    if (roll < this.config.hazardRatio + this.config.wantedRatio && context.neededIds.length > 0) return "wanted";
    return this.pools.distractors.length > 0 ? "distractor" : context.neededIds.length > 0 ? "wanted" : "hazard";
  }

  private poolFor(role: SpawnRole, context: SpawnContext): readonly string[] {
    if (role === "wanted") return context.neededIds;
    return role === "hazard" ? this.pools.hazards : this.pools.distractors;
  }

  private pickX(role: SpawnRole, spawnY: number, vy: number, context: SpawnContext): number {
    const { minX, maxX, minSeparation } = this.config;
    const fallTime = Math.max((context.catchY - spawnY) / vy, 0.2);
    // Wanted objects must be reachable: the player can cover this much before it lands.
    const reach = context.playerSpeed * fallTime * 0.7 + context.catchHalfWidth * 0.6;
    const lo = role === "wanted" ? Math.max(minX, context.playerX - reach) : minX;
    const hi = role === "wanted" ? Math.min(maxX, context.playerX + reach) : maxX;

    const near = context.active.filter((o) => o.y < 260);
    let fallback = (lo + hi) / 2;
    let bestGap = -1;
    for (let attempt = 0; attempt < 14; attempt++) {
      const x = lo + this.rng.next() * (hi - lo);
      const gap = near.reduce((min, o) => Math.min(min, Math.abs(o.x - x)), Infinity);
      if (gap >= minSeparation) return x;
      if (gap > bestGap) {
        bestGap = gap;
        fallback = x;
      }
    }
    return fallback;
  }
}
