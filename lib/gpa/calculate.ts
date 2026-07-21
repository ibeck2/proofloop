import type { Course, GradeScale, MetricResult, ValueBand } from "./types";

export type CalculateErrorReason =
  | "no_courses"
  | "zero_credits"
  | "invalid_credits"
  | "invalid_grade"
  | "invalid_score"
  | "invalid_weight";

export type CalculateOutput =
  | { ok: true; result: MetricResult }
  | { ok: false; reason: CalculateErrorReason; courseId?: string };

/** 重率として認める値 */
const ALLOWED_WEIGHTS = [1, 0.1, 0];

/**
 * 小数第2位まで四捨五入する。
 *
 * 単純な `Math.round(value * 100) / 100` は使えない。GPと単位数から作られる商は
 * 23/40 = 0.575 や 8.7/4 = 2.175 のような「ちょうど .xx5」になりうるが、
 * これらは二進浮動小数点で正確に表現できず、100倍すると 57.4999... /
 * 217.4999... となって切り下がってしまう。
 *
 * Number.EPSILON は 1.0 の ulp なので、2以上の値では丸め誤差に飲まれて効かない
 * （実際 2.175 が 2.17 になる）。GPAの桁で確実に効き、かつ本物の境界間隔より
 * 十分小さい絶対値でずらす。
 */
function roundTo2(value: number): number {
  return Math.round(value * 100 + 1e-9) / 100;
}

/**
 * 科目1件の「分子に使う値」を求める。
 * grade / score 方式ではグレードポイント、raw 方式では評点そのもの。
 * 換算できない場合は null を返す（呼び出し側でエラー種別を判定する）。
 */
function resolveValue(course: Course, scale: GradeScale): number | null {
  if (scale.method === "grade") {
    if (!course.grade) return null;
    const found = scale.grades?.find((g) => g.label === course.grade);
    return found ? found.point : null;
  }

  const score = course.score;
  if (score === undefined || !Number.isFinite(score)) return null;
  if (score < 0 || score > 100) return null;

  // raw 方式は換算せず評点をそのまま使う
  if (scale.method === "raw") return score;

  if (!scale.scoreToPoint) return null;
  return scale.scoreToPoint(score);
}

/**
 * 指標値 = Σ(値 × 単位数 × 重率) ÷ Σ(単位数 × 重率)
 *
 * - 重率は `usesWeight` の方式でのみ読む。それ以外の方式では常に1として扱うため、
 *   従来のGPA計算の挙動は変わらない。
 * - 重率0の科目は分子にも分母にも寄与しないため、評点・評語の検証を行わず、
 *   科目数・単位数の集計からも除外する。「算入科目3科目」と表示しながら
 *   実際は2科目分しか計算していない、という食い違いを作らないため。
 * - 不可（GP=0）の科目は分母の単位数に算入する。
 */
export function calculateMetric(input: {
  courses: Course[];
  scale: GradeScale;
}): CalculateOutput {
  const { courses, scale } = input;

  if (courses.length === 0) {
    return { ok: false, reason: "no_courses" };
  }

  let weightedSum = 0;
  let weightedCredits = 0;
  let totalCredits = 0;
  let countedCourses = 0;

  for (const course of courses) {
    if (!Number.isFinite(course.credits) || course.credits < 0) {
      return { ok: false, reason: "invalid_credits", courseId: course.id };
    }

    const weight = scale.usesWeight ? course.weight ?? 1 : 1;
    if (scale.usesWeight && !ALLOWED_WEIGHTS.includes(weight)) {
      return { ok: false, reason: "invalid_weight", courseId: course.id };
    }

    // 重率0の科目は何にも寄与しないので、値の検証もせずに飛ばす
    if (weight === 0) continue;

    const value = resolveValue(course, scale);
    if (value === null) {
      return {
        ok: false,
        reason: scale.method === "grade" ? "invalid_grade" : "invalid_score",
        courseId: course.id,
      };
    }

    const contribution = course.credits * weight;
    if (contribution === 0) continue;

    weightedSum += value * contribution;
    weightedCredits += contribution;
    totalCredits += course.credits;
    countedCourses += 1;
  }

  if (weightedCredits === 0) {
    return { ok: false, reason: "zero_credits" };
  }

  return {
    ok: true,
    result: {
      value: roundTo2(weightedSum / weightedCredits),
      totalCredits,
      countedCourses,
    },
  };
}

/**
 * GA4送信に使う、満点に対する比率の帯を返す。
 *
 * 満点が指標ごとに異なる（GPA 4.0/4.3、成績評価係数 3、基本平均点 100）ため、
 * 絶対値ではなく比率で区切る。境界は従来のGPA帯（4.0満点で 2.0 / 2.5 / 3.0 / 3.5）を
 * 比率に直したものなので、通常のGPAでは従来と同じ分布が得られる。
 */
export function toValueBand(value: number, maxValue: number): ValueBand {
  const ratio = maxValue > 0 ? value / maxValue : 0;
  if (ratio < 0.5) return "0-50%";
  if (ratio < 0.625) return "50-62%";
  if (ratio < 0.75) return "62-75%";
  if (ratio < 0.875) return "75-87%";
  return "87-100%";
}
