import { describe, expect, it } from "vitest";
import { responseBadgeClass, responseLabel } from "./scheduleResponse";

describe("responseLabel", () => {
  it("converts yes/maybe/no to ○/△/×", () => {
    expect(responseLabel("yes")).toBe("○");
    expect(responseLabel("maybe")).toBe("△");
    expect(responseLabel("no")).toBe("×");
  });

  it("returns a dash for null, undefined, or unknown values", () => {
    expect(responseLabel(null)).toBe("—");
    expect(responseLabel(undefined)).toBe("—");
    expect(responseLabel("unknown")).toBe("—");
  });
});

describe("responseBadgeClass", () => {
  it("returns a distinct class per response value", () => {
    expect(responseBadgeClass("yes")).not.toBe(responseBadgeClass("maybe"));
    expect(responseBadgeClass("maybe")).not.toBe(responseBadgeClass("no"));
    expect(responseBadgeClass("yes")).not.toBe(responseBadgeClass("no"));
  });

  it("falls back to the default class for unknown values", () => {
    expect(responseBadgeClass(null)).toBe(responseBadgeClass("unknown"));
  });

  // このクラス文字列は app/(club)/clubschedule/[id]/page.tsx の
  // 「未選択」ボタン（myResponse !== v の分岐）にハードコードされているものと
  // 同じ値。両ファイルは共有シンボルで結合されていないため、ここで
  // リテラルとして固定し、responseBadgeClass の結果がこの値と衝突しない
  // ことを回帰テストとして担保する（×選択時に無反応に見えるバグの再発防止）。
  const UNSELECTED_BUTTON_CLASS =
    "border border-rule bg-paper text-graphite hover:border-ink";

  it("differs from the page's unselected-button class for yes/maybe/no", () => {
    expect(responseBadgeClass("yes")).not.toBe(UNSELECTED_BUTTON_CLASS);
    expect(responseBadgeClass("maybe")).not.toBe(UNSELECTED_BUTTON_CLASS);
    expect(responseBadgeClass("no")).not.toBe(UNSELECTED_BUTTON_CLASS);
  });
});
