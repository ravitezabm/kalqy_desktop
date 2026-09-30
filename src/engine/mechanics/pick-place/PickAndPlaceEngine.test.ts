import { describe, expect, it } from "vitest";
import { PickAndPlaceEngine, type DropZone, type HandInput, type PickItem, type PickPlaceEvent } from "./PickAndPlaceEngine";
import type { AnswerOption } from "../../content/types";

const option = (value: string, correct: boolean): AnswerOption => ({ type: "text", value, id: `text-${value.toLowerCase()}`, correct });
const item = (value: string, correct: boolean, x: number, y: number): PickItem => ({
  id: `text-${value.toLowerCase()}`,
  option: option(value, correct),
  x,
  y,
  radius: 70,
  homeX: x,
  homeY: y,
  state: "ground",
  offsetX: 0,
  offsetY: 0,
});
const zone: DropZone = { id: "slot", x: 600, y: 200, dropRadius: 90, magnetRadius: 160, expected: { type: "text", value: "R" } };

function setup() {
  const engine = new PickAndPlaceEngine([item("R", true, 300, 600), item("L", false, 500, 600)], [zone]);
  const log: PickPlaceEvent[] = [];
  const hand: HandInput = { visible: true, confidence: 1, x: 300, y: 600, grabbing: false };
  const step = (ms = 100, patch: Partial<HandInput> = {}) => {
    Object.assign(hand, patch);
    log.push(...engine.update(hand, ms));
  };
  /** Walks the hand to (x,y) over a number of frames. */
  const walk = (x: number, y: number, frames = 30) => {
    const sx = hand.x;
    const sy = hand.y;
    for (let i = 1; i <= frames; i++) step(33, { x: sx + ((x - sx) * i) / frames, y: sy + ((y - sy) * i) / frames });
  };
  const types = () => log.map((e) => e.type);
  return { engine, hand, step, walk, log, types };
}

describe("PickAndPlaceEngine", () => {
  it("picks, drags, and places the correct option", () => {
    const { engine, step, walk, types } = setup();
    step(33);
    step(33, { grabbing: true });
    expect(engine.dragging?.id).toBe("text-r");
    walk(600, 210, 45);
    step(33, { grabbing: false });
    expect(types()).toContain("correct");
    expect(engine.items[0].state).toBe("placed");
    expect(engine.items[0]).toMatchObject({ x: 600, y: 200 });
  });

  it("sends a wrong option back to where it started", () => {
    const { engine, step, walk, types } = setup();
    walk(500, 600, 5);
    step(33);
    step(33, { grabbing: true });
    expect(engine.dragging?.id).toBe("text-l");
    walk(600, 200, 40);
    step(33, { grabbing: false });
    expect(types()).toContain("incorrect");
    for (let i = 0; i < 20; i++) step(33);
    expect(types()).toContain("returned");
    expect(engine.items[1]).toMatchObject({ state: "ground", x: 500, y: 600 });
  });

  it("returns an item dropped away from every zone", () => {
    const { engine, step, walk, types } = setup();
    step(33);
    step(33, { grabbing: true });
    walk(900, 400, 20);
    step(33, { grabbing: false });
    expect(types()).toContain("missed");
    for (let i = 0; i < 20; i++) step(33);
    expect(engine.items[0].state).toBe("ground");
  });

  it("does not jump to the fingertip: the grab offset is kept", () => {
    const { engine, step } = setup();
    step(33, { x: 340, y: 620 });
    step(33, { x: 340, y: 620, grabbing: true });
    expect(engine.items[0].offsetX).toBe(-40);
    for (let i = 0; i < 10; i++) step(33, { x: 340, y: 620 });
    expect(engine.items[0].x).toBeCloseTo(300, 0);
  });

  it("ignores a hand that is already closed when it reaches an item", () => {
    const { engine, step, walk } = setup();
    step(33, { x: 100, y: 100, grabbing: true });
    walk(300, 600, 20);
    expect(engine.dragging).toBeNull();
  });

  it("ignores low-confidence tracking", () => {
    const { engine, step } = setup();
    step(33, { confidence: 0.2 });
    step(33, { confidence: 0.2, grabbing: true });
    expect(engine.dragging).toBeNull();
  });

  it("holds still through a brief tracking loss, then lets go gently", () => {
    const { engine, step, walk, types } = setup();
    step(33);
    step(33, { grabbing: true });
    walk(450, 500, 10);
    const held = { x: engine.items[0].x, y: engine.items[0].y };
    step(100, { visible: false });
    step(100, { visible: false });
    expect(engine.dragging?.id).toBe("text-r");
    expect(engine.items[0]).toMatchObject(held);
    step(100, { visible: true });
    expect(types()).toContain("handRecovered");
    step(100, { visible: false });
    for (let i = 0; i < 7; i++) step(100, { visible: false });
    expect(types()).toContain("missed");
  });

  it("only pulls the CORRECT option toward the slot", () => {
    const right = setup();
    right.step(33);
    right.step(33, { grabbing: true });
    right.walk(520, 240, 30);
    const correctGap = Math.hypot(right.engine.items[0].x - zone.x, right.engine.items[0].y - zone.y);

    const wrong = setup();
    wrong.walk(500, 600, 5);
    wrong.step(33);
    wrong.step(33, { grabbing: true });
    wrong.walk(520, 240, 30);
    const wrongGap = Math.hypot(wrong.engine.items[1].x - zone.x, wrong.engine.items[1].y - zone.y);
    expect(correctGap).toBeLessThan(wrongGap);
  });
});
