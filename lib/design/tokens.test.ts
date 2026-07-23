import { describe, expect, it } from "vitest";
import { COLORS, FONT_FAMILIES } from "./tokens";

describe("COLORS", () => {
  it("は6色だけを持つ", () => {
    expect(Object.keys(COLORS).sort()).toEqual(
      ["graphite", "ink", "mist", "paper", "rule", "seal"]
    );
  });

  it("はすべて6桁のHEXで書かれている", () => {
    for (const value of Object.values(COLORS)) {
      expect(value).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("に同じ値の色が2つ存在しない", () => {
    const values = Object.values(COLORS);
    expect(new Set(values).size).toBe(values.length);
  });

  it("はブランド色（紺・深紅）を維持している", () => {
    expect(COLORS.ink).toBe("#002B5C");
    expect(COLORS.seal).toBe("#8B0000");
  });
});

describe("FONT_FAMILIES", () => {
  it("は3ロールを持つ", () => {
    expect(Object.keys(FONT_FAMILIES).sort()).toEqual(["body", "mincho", "numeric"]);
  });

  it("の明朝はウェブフォント未読込でも日本語環境で成立するフォールバックを持つ", () => {
    expect(FONT_FAMILIES.mincho[0]).toBe("Shippori Mincho B1");
    expect(FONT_FAMILIES.mincho).toContain("Hiragino Mincho ProN");
    expect(FONT_FAMILIES.mincho).toContain("Yu Mincho");
    expect(FONT_FAMILIES.mincho.at(-1)).toBe("serif");
  });
});
