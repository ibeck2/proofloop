/** 成績評語1つと、それに対応するグレードポイント */
export type GradeOption = {
  /** 表示ラベル。例: "秀", "A", "優" */
  label: string;
  /** グレードポイント。例: 4 */
  point: number;
};

/** 指標の計算方式 */
export type ScaleMethod =
  /** 評語 → グレードポイント */
  | "grade"
  /** 素点 → グレードポイント */
  | "score"
  /** 評点をそのまま加重平均する（グレードポイントへの換算をしない） */
  | "raw";

/** 結果パネルでどのCTAを出すか */
export type CtaPolicy =
  /** 値が3.0以上なら留学、未満なら履修設計（従来のGPA向け挙動） */
  | "gpa-threshold"
  /** 値によらず留学ガイドへ */
  | "always-study-abroad"
  /** 値によらず履修ガイドへ */
  | "always-credits";

/** GA4送信に使う、満点に対する比率の帯 */
export type ValueBand =
  | "0-50%"
  | "50-62%"
  | "62-75%"
  | "75-87%"
  | "87-100%";

/** 成績評価の換算方式 */
export type GradeScale = {
  id: string;
  /** UIに表示する方式名 */
  label: string;
  method: ScaleMethod;
  /** method === 'grade' のとき必須。表示順は配列順 */
  grades?: GradeOption[];
  /**
   * method === 'score' のとき必須。素点(0-100)からGPを返す。
   * 出典の対応表がその素点区間を定義していない場合は `null` を返すこと
   * （下位の区分に丸めて数値を捏造してはならない）。
   */
  scoreToPoint?: (score: number) => number | null;
  /** この方式の満点。GPAなら4や4.3、成績評価係数なら3、基本平均点なら100 */
  maxValue: number;
  /** 画面に出す指標名。"GPA" / "基本平均点" / "成績評価係数" */
  metricLabel: string;
  /** 値に付ける単位。基本平均点なら "点"。省略時は付けない */
  unitSuffix?: string;
  /** 重率の入力欄を出すか。基本平均点のみ true */
  usesWeight?: boolean;
  /** 「不可を計算から除外する」の切替を出す場合の設定 */
  failExclusionToggle?: {
    /** 除外対象とする評語のラベル */
    failLabels: string[];
    /** チェックボックスの脇に表示する説明 */
    note: string;
  };
  /** 結果パネルのCTA方針。省略時は "gpa-threshold" */
  ctaPolicy?: CtaPolicy;
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
  /** 計測用の区分。'top' = 調査対象の上位校 / 'other' = それ以外 */
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
  /** method === 'score' のとき使用。0-100。method === 'raw' では評点として使う */
  score?: number;
  /** 重率。usesWeight の方式でのみ使う。省略時は 1 として扱う */
  weight?: number;
};

/** 計算結果 */
export type MetricResult = {
  /** 小数第2位まで四捨五入した指標値 */
  value: number;
  /** 分母に実際に寄与した科目の素の単位数の合計（重率を掛ける前の値） */
  totalCredits: number;
  /** 分母に実際に寄与した科目数 */
  countedCourses: number;
};
