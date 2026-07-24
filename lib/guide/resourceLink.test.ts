import { describe, expect, it } from "vitest";
import { resourceLinkAttrs } from "./resourceLink";

describe("resourceLinkAttrs", () => {
  it("affiliate は rel に sponsored を含み、広告フラグが立ち、新規タブで開く", () => {
    const attrs = resourceLinkAttrs("affiliate");
    expect(attrs.rel).toContain("sponsored");
    expect(attrs.rel).toContain("noopener");
    expect(attrs.rel).toContain("noreferrer");
    expect(attrs.target).toBe("_blank");
    expect(attrs.isAd).toBe(true);
  });

  it("official は sponsored を付けず、広告フラグは立たない", () => {
    const attrs = resourceLinkAttrs("official");
    expect(attrs.rel).not.toContain("sponsored");
    expect(attrs.isAd).toBe(false);
  });

  it("guide も広告ではない", () => {
    expect(resourceLinkAttrs("guide").isAd).toBe(false);
  });
});
