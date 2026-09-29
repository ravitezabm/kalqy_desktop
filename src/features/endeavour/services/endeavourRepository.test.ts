import { beforeEach, describe, expect, it } from "vitest";

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
} as Storage;

const { localEndeavourRepository, adventureIdForRoute } = await import("./endeavourRepository");

const statusOf = async (id: string) =>
  (await localEndeavourRepository.getWorld("kid")).adventures.find((a) => a.id === id)?.status;

describe("endeavourRepository", () => {
  beforeEach(() => store.clear());

  it("starts with only the first adventure playable", async () => {
    expect(await statusOf("adventure_01")).toBe("available");
    expect(await statusOf("adventure_02")).toBe("locked");
  });

  it("shows partial progress as in_progress without unlocking the next island", async () => {
    await localEndeavourRepository.reportProgress("kid", "adventure_01", 40);
    const world = await localEndeavourRepository.getWorld("kid");
    const first = world.adventures.find((a) => a.id === "adventure_01");
    expect(first?.status).toBe("in_progress");
    expect(first?.progress).toBe(40);
    expect(await statusOf("adventure_02")).toBe("locked");
  });

  it("completing an adventure unlocks the next one and survives a reload", async () => {
    await localEndeavourRepository.completeAdventure("kid", "adventure_01", { stars: 3, score: 900 });
    expect(await statusOf("adventure_01")).toBe("completed");
    expect(await statusOf("adventure_02")).toBe("available");
  });

  it("keeps profiles independent", async () => {
    await localEndeavourRepository.completeAdventure("kid", "adventure_01", { stars: 3, score: 900 });
    const other = await localEndeavourRepository.getWorld("someone-else");
    expect(other.adventures.find((a) => a.id === "adventure_02")?.status).toBe("locked");
  });

  it("finds an adventure by its game route", () => {
    expect(adventureIdForRoute("/games/butterfly-meadow")).toBe("adventure_01");
    expect(adventureIdForRoute("/games/nope")).toBeNull();
  });
});
