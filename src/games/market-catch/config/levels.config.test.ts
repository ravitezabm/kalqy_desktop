import { describe, expect, it } from "vitest";
import { FRUIT_REGISTRY } from "../objects";
import { MARKET_LEVELS, validateMarketLevel } from "./levels.config";

describe("Market Catch levels", () => {
  it("has training plus ten story levels with unique ids", () => {
    expect(MARKET_LEVELS).toHaveLength(11);
    expect(MARKET_LEVELS[0].kind).toBe("training");
    expect(new Set(MARKET_LEVELS.map((l) => l.id)).size).toBe(11);
  });

  it("every level validates against the object registry", () => {
    for (const level of MARKET_LEVELS) expect(validateMarketLevel(level, FRUIT_REGISTRY), level.id).toEqual([]);
  });

  it("only ever asks for fresh fruit, never a rotten one or one that is also a hazard", () => {
    for (const level of MARKET_LEVELS) {
      for (const target of level.goal.targets) expect(FRUIT_REGISTRY.get(target.objectId)?.behavior.collectible, target.objectId).toBe(true);
      for (const id of level.hazards) expect(FRUIT_REGISTRY.get(id)?.behavior.hazard, id).toBe(true);
      for (const id of level.distractors) {
        expect(FRUIT_REGISTRY.get(id)?.behavior.hazard, id).toBe(false);
        expect(level.goal.targets.some((t) => t.objectId === id), `${level.id} distractor ${id}`).toBe(false);
      }
    }
  });

  it("introduces rotten fruit at level 3 and gets harder", () => {
    const story = MARKET_LEVELS.filter((l) => l.kind === "story");
    expect(story[0].hazards).toEqual([]);
    expect(story[1].hazards).toEqual([]);
    expect(story[2].hazards.length).toBeGreaterThan(0);
    expect(story[9].spawning.spawnIntervalMs).toBeLessThan(story[0].spawning.spawnIntervalMs);
    expect(story[9].spawning.fallSpeed[1]).toBeGreaterThan(story[0].spawning.fallSpeed[1]);
  });

  it("levels 9 and 10 ask for several different fruits", () => {
    expect(MARKET_LEVELS[9].goal.targets.length).toBe(3);
    expect(MARKET_LEVELS[10].goal.targets.length).toBe(4);
  });

  it("every story level leaves enough time for its goal", () => {
    for (const level of MARKET_LEVELS.filter((l) => l.kind === "story")) {
      const needed = level.goal.targets.reduce((sum, t) => sum + t.count, 0);
      const wantedSpawns = (level.timeLimitSeconds * 1000 / level.spawning.spawnIntervalMs) * level.spawning.wantedRatio;
      expect(wantedSpawns / needed, level.id).toBeGreaterThan(1.8);
    }
  });

  it("rejects a broken level", () => {
    const broken = { ...MARKET_LEVELS[1], goal: { targets: [{ objectId: "unicorn_fresh", count: 0, label: "?" }] } };
    expect(validateMarketLevel(broken, FRUIT_REGISTRY).length).toBeGreaterThan(0);
  });
});
