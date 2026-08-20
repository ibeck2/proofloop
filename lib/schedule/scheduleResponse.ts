/**
 * 日程調整の回答（○/△/×）の表示変換。
 * DB側はtasks.statusと同じ「英語canonical値／UI=日本語ラベル」パターンに
 * 揃えるため、response列は 'yes'/'maybe'/'no' を持つ。
 */

const RESPONSE_LABEL: Record<string, string> = {
  yes: "○",
  maybe: "△",
  no: "×",
};

export function responseLabel(response: string | null | undefined): string {
  return (response && RESPONSE_LABEL[response]) || "—";
}

const RESPONSE_BADGE_CLASS: Record<string, string> = {
  yes: "border border-ink bg-ink text-paper",
  maybe: "border border-rule bg-mist text-ink",
  no: "border border-rule bg-paper text-graphite",
};
const DEFAULT_RESPONSE_BADGE_CLASS = "border border-rule bg-paper text-graphite/50";

export function responseBadgeClass(response: string | null | undefined): string {
  return RESPONSE_BADGE_CLASS[response ?? ""] ?? DEFAULT_RESPONSE_BADGE_CLASS;
}
