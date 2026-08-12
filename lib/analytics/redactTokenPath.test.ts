import { describe, expect, it } from "vitest";
import { redactTokenPath } from "./redactTokenPath";

describe("redactTokenPath", () => {
  it("claimトークンを丸める", () => {
    expect(
      redactTokenPath("/claim/a1b2c3d4-e5f6-47a8-89b0-1234567890ab")
    ).toBe("/claim/[token]");
  });

  it("inviteトークンを丸める", () => {
    expect(
      redactTokenPath("/invite/a1b2c3d4-e5f6-47a8-89b0-1234567890ab")
    ).toBe("/invite/[token]");
  });

  it("UUID形式でない値も丸める（形式チェックはしない・過剰に丸める方を選ぶ）", () => {
    expect(redactTokenPath("/claim/not-a-real-uuid")).toBe("/claim/[token]");
  });

  it("無関係のパスはそのまま返す", () => {
    expect(
      redactTokenPath("/organizations/002e59d9-d041-4893-ac46-537a34e06c90")
    ).toBe("/organizations/002e59d9-d041-4893-ac46-537a34e06c90");
    expect(redactTokenPath("/")).toBe("/");
    expect(redactTokenPath("/guide/credits")).toBe("/guide/credits");
  });

  it("claim/invite で始まるだけの無関係なパスは丸めない", () => {
    expect(redactTokenPath("/claiming-something")).toBe(
      "/claiming-something"
    );
  });

  it("トークンが無い /claim・/invite 単体はそのまま返す", () => {
    expect(redactTokenPath("/claim")).toBe("/claim");
    expect(redactTokenPath("/invite")).toBe("/invite");
  });

  it("末尾スラッシュがあっても丸める（トークンより後ろは落ちる）", () => {
    expect(redactTokenPath("/claim/abc123/")).toBe("/claim/[token]");
  });
});
