import { hexToOKLCH } from "@rafters/color-utils";
import { describe, expect, it } from "vite-plus/test";
import { colorKey, parseColorKey } from "../../src/color/key";

describe("colorKey", () => {
  it("formats L and C to three decimals and H to a whole degree", () => {
    expect(colorKey({ l: 0.62308, c: 0.188014, h: 259.81, alpha: 1 })).toBe("0.623-0.188-260");
  });

  it("wraps a hue of 360 to 0", () => {
    expect(colorKey({ l: 0.5, c: 0.1, h: 360, alpha: 1 })).toBe("0.500-0.100-0");
    expect(colorKey({ l: 0.5, c: 0.1, h: 359.6, alpha: 1 })).toBe("0.500-0.100-0");
  });

  it("gives every gray at a lightness the same key", () => {
    expect(colorKey({ l: 0.5, c: 0.0004, h: 120, alpha: 1 })).toBe("0.500-0.000-0");
    expect(colorKey(hexToOKLCH("#808080"))).toBe("0.600-0.000-0");
  });

  it("clamps lightness into 0..1 and chroma to at least 0", () => {
    expect(colorKey(hexToOKLCH("#ffffff"))).toBe("1.000-0.000-0");
    expect(colorKey({ l: -0.00001, c: -0.0001, h: 10, alpha: 1 })).toBe("0.000-0.000-0");
  });
});

describe("parseColorKey", () => {
  it("round-trips a key", () => {
    const key = colorKey(hexToOKLCH("#3b82f6"));
    const parsed = parseColorKey(key);
    expect(parsed).not.toBeNull();
    expect(parsed && colorKey(parsed)).toBe(key);
  });

  it("rejects malformed keys and hues of 360 or more", () => {
    expect(parseColorKey("0.5-0.1-240")).toBeNull();
    expect(parseColorKey("1.200-0.100-240")).toBeNull();
    expect(parseColorKey("0.500-0.100-360")).toBeNull();
    expect(parseColorKey("#3b82f6")).toBeNull();
  });
});
