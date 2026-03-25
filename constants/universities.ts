export const UNIVERSITY_OPTIONS = [
  "北海道大学",
  "東北大学",
  "東京大学",
  "名古屋大学",
  "京都大学",
  "大阪大学",
  "九州大学",
  "一橋大学",
  "東京科学大学",
  "慶應義塾大学",
  "早稲田大学",
  "上智大学",
  "国際基督教大学",
  "その他",
] as const;

export const UNIVERSITY_OTHER = "その他";

export function isKnownUniversity(value: string): boolean {
  return (UNIVERSITY_OPTIONS as readonly string[]).includes(value);
}

export function toUniversityFormState(stored: string | null | undefined): {
  selected: string;
  other: string;
} {
  const v = (stored ?? "").trim();
  if (!v) return { selected: "", other: "" };
  if (isKnownUniversity(v)) return { selected: v, other: "" };
  return { selected: UNIVERSITY_OTHER, other: v };
}

export function resolveUniversityValue(selected: string, other: string): string {
  const s = selected.trim();
  if (!s) return "";
  if (s === UNIVERSITY_OTHER) return other.trim();
  return s;
}

