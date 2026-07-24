import { describe, expect, it } from "vitest";
import { findAdOnlyGroups, findMislabeledAffiliateLinks } from "./validateResourceGroups";
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

describe("findMislabeledAffiliateLinks", () => {
  const mislabeled: ResourceGroupData = {
    id: "mislabeled",
    heading: "誤ラベル",
    links: [
      {
        kind: "official",
        label: "公式（実は広告）",
        url: "https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3766669",
      },
    ],
  };
  const correctlyLabeled: ResourceGroupData = {
    id: "correct",
    heading: "正しいラベル",
    links: [
      {
        kind: "affiliate",
        label: "広告",
        url: "https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3766669",
        advertiser: "test",
      },
    ],
  };

  it("official に広告URLがあると検出する", () => {
    expect(findMislabeledAffiliateLinks([mislabeled])).toEqual([
      { groupId: "mislabeled", url: mislabeled.links[0].url },
    ]);
  });

  it("同じURLでも kind:affiliate なら検出しない", () => {
    expect(findMislabeledAffiliateLinks([correctlyLabeled])).toEqual([]);
  });
});
