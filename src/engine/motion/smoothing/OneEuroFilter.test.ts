import { describe, expect, it } from "vitest";
import { OneEuroFilter2D, SMOOTHING_PROFILES } from "./OneEuroFilter";

const DT = 1 / 30;

describe("OneEuroFilter2D", () => {
  it("passes the first sample through unchanged", () => {
    const filter = new OneEuroFilter2D();
    expect(filter.filter(0.4, 0.7, DT)).toEqual({ x: 0.4, y: 0.7 });
  });

  it("damps jitter around a still point", () => {
    const filter = new OneEuroFilter2D(SMOOTHING_PROFILES.smooth);
    let last = filter.filter(0.5, 0.5, DT);
    let maxDeviation = 0;
    for (let i = 0; i < 90; i++) {
      const noise = i % 2 === 0 ? 0.02 : -0.02;
      last = filter.filter(0.5 + noise, 0.5, DT);
      maxDeviation = Math.max(maxDeviation, Math.abs(last.x - 0.5));
    }
    expect(maxDeviation).toBeLessThan(0.02);
  });

  it("still follows a real, fast movement", () => {
    const filter = new OneEuroFilter2D(SMOOTHING_PROFILES.responsive);
    filter.filter(0, 0, DT);
    let last = { x: 0, y: 0 };
    for (let i = 1; i <= 30; i++) last = filter.filter(i / 30, 0, DT);
    expect(last.x).toBeGreaterThan(0.85);
  });

  it("starts fresh after reset()", () => {
    const filter = new OneEuroFilter2D();
    filter.filter(0.1, 0.1, DT);
    filter.reset();
    expect(filter.filter(0.9, 0.9, DT)).toEqual({ x: 0.9, y: 0.9 });
  });
});
