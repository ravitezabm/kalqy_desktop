import { describe, expect, it } from "vitest";
import { HandZoneHitDetector, type HandSample } from "./HandZoneHitDetector";

const zones = [
  { id: 0, x: 200, y: 400, radius: 80 },
  { id: 1, x: 500, y: 400, radius: 80 },
  { id: 2, x: 800, y: 400, radius: 80 },
];
const hand = (hand: "left" | "right", x: number, speed = 0.4, extra: Partial<HandSample> = {}): HandSample => ({ hand, visible: true, x, y: 400, speed, confidence: 0.9, ...extra });

describe("HandZoneHitDetector", () => {
  it("hits once when a hand moves onto a zone, not every frame while it stays", () => {
    const d = new HandZoneHitDetector();
    expect(d.update([hand("right", 100)], zones, 0)).toEqual([]);
    const hits = d.update([hand("right", 190)], zones, 0.05);
    expect(hits).toMatchObject([{ hand: "right", zone: 0, by: "enter" }]);
    for (let i = 0; i < 30; i++) expect(d.update([hand("right", 195, 0.02)], zones, 0.1 + i * 0.016)).toEqual([]);
  });

  it("ignores a hand that drifts in too slowly", () => {
    const d = new HandZoneHitDetector();
    d.update([hand("left", 100, 0.02)], zones, 0);
    expect(d.update([hand("left", 190, 0.03)], zones, 0.05)).toEqual([]);
  });

  it("tracks both hands independently, including at the same moment", () => {
    const d = new HandZoneHitDetector();
    d.update([hand("left", 100), hand("right", 650)], zones, 0);
    const hits = d.update([hand("left", 200), hand("right", 790)], zones, 0.05);
    expect(hits.map((h) => [h.hand, h.zone]).sort()).toEqual([["left", 0], ["right", 2]]);
  });

  it("a quick tap inside a zone hits again without leaving (repeated notes)", () => {
    const d = new HandZoneHitDetector();
    d.update([hand("right", 100)], zones, 0);
    d.update([hand("right", 500)], zones, 0.05);
    d.update([hand("right", 500, 0.05)], zones, 0.3);
    const tap = d.update([hand("right", 500, 1.2)], zones, 0.5);
    expect(tap).toMatchObject([{ zone: 1, by: "tap" }]);
    // still moving fast: no second hit until the hand settles and taps again
    expect(d.update([hand("right", 500, 1.1)], zones, 0.52)).toEqual([]);
  });

  it("moving sideways out of a zone is never a second hit", () => {
    const d = new HandZoneHitDetector();
    d.update([hand("right", 100)], zones, 0);
    expect(d.update([hand("right", 200)], zones, 0.05)).toHaveLength(1);
    // the hand slows on the drum, then sweeps away fast while still inside the (hysteresis-widened) zone
    d.update([hand("right", 205, 0.05)], zones, 0.4);
    const sweep = [hand("right", 240, 1.0, { vx: 1.0, vy: 0.05 }), hand("right", 275, 1.3, { vx: 1.3, vy: 0.1 })];
    expect(sweep.flatMap((s, i) => d.update([s], zones, 0.5 + i * 0.016))).toEqual([]);
  });

  it("no tap right after entering — the entry already was the hit", () => {
    const d = new HandZoneHitDetector();
    d.update([hand("right", 100)], zones, 0);
    d.update([hand("right", 500)], zones, 0.05);
    d.update([hand("right", 500, 0.05, { vx: 0, vy: 0.05 })], zones, 0.1);
    expect(d.update([hand("right", 500, 1.2, { vx: 0, vy: 1.2 })], zones, 0.15)).toEqual([]);
    // once the grace period has passed, a real vertical tap counts again
    expect(d.update([hand("right", 500, 1.2, { vx: 0, vy: 1.2 })], zones, 0.7)).toMatchObject([{ by: "tap" }]);
  });

  it("leaving and re-entering the same drum right away is one hit, not two", () => {
    const d = new HandZoneHitDetector();
    d.update([hand("right", 100)], zones, 0);
    expect(d.update([hand("right", 500)], zones, 0.05)).toHaveLength(1);
    d.update([hand("right", 650)], zones, 0.15);
    expect(d.update([hand("right", 500)], zones, 0.25)).toEqual([]);
    d.update([hand("right", 650)], zones, 0.4);
    expect(d.update([hand("right", 500)], zones, 0.6)).toHaveLength(1);
  });

  it("limits how quickly one hand can hit (no audio spam)", () => {
    const d = new HandZoneHitDetector({ minHitIntervalMs: 200 });
    d.update([hand("right", 100)], zones, 0);
    expect(d.update([hand("right", 200)], zones, 0.01)).toHaveLength(1);
    d.update([hand("right", 350)], zones, 0.03);
    expect(d.update([hand("right", 500)], zones, 0.05)).toEqual([]);
    d.update([hand("right", 350)], zones, 0.3);
    expect(d.update([hand("right", 500)], zones, 0.65)).toHaveLength(1);
  });

  it("ignores low-confidence and hidden hands", () => {
    const d = new HandZoneHitDetector();
    d.update([hand("right", 100)], zones, 0);
    expect(d.update([hand("right", 200, 0.4, { confidence: 0.2 })], zones, 0.05)).toEqual([]);
    expect(d.update([hand("right", 200, 0.4, { visible: false })], zones, 0.1)).toEqual([]);
  });

  it("does not flicker on the edge of a zone", () => {
    const d = new HandZoneHitDetector();
    d.update([hand("right", 100)], zones, 0);
    d.update([hand("right", 150)], zones, 0.05); // enters (hit)
    // jitter around the boundary (radius 80 → edge at x=280) stays "inside" thanks to hysteresis
    const hits = [285, 275, 290, 272, 288].flatMap((x, i) => d.update([hand("right", x, 0.3)], zones, 0.3 + i * 0.05));
    expect(hits).toEqual([]);
  });

  it("press mode fires after resting on a zone", () => {
    const d = new HandZoneHitDetector({ modes: ["press"], pressMs: 300 });
    d.update([hand("right", 100, 0.3)], zones, 0);
    d.update([hand("right", 200, 0.05)], zones, 0.1);
    expect(d.update([hand("right", 200, 0.02)], zones, 0.3)).toEqual([]);
    expect(d.update([hand("right", 200, 0.02)], zones, 0.45)).toMatchObject([{ by: "press" }]);
  });
});
