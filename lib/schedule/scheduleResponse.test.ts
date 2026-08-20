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
  //
  // 単純な文字列完全一致（.not.toBe）だと、`hover:` 等のバリアント接頭辞の
  // 有無だけが違う実質同じ見た目のクラス（例: 修正前の"no"の値）でも
  // 「異なる文字列」として通ってしまい、再発を検知できない。実際に見た目へ
  // 効くユーティリティ（bg-/text-/border-の非バリアント値）の集合で比較する。
  const UNSELECTED_BUTTON_CLASS =
    "border border-rule bg-paper text-graphite hover:border-ink";

  function visualUtilities(className: string): Set<string> {
    return new Set(
      className.split(/\s+/).filter((token) => !token.includes(":"))
    );
  }

  it("differs from the page's unselected-button class for yes/maybe/no", () => {
    const unselected = visualUtilities(UNSELECTED_BUTTON_CLASS);
    expect(visualUtilities(responseBadgeClass("yes"))).not.toEqual(unselected);
    expect(visualUtilities(responseBadgeClass("maybe"))).not.toEqual(unselected);
    expect(visualUtilities(responseBadgeClass("no"))).not.toEqual(unselected);
  });
});
