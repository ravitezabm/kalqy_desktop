import { describe, expect, it } from "vitest";
import { createRng } from "../../content/random";
import { ObjectSpawner, type SpawnConfig, type SpawnContext } from "./ObjectSpawner";

const CONFIG: SpawnConfig = {
  spawnIntervalMs: 1000,
  fallSpeed: [150, 200],
  maxObjects: 3,
  minX: 300,
  maxX: 980,
  spawnY: [60, 60],
  minSeparation: 130,
  wantedRatio: 0.5,
  hazardRatio: 0.2,
  guaranteeWantedMs: 4000,
  spin: 40,
};
const POOLS = { wanted: ["apple"], distractors: ["orange"], hazards: ["rotten"] };
const context = (over: Partial<SpawnContext> = {}): SpawnContext => ({
  active: [],
  playerX: 640,
  playerSpeed: 600,
  catchY: 480,
  catchHalfWidth: 80,
  neededIds: ["apple"],
  ...over,
});

function collect(spawner: ObjectSpawner, ms: number, ctx = context()) {
  const out = [];
  for (let t = 0; t < ms; t += 50) {
    const r = spawner.update(50, ctx);
    if (r) out.push(r);
  }
  return out;
}

describe("ObjectSpawner", () => {
  it("spawns on the interval, inside the play area, above the screen", () => {
    const spawns = collect(new ObjectSpawner(CONFIG, POOLS, createRng(1)), 10000);
    expect(spawns.length).toBeGreaterThan(6);
    for (const s of spawns) {
      expect(s.x).toBeGreaterThanOrEqual(CONFIG.minX);
      expect(s.x).toBeLessThanOrEqual(CONFIG.maxX);
      expect(s.y).toBeLessThan(0);
      expect(s.vy).toBeGreaterThanOrEqual(150);
      expect(s.vy).toBeLessThanOrEqual(200);
    }
  });

  it("never exceeds maxObjects", () => {
    const spawner = new ObjectSpawner(CONFIG, POOLS, createRng(2));
    const full = context({ active: [{ x: 400, y: 100 }, { x: 600, y: 100 }, { x: 800, y: 100 }] });
    expect(collect(spawner, 5000, full)).toHaveLength(0);
  });

  it("guarantees a wanted object so a level can't stall", () => {
    const spawner = new ObjectSpawner({ ...CONFIG, wantedRatio: 0, hazardRatio: 0, guaranteeWantedMs: 2500 }, POOLS, createRng(3));
    const spawns = collect(spawner, 6000);
    expect(spawns.some((s) => s.role === "wanted")).toBe(true);
  });

  it("places wanted objects where the player can reach them in time", () => {
    const spawner = new ObjectSpawner({ ...CONFIG, wantedRatio: 1, hazardRatio: 0, fallSpeed: [300, 300] }, POOLS, createRng(4));
    const ctx = context({ playerX: 320, playerSpeed: 200 });
    const spawns = collect(spawner, 20000, ctx).filter((s) => s.role === "wanted");
    const fall = (480 + 60) / 300;
    const reach = 200 * fall * 0.7 + 80 * 0.6;
    expect(spawns.length).toBeGreaterThan(5);
    for (const s of spawns) expect(Math.abs(s.x - 320)).toBeLessThanOrEqual(reach + 0.01);
  });

  it("keeps objects near the top apart", () => {
    const spawner = new ObjectSpawner({ ...CONFIG, wantedRatio: 0, hazardRatio: 0 }, { ...POOLS, distractors: ["orange"] }, createRng(5));
    const ctx = context({ neededIds: [], active: [{ x: 640, y: 40 }] });
    const spawns = collect(spawner, 30000, ctx);
    expect(spawns.length).toBeGreaterThan(10);
    for (const s of spawns) expect(Math.abs(s.x - 640)).toBeGreaterThanOrEqual(130);
  });

  it("only drops wanted objects that still advance the goal", () => {
    const spawner = new ObjectSpawner({ ...CONFIG, wantedRatio: 1, hazardRatio: 0 }, { wanted: ["apple", "banana"], distractors: [], hazards: [] }, createRng(6));
    const spawns = collect(spawner, 8000, context({ neededIds: ["banana"] }));
    expect(spawns.every((s) => s.objectId === "banana")).toBe(true);
  });

  it("is deterministic for a seed", () => {
    const a = collect(new ObjectSpawner(CONFIG, POOLS, createRng(9)), 8000);
    const b = collect(new ObjectSpawner(CONFIG, POOLS, createRng(9)), 8000);
    expect(a).toEqual(b);
  });
});
