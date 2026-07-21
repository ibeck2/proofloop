import { GENERIC_SCALES, DEFAULT_SCALE_ID } from "./scales";
import type { GradeScale, University } from "./types";

/**
 * 大学固有の換算方式。
 * 出典：docs/seo/gpa-university-scales.md（Task 1 の調査記録）。
 * 汎用方式（GENERIC_SCALES）と同一内容になる大学（慶應義塾大学）は、
 * ここに重複定義せず UNIVERSITIES 側で汎用方式の id を参照させている。
 */
export const UNIVERSITY_SCALES: GradeScale[] = [
  {
    // 出典：東京大学教養学部前期課程「進学選択に用いられる評点」
    // https://www.c.u-tokyo.ac.jp/zenki/news/kyoumu/heikinten.pdf（2026-07-21）
    // 計算例：https://zenkyomu.c.u-tokyo.ac.jp/sentaku/heikinten-sample.pdf（2026-07-21）
    id: "u-tokyo-basic-average-scale",
    label: "東京大学の基本平均点（評点をそのまま加重平均）",
    method: "raw",
    maxValue: 100,
    metricLabel: "基本平均点",
    unitSuffix: "点",
    usesWeight: true,
    ctaPolicy: "always-credits",
    note: "教養学部前期課程の進学選択（2年次の学部振り分け）専用の指標で、2S2ターム・2Sセメスターまでに履修した単位数と成績から算出します。重率は科目ごとに1・0.1・0のいずれかを選びます。重率1は科類ごとに定められた必修・準必修科目群（外国語・情報・身体運動健康科学実習・初年次ゼミナール・社会科学（文科）または自然科学（理科）・人文科学（文科のみ）・総合科目の指定単位）に、重率0.1はそれ以外で単位取得した基礎科目や指定単位数を超えて追加履修した展開科目・総合科目に適用されます（科類ごとの指定単位数の詳細はこの方式では扱いません）。重率0は公式の計算例に存在しますが、本文中に明文の規定がなく適用条件は未確認です。進学選択の必修枠の単位を取得していない場合、その枠は評点0・重率1として計算に算入され、平均点を押し下げます。一部の進学単位で使われる「指定平均点」（本方式とは別の基準）には対応していません。満点は出典の算出式から数学的に導いた値で、満点を明示した文言は出典にありません。",
  },
  {
    // 出典：東京大学「成績評価係数計算表」
    // https://www.u-tokyo.ac.jp/content/400125968.xls（2026-07-21）
    // 対象範囲の補足：https://www.u-tokyo.ac.jp/adm/go-global/ja/application-tips-USTEP_FAQ（2026-07-21）
    id: "u-tokyo-grade-coefficient-scale",
    label: "東京大学の成績評価係数（優上・優・良・可・不可の5段階）",
    method: "grade",
    grades: [
      { label: "優上", point: 3 },
      { label: "優", point: 3 },
      { label: "良", point: 2 },
      { label: "可", point: 1 },
      { label: "不可", point: 0 },
    ],
    maxValue: 3,
    metricLabel: "成績評価係数",
    ctaPolicy: "always-study-abroad",
    failExclusionToggle: {
      failLabels: ["不可"],
      note: "不可・Fの扱いは東京大学の公式資料内でも記載が矛盾しています（参考計算式は「総登録単位数」で除すとしており分母に含めて読めますが、記入例シートの手順説明は「不可やFは単位数に含めません」と明言しています）。提出先（奨学金・交換留学の申請窓口）にどちらの扱いか必ず確認してください。",
    },
    note: "大学学部1年次から応募時までの全学期の成績が対象で、大学院生は学部と大学院の成績を通算して算出します（学部／修士／博士それぞれと通算の4系統）。合格・不合格の2段階評価科目、成績証明書に記載のない単位、学位を取得しないプログラムの単位は計算に含めません。ここでは「優上・優・良・可・不可」の5段階評語（教養学部前期課程2017年度以降、医学部・工学部・文学部など2014年度以降で使用が公式に確認できる体系）を採用しています。優上・優はともに評価ポイント3で、上位2段が同じ扱いになります。ただし出典の成績評価係数計算表（400125968.xls）には「優上」という列自体が存在せず、優上＝評価ポイント3という対応は、東京大学の他の公式ページが定める優上の点数帯（90点以上）が計算表の100～90点帯（評価ポイント3）と一致することから導いた推論です（公式資料がこの対応を明言しているわけではありません）。成績証明書の評語が「優・良・可」（3段階）や「A＋・A・B・C」「A＋・A・B・C＋・C－」（英字）などこの一覧と異なる場合は選択せず、出典の対応表（https://www.u-tokyo.ac.jp/content/400125968.xls）で該当する列を確認し、評価ポイントを手動で当てはめてください。満点は出典の対応表・算出式から数学的に導いた値で、満点を明示した文言は出典にありません。",
  },
  {
    // 出典：京都大学「成績評価・GPA」https://www.kyoto-u.ac.jp/ja/education-campus/curriculum/grading-gpa（2026-07-21）
    id: "kyoto-university-scale",
    label: "京都大学の評語方式（A+〜F）",
    method: "grade",
    grades: [
      { label: "A+", point: 4.3 },
      { label: "A", point: 4.0 },
      { label: "B", point: 3.0 },
      { label: "C", point: 2.0 },
      { label: "D", point: 1.0 },
      { label: "F", point: 0.0 },
    ],
    maxValue: 4.3,
    metricLabel: "GPA",
    note: "不合格科目を含む全ての履修単位に係る成績がGPAに算入されます。",
  },
  {
    // 出典：一橋大学「学士課程GPA制度に関する要項」第3条 https://www.hit-u.ac.jp/kyomu/info/pdf/20200212_bachelor_gpa.pdf（2026-07-21）
    id: "hitotsubashi-university-scale",
    label: "一橋大学の評語方式（A+〜F）",
    method: "grade",
    grades: [
      { label: "A+", point: 4.3 },
      { label: "A", point: 4.0 },
      { label: "B", point: 3.0 },
      { label: "C", point: 2.0 },
      { label: "F", point: 0.0 },
    ],
    maxValue: 4.3,
    metricLabel: "GPA",
    note: "総履修登録単位数（分母）にF（不合格）取得単位数を含みます。同要項第3条第2項には、4.0を上限として換算する別表（A+とAをともに4.0とする）も存在します。",
  },
  {
    // 出典：東京科学大学学修規程 第7条第2項 https://www.somuka.titech.ac.jp/reiki_int/reiki_honbun/x385RG00001977.html?id=j15（2026-07-21）
    // GP＝(学修の評価－55)／10。ただし学修の評価が59点以下の授業科目は「0」。
    id: "institute-of-science-tokyo-scale",
    label: "東京科学大学の素点換算方式（(素点－55)÷10）",
    method: "score",
    scoreToPoint: (score: number) => (score <= 59 ? 0 : (score - 55) / 10),
    maxValue: 4.5,
    metricLabel: "GPA",
    note: "GP＝(素点－55)÷10（59点以下は0）。再履修で合格した場合は不合格時の成績をGPAの算出から除外する規定がありますが、初回不合格時に分母へ算入するかを明記した条文は確認できていません。",
  },
  {
    // 出典：北海道大学における授業科目の成績評価に関するGPA規程 第2条・第3条
    // https://www.hokudai.ac.jp/jimuk/reiki/reiki_honbun/u010RG00000819.html（2026-07-21）
    id: "hokkaido-university-scale",
    label: "北海道大学の評語方式（A+〜F・11段階）",
    method: "grade",
    grades: [
      { label: "A+", point: 4.3 },
      { label: "A", point: 4.0 },
      { label: "A-", point: 3.7 },
      { label: "B+", point: 3.3 },
      { label: "B", point: 3.0 },
      { label: "B-", point: 2.7 },
      { label: "C+", point: 2.3 },
      { label: "C", point: 2.0 },
      { label: "D", point: 1.0 },
      { label: "D-", point: 0.7 },
      { label: "F", point: 0.0 },
    ],
    maxValue: 4.3,
    metricLabel: "GPA",
  },
  {
    // 出典：東北大学におけるGPA制度に関する申し合わせ 第3条
    // https://www.tohoku.ac.jp/japanese/studentinfo/education/01/education0110/015_2.pdf（2026-07-21）
    id: "tohoku-university-scale",
    label: "東北大学の素点換算方式（5段階）",
    method: "score",
    scoreToPoint: (score: number) => {
      if (score >= 90) return 4.0;
      if (score >= 80) return 3.0;
      if (score >= 70) return 2.0;
      if (score >= 60) return 1.0;
      return 0.0;
    },
    maxValue: 4.0,
    metricLabel: "GPA",
    note: "AA(100-90)=4.0／A(89-80)=3.0／B(79-70)=2.0／C(69-60)=1.0／D(59-0)=0.0。",
  },
  {
    // 出典：名古屋大学における成績評価及びGPA制度に関する規程 第3条・別表
    // https://www.nagoya-u.ac.jp/academics/upload_images/5b2f064da9816cd6192d25c3a6d262ae_1.pdf（2026-07-21）
    id: "nagoya-university-scale",
    label: "名古屋大学の評語方式（A+〜F）",
    method: "grade",
    grades: [
      { label: "A+", point: 4.3 },
      { label: "A", point: 4.0 },
      { label: "B", point: 3.0 },
      { label: "C", point: 2.0 },
      { label: "C-", point: 1.0 },
      { label: "F", point: 0.0 },
    ],
    maxValue: 4.3,
    metricLabel: "GPA",
    note: "GPは学士課程のみに適用されます（大学院には適用されません）。Fの評価を受けた科目を再履修して合格した場合、Fの評価は累積GPAに算入されません。",
  },
  {
    // 出典：大阪大学「GPA制度」得点率と評価・GPの対応表（令和8年度以降入学）
    // https://www.osaka-u.ac.jp/ja/education/academic_reform/gpa（2026-07-21）
    id: "osaka-university-post-reform-scale",
    label: "大阪大学の素点換算方式（令和8年度以降入学・9段階）",
    method: "score",
    scoreToPoint: (score: number) => {
      if (score >= 90) return 4.0; // A+
      if (score >= 85) return 3.7; // A
      if (score >= 80) return 3.3; // A-
      if (score >= 75) return 3.0; // B+
      if (score >= 70) return 2.7; // B
      if (score >= 65) return 2.3; // C+
      if (score >= 61) return 2.0; // C
      if (score >= 60) return 1.0; // C-
      return 0.0; // F
    },
    maxValue: 4.0,
    metricLabel: "GPA",
  },
  {
    // 出典：大阪大学「GPA制度」得点率と評価・GPの対応表（令和7年度以前入学）
    // https://www.osaka-u.ac.jp/ja/education/academic_reform/gpa（2026-07-21）
    id: "osaka-university-pre-reform-scale",
    label: "大阪大学の素点換算方式（令和7年度以前入学・5段階）",
    method: "score",
    // 出典の得点区分は 90-100(S)/85-89(A)/75-79(B)/65-69(C)/0-59(F) の5帯のみで、
    // 80-84・70-74・60-64点は出典に定義がない（2026-07-21、osaka-u.ac.jp公式ページを再確認済み）。
    // 下位の区分に丸めて数値を捏造しないよう、未定義の帯は null を返す。
    scoreToPoint: (score: number): number | null => {
      if (score >= 90) return 4.0; // S
      if (score >= 85) return 3.0; // A
      if (score >= 80) return null; // 未定義（80-84）
      if (score >= 75) return 2.0; // B
      if (score >= 70) return null; // 未定義（70-74）
      if (score >= 65) return 1.0; // C
      if (score >= 60) return null; // 未定義（60-64）
      return 0.0; // F（0-59）
    },
    maxValue: 4.0,
    metricLabel: "GPA",
    note: "出典の得点区分は90-100(S)/85-89(A)/75-79(B)/65-69(C)/0-59(F)のみで、80-84・70-74・60-64点は出典の対応表に定義がありません。これらの点数は本方式では計算できません（該当する場合はエラーになります）。",
  },
  {
    // 出典：九州大学「GPA制度」評語対応表 https://www.kyushu-u.ac.jp/ja/faculty/class/learning/gpa/（2026-07-21）
    id: "kyushu-university-scale",
    label: "九州大学の評語方式（S〜F）",
    method: "grade",
    grades: [
      { label: "S", point: 4 },
      { label: "A", point: 3 },
      { label: "B", point: 2 },
      { label: "C", point: 1 },
      { label: "F", point: 0 },
    ],
    maxValue: 4,
    metricLabel: "GPA",
  },
  {
    // 出典：早稲田大学発行「早稲田大学におけるGPA制度に関して」（waseda.jp、出典ドメイン例外・プロジェクトオーナー承認済み、2026-07-21）
    id: "waseda-university-scale",
    label: "早稲田大学の評語方式（A+〜不合格）",
    method: "grade",
    grades: [
      { label: "A+", point: 4 },
      { label: "A", point: 3 },
      { label: "B", point: 2 },
      { label: "C", point: 1 },
      { label: "不合格", point: 0 },
    ],
    maxValue: 4,
    metricLabel: "GPA",
    note: "2010年度以降入学者が対象。総登録単位数（分母）に不合格科目の単位を含みます。N・P・Qで評価される科目はGPA算出の対象外です。",
  },
  {
    // 出典：上智大学「ガイド・資料編2024」
    // https://www.sophia.ac.jp/static/academic/g_youran/2024_guide/pageindices/index40.html（2026-07-21）
    id: "sophia-university-scale",
    label: "上智大学の評語方式（A〜F・QPI）",
    method: "grade",
    grades: [
      { label: "A", point: 4.0 },
      { label: "B", point: 3.0 },
      { label: "C", point: 2.0 },
      { label: "D", point: 1.0 },
      { label: "F", point: 0.0 },
    ],
    maxValue: 4.0,
    metricLabel: "GPA",
    note: "QPI（Quality Point Index）と呼ばれる方式です。W・N・P・Xの科目は出典により分母（履修登録科目の総単位数）から除外されるため、この計算機では入力しないでください。F（不可）は算入されます。A評価の付与は2割以内が目安（最大3割）とされています。",
  },
  {
    // 出典：ICU公式サイト「成績評価」https://www.icu.ac.jp/academics/undergraduate/evaluation/（2026-07-21）
    id: "icu-scale",
    label: "国際基督教大学（ICU）の評語方式（A〜E）",
    method: "grade",
    grades: [
      { label: "A", point: 4 },
      { label: "B", point: 3 },
      { label: "C", point: 2 },
      { label: "D", point: 1 },
      { label: "E", point: 0 },
    ],
    maxValue: 4,
    metricLabel: "GPA",
    note: "満点GPAは公式ページに明示の記載がなく、A評価の値（4pt）から導いています。",
  },
];

