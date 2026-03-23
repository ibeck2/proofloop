export const TIMELINE_CATEGORIES = [
  { value: "recruitment", label: "新歓・メンバー募集", icon: "🎉" },
  { value: "event", label: "イベント・告知", icon: "📅" },
  { value: "report", label: "活動報告", icon: "📸" },
  { value: "campus_life", label: "大学生活", icon: "🏫" },
  { value: "other", label: "雑談・その他", icon: "💬" },
] as const;

export type TimelineCategoryValue = (typeof TIMELINE_CATEGORIES)[number]["value"];

export function getTimelineCategoryMeta(category: string | null | undefined): {
  value: string;
  label: string;
  icon: string;
} | null {
  if (!category) return null;
  const found = TIMELINE_CATEGORIES.find((c) => c.value === category);
  if (found) return found;
  return { value: category, label: category, icon: "💬" };
}

