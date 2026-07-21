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
      } else {
        expect(
          typeof scale.scoreToPoint,
          `${scale.id} に scoreToPoint がありません`
        ).toBe("function");
      }
    }
  });

  it("既定の方式が取得できる", () => {
    expect(getDefaultScale()).toBeDefined();
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
