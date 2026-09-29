import { describe, expect, it } from "vitest";
import { isMatch } from "./MatchingSystem";

describe("isMatch", () => {
  it("matches by logical color id", () => {
    expect(isMatch("red", "red")).toBe(true);
    expect(isMatch("red", "blue")).toBe(false);
  });
});
