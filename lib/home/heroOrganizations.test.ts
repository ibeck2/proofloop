import { describe, expect, it } from "vitest";
import {
  pickHeroOrganizations,
  selectHeroOrganizations,
  type HeroOrgRow,
} from "./heroOrganizations";

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

describe("pickHeroOrganizations", () => {
  /** 常に末尾の要素を選ぶ乱数。シャッフルの結果を固定してテストする */
  const alwaysLast = () => 0.999999;

  it("除外IDの団体は選ばない", () => {
    const result = pickHeroOrganizations(
      [
        row({ id: "office", name: "ProofLoop運営事務局", university: "東京大学" }),
        row({ id: "a", name: "A会", university: "京都大学" }),
      ],
      { excludeIds: ["office"], random: alwaysLast }
    );

    expect(result.map((o) => o.id)).toEqual(["a"]);
  });

  it("除外しても大学の重複は許さない", () => {
    const result = pickHeroOrganizations(
      [
        row({ id: "a", university: "京都大学", name: "A会" }),
        row({ id: "b", university: "京都大学", name: "B会" }),
        row({ id: "c", university: "上智大学", name: "C会" }),
      ],
      { random: alwaysLast }
    );

    expect(result).toHaveLength(2);
    expect(new Set(result.map((o) => o.university)).size).toBe(2);
  });

  it("使えない行（文字化け・名前なし）は選ばない", () => {
    const result = pickHeroOrganizations(
      [
        row({ id: "broken", university: "京都大学", category: "運動系（アウトド�ア）" }),
        row({ id: "noname", university: "上智大学", name: "" }),
        row({ id: "ok", university: "一橋大学", name: "OK会" }),
      ],
      { random: alwaysLast }
    );

    expect(result.map((o) => o.id)).toEqual(["ok"]);
  });

  it("乱数を差し替えると選ばれる団体が変わる", () => {
    const rows = [
      row({ id: "a", university: "京都大学", name: "A会" }),
      row({ id: "b", university: "上智大学", name: "B会" }),
      row({ id: "c", university: "一橋大学", name: "C会" }),
    ];

    const first = pickHeroOrganizations(rows, { limit: 1, random: () => 0 });
    const second = pickHeroOrganizations(rows, { limit: 1, random: alwaysLast });

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0].id).not.toBe(second[0].id);
  });

  it("元の配列を書き換えない", () => {
    const rows = [
      row({ id: "a", university: "京都大学" }),
      row({ id: "b", university: "上智大学" }),
    ];
    const before = rows.map((r) => r.id);

    pickHeroOrganizations(rows, { random: alwaysLast });

    expect(rows.map((r) => r.id)).toEqual(before);
  });

  it("空配列を渡されたら空配列を返す", () => {
    expect(pickHeroOrganizations([])).toEqual([]);
  });
});
