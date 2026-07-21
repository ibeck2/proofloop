import type { GradeScale } from "@/lib/gpa/types";

/**
 * まとめ入力モードのUI。評語ごとに合計単位数を1つずつ入力させる。
 * 値の保持は親（GpaCalculatorClient）が行う。
 */
export default function GradeTotalsInput({
  scale,
  totals,
  onChange,
  idPrefix,
}: {
  scale: GradeScale;
  totals: Record<string, string>;
  onChange: (label: string, value: string) => void;
  idPrefix: string;
}) {
  return (
    <div className="mt-3 space-y-3">
      {scale.grades?.map((option) => (
        <div key={option.label} className="flex items-end gap-3">
          <label
            htmlFor={`${idPrefix}-total-${option.label}`}
            className="w-32 text-sm text-primary"
          >
            {option.label}（{option.point}）
          </label>
          <div className="w-32">
            <span className="block text-xs text-text-grey">合計単位数</span>
            <input
              id={`${idPrefix}-total-${option.label}`}
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={totals[option.label] ?? ""}
              onChange={(e) => onChange(option.label, e.target.value)}
              className="mt-1 w-full border border-border-grey p-2 text-primary"
              placeholder="0"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
