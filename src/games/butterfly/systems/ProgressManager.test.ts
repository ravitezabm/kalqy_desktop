import { describe, expect, it } from "vitest";
import type { StorageAdapter } from "../../../engine/persistence/StorageAdapter";
import { ProgressManager } from "./ProgressManager";

function memoryStorage(): StorageAdapter {
  const map = new Map<string, unknown>();
  return {
    get: <T,>(key: string) => (map.has(key) ? (structuredClone(map.get(key)) as T) : null),
    set: (key, value) => void map.set(key, structuredClone(value)),
    remove: (key) => void map.delete(key),
  };
}

describe("ProgressManager", () => {
  it("marks training complete without recording a story level", () => {
    const progress = new ProgressManager("kid", memoryStorage());
    progress.recordSuccess("butterfly-training", 3, 100, 0);
    expect(progress.snapshot().trainingCompleted).toBe(true);
    expect(Object.keys(progress.snapshot().levels)).toHaveLength(0);
  });

  it("keeps the best stars and score across replays", () => {
    const progress = new ProgressManager("kid", memoryStorage());
    progress.recordSuccess("butterfly-story-01", 3, 500, 0);
    progress.recordSuccess("butterfly-story-01", 1, 200, 2);
    expect(progress.snapshot().levels["butterfly-story-01"]).toEqual({ stars: 3, bestScore: 500, attempts: 2 });
    expect(progress.snapshot().wrongMatches).toBe(2);
  });

  it("persists per profile and survives a reload", () => {
    const storage = memoryStorage();
    new ProgressManager("a", storage).recordSuccess("butterfly-story-01", 2, 300, 1);
    expect(new ProgressManager("a", storage).isCompleted("butterfly-story-01")).toBe(true);
    expect(new ProgressManager("b", storage).isCompleted("butterfly-story-01")).toBe(false);
  });

  it("reset() clears saved progress", () => {
    const storage = memoryStorage();
    const progress = new ProgressManager("a", storage);
    progress.recordSuccess("butterfly-story-01", 2, 300, 0);
    progress.reset();
    expect(new ProgressManager("a", storage).isCompleted("butterfly-story-01")).toBe(false);
  });
});
