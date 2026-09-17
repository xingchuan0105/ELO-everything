import { describe, expect, it } from "vitest";
import { quantize4 } from "./quantize.js";

describe("quantize4 half-away-from-zero", () => {
  it("rounds positive halves away from zero", () => {
    expect(quantize4(1.23455)).toBe(1.2346);
    expect(quantize4(13.71315)).toBe(13.7132);
  });

  it("rounds negative halves away from zero", () => {
    expect(quantize4(-1.23455)).toBe(-1.2346);
    expect(quantize4(-13.71315)).toBe(-13.7132);
  });

  it("keeps exact 4dp", () => {
    expect(quantize4(13.7132)).toBe(13.7132);
    expect(quantize4(0)).toBe(0);
  });
});
