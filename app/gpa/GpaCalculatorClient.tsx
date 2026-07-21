"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { calculateMetric, toValueBand } from "@/lib/gpa/calculate";
import type { CalculateOutput } from "@/lib/gpa/calculate";
import {
  UNIVERSITIES,
  findScaleById,
  getDefaultScale,
} from "@/lib/gpa/universities";
import type { Course, MetricResult, GradeScale } from "@/lib/gpa/types";
import { coursesFromGradeTotals, supportsBulkInput } from "@/lib/gpa/bulk";
import ScaleInfoPanel from "./ScaleInfoPanel";
import MetricResultPanel from "./MetricResultPanel";
import GradeTotalsInput from "./GradeTotalsInput";

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

/** 未選択・一覧にない大学を表す値 */
const OTHER_UNIVERSITY = "other";

type CourseField = {
  name: string;
  credits: string;
  grade: string;
  score: string;
  weight: string;
};

type FormValues = {
  universityId: string;
  courses: CourseField[];
};

const EMPTY_COURSE: CourseField = {
  name: "",
  credits: "",
  grade: "",
  score: "",
  weight: "1",
};

/** 空文字を 0 ではなく NaN にする。Number("") === 0 のため、
 *  素点や単位数の入力漏れが「0点」「0単位」として黙って計算に入ってしまう。 */
function toNumber(value: string): number {
  return value.trim() === "" ? NaN : Number(value);
}

function trackCalculate(params: {
  university_id: string;
  university_tier: string;
  metric_id: string;
  value_band: string;
  course_count: number;
  input_mode: string;
}) {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  if (typeof w.gtag !== "function") return;
  w.gtag("event", "gpa_calculate", params);
}

/** calculateMetric のエラーを、画面に出す日本語メッセージへ変換する */
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
    case "invalid_weight":
      return "重率は 1・0.1・0 のいずれかを選んでください。";
    default:
      return "入力内容を確認してください。";
  }
}

