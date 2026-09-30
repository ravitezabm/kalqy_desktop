export type ZoneHand = "left" | "right";

export interface HitZone {
  id: number;
  x: number;
  y: number;
  radius: number;
}

/** What the detector needs to know about one tracked hand, already mapped to screen pixels. */
export interface HandSample {
  hand: ZoneHand;
  visible: boolean;
  x: number;
  y: number;
  /** Speed in normalized units/second (screen-size independent). */
  speed: number;
  /** Velocity components (same units as speed). When given, a tap must be mostly vertical, so sweeping sideways out of a zone is never a tap. */
  vx?: number;
  vy?: number;
  confidence: number;
}

export interface ZoneHit {
  hand: ZoneHand;
  zone: number;
  time: number;
  speed: number;
  /** How the hit was made. */
  by: "enter" | "tap" | "press";
}

/**
 * - entry: a hit when the hand moves onto a zone (moving at least `minEnterSpeed`)
 * - tap: a hit when a quick movement happens while already over a zone
 * - press: a hit after the hand has rested on a zone for `pressMs`
 * Modes combine, so a story game can use "entry" and "tap" together.
 */
export type HitMode = "entry" | "tap" | "press";

export interface HandZoneConfig {
  modes: HitMode[];
  /** Hands below this confidence are ignored. */
  minConfidence: number;
  minEnterSpeed: number;
  /** Speed a movement must reach inside a zone to count as a tap. */
  tapSpeed: number;
  /** The same hand can't hit again sooner than this (seconds' worth, in ms) — no audio spam. */
  minHitIntervalMs: number;
  /** The same hand can't hit the SAME zone again sooner than this — kills double hits from edge jitter or a settling hand. */
  sameZoneIntervalMs: number;
  pressMs: number;
  /** A tap can't follow the zone entry sooner than this — the entry itself was the hit. */
  tapGraceMs: number;
  /** How much more vertical than sideways a tap movement must be. */
  tapVerticalRatio: number;
  /** A hand must leave by this factor of the radius before it counts as "out" (stops flicker on the edge). */
  leaveFactor: number;
}

export const DEFAULT_HAND_ZONE_CONFIG: HandZoneConfig = {
  modes: ["entry", "tap"],
  minConfidence: 0.5,
  minEnterSpeed: 0.1,
  tapSpeed: 0.8,
  minHitIntervalMs: 120,
  sameZoneIntervalMs: 450,
  pressMs: 350,
  tapGraceMs: 350,
  tapVerticalRatio: 1.3,
  leaveFactor: 1.3,
};

interface HandState {
  zone: number | null;
  lastHitAt: number;
  zoneHitAt: Map<number, number>;
  enteredAt: number;
  /** Speed was below the tap threshold recently — a tap needs a fresh rise above it. */
  armed: boolean;
  pressed: boolean;
}

/**
 * Turns hand positions into hits on circular zones. Pure: no Phaser, no
 * clock of its own — callers pass the time. Each hand is judged
 * independently, so both hands can hit different (or the same) zones at once.
 */
export class HandZoneHitDetector {
  private readonly hands = new Map<ZoneHand, HandState>();
  private readonly config: HandZoneConfig;

  constructor(config: Partial<HandZoneConfig> = {}) {
    this.config = { ...DEFAULT_HAND_ZONE_CONFIG, ...config };
  }

  reset(): void {
    this.hands.clear();
  }

  /** Which zone (if any) the hand is over right now, for highlighting. */
  zoneUnder(hand: ZoneHand): number | null {
    return this.hands.get(hand)?.zone ?? null;
  }

  update(samples: readonly HandSample[], zones: readonly HitZone[], time: number): ZoneHit[] {
    const hits: ZoneHit[] = [];
    const { modes, minConfidence, minEnterSpeed, tapSpeed, minHitIntervalMs, sameZoneIntervalMs, pressMs, tapGraceMs, tapVerticalRatio, leaveFactor } = this.config;

    for (const sample of samples) {
      const state = this.hands.get(sample.hand) ?? { zone: null, lastHitAt: -Infinity, zoneHitAt: new Map<number, number>(), enteredAt: 0, armed: true, pressed: false };
      this.hands.set(sample.hand, state);

      if (!sample.visible || sample.confidence < minConfidence) {
        state.zone = null;
        state.armed = true;
        continue;
      }

      // Nearest zone the hand is inside. A hand already in a zone keeps it until it is clearly outside.
      let inside: number | null = null;
      let bestDistance = Infinity;
      for (const zone of zones) {
        const distance = Math.hypot(sample.x - zone.x, sample.y - zone.y);
        const reach = zone.radius * (state.zone === zone.id ? leaveFactor : 1);
        if (distance <= reach && distance < bestDistance) {
          inside = zone.id;
          bestDistance = distance;
        }
      }

      const canHit = (time - state.lastHitAt) * 1000 >= minHitIntervalMs && (inside === null || (time - (state.zoneHitAt.get(inside) ?? -Infinity)) * 1000 >= sameZoneIntervalMs);
      const fire = (zone: number, by: ZoneHit["by"]) => {
        state.lastHitAt = time;
        state.zoneHitAt.set(zone, time);
        hits.push({ hand: sample.hand, zone, time, speed: sample.speed, by });
      };

      if (inside !== state.zone) {
        state.zone = inside;
        state.enteredAt = time;
        state.pressed = false;
        // A hand that just arrived is "armed" only once it slows below the tap speed again.
        state.armed = sample.speed < tapSpeed;
        if (inside !== null && modes.includes("entry") && sample.speed >= minEnterSpeed && canHit) fire(inside, "enter");
      } else if (inside !== null) {
        if (sample.speed < tapSpeed * 0.6) state.armed = true;
        const vertical = sample.vy === undefined || Math.abs(sample.vy) >= Math.abs(sample.vx ?? 0) * tapVerticalRatio;
        const settled = (time - state.enteredAt) * 1000 >= tapGraceMs;
        if (modes.includes("tap") && state.armed && settled && vertical && sample.speed >= tapSpeed && canHit) {
          state.armed = false;
          fire(inside, "tap");
        } else if (modes.includes("press") && !state.pressed && (time - state.enteredAt) * 1000 >= pressMs && canHit) {
          state.pressed = true;
          fire(inside, "press");
        }
      } else {
        state.armed = true;
      }
    }
    return hits;
  }
}
