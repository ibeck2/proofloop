import { describe, expect, it } from "vitest";
import {
  ALL_SCALES,
  UNIVERSITIES,
  findScaleById,
  findUniversityById,
  getDefaultScale,
} from "./universities";

describe("換算方式マスタ", () => {
  it("id が重複していない", () => {
    const ids = ALL_SCALES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("grade方式は grades を、score方式は scoreToPoint を持つ", () => {
    for (const scale of ALL_SCALES) {
      if (scale.method === "grade") {
        expect(scale.grades, `${scale.id} に grades がありません`).toBeDefined();
        expect(scale.grades!.length).toBeGreaterThan(0);
      } else if (scale.method === "score") {
        expect(
          typeof scale.scoreToPoint,
          `${scale.id} に scoreToPoint がありません`
        ).toBe("function");
      }
      // raw方式は grades も scoreToPoint も持たない（別のテストで検証）
    }
  });

  it("既定の方式が取得できる", () => {
    expect(getDefaultScale()).toBeDefined();
  });

  it("すべての方式が maxValue と metricLabel を持つ", () => {
    for (const scale of ALL_SCALES) {
      expect(
        typeof scale.maxValue === "number" && scale.maxValue > 0,
        `${scale.id} の maxValue が不正です`
      ).toBe(true);
      expect(
        typeof scale.metricLabel === "string" && scale.metricLabel.length > 0,
        `${scale.id} の metricLabel が空です`
      ).toBe(true);
    }
  });

  it("重率を使う方式は raw 方式である", () => {
    for (const scale of ALL_SCALES) {
      if (scale.usesWeight) {
        expect(scale.method, `${scale.id} は usesWeight だが raw ではありません`).toBe(
          "raw"
        );
      }
    }
  });

  it("raw 方式は grades も scoreToPoint も持たない", () => {
    for (const scale of ALL_SCALES) {
      if (scale.method === "raw") {
        expect(scale.grades, `${scale.id} は raw なのに grades を持っています`).toBeUndefined();
        expect(
          scale.scoreToPoint,
          `${scale.id} は raw なのに scoreToPoint を持っています`
        ).toBeUndefined();
      }
    }
  });

  it("failExclusionToggle の failLabels は実在する評語を指している", () => {
    for (const scale of ALL_SCALES) {
      const toggle = scale.failExclusionToggle;
      if (!toggle) continue;
      expect(toggle.failLabels.length).toBeGreaterThan(0);
      for (const label of toggle.failLabels) {
        const found = scale.grades?.some((g) => g.label === label);
        expect(found, `${scale.id} の failLabels "${label}" が grades にありません`).toBe(
          true
        );
      }
    }
  });
});

describe("大学マスタ", () => {
  it("id が重複していない", () => {
    const ids = UNIVERSITIES.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("全ての大学の scaleId が実在する方式を指している", () => {
    for (const university of UNIVERSITIES) {
      expect(
        findScaleById(university.scaleId),
        `${university.name} の scaleId "${university.scaleId}" が見つかりません`
      ).toBeDefined();
    }
  });

  it("全ての大学が公式の出典URLを持つ", () => {
    for (const university of UNIVERSITIES) {
      expect(
        university.sourceUrl.startsWith("https://"),
        `${university.name} の sourceUrl が https:// で始まっていません`
      ).toBe(true);
    }
  });

  it("全ての大学が YYYY-MM-DD 形式の確認日を持つ", () => {
    for (const university of UNIVERSITIES) {
      expect(
        /^\d{4}-\d{2}-\d{2}$/.test(university.verifiedAt),
        `${university.name} の verifiedAt "${university.verifiedAt}" が不正です`
      ).toBe(true);
    }
  });

  it("マスタに載る大学は全て tier=top である", () => {
    for (const university of UNIVERSITIES) {
      expect(university.tier).toBe("top");
    }
  });

  it("1校以上が登録されている", () => {
    // 0校の場合はプラン Task 1 Step 4 の指示どおり実装を止めるため、
    // ここに到達する時点で必ず1校以上あるはず。
    expect(UNIVERSITIES.length).toBeGreaterThan(0);
  });

  it("findUniversityById が登録済みの大学を引ける", () => {
    const first = UNIVERSITIES[0];
    expect(findUniversityById(first.id)).toEqual(first);
  });
});

describe("大阪大学（令和7年度以前入学）の素点換算", () => {
  const scale = findScaleById("osaka-university-pre-reform-scale");
  if (!scale || !scale.scoreToPoint) {
    throw new Error("osaka-university-pre-reform-scale が見つかりません");
  }
  const scoreToPoint = scale.scoreToPoint;

  it("出典に定義された各帯の上限・下限で正しいGPを返す", () => {
    // 90-100「Ｓ」4.0
    expect(scoreToPoint(90)).toBe(4.0);
    expect(scoreToPoint(100)).toBe(4.0);
    // 85-89「Ａ」3.0
    expect(scoreToPoint(85)).toBe(3.0);
    expect(scoreToPoint(89)).toBe(3.0);
    // 75-79「Ｂ」2.0
    expect(scoreToPoint(75)).toBe(2.0);
    expect(scoreToPoint(79)).toBe(2.0);
    // 65-69「Ｃ」1.0
    expect(scoreToPoint(65)).toBe(1.0);
    expect(scoreToPoint(69)).toBe(1.0);
    // 0-59「Ｆ」0.0
    expect(scoreToPoint(0)).toBe(0.0);
    expect(scoreToPoint(59)).toBe(0.0);
  });

  it("出典に定義のない帯（80-84・70-74・60-64）はnullを返し、数値を捏造しない", () => {
    expect(scoreToPoint(80)).toBeNull();
    expect(scoreToPoint(84)).toBeNull();
    expect(scoreToPoint(70)).toBeNull();
    expect(scoreToPoint(74)).toBeNull();
    expect(scoreToPoint(60)).toBeNull();
    expect(scoreToPoint(64)).toBeNull();
  });
});
