import { describe, expect, it } from "vitest";
import { calculateMetric, toValueBand } from "./calculate";
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
  maxValue: 4,
  metricLabel: "GPA",
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
  maxValue: 4.3,
  metricLabel: "GPA",
};

describe("calculateGpa", () => {
  it("単位数が同じ複数科目の平均を返す", () => {
    const out = calculateMetric({
      scale: gradeScale,
      courses: [
        { id: "1", name: "微分積分", credits: 2, grade: "秀" }, // 4
        { id: "2", name: "線形代数", credits: 2, grade: "良" }, // 2
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(3);
    expect(out.result.totalCredits).toBe(4);
    expect(out.result.countedCourses).toBe(2);
  });

  it("単位数で加重平均する", () => {
    // (4*6 + 1*2) / 8 = 26/8 = 3.25
    const out = calculateMetric({
      scale: gradeScale,
      courses: [
        { id: "1", name: "専門演習", credits: 6, grade: "秀" },
        { id: "2", name: "体育", credits: 2, grade: "可" },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(3.25);
  });

  it("不可（GP=0）の科目も分母の単位数に算入する", () => {
    // (3*2 + 0*2) / 4 = 1.5
    const out = calculateMetric({
      scale: gradeScale,
      courses: [
        { id: "1", name: "英語", credits: 2, grade: "優" },
        { id: "2", name: "統計学", credits: 2, grade: "不可" },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(1.5);
    expect(out.result.totalCredits).toBe(4);
  });

  it("小数第2位まで四捨五入する", () => {
    // (4*2 + 3*2 + 2*2) / 6 = 18/6 = 3 ではなく、割り切れない例を使う
    // (4*2 + 3*2 + 1*2) / 6 = 16/6 = 2.666... → 2.67
    const out = calculateMetric({
      scale: gradeScale,
      courses: [
        { id: "1", name: "A", credits: 2, grade: "秀" },
        { id: "2", name: "B", credits: 2, grade: "優" },
        { id: "3", name: "C", credits: 2, grade: "可" },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(2.67);
  });

  it("ちょうど .xx5 の値を切り上げる（浮動小数点誤差で切り下げない）", () => {
    // GPと単位数はいずれも整数なので、商が 23/40 = 0.575 のような
    // 「ちょうど .xx5」になる組み合わせは現実に発生する。
    // 単純な Math.round(x * 100) / 100 だとここが 0.57 に落ちる。
    // 優(3)×7単位 = 21、可(1)×2単位 = 2、不可(0)×31単位 = 0 → 合計23 / 40単位 = 0.575
    const out = calculateMetric({
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
    expect(out.result.value).toBe(0.58);
  });

  it("素点換算方式では scoreToPoint の結果を使う", () => {
    // 85点 → floor(35/10) = 3 、65点 → floor(15/10) = 1
    // (3*2 + 1*2) / 4 = 2
    const out = calculateMetric({
      scale: testScoreScale,
      courses: [
        { id: "1", name: "A", credits: 2, score: 85 },
        { id: "2", name: "B", credits: 2, score: 65 },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(2);
  });

  it("科目が0件ならエラーを返す", () => {
    const out = calculateMetric({ scale: gradeScale, courses: [] });
    expect(out).toEqual({ ok: false, reason: "no_courses" });
  });

  it("単位数の合計が0ならゼロ除算せずエラーを返す", () => {
    const out = calculateMetric({
      scale: gradeScale,
      courses: [{ id: "1", name: "聴講", credits: 0, grade: "優" }],
    });
    expect(out).toEqual({ ok: false, reason: "zero_credits" });
  });

  it("単位数が負ならエラーを返し、該当科目のidを含める", () => {
    const out = calculateMetric({
      scale: gradeScale,
      courses: [{ id: "c9", name: "A", credits: -1, grade: "優" }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_credits", courseId: "c9" });
  });

  it("評語が方式に存在しなければエラーを返す", () => {
    const out = calculateMetric({
      scale: gradeScale,
      courses: [{ id: "c1", name: "A", credits: 2, grade: "X" }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_grade", courseId: "c1" });
  });

  it("素点が0-100の範囲外ならエラーを返す", () => {
    const out = calculateMetric({
      scale: testScoreScale,
      courses: [{ id: "c2", name: "A", credits: 2, score: 120 }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_score", courseId: "c2" });
  });

  it("1.0以上の .xx5 ちょうどのタイも正しく切り上げる（EPSILONは2以上で無効化されるため）", () => {
    // A+(4.3) + B-(2.7) + D(1.0) + D-(0.7) = 8.7 / 4単位 = 2.175 → 2.18
    const out = calculateMetric({
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
    expect(out.result.value).toBe(2.18);
  });

  it("4点台の .xx5 ちょうどのタイも正しく切り上げる", () => {
    // A+(4.3) + A+(4.3) + A+(4.3) + A(4.0) = 16.9 / 4単位 = 4.225 → 4.23
    const out = calculateMetric({
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
    expect(out.result.value).toBe(4.23);
  });

  it("単位数がNaNならinvalid_creditsを返す（空欄入力が0単位として黙って計算されるのを防ぐ）", () => {
    const out = calculateMetric({
      scale: gradeScale,
      courses: [{ id: "c10", name: "A", credits: NaN, grade: "優" }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_credits", courseId: "c10" });
  });

  it("素点がNaNならinvalid_scoreを返す（空欄入力が0点として黙って計算されるのを防ぐ）", () => {
    const out = calculateMetric({
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

    const out = calculateMetric({
      scale: osakaPreReform,
      courses: [{ id: "c3", name: "未定義帯の科目", credits: 2, score: 82 }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_score", courseId: "c3" });
  });
});

/** 重率つき素点方式のテスト専用スケール（実在の大学の方式ではない） */
const testRawScale: GradeScale = {
  id: "test-raw",
  label: "テスト用素点そのまま平均",
  method: "raw",
  maxValue: 100,
  metricLabel: "テスト平均点",
  unitSuffix: "点",
  usesWeight: true,
};

describe("calculateMetric / raw方式", () => {
  it("評点を単位数で加重平均する（重率はすべて1）", () => {
    // (80*2 + 60*2) / 4 = 70
    const out = calculateMetric({
      scale: testRawScale,
      courses: [
        { id: "1", name: "A", credits: 2, score: 80, weight: 1 },
        { id: "2", name: "B", credits: 2, score: 60, weight: 1 },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(70);
    expect(out.result.totalCredits).toBe(4);
    expect(out.result.countedCourses).toBe(2);
  });

  it("重率0.1の科目は影響が小さくなる", () => {
    // (90*2*1 + 50*2*0.1) / (2*1 + 2*0.1) = (180 + 10) / 2.2 = 86.36...
    const out = calculateMetric({
      scale: testRawScale,
      courses: [
        { id: "1", name: "A", credits: 2, score: 90, weight: 1 },
        { id: "2", name: "B", credits: 2, score: 50, weight: 0.1 },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(86.36);
  });

  it("重率0の科目は計算からも科目数からも除外される", () => {
    // 重率0のBは無視され、Aだけの平均 = 90
    const out = calculateMetric({
      scale: testRawScale,
      courses: [
        { id: "1", name: "A", credits: 2, score: 90, weight: 1 },
        { id: "2", name: "B", credits: 4, score: 10, weight: 0 },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(90);
    expect(out.result.totalCredits).toBe(2);
    expect(out.result.countedCourses).toBe(1);
  });

  it("重率0の科目は評点が未入力でもエラーにならない", () => {
    const out = calculateMetric({
      scale: testRawScale,
      courses: [
        { id: "1", name: "A", credits: 2, score: 90, weight: 1 },
        { id: "2", name: "B", credits: 4, weight: 0 },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(90);
  });

  it("重率が 1 / 0.1 / 0 以外ならエラーを返す", () => {
    const out = calculateMetric({
      scale: testRawScale,
      courses: [{ id: "c1", name: "A", credits: 2, score: 90, weight: 0.5 }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_weight", courseId: "c1" });
  });

  it("重率を省略した科目は重率1として扱う", () => {
    const out = calculateMetric({
      scale: testRawScale,
      courses: [{ id: "1", name: "A", credits: 2, score: 90 }],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(90);
  });

  it("評点が0-100の範囲外ならエラーを返す", () => {
    const out = calculateMetric({
      scale: testRawScale,
      courses: [{ id: "c2", name: "A", credits: 2, score: 120, weight: 1 }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_score", courseId: "c2" });
  });

  it("重率をすべて0にすると分母が0になりエラーを返す", () => {
    const out = calculateMetric({
      scale: testRawScale,
      courses: [{ id: "1", name: "A", credits: 2, score: 90, weight: 0 }],
    });
    expect(out).toEqual({ ok: false, reason: "zero_credits" });
  });
});

describe("重率は usesWeight の方式でのみ読まれる", () => {
  it("評語方式では weight が指定されていても無視される", () => {
    // 秀(4)×2 + 良(2)×2 = 12 / 4 = 3 。weight 0.1 は読まれない
    const out = calculateMetric({
      scale: gradeScale,
      courses: [
        { id: "1", name: "A", credits: 2, grade: "秀", weight: 0.1 },
        { id: "2", name: "B", credits: 2, grade: "良", weight: 0.1 },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(3);
  });
});

describe("toValueBand", () => {
  it("満点4.0のGPAで従来の境界と同じ帯になる", () => {
    expect(toValueBand(1.99, 4)).toBe("0-50%");
    expect(toValueBand(2.0, 4)).toBe("50-62%");
    expect(toValueBand(2.49, 4)).toBe("50-62%");
    expect(toValueBand(2.5, 4)).toBe("62-75%");
    expect(toValueBand(2.99, 4)).toBe("62-75%");
    expect(toValueBand(3.0, 4)).toBe("75-87%");
    expect(toValueBand(3.49, 4)).toBe("75-87%");
    expect(toValueBand(3.5, 4)).toBe("87-100%");
    expect(toValueBand(4.0, 4)).toBe("87-100%");
  });

  it("満点100の指標でも同じ比率で区切られる", () => {
    expect(toValueBand(49, 100)).toBe("0-50%");
    expect(toValueBand(50, 100)).toBe("50-62%");
    expect(toValueBand(75, 100)).toBe("75-87%");
    expect(toValueBand(100, 100)).toBe("87-100%");
  });

  it("満点3の指標でも同じ比率で区切られる", () => {
    expect(toValueBand(1.49, 3)).toBe("0-50%");
    expect(toValueBand(2.25, 3)).toBe("75-87%");
    expect(toValueBand(3.0, 3)).toBe("87-100%");
  });
});
