import { describe, it, expect } from "vitest";
import { resolveClaimView, claimErrorMessage, type ClaimPreview } from "./claimView";

const basePreview: ClaimPreview = {
  ok: true,
  organization_id: "org-1",
  organization_name: "テストサークル",
  already_applied: false,
};

describe("resolveClaimView", () => {
  it("preview 未取得ならまだ判定しない", () => {
    expect(
      resolveClaimView({
        preview: null,
        sessionResolved: true,
        isLoggedIn: true,
        isMemberOfOrg: false,
        appliedInThisBrowser: false,
        membershipCheckPending: false,
      })
    ).toBe("loading");
  });

  it("already_claimed かつ自分がメンバー → owned_by_me（承認後に本人が再訪したケース）", () => {
    expect(
      resolveClaimView({
        preview: { ok: false, reason: "already_claimed", organization_id: "org-1" },
        sessionResolved: true,
        isLoggedIn: true,
        isMemberOfOrg: true,
        appliedInThisBrowser: true, // 過去に自分が申請したフラグが残っていても owned_by_me が優先
        membershipCheckPending: false,
      })
    ).toBe("owned_by_me");
  });

  it("already_claimed かつメンバーでない → claimed_by_other", () => {
    expect(
      resolveClaimView({
        preview: { ok: false, reason: "already_claimed", organization_id: "org-1" },
        sessionResolved: true,
        isLoggedIn: true,
        isMemberOfOrg: false,
        appliedInThisBrowser: false,
        membershipCheckPending: false,
      })
    ).toBe("claimed_by_other");
  });

  it("already_claimed かつ未ログイン → claimed_by_other（他人の所属は分からないため既定側に倒す）", () => {
    expect(
      resolveClaimView({
        preview: { ok: false, reason: "already_claimed", organization_id: "org-1" },
        sessionResolved: true,
        isLoggedIn: false,
        isMemberOfOrg: false,
        appliedInThisBrowser: false,
        membershipCheckPending: false,
      })
    ).toBe("claimed_by_other");
  });

  it("already_claimed かつ membershipCheckPending:true → loading（getSession() が先に解決する間、確認不要と誤確定させない）", () => {
    expect(
      resolveClaimView({
        preview: { ok: false, reason: "already_claimed", organization_id: "org-1" },
        sessionResolved: true,
        isLoggedIn: true,
        isMemberOfOrg: false, // まだ確認できていないため既定値だが、pending が優先される
        appliedInThisBrowser: false,
        membershipCheckPending: true,
      })
    ).toBe("loading");
  });

  it("already_claimed かつ確認完了・メンバー → owned_by_me", () => {
    expect(
      resolveClaimView({
        preview: { ok: false, reason: "already_claimed", organization_id: "org-1" },
        sessionResolved: true,
        isLoggedIn: true,
        isMemberOfOrg: true,
        appliedInThisBrowser: false,
        membershipCheckPending: false,
      })
    ).toBe("owned_by_me");
  });

  it("already_claimed かつ確認完了・非メンバー → claimed_by_other", () => {
    expect(
      resolveClaimView({
        preview: { ok: false, reason: "already_claimed", organization_id: "org-1" },
        sessionResolved: true,
        isLoggedIn: true,
        isMemberOfOrg: false,
        appliedInThisBrowser: false,
        membershipCheckPending: false,
      })
    ).toBe("claimed_by_other");
  });

  it("already_claimed 以外では membershipCheckPending:true でも影響しない（form）", () => {
    expect(
      resolveClaimView({
        preview: basePreview,
        sessionResolved: true,
        isLoggedIn: true,
        isMemberOfOrg: false,
        appliedInThisBrowser: false,
        membershipCheckPending: true,
      })
    ).toBe("form");
  });

  it("already_claimed 以外では membershipCheckPending:true でも影響しない（need_login）", () => {
    expect(
      resolveClaimView({
        preview: basePreview,
        sessionResolved: true,
        isLoggedIn: false,
        isMemberOfOrg: false,
        appliedInThisBrowser: false,
        membershipCheckPending: true,
      })
    ).toBe("need_login");
  });

  it("already_claimed 以外では membershipCheckPending:true でも影響しない（invalid）", () => {
    expect(
      resolveClaimView({
        preview: { ok: false, reason: "invalid" },
        sessionResolved: true,
        isLoggedIn: true,
        isMemberOfOrg: false,
        appliedInThisBrowser: false,
        membershipCheckPending: true,
      })
    ).toBe("invalid");
  });

  it('ok:false, reason:"invalid" → invalid', () => {
    expect(
      resolveClaimView({
        preview: { ok: false, reason: "invalid" },
        sessionResolved: true,
        isLoggedIn: true,
        isMemberOfOrg: false,
        appliedInThisBrowser: false,
        membershipCheckPending: false,
      })
    ).toBe("invalid");
  });

  it("reason 未指定の ok:false も invalid（期限切れ・取消を区別しない）", () => {
    expect(
      resolveClaimView({
        preview: { ok: false },
        sessionResolved: true,
        isLoggedIn: true,
        isMemberOfOrg: false,
        appliedInThisBrowser: false,
        membershipCheckPending: false,
      })
    ).toBe("invalid");
  });

  it("セッション未解決のあいだは need_login を返さない（既ログインユーザーへのちらつき防止）", () => {
    expect(
      resolveClaimView({
        preview: basePreview,
        sessionResolved: false,
        isLoggedIn: false,
        isMemberOfOrg: false,
        appliedInThisBrowser: false,
        membershipCheckPending: false,
      })
    ).toBe("loading");
  });

  it("未ログイン かつ セッション解決済み → need_login", () => {
    expect(
      resolveClaimView({
        preview: basePreview,
        sessionResolved: true,
        isLoggedIn: false,
        isMemberOfOrg: false,
        appliedInThisBrowser: false,
        membershipCheckPending: false,
      })
    ).toBe("need_login");
  });

  it("ログイン済みで未申請 → form", () => {
    expect(
      resolveClaimView({
        preview: basePreview,
        sessionResolved: true,
        isLoggedIn: true,
        isMemberOfOrg: false,
        appliedInThisBrowser: false,
        membershipCheckPending: false,
      })
    ).toBe("form");
  });

  it("このブラウザで申請済み → applied", () => {
    expect(
      resolveClaimView({
        preview: { ...basePreview, already_applied: true },
        sessionResolved: true,
        isLoggedIn: true,
        isMemberOfOrg: false,
        appliedInThisBrowser: true,
        membershipCheckPending: false,
      })
    ).toBe("applied");
  });

  it("申請済みフラグはセッション未解決でも優先される（自分の完了画面をちらつかせない）", () => {
    expect(
      resolveClaimView({
        preview: { ...basePreview, already_applied: true },
        sessionResolved: false,
        isLoggedIn: false,
        isMemberOfOrg: false,
        appliedInThisBrowser: true,
        membershipCheckPending: false,
      })
    ).toBe("applied");
  });
});

describe("claimErrorMessage", () => {
  it("not_authenticated", () => {
    expect(claimErrorMessage("not_authenticated")).toBe("ログインが必要です");
  });

  it("already_claimed", () => {
    expect(claimErrorMessage("already_claimed")).toBe("この団体は既に引き取られています");
  });

  it("already_applied_by_other", () => {
    expect(claimErrorMessage("already_applied_by_other")).toBe(
      "この団体には既に別の方から申請が届いています。運営が内容を確認します。"
    );
  });

  it('invalid → 「このリンクは無効です」（プレビュー無効時の文言と統一）', () => {
    expect(claimErrorMessage("invalid")).toBe("このリンクは無効です");
  });

  it("未知のコードはフォールバックで「このリンクは無効です」", () => {
    expect(claimErrorMessage("something_unexpected")).toBe("このリンクは無効です");
    expect(claimErrorMessage(undefined)).toBe("このリンクは無効です");
  });
});
