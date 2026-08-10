import { describe, it, expect } from "vitest";
import {
  countByUniversity,
  countByCategory,
  type CountableRow,
} from "./organizationCounts";

const UNIVERSITIES = ["東京大学", "早稲田大学", "慶應義塾大学", "その他"];
const CATEGORIES = [
  { category: "運動系（スポーツ・アウトドア）", label: "運動系" },
  { category: "文化系（音楽・演劇・アート）", label: "文化系" },
];

function row(university: string | null, category: string | null): CountableRow {
  return { university, category };
}

describe("countByUniversity", () => {
  it("大学ごとに数え、件数の多い順に並べる", () => {
    const rows = [
      row("早稲田大学", null),
      row("東京大学", null),
      row("早稲田大学", null),
      row("早稲田大学", null),
      row("東京大学", null),
    ];

    expect(countByUniversity(rows, UNIVERSITIES)).toEqual([
      { university: "早稲田大学", count: 3 },
      { university: "東京大学", count: 2 },
    ]);
  });

  it("0件の大学は返さない", () => {
    const result = countByUniversity([row("東京大学", null)], UNIVERSITIES);
    expect(result.map((u) => u.university)).toEqual(["東京大学"]);
  });

  it("選択肢に無い大学名は数えない", () => {
    const rows = [row("東京大学", null), row("架空大学", null)];
    expect(countByUniversity(rows, UNIVERSITIES)).toEqual([
      { university: "東京大学", count: 1 },
    ]);
  });

  it("大学名が null の行は数えない", () => {
    expect(countByUniversity([row(null, null)], UNIVERSITIES)).toEqual([]);
  });

  it("前後に空白がある値は別物として扱う（.eq と同じ突き合わせ）", () => {
    const rows = [row(" 東京大学", null), row("東京大学", null)];
    expect(countByUniversity(rows, UNIVERSITIES)).toEqual([
      { university: "東京大学", count: 1 },
    ]);
  });

  it("行が空なら空配列", () => {
    expect(countByUniversity([], UNIVERSITIES)).toEqual([]);
  });
});

describe("countByCategory", () => {
  it("表示対象の分野を数え、件数の多い順に並べる", () => {
    const rows = [
      row(null, "文化系（音楽・演劇・アート）"),
      row(null, "運動系（スポーツ・アウトドア）"),
      row(null, "文化系（音楽・演劇・アート）"),
    ];

    expect(countByCategory(rows, CATEGORIES)).toEqual([
      { category: "文化系（音楽・演劇・アート）", label: "文化系", count: 2 },
      { category: "運動系（スポーツ・アウトドア）", label: "運動系", count: 1 },
    ]);
  });

  it("表示対象に無い分野は返さない", () => {
    const rows = [row(null, "ボランティア・NPO")];
    expect(countByCategory(rows, CATEGORIES)).toEqual([]);
  });

  it("文字化けした分野名は完全一致しないので数えない（旧 .eq と同じ）", () => {
    // DBに実在する壊れた行。organizationField.ts は前方一致で救っているが、
    // 旧実装の count クエリは .eq なので数に入っていなかった。挙動を変えない。
    const rows = [row(null, "運動系（スポーツ・アウトド�ア）")];
    expect(countByCategory(rows, CATEGORIES)).toEqual([]);
  });

  it("分野が null の行は数えない", () => {
    expect(countByCategory([row(null, null)], CATEGORIES)).toEqual([]);
  });
});
