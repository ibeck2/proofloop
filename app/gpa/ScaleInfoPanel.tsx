import type { GradeScale, University } from "@/lib/gpa/types";

/**
 * 選択中の換算方式と、その出典・確認日・注記を表示する。
 * 出典と確認日の明示はこのツールの差別化の核なので、省略しないこと。
 */
export default function ScaleInfoPanel({
  scale,
  university,
}: {
  scale: GradeScale;
  university?: University;
}) {
  return (
    <div className="mt-3 border border-rule border-l-4 border-l-ink bg-mist p-3 text-xs text-graphite">
      <p className="font-bold text-ink">換算方式：{scale.label}</p>
      {scale.note ? <p className="mt-1">{scale.note}</p> : null}
      {university ? (
        <p className="mt-1">
          出典：
          <a
            href={university.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline"
          >
            {university.name} 公式
          </a>
          （{university.verifiedAt} 確認）
        </p>
      ) : null}
      {university?.note ? <p className="mt-1">{university.note}</p> : null}
    </div>
  );
}
