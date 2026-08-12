import { describe, expect, it } from "vitest";
import { organizationCacheTag, organizationPagePath } from "./paths";

describe("organizationPagePath", () => {
  it("UUID ならその団体だけのパスを返す", () => {
    expect(organizationPagePath("002e59d9-d041-4893-ac46-537a34e06c90")).toBe(
      "/organizations/002e59d9-d041-4893-ac46-537a34e06c90"
    );
  });

  it("大文字混じりの UUID は小文字へ正規化する（タグ側と揃えるため）", () => {
    expect(organizationPagePath("002E59D9-D041-4893-AC46-537A34E06C90")).toBe(
      "/organizations/002e59d9-d041-4893-ac46-537a34e06c90"
    );
  });

  it("前後の空白は落とす", () => {
    expect(organizationPagePath("  002e59d9-d041-4893-ac46-537a34e06c90 ")).toBe(
      "/organizations/002e59d9-d041-4893-ac46-537a34e06c90"
    );
  });

  it("route 形式は拒否する（全団体ページの一斉無効化を防ぐ）", () => {
    expect(organizationPagePath("[id]")).toBeNull();
  });

  it("パス区切りを含む値は拒否する", () => {
    expect(organizationPagePath("../../admin")).toBeNull();
    expect(organizationPagePath("abc/def")).toBeNull();
  });

  it("空・null・undefined は拒否する", () => {
    expect(organizationPagePath("")).toBeNull();
    expect(organizationPagePath(null)).toBeNull();
    expect(organizationPagePath(undefined)).toBeNull();
  });

  it("UUID に見えるが桁数が違う値は拒否する", () => {
    expect(organizationPagePath("002e59d9-d041-4893-ac46-537a34e06c9")).toBeNull();
  });
});

describe("organizationCacheTag", () => {
  it("団体ごとに固有のタグを返す", () => {
    expect(organizationCacheTag("002e59d9-d041-4893-ac46-537a34e06c90")).toBe(
      "organization:002e59d9-d041-4893-ac46-537a34e06c90"
    );
  });

  it("大文字と小文字で同じタグになる（生成側はURL由来・無効化側はDB由来のため）", () => {
    expect(organizationCacheTag("002E59D9-D041-4893-AC46-537A34E06C90")).toBe(
      organizationCacheTag("002e59d9-d041-4893-ac46-537a34e06c90")
    );
  });

  it("前後の空白は無視する", () => {
    expect(organizationCacheTag("  002e59d9-d041-4893-ac46-537a34e06c90  ")).toBe(
      organizationCacheTag("002e59d9-d041-4893-ac46-537a34e06c90")
    );
  });

  it("別の団体とは必ず異なる", () => {
    expect(organizationCacheTag("002e59d9-d041-4893-ac46-537a34e06c90")).not.toBe(
      organizationCacheTag("112e59d9-d041-4893-ac46-537a34e06c90")
    );
  });
});
