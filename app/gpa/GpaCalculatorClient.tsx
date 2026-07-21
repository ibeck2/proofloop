"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { calculateGpa, toGpaBand } from "@/lib/gpa/calculate";
import type { CalculateOutput } from "@/lib/gpa/calculate";
import {
  UNIVERSITIES,
  findScaleById,
  getDefaultScale,
} from "@/lib/gpa/universities";
import type { Course, GpaResult, GradeScale } from "@/lib/gpa/types";

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

/** 未選択・一覧にない大学を表す値 */
const OTHER_UNIVERSITY = "other";

type CourseField = {
  name: string;
  credits: string;
  grade: string;
  score: string;
};

type FormValues = {
  universityId: string;
  courses: CourseField[];
};

const EMPTY_COURSE: CourseField = { name: "", credits: "", grade: "", score: "" };

function trackCalculate(params: {
  university_id: string;
  university_tier: string;
  gpa_band: string;
  course_count: number;
}) {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  if (typeof w.gtag !== "function") return;
  w.gtag("event", "gpa_calculate", params);
}

/** calculateGpa のエラーを、画面に出す日本語メッセージへ変換する */
function errorMessage(
  output: Extract<CalculateOutput, { ok: false }>,
  courses: Course[]
): string {
  switch (output.reason) {
    case "no_courses":
      return "科目を1つ以上入力してください。";
    case "zero_credits":
      return "単位数の合計が0のため計算できません。単位数を入力してください。";
    case "invalid_credits":
      return "単位数は0以上の数値で入力してください。";
    case "invalid_grade":
      return "すべての科目で成績を選択してください。";
    case "invalid_score": {
      const course = courses.find((c) => c.id === output.courseId);
      const score = course?.score;
      // 0〜100 に収まっているのに換算できない場合は、その大学の公式資料に
      // その点数帯のGP定義が無いことを意味する（例：大阪大学 令和7年度以前は
      // 60-64・70-74・80-84 が未定義）。範囲内の点数を入れた学生に
      // 「0〜100の範囲で入力してください」と返すと確実に混乱させるため、分けて出す。
      if (
        score !== undefined &&
        Number.isFinite(score) &&
        score >= 0 &&
        score <= 100
      ) {
        return "入力された点数は、選択した大学の公式資料にGPの定義がないため計算できません。上の換算方式の注記をご確認ください。";
      }
      return "素点は0〜100の範囲で入力してください。";
    }
    default:
      return "入力内容を確認してください。";
  }
}

