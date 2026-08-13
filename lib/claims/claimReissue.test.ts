import { describe, expect, it } from "vitest";
import { claimUrlFromToken, reissueClaimTokenErrorMessage } from "./claimReissue";

describe("claimUrlFromToken", () => {
  it("SITE_URLと/claim/<token>を組み立てる", () => {
    expect(claimUrlFromToken("abc-123")).toBe("https://proofloop.jp/claim/abc-123");
  });
});

describe("reissueClaimTokenErrorMessage", () => {
  it("forbidden", () => {
    expect(reissueClaimTokenErrorMessage("forbidden")).toBe("権限がありません");
  });

  it("invalid（対象claimが却下済みでない・存在しない）", () => {
    expect(reissueClaimTokenErrorMessage("invalid")).toContain("却下済み");
  });

  it("already_claimed（団体は既に別のclaimで解決済み）", () => {
    expect(reissueClaimTokenErrorMessage("already_claimed")).toContain("引き取り済み");
  });

  it("未知のコードと undefined は既定の文言", () => {
    expect(reissueClaimTokenErrorMessage(undefined)).toBe("再発行に失敗しました");
    expect(reissueClaimTokenErrorMessage("who_knows")).toBe("再発行に失敗しました");
  });
});
