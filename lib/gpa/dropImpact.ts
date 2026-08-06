import { calculateMetric } from "./calculate";
import type { GradeScale } from "./types";

/**
 * 単位を落とした（不可になった）ときにGPAがどう動くかを求める。
 *
 * `/guide/credits` の「選択科目を落とすとGPAはどう下がる？」で表示する数値の計算元。
 * 本文に数字をベタ書きせず、`/gpa`（GPA計算機）と**同一の加重平均・丸め規則**で
 * 算出することで、ガイドの記述と計算機の答えが食い違わないようにしている。
 */

/**
 * GPAの値を「評点」としてそのまま加重平均するための内部方式。
 * method: "raw" は換算をせず Σ(値×単位数)÷Σ(単位数) を返すため、
 * 「これまでのGPAを1つの科目に集約したもの」として扱える。
 */
const WEIGHTED_AVERAGE_SCALE: GradeScale = {
  id: "internal-weighted-average",
  label: "加重平均（内部計算用）",
  method: "raw",
  maxValue: 4,
  metricLabel: "GPA",
};

export type DropImpactInput = {
  /** 落とす前のGPA */
  currentGpa: number;
  /** 落とす前に分母へ算入されていた単位数 */
  currentCredits: number;
  /** 落とした科目の単位数（不可＝GP 0 として分母に算入される） */
  failedCredits: number;
};

/**
 * 不可（GP 0）が1科目加わったあとのGPA。小数第2位で四捨五入。
 * 入力が計算不能なとき（単位数0など）は null を返す。
 */
export function gpaAfterFail(input: DropImpactInput): number | null {
  const { currentGpa, currentCredits, failedCredits } = input;

  const output = calculateMetric({
    courses: [
      { id: "current", name: "これまでの成績", credits: currentCredits, score: currentGpa },
      { id: "failed", name: "落とした科目", credits: failedCredits, score: 0 },
    ],
    scale: WEIGHTED_AVERAGE_SCALE,
  });

  return output.ok ? output.result.value : null;
}

export type RecoveryInput = DropImpactInput & {
  /** 戻したいGPA */
  targetGpa: number;
  /** これから取る科目のグレードポイント（優=3.0、秀=4.0 など） */
  gradePoint: number;
};

/**
 * 落としたあと、`gradePoint` の成績を何単位積めば `targetGpa` に届くかを返す。
 * 届かない場合（グレードポイントが目標GPA以下）は null を返す。
 *
 * (G×C + P×x) ÷ (C + F + x) = T を x について解くと
 *   x = (T×(C+F) − G×C) ÷ (P − T)
 *
 * 単位は整数でしか取れないので切り上げる。ただし解がちょうど整数になる場合
 * （例：38.000000000000114）に浮動小数点の誤差で1単位多く出さないよう、
 * 切り上げ前にごく小さい許容差を引く。GPAの桁では本物の境界と衝突しない大きさ。
 */
export function creditsToRecover(input: RecoveryInput): number | null {
  const { currentGpa, currentCredits, failedCredits, targetGpa, gradePoint } = input;

  // 目標と同じか低い成績をいくら積んでも目標には届かない（漸近するだけ）
  if (gradePoint <= targetGpa) return null;

  const totalCredits = currentCredits + failedCredits;
  const shortfall = targetGpa * totalCredits - currentGpa * currentCredits;

  // すでに目標以上なら追加の単位は要らない
  if (shortfall <= 0) return 0;

  return Math.ceil(shortfall / (gradePoint - targetGpa) - 1e-6);
}
