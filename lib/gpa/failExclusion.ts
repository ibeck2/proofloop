import type { Course, GradeScale } from "./types";

/**
 * 「不可の科目を除外する」がONのとき、対象の評語の科目を取り除く。
 *
 * 計算関数にこの概念を持ち込まないための変換層。出典（東大の成績評価係数計算表）は
 * 不可を分母に含めるかどうかについて記載が矛盾しているため、どちらでも計算できるようにしてある。
 */
export function excludeFailCourses(
  courses: Course[],
  scale: GradeScale,
  enabled: boolean
): Course[] {
  const failLabels = scale.failExclusionToggle?.failLabels ?? [];
  if (!enabled || failLabels.length === 0) return courses;
  return courses.filter((c) => !(c.grade && failLabels.includes(c.grade)));
}
