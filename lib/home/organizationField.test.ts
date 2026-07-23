import { describe, expect, it } from "vitest";
import { buildOrganizationField, type FieldRow } from "./organizationField";

function row(university: string | null, category: string | null): FieldRow {
  return { university, category };
}

describe("buildOrganizationField", () => {
  it("大学ごとに束ね、掲載数の多い順に並べる", () => {
    const result = buildOrganizationField([
      row("京都大学", "運動系（スポーツ・アウトドア）"),
      row("慶應義塾大学", "運動系（スポーツ・アウトドア）"),
      row("慶應義塾大学", "文化系（音楽・演劇・アート）"),
    ]);

    expect(result.map((c) => [c.university, c.total])).toEqual([
      ["慶應義塾大学", 2],
      ["京都大学", 1],
    ]);
  });

  it("分野ごとの内訳を数える", () => {
    const result = buildOrganizationField([
      row("東京大学", "運動系（スポーツ・アウトドア）"),
      row("東京大学", "運動系（スポーツ・アウトドア）"),
      row("東京大学", "文化系（音楽・演劇・アート）"),
      row("東京大学", "学術・研究（ゼミ・研究会・勉強会）"),
      row("東京大学", "趣味・その他"),
      row("東京大学", "国際交流・語学"),
    ]);

    expect(result[0].counts).toEqual({
      sports: 2,
      culture: 1,
      academic: 1,
      other: 2,
    });
  });

  it("内訳の合計は必ず総数と一致する", () => {
    const rows = [
      row("東北大学", "運動系（スポーツ・アウトドア）"),
      row("東北大学", null),
      row("東北大学", ""),
      row("東北大学", "メディア・出版"),
    ];

    const cluster = buildOrganizationField(rows)[0];
    const sum =
      cluster.counts.sports +
      cluster.counts.culture +
      cluster.counts.academic +
      cluster.counts.other;

    expect(sum).toBe(cluster.total);
    expect(cluster.total).toBe(4);
  });

  it("文字化けした分野名でも前方一致で正しく分類する", () => {
    // DBに実在する壊れた値。完全一致で判定すると「その他」に落ちてしまう
    const result = buildOrganizationField([
      row("大阪大学", "運動系（スポーツ・アウトド�ア）"),
    ]);

    expect(result[0].counts.sports).toBe(1);
    expect(result[0].counts.other).toBe(0);
  });

  it("大学名が無い行は数えない", () => {
    const result = buildOrganizationField([
      row(null, "運動系（スポーツ・アウトドア）"),
      row("   ", "運動系（スポーツ・アウトドア）"),
      row("一橋大学", "運動系（スポーツ・アウトドア）"),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].total).toBe(1);
  });

  it("大学名の前後の空白を落として同じ大学として束ねる", () => {
    const result = buildOrganizationField([
      row("九州大学", "運動系（スポーツ・アウトドア）"),
      row(" 九州大学 ", "文化系（音楽・演劇・アート）"),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].total).toBe(2);
  });

  it("空配列を渡されたら空配列を返す", () => {
    expect(buildOrganizationField([])).toEqual([]);
  });
});
