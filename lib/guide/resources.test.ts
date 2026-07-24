import { describe, expect, it } from "vitest";
import { LIVING_ALONE_RESOURCES, MONEY_RESOURCES } from "./resources";
import { findAdOnlyGroups } from "./validateResourceGroups";

const allGroups = [...LIVING_ALONE_RESOURCES, ...MONEY_RESOURCES];

describe("リソースデータの健全性", () => {
  it("広告のみのグループが存在しない（一次情報が主役）", () => {
    expect(findAdOnlyGroups(allGroups)).toEqual([]);
  });
  it("グループ id はページ内で一意（GA計測の position 用）", () => {
    const ids = allGroups.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("affiliate リンクは advertiser（計測識別子）を持つ", () => {
    const ads = allGroups.flatMap((g) => g.links).filter((l) => l.kind === "affiliate");
    for (const ad of ads) expect(ad.advertiser, ad.label).toBeTruthy();
  });
  it("すべての url が http(s) で始まる", () => {
    for (const g of allGroups)
      for (const l of g.links) expect(l.url).toMatch(/^https?:\/\//);
  });
});
