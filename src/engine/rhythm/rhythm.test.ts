import { describe, expect, it } from "vitest";
import { parsePattern, validatePattern, noteEvents } from "./RhythmPattern";
import { RhythmClock } from "./RhythmClock";
import { RhythmValidator, DEFAULT_WINDOWS } from "./RhythmValidator";
import { RhythmEngine } from "./RhythmEngine";
import { RhythmScore } from "./RhythmScore";

describe("parsePattern", () => {
  it("reads tokens into events, rests and two-hand events", () => {
    const p = parsePattern(90, ["1", "-", "L2", "L1+R4"]);
    expect(p.events[0]).toEqual({ beat: 0, hits: [{ hand: "either", tabla: 0 }] });
    expect(p.events[1].hits).toEqual([]);
    expect(p.events[2].hits).toEqual([{ hand: "left", tabla: 1 }]);
    expect(p.events[3].hits).toEqual([{ hand: "left", tabla: 0 }, { hand: "right", tabla: 3 }]);
    expect(noteEvents(p)).toHaveLength(3);
    expect(p.lengthBeats).toBe(4);
  });

  it("validates tablas and hands", () => {
    expect(validatePattern(parsePattern(60, ["1", "2"]), 2)).toEqual([]);
    expect(validatePattern(parsePattern(60, ["1", "3"]), 2)[0]).toMatch(/tabla 3 does not exist/);
    expect(validatePattern(parsePattern(60, ["L1+L2"]), 4)[0]).toMatch(/same hand/);
    expect(() => parsePattern(60, ["x"])).toThrow();
  });
});

describe("RhythmClock", () => {
  it("converts between time and beats, with a count-in before beat 0", () => {
    const c = new RhythmClock(120);
    c.start(10);
    expect(c.beatDuration).toBeCloseTo(0.5);
    expect(c.barDuration).toBeCloseTo(2);
    expect(c.timeAtBeat(2)).toBeCloseTo(11);
    expect(c.beatAt(10.25)).toBeCloseTo(0.5);
    expect(c.position(11.6)).toMatchObject({ bar: 0, beatInBar: 3 });
    expect(c.position(12.1).bar).toBe(1);
    expect(c.position(9.6).beat).toBeCloseTo(-0.8);
  });
});

const events = (tokens: string[]) => noteEvents(parsePattern(60, tokens));
const validator = (tokens: string[], windows = DEFAULT_WINDOWS) => new RhythmValidator(events(tokens), (e) => e.beat, windows);

describe("RhythmValidator", () => {
  it("grades by how close the hit is", () => {
    const v = validator(["1", "2", "1", "2"]);
    expect(v.hit({ hand: "right", tabla: 0, time: 0.05 })).toMatchObject({ kind: "matched", grade: "perfect" });
    expect(v.hit({ hand: "left", tabla: 1, time: 1.18 })).toMatchObject({ grade: "good" });
    expect(v.hit({ hand: "left", tabla: 0, time: 2.3 })).toMatchObject({ grade: "near" });
  });

  it("ignores the wrong tabla without punishing", () => {
    const v = validator(["1", "2"]);
    expect(v.hit({ hand: "right", tabla: 3, time: 0 })).toEqual({ kind: "stray" });
    expect(v.hit({ hand: "right", tabla: 1, time: 0 })).toEqual({ kind: "stray" });
    expect(v.results).toHaveLength(0);
  });

  it("does not match a hit that is too far from any event", () => {
    const v = validator(["1", "-", "-", "2"]);
    expect(v.hit({ hand: "right", tabla: 0, time: 1.6 })).toEqual({ kind: "stray" });
  });

  it("expires events nobody played as misses", () => {
    const v = validator(["1", "2"]);
    expect(v.advance(0.2)).toHaveLength(0);
    const expired = v.advance(1.5);
    expect(expired.map((r) => r.grade)).toEqual(["miss", "miss"]);
    expect(v.finished).toBe(true);
  });

  it("respects a named hand but lets 'either' use any", () => {
    const v = validator(["L1", "2"]);
    expect(v.hit({ hand: "right", tabla: 0, time: 0 })).toEqual({ kind: "stray" });
    expect(v.hit({ hand: "left", tabla: 0, time: 0 })).toMatchObject({ kind: "matched" });
    expect(v.hit({ hand: "right", tabla: 1, time: 1 })).toMatchObject({ kind: "matched" });
  });

  it("needs both hands for a two-hand event, close together", () => {
    const v = validator(["L1+R3"]);
    const first = v.hit({ hand: "left", tabla: 0, time: 0.02 });
    expect(first).toMatchObject({ kind: "matched", result: null });
    const second = v.hit({ hand: "right", tabla: 2, time: 0.1 });
    expect(second).toMatchObject({ kind: "matched" });
    expect((second as { result: { twoHands: boolean } }).result).toMatchObject({ twoHands: true, grade: "perfect" });
  });

  it("does not pair hits that are too far apart, and credits a lone hit as near", () => {
    const v = validator(["L1+R3"], { ...DEFAULT_WINDOWS, simultaneousMs: 100 });
    v.hit({ hand: "left", tabla: 0, time: -0.1 });
    expect(v.hit({ hand: "right", tabla: 2, time: 0.25 })).toEqual({ kind: "stray" });
    const [result] = v.advance(2);
    expect(result).toMatchObject({ grade: "near", partial: true, twoHands: false });
  });

  it("two 'either' hits in one event need different hands", () => {
    const v = validator(["1+2"]);
    v.hit({ hand: "left", tabla: 0, time: 0 });
    expect(v.hit({ hand: "left", tabla: 1, time: 0 })).toEqual({ kind: "stray" });
    expect(v.hit({ hand: "right", tabla: 1, time: 0 })).toMatchObject({ kind: "matched" });
  });

  it("repeated hits on one tabla match successive events", () => {
    const v = validator(["1", "1", "2"]);
    expect(v.hit({ hand: "right", tabla: 0, time: 0 })).toMatchObject({ eventIndex: 0 });
    expect(v.hit({ hand: "right", tabla: 0, time: 1 })).toMatchObject({ eventIndex: 1 });
  });

  it("reports the next open event for hints", () => {
    const v = validator(["1", "-", "3"]);
    expect(v.nextOpen()).toMatchObject({ eventIndex: 0, tablas: [0] });
    v.hit({ hand: "right", tabla: 0, time: 0 });
    expect(v.nextOpen()).toMatchObject({ eventIndex: 1, time: 2, tablas: [2] });
  });
});

