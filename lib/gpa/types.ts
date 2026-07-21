/** 成績評語1つと、それに対応するグレードポイント */
export type GradeOption = {
  /** 表示ラベル。例: "秀", "A", "優" */
  label: string;
  /** グレードポイント。例: 4 */
  point: number;
};

/** GPA換算方式 */
export type GradeScale = {
  id: string;
  /** UIに表示する方式名 */
  label: string;
  /** 'grade' = 評語から換算 / 'score' = 素点から換算 */
  method: "grade" | "score";
  /** method === 'grade' のとき必須。表示順は配列順 */
  grades?: GradeOption[];
  /**
   * method === 'score' のとき必須。素点(0-100)からGPを返す。
   * 出典の対応表がその素点区間を定義していない場合は `null` を返すこと
   * （下位の区分に丸めて数値を捏造してはならない）。
   */
  scoreToPoint?: (score: number) => number | null;
  /** この方式の満点GPA */
  maxGpa: number;
  /** 方式の補足説明。UIに表示する */
  note?: string;
};

/** 大学 */
export type University = {
  id: string;
  /** 正式名称。例: "東京大学" */
  name: string;
  /** 選択UI用の短縮名。例: "東大" */
  shortName: string;
  /** 計測用の区分。'top' = 調査対象13校 / 'other' = それ以外 */
  tier: "top" | "other";
  /** 参照する GradeScale の id */
  scaleId: string;
  /** 換算方式の出典URL（大学公式）。空文字を許さない */
  sourceUrl: string;
  /** 出典を確認した日付。"YYYY-MM-DD" */
  verifiedAt: string;
  /** 学部差など、大学固有の注意書き */
  note?: string;
};

/** 入力された履修科目1件 */
export type Course = {
  id: string;
  name: string;
  /** 単位数。0以上 */
  credits: number;
  /** method === 'grade' のとき使用。GradeOption.label と一致させる */
  grade?: string;
  /** method === 'score' のとき使用。0-100 */
  score?: number;
};

/** 計算結果 */
export type GpaResult = {
  /** 小数第2位まで四捨五入 */
  gpa: number;
  totalCredits: number;
  /** GPAに算入された科目数 */
  countedCourses: number;
};

/** GA4送信・出し分けに使うGPA帯 */
export type GpaBand = "~2.0" | "2.0-2.5" | "2.5-3.0" | "3.0-3.5" | "3.5~";
