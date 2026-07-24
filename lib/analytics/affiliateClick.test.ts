import { describe, expect, it } from "vitest";
import { buildAffiliateClickParams } from "./affiliateClick";

describe("buildAffiliateClickParams", () => {
  it("GA4 に送るパラメータへ変換する", () => {
    expect(
      buildAffiliateClickParams({
        page: "/guide/living-alone",
        advertiser: "albeeeX",
        position: "moving",
      })
    ).toEqual({ link_page: "/guide/living-alone", advertiser: "albeeeX", position: "moving" });
  });
});