describe("RhythmEngine", () => {
  const pattern = parsePattern(60, ["1", "2", "-", "L1+R3"]);

  it("demo: count-in ticks then the pattern's events, in time order, all known up front", () => {
    const engine = new RhythmEngine(pattern, { countInBeats: 2 });
    const cues = engine.startDemo(10);
    expect(cues.map((c) => c.kind)).toEqual(["tick", "tick", "event", "event", "event"]);
    expect(cues.map((c) => c.time)).toEqual([10, 11, 12, 13, 15]);
    expect(cues[0].accent).toBe(true);
    expect(cues[1].accent).toBe(false);
  });

  it("demo: fires cues as time passes and finishes after the tail", () => {
    const engine = new RhythmEngine(pattern, { countInBeats: 2 });
    engine.startDemo(0);
    expect(engine.update(1.5).cues).toHaveLength(2);
    expect(engine.update(2.5).cues.map((c) => c.beat)).toEqual([0]);
    expect(engine.update(4.9).finished).toBe(false);
    expect(engine.update(6.6).finished).toBe(true);
  });

  it("player: judges hits against the same pattern and finishes when everything is judged", () => {
    const engine = new RhythmEngine(pattern, { countInBeats: 1 });
    engine.startPlayer(0);
    // beat 0 is at t=1
    expect(engine.hit({ hand: "right", tabla: 0, time: 1.02 })).toMatchObject({ kind: "matched", grade: "perfect" });
    expect(engine.hit({ hand: "left", tabla: 1, time: 2.3 })).toMatchObject({ kind: "matched", grade: "near" });
    engine.hit({ hand: "left", tabla: 0, time: 4 });
    engine.hit({ hand: "right", tabla: 2, time: 4.05 });
    const tick = engine.update(4.6);
    expect(tick.finished).toBe(true);
    expect(engine.results().map((r) => r.grade)).toEqual(["perfect", "near", "perfect"]);
  });

  it("ignores hits when not in player mode", () => {
    const engine = new RhythmEngine(pattern);
    expect(engine.hit({ hand: "right", tabla: 0, time: 0 })).toEqual({ kind: "stray" });
    engine.startDemo(0);
    expect(engine.hit({ hand: "right", tabla: 0, time: 4 })).toEqual({ kind: "stray" });
  });
});

describe("RhythmScore", () => {
  const result = (grade: "perfect" | "good" | "near" | "miss", extra = {}) => ({ eventIndex: 0, grade, offsetsMs: grade === "miss" ? [] : [0], twoHands: false, partial: false, ...extra });

  it("scores by grade and builds the streak", () => {
    const s = new RhythmScore();
    expect(s.apply(result("perfect"))).toBe(10);
    expect(s.apply(result("good"))).toBe(7);
    expect(s.apply(result("near"))).toBe(4);
    expect(s).toMatchObject({ score: 21, streak: 3, notes: 3, perfect: 1 });
  });

  it("a miss scores nothing and resets the streak by default, but never below zero", () => {
    const s = new RhythmScore();
    s.apply(result("perfect"));
    expect(s.apply(result("miss"))).toBe(0);
    expect(s).toMatchObject({ streak: 0, misses: 1, bestStreak: 1 });
    const keep = new RhythmScore({ perfect: 10, good: 7, near: 4, miss: 0, twoHandBonus: 5, streakOnMiss: "keep" }, 0, 3);
    keep.apply(result("miss"));
    expect(keep.streak).toBe(3);
  });

  it("two-hand events pay both hits plus a bonus and count double for the streak", () => {
    const s = new RhythmScore();
    const points = s.apply({ eventIndex: 0, grade: "perfect", offsetsMs: [0, 10], twoHands: true, partial: false });
    expect(points).toBe(25);
    expect(s).toMatchObject({ streak: 2, twoHandHits: 1 });
  });
});
