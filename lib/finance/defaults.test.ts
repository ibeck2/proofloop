import { describe, it, expect } from "vitest";
import { DEFAULT_CATEGORIES, defaultPeriodForDate, nextReceiptNo } from "./defaults";

describe("DEFAULT_CATEGORIES", () => {
  it("支払手数料を支出費目に含む", () => {
    const names = DEFAULT_CATEGORIES.filter((c) => c.kind === "expense").map((c) => c.name);
    expect(names).toContain("支払手数料");
  });
  it("収入と支出の両方を持つ", () => {
    expect(DEFAULT_CATEGORIES.some((c) => c.kind === "income")).toBe(true);
    expect(DEFAULT_CATEGORIES.some((c) => c.kind === "expense")).toBe(true);
  });
});

describe("defaultPeriodForDate", () => {
  it("4月以降は当年始まりの年度", () => {
    const p = defaultPeriodForDate(new Date("2026-07-25T00:00:00+09:00"));
    expect(p.name).toBe("2026年度");
    expect(p.starts_on).toBe("2026-04-01");
    expect(p.ends_on).toBe("2027-03-31");
  });
  it("3月以前は前年始まりの年度", () => {
    const p = defaultPeriodForDate(new Date("2026-02-10T00:00:00+09:00"));
    expect(p.name).toBe("2025年度");
    expect(p.starts_on).toBe("2025-04-01");
    expect(p.ends_on).toBe("2026-03-31");
  });
});

describe("nextReceiptNo", () => {
  it("空なら1", () => {
    expect(nextReceiptNo([])).toBe("1");
  });
  it("既存数値の最大+1", () => {
    expect(nextReceiptNo([{ receipt_no: "3" }, { receipt_no: "7" }, { receipt_no: null }])).toBe("8");
  });
  it("数値でない番号は無視", () => {
    expect(nextReceiptNo([{ receipt_no: "A-1" }, { receipt_no: "2" }])).toBe("3");
  });
});
