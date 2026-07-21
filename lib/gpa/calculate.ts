import type { Course, GpaBand, GpaResult, GradeScale } from "./types";

export type CalculateErrorReason =
  | "no_courses"
  | "zero_credits"
  | "invalid_credits"
  | "invalid_grade"
  | "invalid_score";

export type CalculateOutput =
  | { ok: true; result: GpaResult }
  | { ok: false; reason: CalculateErrorReason; courseId?: string };

/** 小数第2位まで四捨五入する */
function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * 科目1件のグレードポイントを求める。
 * 換算できない場合は null を返す（呼び出し側でエラー種別を判定する）。
 */
function resolvePoint(course: Course, scale: GradeScale): number | null {
  if (scale.method === "grade") {
    if (!course.grade) return null;
    const found = scale.grades?.find((g) => g.label === course.grade);
    return found ? found.point : null;
  }

  const score = course.score;
  if (score === undefined || !Number.isFinite(score)) return null;
  if (score < 0 || score > 100) return null;
  if (!scale.scoreToPoint) return null;
  return scale.scoreToPoint(score);
}

/**
 * GPA = Σ(GP × 単位数) ÷ Σ(単位数)
 * 不可（GP=0）の科目も分母の単位数に算入する。
 */
export function calculateGpa(input: {
  courses: Course[];
  scale: GradeScale;
}): CalculateOutput {
  const { courses, scale } = input;

  if (courses.length === 0) {
    return { ok: false, reason: "no_courses" };
  }

  let weighted = 0;
  let totalCredits = 0;

  for (const course of courses) {
    if (!Number.isFinite(course.credits) || course.credits < 0) {
      return { ok: false, reason: "invalid_credits", courseId: course.id };
    }

    const point = resolvePoint(course, scale);
    if (point === null) {
      return {
        ok: false,
        reason: scale.method === "grade" ? "invalid_grade" : "invalid_score",
        courseId: course.id,
      };
    }

    weighted += point * course.credits;
    totalCredits += course.credits;
  }

  if (totalCredits === 0) {
    return { ok: false, reason: "zero_credits" };
  }

  return {
    ok: true,
    result: {
      gpa: roundTo2(weighted / totalCredits),
      totalCredits,
      countedCourses: courses.length,
    },
  };
}

/** GA4送信とCTA出し分けに使うGPA帯を返す */
export function toGpaBand(gpa: number): GpaBand {
  if (gpa < 2.0) return "~2.0";
  if (gpa < 2.5) return "2.0-2.5";
  if (gpa < 3.0) return "2.5-3.0";
  if (gpa < 3.5) return "3.0-3.5";
  return "3.5~";
}
