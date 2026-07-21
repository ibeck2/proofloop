import { describe, expect, it } from "vitest";
import { calculateMetric } from "./calculate";
import { findScaleById } from "./universities";
import type { Course } from "./types";

/**
 * 東京大学が公式に公開している基本平均点の計算例を、そのまま回帰テストにする。
 * 出典：https://zenkyomu.c.u-tokyo.ac.jp/sentaku/heikinten-sample.pdf（確認日 2026-07-21）。
 * 各例の数値は docs/seo/gpa-university-scales.md の
 * 「公式計算例（回帰テスト用）」を参照。科目行（科目名・単位・評点・重率）は
 * PDFの表からそのまま転記し、要約・丸め・行の省略は行っていない。
 * これが通ることで、重率つき加重平均の実装が公式の計算と一致することを保証する。
 */
describe("東京大学 基本平均点：公式計算例との一致", () => {
  const scale = findScaleById("u-tokyo-basic-average-scale");

  it("方式がマスタに登録されている", () => {
    expect(scale).toBeDefined();
  });

  it("計算例1（文科一類）", () => {
    const courses: Course[] = [
      { id: "1", name: "英語一列①", credits: 1, score: 74, weight: 1 },
      { id: "2", name: "英語一列②", credits: 1, score: 66, weight: 1 },
      { id: "3", name: "英語二列Ｓ", credits: 1, score: 74, weight: 1 },
      { id: "4", name: "英語二列Ｗ", credits: 2, score: 80, weight: 1 },
      { id: "5", name: "イタリア語一列①", credits: 2, score: 61, weight: 1 },
      { id: "6", name: "イタリア語一列②", credits: 2, score: 66, weight: 1 },
      { id: "7", name: "イタリア語二列", credits: 2, score: 68, weight: 1 },
      { id: "8", name: "情報", credits: 2, score: 73, weight: 1 },
      { id: "9", name: "身体運動・健康科学実習Ⅰ", credits: 1, score: 91, weight: 1 },
      { id: "10", name: "身体運動・健康科学実習Ⅱ", credits: 1, score: 87, weight: 1 },
      { id: "11", name: "初年次ゼミナール文科", credits: 2, score: 90, weight: 1 },
      { id: "12", name: "法Ⅰ", credits: 2, score: 72, weight: 1 },
      { id: "13", name: "法Ⅱ", credits: 2, score: 67, weight: 1 },
      { id: "14", name: "社会Ⅰ", credits: 2, score: 40, weight: 1 },
      { id: "15", name: "（未履修科目）", credits: 2, score: 0, weight: 1 },
      { id: "16", name: "哲学Ⅱ", credits: 2, score: 62, weight: 1 },
      { id: "17", name: "心理Ⅱ", credits: 2, score: 80, weight: 1 },
      { id: "18", name: "英語中級", credits: 1, score: 72, weight: 1 },
      { id: "19", name: "英語中級", credits: 2, score: 77, weight: 1 },
      { id: "20", name: "ドイツ語初級（作文）", credits: 2, score: 65, weight: 0.1 },
      { id: "21", name: "イタリア語初級（演習）①", credits: 2, score: 62, weight: 1 },
      { id: "22", name: "イタリア語初級（演習）②", credits: 2, score: 62, weight: 1 },
      { id: "23", name: "古典語初級（ヘブライ語）Ⅰ", credits: 2, score: 79, weight: 1 },
      { id: "24", name: "美術論", credits: 2, score: 65, weight: 1 },
      { id: "25", name: "現代国際社会論", credits: 2, score: 82, weight: 1 },
      { id: "26", name: "現代社会論", credits: 2, score: 60, weight: 0.1 },
      { id: "27", name: "法と社会", credits: 2, score: 50, weight: 0.1 },
      { id: "28", name: "教育臨床心理学", credits: 2, score: 65, weight: 1 },
      { id: "29", name: "認知脳科学", credits: 2, score: 0, weight: 0.1 },
      { id: "30", name: "身体運動科学", credits: 2, score: 84, weight: 1 },
      { id: "31", name: "看護学概論Ⅱ", credits: 2, score: 93, weight: 1 },
      { id: "32", name: "物理科学Ⅰ（文科生）", credits: 2, score: 73, weight: 1 },
    ];
    const out = calculateMetric({ courses, scale: scale! });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(68.92);
  });

  it("計算例2（文科二類）", () => {
    const courses: Course[] = [
      { id: "1", name: "英語一列①", credits: 1, score: 74, weight: 1 },
      { id: "2", name: "英語一列②", credits: 1, score: 66, weight: 1 },
      { id: "3", name: "英語二列Ｓ", credits: 1, score: 74, weight: 1 },
      { id: "4", name: "英語二列Ｗ", credits: 2, score: 80, weight: 1 },
      { id: "5", name: "ドイツ語一列①", credits: 2, score: 61, weight: 1 },
      { id: "6", name: "ドイツ語一列②", credits: 2, score: 66, weight: 1 },
      { id: "7", name: "ドイツ語二列", credits: 2, score: 68, weight: 1 },
      { id: "8", name: "情報", credits: 2, score: 73, weight: 1 },
      { id: "9", name: "身体運動・健康科学実習Ⅰ", credits: 1, score: 91, weight: 1 },
      { id: "10", name: "身体運動・健康科学実習Ⅱ", credits: 1, score: 87, weight: 1 },
      { id: "11", name: "初年次ゼミナール文科", credits: 2, score: 90, weight: 1 },
      { id: "12", name: "経済Ⅰ", credits: 2, score: 72, weight: 1 },
      { id: "13", name: "数学Ⅰ", credits: 2, score: 67, weight: 1 },
      { id: "14", name: "数学Ⅱ", credits: 2, score: 40, weight: 1 },
      { id: "15", name: "（未履修科目）", credits: 2, score: 0, weight: 1 },
      { id: "16", name: "哲学Ⅱ", credits: 2, score: 62, weight: 1 },
      { id: "17", name: "心理Ⅱ", credits: 2, score: 80, weight: 1 },
      { id: "18", name: "英語中級", credits: 1, score: 72, weight: 1 },
      { id: "19", name: "英語中級", credits: 2, score: 77, weight: 1 },
      { id: "20", name: "ドイツ語初級（作文）", credits: 2, score: 65, weight: 0.1 },
      { id: "21", name: "ドイツ語初級（演習）①", credits: 2, score: 62, weight: 1 },
      { id: "22", name: "ドイツ語初級（演習）②", credits: 2, score: 62, weight: 1 },
      { id: "23", name: "古典語初級（ヘブライ語）Ⅰ", credits: 2, score: 79, weight: 1 },
      { id: "24", name: "美術論", credits: 2, score: 65, weight: 1 },
      { id: "25", name: "現代国際社会論", credits: 2, score: 82, weight: 1 },
      { id: "26", name: "現代社会論", credits: 2, score: 60, weight: 0.1 },
      { id: "27", name: "法と社会", credits: 2, score: 50, weight: 0.1 },
      { id: "28", name: "教育臨床心理学", credits: 2, score: 65, weight: 1 },
      { id: "29", name: "認知脳科学", credits: 2, score: 0, weight: 0.1 },
      { id: "30", name: "身体運動科学", credits: 2, score: 84, weight: 1 },
      { id: "31", name: "看護学概論Ⅱ", credits: 2, score: 93, weight: 1 },
      { id: "32", name: "物理科学Ⅰ（文科生）", credits: 2, score: 73, weight: 1 },
    ];
    const out = calculateMetric({ courses, scale: scale! });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(68.92);
  });

  it("計算例3（文科三類）", () => {
    const courses: Course[] = [
      { id: "1", name: "英語一列①", credits: 1, score: 77, weight: 1 },
      { id: "2", name: "英語一列②", credits: 1, score: 78, weight: 1 },
      { id: "3", name: "英語二列Ｓ", credits: 1, score: 83, weight: 1 },
      { id: "4", name: "英語二列Ｗ", credits: 2, score: 73, weight: 1 },
      { id: "5", name: "フランス語一列①", credits: 2, score: 85, weight: 1 },
      { id: "6", name: "フランス語一列②", credits: 2, score: 87, weight: 1 },
      { id: "7", name: "フランス語二列", credits: 2, score: 85, weight: 1 },
      { id: "8", name: "情報", credits: 2, score: 82, weight: 1 },
      { id: "9", name: "身体運動・健康科学実習Ⅰ", credits: 1, score: 88, weight: 1 },
      { id: "10", name: "身体運動・健康科学実習Ⅱ", credits: 1, score: 84, weight: 1 },
      { id: "11", name: "初年次ゼミナール文科", credits: 2, score: 54, weight: 1 },
      { id: "12", name: "法Ⅱ", credits: 2, score: 65, weight: 1 },
      { id: "13", name: "（未履修科目）", credits: 2, score: 0, weight: 1 },
      { id: "14", name: "哲学Ⅱ", credits: 2, score: 77, weight: 1 },
      { id: "15", name: "心理Ⅰ", credits: 2, score: 67, weight: 1 },
      {
        id: "16",
        name: "倫理Ⅰ（重率0。指定単位数を超過した基礎科目）",
        credits: 2,
        score: 44,
        weight: 0,
      },
      { id: "17", name: "英語中級", credits: 1, score: 79, weight: 1 },
      { id: "18", name: "英語中級", credits: 2, score: 80, weight: 1 },
      { id: "19", name: "フランス語初級（インテンシブ）", credits: 2, score: 100, weight: 1 },
      { id: "20", name: "フランス語初級（インテンシブ）", credits: 2, score: 100, weight: 1 },
      { id: "21", name: "フランス語初級（インテンシブ）", credits: 2, score: 100, weight: 1 },
      {
        id: "22",
        name: "フランス語初級（インテンシブ）（2単位のうち1単位分）",
        credits: 1,
        score: 80,
        weight: 1,
      },
      {
        id: "23",
        name: "フランス語初級（インテンシブ）（残り1単位分）",
        credits: 1,
        score: 80,
        weight: 0.1,
      },
      { id: "24", name: "フランス語初級（演習）①", credits: 2, score: 84, weight: 1 },
      { id: "25", name: "フランス語初級（演習）②", credits: 2, score: 79, weight: 1 },
      {
        id: "26",
        name: "比較地域史（2単位のうち1単位分）",
        credits: 1,
        score: 65,
        weight: 1,
      },
      { id: "27", name: "比較地域史（残り1単位分）", credits: 1, score: 65, weight: 0.1 },
      { id: "28", name: "ジェンダー論", credits: 2, score: 90, weight: 1 },
      { id: "29", name: "教育臨床心理学", credits: 2, score: 75, weight: 0.1 },
      { id: "30", name: "適応行動論", credits: 2, score: 66, weight: 1 },
      { id: "31", name: "社会行動論", credits: 2, score: 75, weight: 1 },
      { id: "32", name: "教育心理学の世界", credits: 2, score: 71, weight: 1 },
      { id: "33", name: "応用動物科学Ⅰ", credits: 2, score: 84, weight: 1 },
    ];
    const out = calculateMetric({ courses, scale: scale! });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(76.82);
  });

  it("計算例4（理科一類）", () => {
    const courses: Course[] = [
      { id: "1", name: "英語一列①", credits: 1, score: 77, weight: 1 },
      { id: "2", name: "英語一列②", credits: 1, score: 75, weight: 1 },
      { id: "3", name: "英語二列Ｓ", credits: 1, score: 74, weight: 1 },
      { id: "4", name: "英語二列Ｗ", credits: 2, score: 72, weight: 1 },
      { id: "5", name: "フランス語一列①", credits: 2, score: 48, weight: 1 },
      { id: "6", name: "フランス語一列②", credits: 2, score: 69, weight: 1 },
      { id: "7", name: "フランス語二列", credits: 2, score: 57, weight: 1 },
      { id: "8", name: "情報", credits: 2, score: 86, weight: 1 },
      { id: "9", name: "身体運動・健康科学実習Ⅰ", credits: 1, score: 90, weight: 1 },
      { id: "10", name: "身体運動・健康科学実習Ⅱ", credits: 1, score: 86, weight: 1 },
      { id: "11", name: "基礎実験Ⅰ（化学）", credits: 1, score: 90, weight: 1 },
      { id: "12", name: "基礎実験Ⅱ（化学）", credits: 1, score: 89, weight: 1 },
      { id: "13", name: "基礎実験Ⅲ（物理学）【２年次】", credits: 1, score: 0, weight: 1 },
      { id: "14", name: "数理科学基礎", credits: 2, score: 95, weight: 1 },
      { id: "15", name: "微分積分学①", credits: 1, score: 69, weight: 1 },
      { id: "16", name: "微分積分学②", credits: 2, score: 69, weight: 1 },
      { id: "17", name: "線型代数学①", credits: 1, score: 76, weight: 1 },
      { id: "18", name: "線型代数学②", credits: 2, score: 76, weight: 1 },
      { id: "19", name: "数理科学基礎演習", credits: 1, score: 97, weight: 1 },
      { id: "20", name: "数学基礎理論演習", credits: 1, score: 95, weight: 1 },
      { id: "21", name: "微分積分学演習", credits: 1, score: 71, weight: 1 },
      { id: "22", name: "線型代数学演習", credits: 1, score: 78, weight: 1 },
      { id: "23", name: "力学A", credits: 2, score: 46, weight: 1 },
      { id: "24", name: "電磁気学A", credits: 2, score: 75, weight: 1 },
      { id: "25", name: "熱力学", credits: 2, score: 88, weight: 1 },
      { id: "26", name: "構造化学", credits: 2, score: 70, weight: 1 },
      { id: "27", name: "物性化学【２年次】", credits: 2, score: 0, weight: 1 },
      { id: "28", name: "生命科学【２年次】", credits: 1, score: 0, weight: 1 },
      { id: "29", name: "英語中級", credits: 1, score: 80, weight: 1 },
      { id: "30", name: "英語中級", credits: 2, score: 77, weight: 1 },
      { id: "31", name: "現代経済理論", credits: 2, score: 70, weight: 1 },
      { id: "32", name: "環境物質科学", credits: 2, score: 68, weight: 1 },
      { id: "33", name: "（未履修科目（A～D））", credits: 2, score: 0, weight: 1 },
      { id: "34", name: "振動・波動論", credits: 2, score: 75, weight: 0.1 },
      { id: "35", name: "物質・生命工学基礎Ⅱ", credits: 2, score: 87, weight: 1 },
      { id: "36", name: "基礎統計", credits: 2, score: 72, weight: 0.1 },
      { id: "37", name: "図形科学A", credits: 2, score: 88, weight: 1 },
      { id: "38", name: "アルゴリズム入門", credits: 2, score: 86, weight: 1 },
    ];
    const out = calculateMetric({ courses, scale: scale! });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(67.91);
  });

  it("計算例5（理科二類）", () => {
    const courses: Course[] = [
      { id: "1", name: "英語一列①", credits: 1, score: 55, weight: 1 },
      { id: "2", name: "英語一列②", credits: 1, score: 75, weight: 1 },
      { id: "3", name: "英語二列Ｓ", credits: 1, score: 66, weight: 1 },
      { id: "4", name: "英語二列Ｗ", credits: 2, score: 68, weight: 1 },
      { id: "5", name: "フランス語一列①", credits: 2, score: 86, weight: 1 },
      { id: "6", name: "フランス語一列②", credits: 2, score: 65, weight: 1 },
      { id: "7", name: "フランス語二列", credits: 2, score: 85, weight: 1 },
      { id: "8", name: "情報", credits: 2, score: 88, weight: 1 },
      { id: "9", name: "身体運動・健康科学実習Ⅰ", credits: 1, score: 77, weight: 1 },
      { id: "10", name: "身体運動・健康科学実習Ⅱ", credits: 1, score: 88, weight: 1 },
      { id: "11", name: "基礎物理学実験", credits: 1, score: 83, weight: 1 },
      { id: "12", name: "基礎化学実験", credits: 1, score: 76, weight: 1 },
      { id: "13", name: "基礎生命科学実験", credits: 1, score: 0, weight: 1 },
      { id: "14", name: "数理科学基礎", credits: 2, score: 58, weight: 1 },
      { id: "15", name: "微分積分学①", credits: 1, score: 60, weight: 1 },
      { id: "16", name: "微分積分学②", credits: 2, score: 60, weight: 1 },
      { id: "17", name: "線型代数学①", credits: 1, score: 72, weight: 1 },
      { id: "18", name: "線型代数学②", credits: 2, score: 72, weight: 1 },
      {
        id: "19",
        name: "数理科学基礎演習（重率0。任意選択の基礎科目）",
        credits: 1,
        score: 48,
        weight: 0,
      },
      { id: "20", name: "数学基礎理論演習", credits: 1, score: 74, weight: 0.1 },
      { id: "21", name: "微分積分学演習", credits: 1, score: 60, weight: 1 },
      { id: "22", name: "線型代数学演習", credits: 1, score: 70, weight: 1 },
      { id: "23", name: "力学A", credits: 2, score: 67, weight: 1 },
      { id: "24", name: "電磁気学A", credits: 2, score: 50, weight: 1 },
      { id: "25", name: "構造化学", credits: 2, score: 59, weight: 1 },
      { id: "26", name: "化学熱力学", credits: 2, score: 55, weight: 1 },
      { id: "27", name: "物性化学【２年次】", credits: 2, score: 0, weight: 1 },
      { id: "28", name: "生命化学Ⅰ", credits: 2, score: 51, weight: 1 },
      { id: "29", name: "生命化学Ⅱ", credits: 2, score: 50, weight: 1 },
      { id: "30", name: "英語中級", credits: 1, score: 74, weight: 1 },
      { id: "31", name: "英語中級", credits: 2, score: 74, weight: 1 },
      { id: "32", name: "現代教育論", credits: 2, score: 55, weight: 1 },
      { id: "33", name: "現代工学基礎Ⅰ", credits: 2, score: 72, weight: 1 },
      { id: "34", name: "（未履修科目（A～D））", credits: 2, score: 0, weight: 1 },
      { id: "35", name: "惑星地球科学Ⅰ（理科生）", credits: 2, score: 35, weight: 1 },
      { id: "36", name: "宇宙科学Ⅰ（理科生）", credits: 2, score: 66, weight: 1 },
      { id: "37", name: "基礎統計", credits: 2, score: 25, weight: 1 },
    ];
    const out = calculateMetric({ courses, scale: scale! });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(58.59);
  });

  it("計算例6（理科三類）", () => {
    const courses: Course[] = [
      { id: "1", name: "英語一列①", credits: 1, score: 78, weight: 1 },
      { id: "2", name: "英語一列②", credits: 1, score: 74, weight: 1 },
      { id: "3", name: "英語二列Ｓ", credits: 1, score: 70, weight: 1 },
      { id: "4", name: "英語二列Ｗ", credits: 2, score: 80, weight: 1 },
      { id: "5", name: "スペイン語一列①", credits: 2, score: 89, weight: 1 },
      { id: "6", name: "スペイン語一列②", credits: 2, score: 88, weight: 1 },
      { id: "7", name: "スペイン語二列", credits: 2, score: 77, weight: 1 },
      { id: "8", name: "情報", credits: 2, score: 77, weight: 1 },
      { id: "9", name: "身体運動・健康科学実習Ⅰ", credits: 1, score: 82, weight: 1 },
      { id: "10", name: "身体運動・健康科学実習Ⅱ", credits: 1, score: 81, weight: 1 },
      { id: "11", name: "基礎物理学実験", credits: 1, score: 86, weight: 1 },
      { id: "12", name: "基礎化学実験", credits: 1, score: 86, weight: 1 },
      { id: "13", name: "基礎生命科学実験【２年次】", credits: 1, score: 0, weight: 1 },
      { id: "14", name: "数理科学基礎", credits: 2, score: 72, weight: 1 },
      { id: "15", name: "微分積分学①", credits: 1, score: 84, weight: 1 },
      { id: "16", name: "微分積分学②", credits: 2, score: 84, weight: 1 },
      { id: "17", name: "線型代数学①", credits: 1, score: 67, weight: 1 },
      { id: "18", name: "線型代数学②", credits: 2, score: 67, weight: 1 },
      { id: "19", name: "微分積分学演習", credits: 1, score: 94, weight: 1 },
      { id: "20", name: "線型代数学演習", credits: 1, score: 70, weight: 1 },
      { id: "21", name: "力学B", credits: 2, score: 90, weight: 1 },
      { id: "22", name: "電磁気学B", credits: 2, score: 70, weight: 1 },
      { id: "23", name: "構造化学", credits: 2, score: 89, weight: 1 },
      { id: "24", name: "化学熱力学", credits: 2, score: 87, weight: 1 },
      { id: "25", name: "物性化学【２年次】", credits: 2, score: 0, weight: 1 },
      { id: "26", name: "生命化学Ⅰ", credits: 2, score: 84, weight: 1 },
      { id: "27", name: "生命化学Ⅱ", credits: 2, score: 89, weight: 1 },
      { id: "28", name: "英語中級", credits: 1, score: 78, weight: 1 },
      { id: "29", name: "英語中級", credits: 2, score: 79, weight: 1 },
      { id: "30", name: "スペイン語初級（インテンシブ）", credits: 2, score: 82, weight: 0.1 },
      { id: "31", name: "スペイン語初級（インテンシブ）", credits: 2, score: 82, weight: 0.1 },
      { id: "32", name: "平和構築論", credits: 2, score: 75, weight: 1 },
      { id: "33", name: "教育臨床心理学", credits: 2, score: 80, weight: 1 },
      { id: "34", name: "情報メディア伝達論", credits: 2, score: 75, weight: 1 },
      { id: "35", name: "食の科学", credits: 1, score: 71, weight: 1 },
      { id: "36", name: "アルゴリズム入門", credits: 2, score: 79, weight: 1 },
      { id: "37", name: "モデリングとシミュレーション基礎Ⅰ", credits: 2, score: 86, weight: 1 },
      {
        id: "38",
        name: "モデリングとシミュレーション基礎Ⅱ（2単位のうち1単位分）",
        credits: 1,
        score: 79,
        weight: 1,
      },
      {
        id: "39",
        name: "モデリングとシミュレーション基礎Ⅱ（残り1単位分）",
        credits: 1,
        score: 79,
        weight: 0.1,
      },
    ];
    const out = calculateMetric({ courses, scale: scale! });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(76.08);
  });
});