/** 計算機で選択可能な全ての換算方式 */
export const ALL_SCALES: GradeScale[] = [...UNIVERSITY_SCALES, ...GENERIC_SCALES];

/**
 * 調査対象13校のうち、公式資料で換算方式の裏が取れた大学のみ。
 * sourceUrl / verifiedAt が空の大学をここに入れてはならない。
 *
 * 東京大学：全学統一のGPA（GP換算）制度を公式には持たないことが確認されたため、
 * 「東京大学」という単一エントリはマスタに登録しない（docs/seo/gpa-university-scales.md 参照）。
 * 代わりに、公式に存在する2つの別指標（進学選択用の基本平均点、奨学金・交換留学選考用の
 * 成績評価係数）を、大阪大学の年度分割と同様に別々のエントリとして登録している。
 *
 * 大阪大学：入学年度（令和7年度以前／令和8年度以降）でGP対応表が異なり、
 * 学生は自分の入学年度でどちらが適用されるか判別できるため、2エントリに分割している。
 */
export const UNIVERSITIES: University[] = [
  {
    id: "u-tokyo-basic-average",
    name: "東京大学（基本平均点・進学選択用）",
    shortName: "東大（基本平均点）",
    tier: "top",
    scaleId: "u-tokyo-basic-average-scale",
    sourceUrl: "https://www.c.u-tokyo.ac.jp/zenki/news/kyoumu/heikinten.pdf",
    verifiedAt: "2026-07-21",
    note: "進学選択（2年次の学部振り分け）の判定に使われる指標です。奨学金や交換留学の学内選考には使われません（それらには「成績評価係数」をご利用ください）。計算例の出典：https://zenkyomu.c.u-tokyo.ac.jp/sentaku/heikinten-sample.pdf",
  },
  {
    id: "u-tokyo-grade-coefficient",
    name: "東京大学（成績評価係数・奨学金／交換留学用）",
    shortName: "東大（成績評価係数）",
    tier: "top",
    scaleId: "u-tokyo-grade-coefficient-scale",
    sourceUrl: "https://www.u-tokyo.ac.jp/content/400125968.xls",
    verifiedAt: "2026-07-21",
    note: "奨学金や交換留学（USTEP等）の学内選考で使われる指標です。進学選択には使われません（それには「基本平均点」をご利用ください）。不可・F科目の扱いは出典資料内で記載が矛盾しているため、方式の注記を必ずご確認ください。対象範囲の補足出典：https://www.u-tokyo.ac.jp/adm/go-global/ja/application-tips-USTEP_FAQ",
  },
  {
    id: "kyoto-university",
    name: "京都大学",
    shortName: "京大",
    tier: "top",
    scaleId: "kyoto-university-scale",
    sourceUrl: "https://www.kyoto-u.ac.jp/ja/education-campus/curriculum/grading-gpa",
    verifiedAt: "2026-07-21",
    note: "GPAに算入する科目は所属部局（学部）の人材養成目的に応じて定められており、部局ごとに異なる場合があります。",
  },
  {
    id: "hitotsubashi-university",
    name: "一橋大学",
    shortName: "一橋大",
    tier: "top",
    scaleId: "hitotsubashi-university-scale",
    sourceUrl: "https://www.hit-u.ac.jp/kyomu/info/pdf/20200212_bachelor_gpa.pdf",
    verifiedAt: "2026-07-21",
    note: "別表1により学部（商学部・経済学部・法学部・社会学部など）ごとにGPA算入対象外科目が定められています。",
  },
  {
    id: "institute-of-science-tokyo",
    name: "東京科学大学",
    shortName: "科学大",
    tier: "top",
    scaleId: "institute-of-science-tokyo-scale",
    sourceUrl: "https://www.somuka.titech.ac.jp/reiki_int/reiki_honbun/x385RG00001977.html?id=j15",
    verifiedAt: "2026-07-21",
    note: "GP換算式（学修規程第7条）は学院・医学部・歯学部・研究科で共通です。ただし算出するGPAの種類（クォーター／学期／年度／通算）は所属により異なります（GPA制度に関する要項 https://www.somuka.titech.ac.jp/reiki_int/reiki_honbun/x385RG00002006.html）。",
  },
  {
    id: "hokkaido-university",
    name: "北海道大学",
    shortName: "北大",
    tier: "top",
    scaleId: "hokkaido-university-scale",
    sourceUrl: "https://www.hokudai.ac.jp/jimuk/reiki/reiki_honbun/u010RG00000819.html",
    verifiedAt: "2026-07-21",
    note: "不可（D・D－・F）がGPA計算の分母に算入されるかどうかを明記した条文は確認できておらず、未確認です（計算式の構造からは算入されると読めますが断定はしていません）。学部固有の除外科目の有無も未確認です。必ずご自身の履修要項でご確認ください。",
  },
  {
    id: "tohoku-university",
    name: "東北大学",
    shortName: "東北大",
    tier: "top",
    scaleId: "tohoku-university-scale",
    sourceUrl:
      "https://www.tohoku.ac.jp/japanese/studentinfo/education/01/education0110/015_2.pdf",
    verifiedAt: "2026-07-21",
    note: "GPA対象科目は各学部・研究科の裁量で選択・除外できるとされています。学期GPA・累積GPAは原則として成績証明書に記載されません。",
  },
  {
    id: "nagoya-university",
    name: "名古屋大学",
    shortName: "名大",
    tier: "top",
    scaleId: "nagoya-university-scale",
    sourceUrl:
      "https://www.nagoya-u.ac.jp/academics/upload_images/5b2f064da9816cd6192d25c3a6d262ae_1.pdf",
    verifiedAt: "2026-07-21",
  },
  {
    id: "osaka-university-post-reform",
    name: "大阪大学（令和8年度以降入学）",
    shortName: "阪大（令和8年度以降）",
    tier: "top",
    scaleId: "osaka-university-post-reform-scale",
    sourceUrl: "https://www.osaka-u.ac.jp/ja/education/academic_reform/gpa",
    verifiedAt: "2026-07-21",
    note: "令和8年度以降入学の学部生・大学院生向けの9段階評価です。ご自身の入学年度を確認のうえ選択してください。学部間の差異は出典からは確認できていません。",
  },
  {
    id: "osaka-university-pre-reform",
    name: "大阪大学（令和7年度以前入学）",
    shortName: "阪大（令和7年度以前）",
    tier: "top",
    scaleId: "osaka-university-pre-reform-scale",
    sourceUrl: "https://www.osaka-u.ac.jp/ja/education/academic_reform/gpa",
    verifiedAt: "2026-07-21",
    note: "令和7年度以前入学の学部生向けの5段階評価です。ご自身の入学年度を確認のうえ選択してください。学部間の差異は出典からは確認できていません。",
  },
  {
    id: "kyushu-university",
    name: "九州大学",
    shortName: "九大",
    tier: "top",
    scaleId: "kyushu-university-scale",
    sourceUrl: "https://www.kyushu-u.ac.jp/ja/faculty/class/learning/gpa/",
    verifiedAt: "2026-07-21",
  },
  {
    id: "waseda-university",
    name: "早稲田大学",
    shortName: "早大",
    tier: "top",
    scaleId: "waseda-university-scale",
    sourceUrl:
      "https://wnpspt.waseda.jp/student/wp-content/uploads/sites/7/2021/01/早稲田大学におけるGPA制度に関して／Notification-of-the-GPA-System-at-Waseda-University.pdf",
    verifiedAt: "2026-07-21",
    note: "出典ドメインは waseda.jp（早稲田大学の公式主要ドメイン。.ac.jp ではない例外として承認済み）です。学部ごとに詳細解説ページがあり、対象外評語（N・P・Q）の扱い等に補足がある可能性があります（例：法学部は点数非公表）。",
  },
  {
    id: "keio-university",
    name: "慶應義塾大学",
    shortName: "慶應",
    tier: "top",
    scaleId: "generic-s-a-b-c-d",
    sourceUrl: "https://www.students.keio.ac.jp/com/procedure/certificate/grading-system.html",
    verifiedAt: "2026-07-21",
    note: "2017年度以降入学者向けの評価体系（S=4.0／A=3.0／B=2.0／C=1.0／D=0.0）です。2017年3月31日以前入学者は不合格科目の記載有無が異なります。法務研究科は別の評語対応、メディアデザイン研究科は独自基準を用います。",
  },
  {
    id: "sophia-university",
    name: "上智大学",
    shortName: "上智",
    tier: "top",
    scaleId: "sophia-university-scale",
    sourceUrl:
      "https://www.sophia.ac.jp/static/academic/g_youran/2024_guide/pageindices/index40.html",
    verifiedAt: "2026-07-21",
  },
  {
    id: "icu",
    name: "国際基督教大学（ICU）",
    shortName: "ICU",
    tier: "top",
    scaleId: "icu-scale",
    sourceUrl: "https://www.icu.ac.jp/academics/undergraduate/evaluation/",
    verifiedAt: "2026-07-21",
    note: "E（不可）がGPA計算の分母に算入されるかどうかは出典に明記がなく未確認です。学部差の有無も出典からは確認できていません。必ずご自身の履修要項でご確認ください。",
  },
];

export function findScaleById(id: string): GradeScale | undefined {
  return ALL_SCALES.find((scale) => scale.id === id);
}

export function findUniversityById(id: string): University | undefined {
  return UNIVERSITIES.find((university) => university.id === id);
}

/** 大学未選択時に使う方式 */
export function getDefaultScale(): GradeScale {
  const scale = findScaleById(DEFAULT_SCALE_ID);
  if (!scale) {
    throw new Error(`DEFAULT_SCALE_ID "${DEFAULT_SCALE_ID}" が ALL_SCALES に存在しません`);
  }
  return scale;
}
