import { describe, expect, it } from "vitest";
import { coursesFromGradeTotals, supportsBulkInput } from "./bulk";
import { GENERIC_SCALES } from "./scales";
import type { GradeScale } from "./types";

const gradeScale = GENERIC_SCALES[0]; // 秀4 / 優3 / 良2 / 可1 / 不可0

const scoreScale: GradeScale = {
  id: "test-score",
  label: "テスト用素点換算",
  method: "score",
  scoreToPoint: (s) => (s >= 60 ? 1 : 0),
  maxValue: 4,
  metricLabel: "GPA",
};

const rawWeightedScale: GradeScale = {
  id: "test-raw",
  label: "テスト用重率つき",
  method: "raw",
  maxValue: 100,
  metricLabel: "基本平均点",
  usesWeight: true,
};

describe("supportsBulkInput", () => {
  it("評語方式は対応する", () => {
    expect(supportsBulkInput(gradeScale)).toBe(true);
  });

  it("素点方式は対応しない", () => {
    expect(supportsBulkInput(scoreScale)).toBe(false);
  });

  it("重率を使う方式は対応しない", () => {
    expect(supportsBulkInput(rawWeightedScale)).toBe(false);
  });
});

describe("coursesFromGradeTotals", () => {
  it("評語ごとに1科目ぶんの Course を作る", () => {
    const courses = coursesFromGradeTotals(gradeScale, { 秀: 20, 良: 12 });
    expect(courses).toEqual([
      { id: "bulk-秀", name: "秀", credits: 20, grade: "秀" },
      { id: "bulk-良", name: "良", credits: 12, grade: "良" },
    ]);
  });

  it("方式の評語の並び順を保つ", () => {
    const courses = coursesFromGradeTotals(gradeScale, { 可: 2, 秀: 4 });
    expect(courses.map((c) => c.grade)).toEqual(["秀", "可"]);
  });

  it("単位数が0の評語は含めない", () => {
    const courses = coursesFromGradeTotals(gradeScale, { 秀: 4, 優: 0 });
    expect(courses.map((c) => c.grade)).toEqual(["秀"]);
  });

  it("方式に存在しない評語は無視する", () => {
    const courses = coursesFromGradeTotals(gradeScale, { 秀: 4, Z: 10 });
    expect(courses.map((c) => c.grade)).toEqual(["秀"]);
  });

  it("NaN の単位数は含めない", () => {
    const courses = coursesFromGradeTotals(gradeScale, { 秀: NaN, 良: 2 });
    expect(courses.map((c) => c.grade)).toEqual(["良"]);
  });

  it("負の単位数はそのまま渡す（検証は calculateMetric の責務）", () => {
    const courses = coursesFromGradeTotals(gradeScale, { 秀: -2 });
    expect(courses).toEqual([
      { id: "bulk-秀", name: "秀", credits: -2, grade: "秀" },
    ]);
  });
});
