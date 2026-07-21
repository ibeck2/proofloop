import type { GradeScale } from "./types";

/**
 * 大学非依存の汎用換算方式。
 * 調査で出典が取れなかった大学、および一覧にない大学のフォールバックとして使う。
 */
export const GENERIC_SCALES: GradeScale[] = [
  {
    id: "generic-shuu-yuu-ryou-ka",
    label: "4段階（秀・優・良・可・不可）",
    method: "grade",
    grades: [
      { label: "秀", point: 4 },
      { label: "優", point: 3 },
      { label: "良", point: 2 },
      { label: "可", point: 1 },
      { label: "不可", point: 0 },
    ],
    maxGpa: 4,
    note: "多くの大学で使われている一般的な方式です。お使いの大学の履修要項で評語とGPの対応をご確認ください。",
  },
  {
    id: "generic-s-a-b-c-d",
    label: "4段階（S・A・B・C・D）",
    method: "grade",
    grades: [
      { label: "S", point: 4 },
      { label: "A", point: 3 },
      { label: "B", point: 2 },
      { label: "C", point: 1 },
      { label: "D", point: 0 },
    ],
    maxGpa: 4,
    note: "S/A/B/C/D 表記の一般的な方式です。お使いの大学の履修要項で評語とGPの対応をご確認ください。",
  },
];

/** 大学未選択時に使う既定の方式 */
export const DEFAULT_SCALE_ID = "generic-shuu-yuu-ryou-ka";
