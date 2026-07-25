type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

/** 診断の回答。キーは QUESTIONS の id（purpose / period / budget / english / priority）。 */
export type StudyAbroadAnswers = Record<string, string>;

export interface StudyAbroadCompleteInput {
  answers: StudyAbroadAnswers;
  /** スコア1位のレコメンド先 */
  topCountry: string;
  topRegion: string;
}

/** GA4 イベント study_abroad_complete のパラメータを組み立てる（純粋関数・テスト対象）。
 * 回答（低カーディナリティの列挙値）と1位のレコメンド先を送る。
 * 回答キー english は GA4 上での意味を明確にするため english_level にリネームして送る。 */
export function buildStudyAbroadCompleteParams(e: StudyAbroadCompleteInput) {
  return {
    top_country: e.topCountry,
    top_region: e.topRegion,
    purpose: e.answers.purpose ?? "",
    period: e.answers.period ?? "",
    budget: e.answers.budget ?? "",
    english_level: e.answers.english ?? "",
    priority: e.answers.priority ?? "",
  };
}

/** 留学先診断の完了を GA4 に送る。gtag が無い環境では何もしない。 */
export function trackStudyAbroadComplete(e: StudyAbroadCompleteInput): void {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  if (typeof w.gtag !== "function") return;
  w.gtag("event", "study_abroad_complete", buildStudyAbroadCompleteParams(e));
}
