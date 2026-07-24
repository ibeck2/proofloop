import { describe, expect, it } from "vitest";
import { findAdOnlyGroups } from "./validateResourceGroups";
import type { ResourceGroupData } from "./resources";

const adOnly: ResourceGroupData = {
  id: "ad-only",
  heading: "広告だけ",
  links: [{ kind: "affiliate", label: "探す", url: "https://ad.example" }],
};
const healthy: ResourceGroupData = {
  id: "healthy",
  heading: "健全",
  links: [
    { kind: "official", label: "公式", url: "https://gov.example" },
    { kind: "affiliate", label: "探す", url: "https://ad.example" },
  ],
};

describe("findAdOnlyGroups", () => {
  it("広告のみのグループの id を返す", () => {
    expect(findAdOnlyGroups([adOnly, healthy])).toEqual(["ad-only"]);
  });
  it("すべて健全なら空配列", () => {
    expect(findAdOnlyGroups([healthy])).toEqual([]);
  });
});
