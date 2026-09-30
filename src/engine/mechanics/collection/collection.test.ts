import { describe, expect, it } from "vitest";
import type { ObjectDefinition } from "../falling-objects/ObjectDefinition";
import { CollectionGoal } from "./CollectionGoal";
import { registerCollectionRule, ruleMatches } from "./CollectionRule";
import { DEFAULT_SCORING, ScoreManager } from "./ScoreManager";

const def = (id: string, extra: Partial<ObjectDefinition> = {}): ObjectDefinition => ({
  id,
  type: "fruit",
  category: "fruit",
  visual: { renderer: "text", text: id, displayHeight: 100 },
  behavior: { collectible: true, hazard: false },
  score: 10,
  ...extra,
});

describe("CollectionRule", () => {
  it("matches by id, category and tag", () => {
    const apple = def("apple_fresh", { tags: ["red"] });
    expect(ruleMatches({ type: "objectId", objectId: "apple_fresh" }, apple)).toBe(true);
    expect(ruleMatches({ type: "objectId", objectId: "pear_fresh" }, apple)).toBe(false);
    expect(ruleMatches({ type: "category", category: "fruit" }, apple)).toBe(true);
    expect(ruleMatches({ type: "tag", tag: "red" }, apple)).toBe(true);
  });

  it("compares values — the same engine handles numbers as well as fruit", () => {
    const five = def("n5", { type: "number", value: 5 });
    expect(ruleMatches({ type: "value", op: "greaterThan", value: 4 }, five)).toBe(true);
    expect(ruleMatches({ type: "value", op: "lessThan", value: 4 }, five)).toBe(false);
    expect(ruleMatches({ type: "value", op: "in", value: [2, 5, 8] }, five)).toBe(true);
    expect(ruleMatches({ type: "value", op: "equals", value: 5 }, def("x"))).toBe(false);
  });

  it("supports registered custom rules only by name", () => {
    registerCollectionRule("even", (d) => typeof d.value === "number" && d.value % 2 === 0);
    expect(ruleMatches({ type: "custom", name: "even" }, def("n4", { value: 4 }))).toBe(true);
    expect(ruleMatches({ type: "custom", name: "even" }, def("n5", { value: 5 }))).toBe(false);
    expect(ruleMatches({ type: "custom", name: "missing" }, def("n4", { value: 4 }))).toBe(false);
  });
});

describe("CollectionGoal", () => {
  const goal = () =>
    new CollectionGoal([
      { rule: { type: "objectId", objectId: "apple_fresh" }, count: 2, label: "Apples" },
      { rule: { type: "objectId", objectId: "banana_fresh" }, count: 1, label: "Bananas" },
    ]);

  it("tracks each target independently", () => {
    const g = goal();
    expect(g.record(def("apple_fresh"))).toMatchObject({ accepted: true, targetIndex: 0, targetDone: false, allDone: false });
    expect(g.record(def("banana_fresh"))).toMatchObject({ accepted: true, targetIndex: 1, targetDone: true, allDone: false });
    expect(g.progress()).toBeCloseTo(2 / 3);
    expect(g.record(def("apple_fresh"))).toMatchObject({ targetDone: true, allDone: true });
    expect(g.isComplete()).toBe(true);
  });

  it("ignores other objects and does not over-count a full target", () => {
    const g = goal();
    expect(g.record(def("orange_fresh"))).toMatchObject({ matched: false, accepted: false });
    g.record(def("banana_fresh"));
    expect(g.record(def("banana_fresh"))).toMatchObject({ matched: true, accepted: false });
    expect(g.rows()[1]).toMatchObject({ value: 1, target: 1 });
  });

  it("only wants objects that still advance something", () => {
    const g = goal();
    g.record(def("banana_fresh"));
    expect(g.wants(def("banana_fresh"))).toBe(-1);
    expect(g.wants(def("apple_fresh"))).toBe(0);
  });
});

describe("ScoreManager", () => {
  it("scores outcomes from config and handles the streak", () => {
    const s = new ScoreManager(DEFAULT_SCORING);
    s.apply("correct");
    s.apply("correct");
    expect(s).toMatchObject({ score: 20, streak: 2, correct: 2 });
    expect(s.apply("wrong")).toBe(-5);
    expect(s).toMatchObject({ score: 15, streak: 0, mistakes: 1 });
    s.apply("hazard");
    expect(s.score).toBe(5);
  });

  it("never drops below zero and can decrease or keep the streak instead", () => {
    const keep = new ScoreManager({ ...DEFAULT_SCORING, streakOnMistake: "keep" });
    keep.apply("correct");
    keep.apply("hazard");
    expect(keep).toMatchObject({ score: 0, streak: 1 });
    const dec = new ScoreManager({ ...DEFAULT_SCORING, streakOnMistake: "decrease" }, 0, 3);
    dec.apply("wrong");
    expect(dec.streak).toBe(2);
  });

  it("an extra catch after the target is full is harmless by default", () => {
    const s = new ScoreManager();
    s.apply("extra");
    expect(s.score).toBe(0);
    expect(s.streak).toBe(0);
  });
});
