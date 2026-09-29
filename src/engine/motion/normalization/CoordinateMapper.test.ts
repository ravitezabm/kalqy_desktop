import { describe, expect, it } from "vitest";
import { mirrorPoint } from "./CoordinateMapper";

describe("mirrorPoint", () => {
  it("flips x so moving right on the camera moves right on screen", () => {
    expect(mirrorPoint({ x: 0.2, y: 0.3 })).toEqual({ x: 0.8, y: 0.3 });
  });
});
