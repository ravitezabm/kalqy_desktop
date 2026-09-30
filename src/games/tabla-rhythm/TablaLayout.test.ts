import { describe, expect, it } from "vitest";
import { calculateTablaLayout } from "./TablaLayout";

describe("calculateTablaLayout", () => {
  it("centers any number of drums with equal spacing and no overlap", () => {
    for (const count of [2, 3, 4, 5, 6]) {
      const slots = calculateTablaLayout(count, 1280);
      expect(slots).toHaveLength(count);
      const mid = slots.reduce((sum, s) => sum + s.x, 0) / count;
      expect(mid).toBeCloseTo(640);
      for (let i = 1; i < count; i++) expect(slots[i].x - slots[i - 1].x).toBeGreaterThan(slots[i].width);
      expect(slots[0].x - slots[0].width / 2).toBeGreaterThan(0);
    }
  });

  it("scales with the viewport", () => {
    const small = calculateTablaLayout(4, 640, { maxWidth: 1000 });
    const big = calculateTablaLayout(4, 1280, { maxWidth: 1000 });
    expect(big[0].width).toBeCloseTo(small[0].width * 2);
  });
});
