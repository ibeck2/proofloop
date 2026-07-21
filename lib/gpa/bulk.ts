import type { Course, GradeScale } from "./types";

/**
 * まとめ入力（評語ごとに合計単位数を入れる方式）に対応できるかを返す。
 *
 * 素点方式は連続値のため評語単位でまとめられない。重率を使う方式は
 * 科目ごとに重率を選ぶ必要があるため、まとめ入力とは両立しない。
 */
export function supportsBulkInput(scale: GradeScale): boolean {
  return scale.method === "grade" && !scale.usesWeight;
}

/**
 * 評語ごとの合計単位数から Course[] を合成する。
 *
 * 合成した配列はそのまま calculateMetric に渡す。計算側にまとめ入力の
 * 概念を持ち込まないための変換層。
 *
 * - 並び順は方式の grades の順に揃える（入力オブジェクトのキー順に依存しない）
 * - 単位数が 0 または NaN の評語は除外する
 * - 方式に存在しない評語は無視する
 * - 負の単位数はそのまま通す。入力値の妥当性検証は calculateMetric の責務であり、
 *   ここで弾くと検証が二重管理になる
 */
export function coursesFromGradeTotals(
  scale: GradeScale,
  totals: Record<string, number>
): Course[] {
  const courses: Course[] = [];

  for (const option of scale.grades ?? []) {
    const credits = totals[option.label];
    if (credits === undefined) continue;
    if (!Number.isFinite(credits)) continue;
    if (credits === 0) continue;

    courses.push({
      id: `bulk-${option.label}`,
      name: option.label,
      credits,
      grade: option.label,
    });
  }

  return courses;
}