export default function GpaCalculatorClient() {
  const [result, setResult] = useState<MetricResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [excludeFail, setExcludeFail] = useState(false);
  const [inputMode, setInputMode] = useState<"per-course" | "by-grade">(
    "per-course"
  );
  const [gradeTotals, setGradeTotals] = useState<Record<string, string>>({});

  // ラベルと入力欄を紐付けるための id 接頭辞。
  // react-hook-form の `field.id` はランダムUUIDでサーバーとクライアントで
  // 値が異なるため、id/htmlFor に使うとハイドレーション不一致エラーになる。
  // useId() はSSRセーフで、index と組み合わせれば行ごとに一意になる。
  // （React の key には従来どおり field.id を使う。行削除で index がずれるため）
  const fieldIdPrefix = useId();

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

  // 大学を切り替えたら、前の大学の方式で計算した結果とエラーを消す。
  // result は送信時にしか更新されないのに scale は選択に追従するため、
  // これを消さないと「一橋の方式で出した3.80」を「3.80 / 4.0（京大の満点）」
  // として表示してしまい、学生に誤った数値を見せることになる。
  useEffect(() => {
    setResult(null);
    setFormError(null);
    setExcludeFail(false);
    setGradeTotals({});
  }, [universityId]);

  const bulkSupported = supportsBulkInput(scale);

  // まとめ入力に非対応の方式へ切り替えたら自動で科目ごと入力へ戻す。
  useEffect(() => {
    if (!bulkSupported) setInputMode("per-course");
  }, [bulkSupported]);

  const onSubmit = (values: FormValues) => {
    const courses: Course[] =
      inputMode === "by-grade"
        ? coursesFromGradeTotals(
            scale,
            Object.fromEntries(
              Object.entries(gradeTotals).map(([k, v]) => [k, toNumber(v)])
            )
          )
        : values.courses
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
              credits: toNumber(c.credits),
              grade: scale.method === "grade" ? c.grade : undefined,
              score: scale.method === "score" ? toNumber(c.score) : undefined,
              weight: scale.usesWeight ? toNumber(c.weight) : undefined,
            }));

    const failLabels = scale.failExclusionToggle?.failLabels ?? [];
    const targetCourses =
      excludeFail && failLabels.length > 0
        ? courses.filter((c) => !(c.grade && failLabels.includes(c.grade)))
        : courses;

    // 不可除外のチェックで全科目が消えた場合。calculateMetric は "no_courses" を返すが、
    // 「科目を1つ以上入力してください」では、実際に入力した学生に原因が伝わらない。
    if (excludeFail && courses.length > 0 && targetCourses.length === 0) {
      setResult(null);
      setFormError(
        "不可の科目を除外した結果、計算対象の科目がなくなりました。チェックを外すか、他の科目を入力してください。"
      );
      return;
    }

    // まとめ入力モードでは「科目を1つ以上入力してください」が科目行を指す文言になり、
    // 単位数欄を見ている学生に噛み合わない。
    if (inputMode === "by-grade" && courses.length === 0) {
      setResult(null);
      setFormError("成績ごとの合計単位数を1つ以上入力してください。");
      return;
    }

    const output = calculateMetric({ courses: targetCourses, scale });

    if (!output.ok) {
      setResult(null);
      setFormError(errorMessage(output, targetCourses));
      return;
    }

    setFormError(null);
    setResult(output.result);

    trackCalculate({
      university_id: university ? university.id : OTHER_UNIVERSITY,
      university_tier: university ? university.tier : "unset",
      metric_id: scale.id,
      value_band: toValueBand(output.result.value, scale.maxValue),
      course_count: output.result.countedCourses,
      input_mode: inputMode,
    });
  };

  return (
    <div className="font-body">
      {/* noValidate：ブラウザ標準のバリデーションが submit を止めると、
          自前の日本語メッセージ（特に「素点は0〜100の範囲で」）が表示されなくなるため無効化する。
          検証は calculateMetric 側で一元的に行う。 */}
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="border border-border-grey p-6"
      >
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

          <ScaleInfoPanel scale={scale} university={university} />
        </div>

        {/* ── 科目入力 ───────────────────────── */}
        <div>
          <p className="font-display text-sm font-bold text-primary">履修科目</p>
          <p className="mt-1 text-xs text-text-grey">
            GPAに算入される科目のみ入力してください（認定単位・履修中の科目は除きます）。
          </p>

          {bulkSupported ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setInputMode("per-course");
                  setResult(null);
                  setFormError(null);
                }}
                aria-pressed={inputMode === "per-course"}
                className={`border px-4 py-2 text-sm font-bold ${
                  inputMode === "per-course"
                    ? "border-primary bg-primary text-white"
                    : "border-border-grey text-text-grey"
                }`}
              >
                科目ごとに入力
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode("by-grade");
                  setResult(null);
                  setFormError(null);
                }}
                aria-pressed={inputMode === "by-grade"}
                className={`border px-4 py-2 text-sm font-bold ${
                  inputMode === "by-grade"
                    ? "border-primary bg-primary text-white"
                    : "border-border-grey text-text-grey"
                }`}
              >
                成績ごとにまとめて入力
              </button>
            </div>
          ) : null}

          {inputMode === "per-course" ? (
            <>
          <div className="mt-3 space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[8rem] flex-1">
                  <label htmlFor={`${fieldIdPrefix}-course-${index}-name`} className="block text-xs text-text-grey">科目名（任意）</label>
                  <input
                    id={`${fieldIdPrefix}-course-${index}-name`}
                    type="text"
                    {...register(`courses.${index}.name`)}
                    className="mt-1 w-full border border-border-grey p-2 text-primary"
                    placeholder="微分積分"
                  />
                </div>

                <div className="w-24">
                  <label htmlFor={`${fieldIdPrefix}-course-${index}-credits`} className="block text-xs text-text-grey">単位数</label>
                  <input
                    id={`${fieldIdPrefix}-course-${index}-credits`}
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
                    <label htmlFor={`${fieldIdPrefix}-course-${index}-grade`} className="block text-xs text-text-grey">成績</label>
                    <select
                      id={`${fieldIdPrefix}-course-${index}-grade`}
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
                    <label htmlFor={`${fieldIdPrefix}-course-${index}-score`} className="block text-xs text-text-grey">素点（0〜100）</label>
                    <input
                      id={`${fieldIdPrefix}-course-${index}-score`}
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

                {scale.usesWeight ? (
                  <div className="w-28">
                    <label
                      htmlFor={`${fieldIdPrefix}-course-${index}-weight`}
                      className="block text-xs text-text-grey"
                    >
                      重率
                    </label>
                    <select
                      id={`${fieldIdPrefix}-course-${index}-weight`}
                      {...register(`courses.${index}.weight`)}
                      className="mt-1 w-full border border-border-grey bg-white p-2 text-primary"
                    >
                      <option value="1">1</option>
                      <option value="0.1">0.1</option>
                      <option value="0">0（対象外）</option>
                    </select>
                  </div>
                ) : null}

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
            </>
          ) : (
            <GradeTotalsInput
              scale={scale}
              totals={gradeTotals}
              idPrefix={fieldIdPrefix}
              onChange={(label, value) =>
                setGradeTotals((prev) => ({ ...prev, [label]: value }))
              }
            />
          )}

          {scale.failExclusionToggle ? (
            <div className="mt-4 border-l-4 border-primary bg-neutral-light p-3">
              <label className="flex items-start gap-2 text-sm text-primary">
                <input
                  type="checkbox"
                  checked={excludeFail}
                  onChange={(e) => {
                    setExcludeFail(e.target.checked);
                    setResult(null);
                    setFormError(null);
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="font-bold">
                    不可（{scale.failExclusionToggle.failLabels.join("・")}）の科目を計算から除外する
                  </span>
                  <span className="mt-1 block text-xs text-text-grey">
                    {scale.failExclusionToggle.note}
                  </span>
                </span>
              </label>
            </div>
          ) : null}
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
      {/* aria-live は内容より先にDOMへ存在している必要があるため、
          パネルの有無にかかわらずラッパを常設し、中身だけ差し替える。 */}
      <div aria-live="polite">
        {result ? <MetricResultPanel result={result} scale={scale} /> : null}
      </div>
    </div>
  );
}
