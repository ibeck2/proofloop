import Link from "next/link";
import type { GradeScale, MetricResult } from "@/lib/gpa/types";

export default function MetricResultPanel({
  result,
  scale,
}: {
  result: MetricResult;
  scale: GradeScale;
}) {
  // 満点は方式ごとに異なる（4.0 / 4.3 / 4.5 / 3.0 / 100）。比率で判定すると満点4.3の大学で
  // 発火点が3.225に上がり、従来3.0で表示されていた学生に出なくなる。
  // 従来どおり絶対値3.0で判定する。方式によっては値によらずCTAを固定する。
  const policy = scale.ctaPolicy ?? "gpa-threshold";
  const showStudyAbroad =
    policy === "always-study-abroad" ||
    (policy === "gpa-threshold" && result.value >= 3.0);

  return (
    <section className="mt-8 border border-primary p-6">
      <p className="font-display text-sm font-bold text-text-grey">
        あなたの{scale.metricLabel}
      </p>
      <p className="mt-2 font-display text-5xl font-bold text-primary">
        {result.value.toFixed(2)}
        {scale.unitSuffix ?? ""}
        <span className="ml-2 text-lg text-text-grey">
          / {scale.maxValue.toFixed(scale.maxValue >= 100 ? 0 : 1)}
          {scale.unitSuffix ?? ""}
        </span>
      </p>
      <p className="mt-2 text-sm text-text-grey">
        算入科目：{result.countedCourses}科目／合計 {result.totalCredits} 単位
      </p>

      {/* 方式の ctaPolicy に応じた次アクション。就活系の導線は置かない */}
      <div className="mt-6 border-t border-border-grey pt-6">
        {showStudyAbroad ? (
          <div>
            <p className="font-display text-base font-bold text-primary">
              交換留学の出願要件を満たしている可能性があります
            </p>
            <p className="mt-2 text-sm text-text-grey">
              多くの大学の交換留学プログラムはGPAを出願要件に置いています。必要なGPAの目安と、
              留学先の選び方を確認してみてください。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/guide/study-abroad"
                className="bg-primary px-5 py-3 text-sm font-bold text-white"
              >
                留学ガイドを読む
              </Link>
              <Link
                href="/guide/study-abroad/recommend"
                className="border border-primary px-5 py-3 text-sm font-bold text-primary"
              >
                留学先を診断する
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <p className="font-display text-base font-bold text-primary">
              GPAは履修設計で変えられます
            </p>
            <p className="mt-2 text-sm text-text-grey">
              単位の取り方・必修と選択のバランス・成績評価の仕組みを理解すると、GPAは戦略的に上げられます。
            </p>
            <div className="mt-4">
              <Link
                href="/guide/credits"
                className="bg-primary px-5 py-3 text-sm font-bold text-white"
              >
                履修・単位ガイドを読む
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-border-grey pt-6">
        <p className="text-sm text-text-grey">
          学外の活動（学生団体・インターン・プロジェクト）は成績には出ませんが、実績として蓄積できます。
        </p>
        <Link href="/signup" className="mt-3 inline-block text-sm font-bold text-accent underline">
          ProofLoopで活動を記録する
        </Link>
      </div>
    </section>
  );
}
