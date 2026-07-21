import { describe, expect, it } from "vitest";
import { calculateGpa, toGpaBand } from "./calculate";
import { GENERIC_SCALES } from "./scales";
import { findScaleById } from "./universities";
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

/** 小数GPを持つテスト専用スケール（実在の大学の方式ではない） */
const testDecimalScale: GradeScale = {
  id: "test-decimal",
  label: "テスト用（小数GP）",
  method: "grade",
  grades: [
    { label: "A+", point: 4.3 },
    { label: "A", point: 4.0 },
    { label: "B-", point: 2.7 },
    { label: "D", point: 1.0 },
    { label: "D-", point: 0.7 },
  ],
  maxGpa: 4.3,
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

  it("1.0以上の .xx5 ちょうどのタイも正しく切り上げる（EPSILONは2以上で無効化されるため）", () => {
    // A+(4.3) + B-(2.7) + D(1.0) + D-(0.7) = 8.7 / 4単位 = 2.175 → 2.18
    const out = calculateGpa({
      scale: testDecimalScale,
      courses: [
        { id: "1", name: "A", credits: 1, grade: "A+" },
        { id: "2", name: "B", credits: 1, grade: "B-" },
        { id: "3", name: "C", credits: 1, grade: "D" },
        { id: "4", name: "D", credits: 1, grade: "D-" },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.gpa).toBe(2.18);
  });

  it("4点台の .xx5 ちょうどのタイも正しく切り上げる", () => {
    // A+(4.3) + A+(4.3) + A+(4.3) + A(4.0) = 16.9 / 4単位 = 4.225 → 4.23
    const out = calculateGpa({
      scale: testDecimalScale,
      courses: [
        { id: "1", name: "A", credits: 1, grade: "A+" },
        { id: "2", name: "B", credits: 1, grade: "A+" },
        { id: "3", name: "C", credits: 1, grade: "A+" },
        { id: "4", name: "D", credits: 1, grade: "A" },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.gpa).toBe(4.23);
  });

  it("単位数がNaNならinvalid_creditsを返す（空欄入力が0単位として黙って計算されるのを防ぐ）", () => {
    const out = calculateGpa({
      scale: gradeScale,
      courses: [{ id: "c10", name: "A", credits: NaN, grade: "優" }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_credits", courseId: "c10" });
  });

  it("素点がNaNならinvalid_scoreを返す（空欄入力が0点として黙って計算されるのを防ぐ）", () => {
    const out = calculateGpa({
      scale: testScoreScale,
      courses: [{ id: "c11", name: "A", credits: 2, score: NaN }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_score", courseId: "c11" });
  });

  it("出典の対応表が定義していない素点帯（大阪大学・令和7年度以前）はinvalid_scoreを返し、値を捏造しない", () => {
    // 大阪大学（令和7年度以前）の出典は 90-100/85-89/75-79/65-69/0-59 の5帯のみを定義し、
    // 80-84・70-74・60-64 には値を割り当てていない。scoreToPoint はこれらの点数で null を返す。
    const osakaPreReform = findScaleById("osaka-university-pre-reform-scale");
    if (!osakaPreReform) throw new Error("osaka-university-pre-reform-scale が見つかりません");

    const out = calculateGpa({
      scale: osakaPreReform,
      courses: [{ id: "c3", name: "未定義帯の科目", credits: 2, score: 82 }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_score", courseId: "c3" });
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
