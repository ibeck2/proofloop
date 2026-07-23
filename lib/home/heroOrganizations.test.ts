import { describe, expect, it } from "vitest";
import { selectHeroOrganizations, type HeroOrgRow } from "./heroOrganizations";

function row(over: Partial<HeroOrgRow> = {}): HeroOrgRow {
  return {
    id: "id-1",
    name: "○○研究会",
    university: "東京大学",
    category: "学術・研究（ゼミ・研究会・勉強会）",
    ...over,
  };
}

describe("selectHeroOrganizations", () => {
  it("大学が重複しないように先頭から選ぶ", () => {
    const result = selectHeroOrganizations([
      row({ id: "a", university: "慶應義塾大学", name: "A会" }),
      row({ id: "b", university: "慶應義塾大学", name: "B会" }),
      row({ id: "c", university: "京都大学", name: "C会" }),
    ]);

    expect(result.map((o) => o.id)).toEqual(["a", "c"]);
  });

  it("limit を超えて返さない", () => {
    const result = selectHeroOrganizations(
      [
        row({ id: "a", university: "慶應義塾大学" }),
        row({ id: "b", university: "京都大学" }),
        row({ id: "c", university: "上智大学" }),
        row({ id: "d", university: "一橋大学" }),
        row({ id: "e", university: "大阪大学" }),
      ],
      4
    );

    expect(result).toHaveLength(4);
  });

  it("候補が足りなければ少ない件数で返す", () => {
    const result = selectHeroOrganizations([row({ id: "a" })], 4);
    expect(result).toHaveLength(1);
  });

  it("文字化け（U+FFFD）を含む行を除外する", () => {
    const result = selectHeroOrganizations([
      row({ id: "broken", university: "慶應義塾大学", category: "運動系（スポーツ・アウトド�ア）" }),
      row({ id: "ok", university: "京都大学" }),
    ]);

    expect(result.map((o) => o.id)).toEqual(["ok"]);
  });

  it("団体名が空・空白のみの行を除外する", () => {
    const result = selectHeroOrganizations([
      row({ id: "empty", university: "慶應義塾大学", name: "" }),
      row({ id: "spaces", university: "上智大学", name: "   " }),
      row({ id: "null", university: "一橋大学", name: null }),
      row({ id: "ok", university: "京都大学" }),
    ]);

    expect(result.map((o) => o.id)).toEqual(["ok"]);
  });

  it("大学名が無い行を除外する", () => {
    const result = selectHeroOrganizations([
      row({ id: "no-univ", university: null }),
      row({ id: "ok", university: "京都大学" }),
    ]);

    expect(result.map((o) => o.id)).toEqual(["ok"]);
  });

  it("前後の空白を落として返す", () => {
    const result = selectHeroOrganizations([
      row({ id: "a", name: "  ○○会  ", university: " 東京大学 " }),
    ]);

    expect(result[0]).toEqual({ id: "a", name: "○○会", university: "東京大学" });
  });

  it("空配列を渡されたら空配列を返す", () => {
    expect(selectHeroOrganizations([])).toEqual([]);
  });
});
