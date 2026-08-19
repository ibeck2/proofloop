import { describe, expect, it } from "vitest";
import { categoryColor, CATEGORY_PALETTE } from "./taskCategoryColor";

describe("categoryColor", () => {
  it("returns null for empty, whitespace-only, null, or undefined category", () => {
    expect(categoryColor(null)).toBeNull();
    expect(categoryColor(undefined)).toBeNull();
    expect(categoryColor("")).toBeNull();
    expect(categoryColor("   ")).toBeNull();
  });

  it("is deterministic: the same category always returns the same color", () => {
    const a = categoryColor("デザイン");
    const b = categoryColor("デザイン");
    expect(a).not.toBeNull();
    expect(a).toEqual(b);
  });

  it("trims whitespace before hashing, so padded and unpadded forms match", () => {
    expect(categoryColor("広報")).toEqual(categoryColor("  広報  "));
  });

  it("returns a hex that is one of the palette entries", () => {
    const result = categoryColor("物品準備");
    expect(result).not.toBeNull();
    expect(CATEGORY_PALETTE).toContain(result!.hex);
    expect(result!.dot).toBe(result!.hex);
  });

  it("returns a border and tint derived from the same hex (alpha-suffixed)", () => {
    const result = categoryColor("会計");
    expect(result).not.toBeNull();
    expect(result!.border.startsWith(result!.hex)).toBe(true);
    expect(result!.tint.startsWith(result!.hex)).toBe(true);
    expect(result!.border).not.toBe(result!.hex);
    expect(result!.tint).not.toBe(result!.hex);
  });

  it("distributes a set of distinct category names across more than one color", () => {
    const names = [
      "デザイン",
      "広報",
      "物品準備",
      "会計",
      "新歓",
      "渉外",
      "イベント運営",
      "備品管理",
      "SNS運用",
      "経理",
    ];
    const colors = new Set(names.map((n) => categoryColor(n)!.hex));
    // ハッシュのビット混合ファイナライザ導入後、この10種別の実測値は8色中6色。
    // 弱い分布への回帰を検知できるよう、実測値をそのまま下限として固定する。
    expect(colors.size).toBeGreaterThanOrEqual(6);
  });
});
