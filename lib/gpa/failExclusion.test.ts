import { describe, expect, it } from "vitest";
import { excludeFailCourses } from "./failExclusion";
import { GENERIC_SCALES } from "./scales";
import { findScaleById } from "./universities";
import type { Course } from "./types";

const gradeCoefficientScale = findScaleById("u-tokyo-grade-coefficient-scale")!;
const noToggleScale = GENERIC_SCALES[0];

function courses(): Course[] {
  return [
    { id: "1", name: "科目A", credits: 2, grade: "優" },
    { id: "2", name: "科目B", credits: 2, grade: "良" },
    { id: "3", name: "科目C", credits: 2, grade: "不可" },
  ];
}

describe("excludeFailCourses", () => {
  it("enabled=false のときは科目一覧をそのまま返す", () => {
    const input = courses();
    const result = excludeFailCourses(input, gradeCoefficientScale, false);
    expect(result).toEqual(input);
  });

  it("enabled=true のとき failLabels に含まれる評語の科目だけを除外する", () => {
    const result = excludeFailCourses(courses(), gradeCoefficientScale, true);
    expect(result.map((c) => c.grade)).toEqual(["優", "良"]);
  });

  it("failExclusionToggle を持たない方式は enabled=true でも変更しない", () => {
    const input = courses();
    const result = excludeFailCourses(input, noToggleScale, true);
    expect(result).toEqual(input);
  });

  it("全科目が対象評語のとき、空配列になる", () => {
    const input: Course[] = [
      { id: "1", name: "科目A", credits: 2, grade: "不可" },
      { id: "2", name: "科目B", credits: 2, grade: "不可" },
    ];
    const result = excludeFailCourses(input, gradeCoefficientScale, true);
    expect(result).toEqual([]);
  });
});
