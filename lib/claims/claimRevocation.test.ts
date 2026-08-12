import { describe, expect, it } from "vitest";
import {
  claimRevocationErrorMessage,
  canSubmitClaimRevocation,
  revokeClaimSuccessMessage,
} from "./claimRevocation";

describe("claimRevocationErrorMessage", () => {
  it("forbidden", () => {
    expect(claimRevocationErrorMessage("forbidden")).toBe("権限がありません");
  });

  it("not_found", () => {
    expect(claimRevocationErrorMessage("not_found")).toContain("見つかりません");
  });

  it("rpc_error は既定と区別し、サーバログを見る先を示す", () => {
    const msg = claimRevocationErrorMessage("rpc_error");
    expect(msg).not.toBe(claimRevocationErrorMessage(undefined));
    expect(msg).toContain("サーバログ");
  });

  it("未知のコードと undefined は既定の文言", () => {
    expect(claimRevocationErrorMessage(undefined)).toBe("取り消しに失敗しました");
    expect(claimRevocationErrorMessage("who_knows")).toBe("取り消しに失敗しました");
  });
});

describe("canSubmitClaimRevocation", () => {
  it("空文字は不可", () => {
    expect(canSubmitClaimRevocation("")).toBe(false);
  });

  it("空白のみは不可（誤ってスペースだけ入力したケースを弾く）", () => {
    expect(canSubmitClaimRevocation("   ")).toBe(false);
  });

  it("前後に空白があっても中身があれば可", () => {
    expect(canSubmitClaimRevocation("  乗っ取りを確認したため  ")).toBe(true);
  });
});

describe("revokeClaimSuccessMessage", () => {
  it("削除件数を文言に含める", () => {
    const msg = revokeClaimSuccessMessage({
      ok: true,
      removed_members: 2,
      removed_invitations: 1,
    });
    expect(msg).toContain("メンバー2件");
    expect(msg).toContain("招待1件");
  });

  it("0件のときも0件と明示する（省略すると何も削除されていないように見える）", () => {
    const msg = revokeClaimSuccessMessage({
      ok: true,
      removed_members: 0,
      removed_invitations: 0,
    });
    expect(msg).toContain("メンバー0件");
    expect(msg).toContain("招待0件");
  });
});
