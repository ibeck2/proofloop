import { describe, expect, it } from "vitest";
import { calculateGpa, toGpaBand } from "./calculate";
import { GENERIC_SCALES } from "./scales";
import type { GradeScale } from "./types";

const gradeScale = GENERIC_SCALES[0]; // 秀4 / 優3 / 良2 / 可1 / 不可0

/** 素点換算のテスト専用スケール（実在の大学の方式ではない） */
const testScoreScale: GradeScale = {
  id: "test-score",
  label: "テスト用素点換算",
  method: "score",
  scoreToPoint: (score) => Math.max(0, Math.min(4, Math.floor((score - 50) / 10))),
  maxGpa: 4,
};

describe("calculateGpa", () => {
  it("単位数が同じ複数科目の平均を返す", () => {
    const out = calculateGpa({
      scale: gradeScale,
      courses: [
        { id: "1", name: "微分積分", credits: 2, grade: "秀" }, // 4
        { id: "2", name: "線形代数", credits: 2, grade: "良" }, // 2
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.gpa).toBe(3);
    expect(out.result.totalCredits).toBe(4);
    expect(out.result.countedCourses).toBe(2);
  });

  it("単位数で加重平均する", () => {
    // (4*6 + 1*2) / 8 = 26/8 = 3.25
    const out = calculateGpa({
      scale: gradeScale,
      courses: [
        { id: "1", name: "専門演習", credits: 6, grade: "秀" },
        { id: "2", name: "体育", credits: 2, grade: "可" },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.gpa).toBe(3.25);
  });

  it("不可（GP=0）の科目も分母の単位数に算入する", () => {
    // (3*2 + 0*2) / 4 = 1.5
    const out = calculateGpa({
      scale: gradeScale,
      courses: [
        { id: "1", name: "英語", credits: 2, grade: "優" },
        { id: "2", name: "統計学", credits: 2, grade: "不可" },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.gpa).toBe(1.5);
    expect(out.result.totalCredits).toBe(4);
  });

  it("小数第2位まで四捨五入する", () => {
    // (4*2 + 3*2 + 2*2) / 6 = 18/6 = 3 ではなく、割り切れない例を使う
    // (4*2 + 3*2 + 1*2) / 6 = 16/6 = 2.666... → 2.67
    const out = calculateGpa({
      scale: gradeScale,
      courses: [
        { id: "1", name: "A", credits: 2, grade: "秀" },
        { id: "2", name: "B", credits: 2, grade: "優" },
        { id: "3", name: "C", credits: 2, grade: "可" },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.gpa).toBe(2.67);
  });

  it("ちょうど .xx5 の値を切り上げる（浮動小数点誤差で切り下げない）", () => {
    // GPと単位数はいずれも整数なので、商が 23/40 = 0.575 のような
    // 「ちょうど .xx5」になる組み合わせは現実に発生する。
    // 単純な Math.round(x * 100) / 100 だとここが 0.57 に落ちる。
    // 優(3)×7単位 = 21、可(1)×2単位 = 2、不可(0)×31単位 = 0 → 合計23 / 40単位 = 0.575
    const out = calculateGpa({
      scale: gradeScale,
      courses: [
        { id: "1", name: "A", credits: 7, grade: "優" },
        { id: "2", name: "B", credits: 2, grade: "可" },
        { id: "3", name: "C", credits: 31, grade: "不可" },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.totalCredits).toBe(40);
    expect(out.result.gpa).toBe(0.58);
  });

  it("素点換算方式では scoreToPoint の結果を使う", () => {
    // 85点 → floor(35/10) = 3 、65点 → floor(15/10) = 1
    // (3*2 + 1*2) / 4 = 2
    const out = calculateGpa({
      scale: testScoreScale,
      courses: [
        { id: "1", name: "A", credits: 2, score: 85 },
        { id: "2", name: "B", credits: 2, score: 65 },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.gpa).toBe(2);
  });

  it("科目が0件ならエラーを返す", () => {
    const out = calculateGpa({ scale: gradeScale, courses: [] });
    expect(out).toEqual({ ok: false, reason: "no_courses" });
  });

  it("単位数の合計が0ならゼロ除算せずエラーを返す", () => {
    const out = calculateGpa({
      scale: gradeScale,
      courses: [{ id: "1", name: "聴講", credits: 0, grade: "優" }],
    });
    expect(out).toEqual({ ok: false, reason: "zero_credits" });
  });

  it("単位数が負ならエラーを返し、該当科目のidを含める", () => {
    const out = calculateGpa({
      scale: gradeScale,
      courses: [{ id: "c9", name: "A", credits: -1, grade: "優" }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_credits", courseId: "c9" });
  });

  it("評語が方式に存在しなければエラーを返す", () => {
    const out = calculateGpa({
      scale: gradeScale,
      courses: [{ id: "c1", name: "A", credits: 2, grade: "X" }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_grade", courseId: "c1" });
  });

  it("素点が0-100の範囲外ならエラーを返す", () => {
    const out = calculateGpa({
      scale: testScoreScale,
      courses: [{ id: "c2", name: "A", credits: 2, score: 120 }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_score", courseId: "c2" });
  });
});

describe("toGpaBand", () => {
  it("境界値を含めて正しい帯を返す", () => {
    expect(toGpaBand(0)).toBe("~2.0");
    expect(toGpaBand(1.99)).toBe("~2.0");
    expect(toGpaBand(2.0)).toBe("2.0-2.5");
    expect(toGpaBand(2.49)).toBe("2.0-2.5");
    expect(toGpaBand(2.5)).toBe("2.5-3.0");
    expect(toGpaBand(2.99)).toBe("2.5-3.0");
    expect(toGpaBand(3.0)).toBe("3.0-3.5");
    expect(toGpaBand(3.49)).toBe("3.0-3.5");
    expect(toGpaBand(3.5)).toBe("3.5~");
    expect(toGpaBand(4)).toBe("3.5~");
  });
});
