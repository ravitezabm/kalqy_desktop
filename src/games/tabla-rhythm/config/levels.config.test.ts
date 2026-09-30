import { describe, expect, it } from "vitest";
import { noteEvents } from "../../../engine/rhythm/RhythmPattern";
import { TABLA_LEVELS, validateTablaLevel } from "./levels.config";

describe("Tabla Rhythm levels", () => {
  it("has training plus ten story levels with unique ids", () => {
    expect(TABLA_LEVELS).toHaveLength(11);
    expect(TABLA_LEVELS[0].kind).toBe("training");
    expect(new Set(TABLA_LEVELS.map((l) => l.id)).size).toBe(11);
  });

  it("every level validates", () => {
    for (const level of TABLA_LEVELS) expect(validateTablaLevel(level), level.id).toEqual([]);
  });

  it("is very simple to medium: slow tempos, short patterns, few drums at first", () => {
    const story = TABLA_LEVELS.filter((l) => l.kind === "story");
    const bpms = story.map((l) => l.pattern.bpm);
    expect(Math.max(...bpms)).toBeLessThanOrEqual(70);
    expect([...bpms].sort((a, b) => a - b)).toEqual(bpms);
    const lengths = story.map((l) => noteEvents(l.pattern).length);
    expect(Math.min(...lengths)).toBeGreaterThanOrEqual(3);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(8);
    expect(story[0].tablaCount).toBe(2);
    expect(story[0].pattern.events.length).toBeLessThanOrEqual(4);
    expect(story[9].tablaCount).toBe(4);
  });

  it("gets a little harder each level without jumping", () => {
    const story = TABLA_LEVELS.filter((l) => l.kind === "story");
    const size = (l: (typeof story)[number]) => l.pattern.events.length + l.tablaCount;
    for (let i = 1; i < story.length; i++) expect(size(story[i]) - size(story[i - 1]), story[i].id).toBeLessThanOrEqual(2);
    expect(size(story[9])).toBeGreaterThan(size(story[0]));
  });

  it("is forgiving: wide windows, big zones, hints, and a lenient pass mark", () => {
    for (const level of TABLA_LEVELS.filter((l) => l.kind === "story")) {
      expect(level.windows.nearMs, level.id).toBeGreaterThanOrEqual(500);
      expect(level.hitRadiusScale, level.id).toBeGreaterThanOrEqual(0.6);
      expect(level.passRatio, level.id).toBeLessThanOrEqual(0.5);
      expect(level.maxAttempts, level.id).toBeLessThanOrEqual(2);
    }
  });

  it("needs only one hand: no named hands and no two-hand events", () => {
    for (const level of TABLA_LEVELS) {
      for (const event of noteEvents(level.pattern)) {
        expect(event.hits, level.id).toHaveLength(1);
        expect(event.hits[0].hand, level.id).toBe("either");
      }
      expect(level.goals).not.toContain("twoHands");
    }
  });

  it("introduces a rest at level 7", () => {
    const story = TABLA_LEVELS.filter((l) => l.kind === "story");
    expect(story.slice(0, 6).every((l) => l.pattern.events.every((e) => e.hits.length > 0))).toBe(true);
    expect(story[6].pattern.events.some((e) => e.hits.length === 0)).toBe(true);
  });

  it("tightens timing windows and removes hints as levels get harder", () => {
    const story = TABLA_LEVELS.filter((l) => l.kind === "story");
    expect(story[9].windows.perfectMs).toBeLessThan(story[0].windows.perfectMs);
    expect(story[0].showNextBeat).toBe(true);
    expect(story[9].showNextBeat).toBe(false);
    expect(story.slice(0, 9).every((l) => l.showNextBeat)).toBe(true);
  });

  it("training is slow and forgiving with no penalties", () => {
    const t = TABLA_LEVELS[0];
    expect(t.pattern.bpm).toBeLessThanOrEqual(70);
    expect(t.scoring.miss).toBe(0);
    expect(t.scoring.streakOnMiss).toBe("keep");
    expect(t.lesson).toHaveLength(3);
  });

  it("rejects a broken level", () => {
    const broken = { ...TABLA_LEVELS[1], tablaCount: 1 };
    expect(validateTablaLevel(broken).length).toBeGreaterThan(0);
  });
});