export default function GpaCalculatorClient() {
  const [result, setResult] = useState<GpaResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { register, control, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: {
      universityId: OTHER_UNIVERSITY,
      courses: [{ ...EMPTY_COURSE }, { ...EMPTY_COURSE }, { ...EMPTY_COURSE }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "courses" });

  const universityId = watch("universityId");

  const university = useMemo(
    () => UNIVERSITIES.find((u) => u.id === universityId),
    [universityId]
  );

  const scale: GradeScale = useMemo(() => {
    if (!university) return getDefaultScale();
    return findScaleById(university.scaleId) ?? getDefaultScale();
  }, [university]);

  const onSubmit = (values: FormValues) => {
    const courses: Course[] = values.courses
      // 完全に空の行は無視する（入力途中の行でエラーを出さないため）
      .filter(
        (c) =>
          c.name.trim() !== "" ||
          c.credits.trim() !== "" ||
          c.grade.trim() !== "" ||
          c.score.trim() !== ""
      )
      .map((c, index) => ({
        id: String(index),
        name: c.name,
        credits: Number(c.credits),
        grade: scale.method === "grade" ? c.grade : undefined,
        score: scale.method === "score" ? Number(c.score) : undefined,
      }));

    const output = calculateGpa({ courses, scale });

    if (!output.ok) {
      setResult(null);
      setFormError(errorMessage(output, courses));
      return;
    }

    setFormError(null);
    setResult(output.result);

    trackCalculate({
      university_id: university ? university.id : OTHER_UNIVERSITY,
      university_tier: university ? university.tier : "unset",
      gpa_band: toGpaBand(output.result.gpa),
      course_count: output.result.countedCourses,
    });
  };

  return (
    <div className="font-body">
      <form onSubmit={handleSubmit(onSubmit)} className="border border-border-grey p-6">
        {/* ── 大学選択 ───────────────────────── */}
        <div className="mb-6">
          <label
            htmlFor="universityId"
            className="block font-display text-sm font-bold text-primary"
          >
            大学を選ぶ
          </label>
          <p className="mt-1 text-xs text-text-grey">
            大学によってGPAの換算方式が異なります。一覧にない場合は「その他の大学」を選び、
            お使いの大学の履修要項で評語とGPの対応をご確認ください。
          </p>
          <select
            id="universityId"
            {...register("universityId")}
            className="mt-2 w-full border border-border-grey bg-white p-3 text-primary"
          >
            {UNIVERSITIES.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
            <option value={OTHER_UNIVERSITY}>その他の大学（一般的な方式で計算）</option>
          </select>

          {/* 換算方式と出典の表示。競合ツールにない差別化点 */}
          <div className="mt-3 border-l-4 border-primary bg-neutral-light p-3 text-xs text-text-grey">
            <p className="font-bold text-primary">換算方式：{scale.label}</p>
            {scale.note ? <p className="mt-1">{scale.note}</p> : null}
            {university ? (
              <p className="mt-1">
                出典：
                <a
                  href={university.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline"
                >
                  {university.name} 公式
                </a>
                （{university.verifiedAt} 確認）
              </p>
            ) : null}
            {university?.note ? <p className="mt-1">{university.note}</p> : null}
          </div>
        </div>

        {/* ── 科目入力 ───────────────────────── */}
        <div>
          <p className="font-display text-sm font-bold text-primary">履修科目</p>
          <p className="mt-1 text-xs text-text-grey">
            GPAに算入される科目のみ入力してください（認定単位・履修中の科目は除きます）。
          </p>

          <div className="mt-3 space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[8rem] flex-1">
                  <label className="block text-xs text-text-grey">科目名（任意）</label>
                  <input
                    type="text"
                    {...register(`courses.${index}.name`)}
                    className="mt-1 w-full border border-border-grey p-2 text-primary"
                    placeholder="微分積分"
                  />
                </div>

                <div className="w-24">
                  <label className="block text-xs text-text-grey">単位数</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    {...register(`courses.${index}.credits`)}
                    className="mt-1 w-full border border-border-grey p-2 text-primary"
                    placeholder="2"
                  />
                </div>

                {scale.method === "grade" ? (
                  <div className="w-32">
                    <label className="block text-xs text-text-grey">成績</label>
                    <select
                      {...register(`courses.${index}.grade`)}
                      className="mt-1 w-full border border-border-grey bg-white p-2 text-primary"
                    >
                      <option value="">選択</option>
                      {scale.grades?.map((g) => (
                        <option key={g.label} value={g.label}>
                          {g.label}（{g.point}）
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="w-32">
                    <label className="block text-xs text-text-grey">素点（0〜100）</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      inputMode="numeric"
                      {...register(`courses.${index}.score`)}
                      className="mt-1 w-full border border-border-grey p-2 text-primary"
                      placeholder="85"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                  className="border border-border-grey px-3 py-2 text-xs text-text-grey disabled:opacity-40"
                  aria-label={`${index + 1}行目を削除`}
                >
                  削除
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => append({ ...EMPTY_COURSE })}
            className="mt-3 border border-primary px-4 py-2 text-sm font-bold text-primary"
          >
            ＋ 科目を追加
          </button>
        </div>

        {formError ? (
          <p role="alert" className="mt-4 border-l-4 border-accent bg-neutral-light p-3 text-sm text-accent">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-6 w-full bg-primary px-6 py-4 font-display text-base font-bold text-white"
        >
          GPAを計算する
        </button>
      </form>

      {/* ── 結果 ───────────────────────── */}
      {result ? <GpaResultPanel result={result} maxGpa={scale.maxGpa} /> : null}
    </div>
  );
}

function GpaResultPanel({ result, maxGpa }: { result: GpaResult; maxGpa: number }) {
  const band = toGpaBand(result.gpa);

  return (
    <section aria-live="polite" className="mt-8 border border-primary p-6">
      <p className="font-display text-sm font-bold text-text-grey">あなたのGPA</p>
      <p className="mt-2 font-display text-5xl font-bold text-primary">
        {result.gpa.toFixed(2)}
        <span className="ml-2 text-lg text-text-grey">/ {maxGpa.toFixed(1)}</span>
      </p>
      <p className="mt-2 text-sm text-text-grey">
        算入科目：{result.countedCourses}科目／合計 {result.totalCredits} 単位
      </p>

      {/* GPA帯に応じた次アクション。就活系の導線は置かない */}
      <div className="mt-6 border-t border-border-grey pt-6">
        {band === "3.0-3.5" || band === "3.5~" ? (
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
