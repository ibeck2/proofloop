import { describe, expect, it } from "vitest";
import { claimDecisionErrorMessage } from "./claimDecision";

describe("claimDecisionErrorMessage", () => {
  it("権限エラーを見分ける", () => {
    expect(claimDecisionErrorMessage("forbidden")).toBe("権限がありません");
  });

  it("申請者が退会済みのときは、承認できない理由を伝える", () => {
    expect(claimDecisionErrorMessage("applicant_gone")).toContain("退会済み");
  });

  it("先に引き取られている・凍結中を区別する", () => {
    expect(claimDecisionErrorMessage("already_claimed")).toContain("凍結中");
  });

  it("処理済み・不在は同じ文言にまとめる", () => {
    expect(claimDecisionErrorMessage("invalid")).toContain("処理済み");
  });

  it("入力不正の3種は同じ案内にする", () => {
    const msg = claimDecisionErrorMessage("bad_decision");
    expect(claimDecisionErrorMessage("bad_level")).toBe(msg);
    expect(claimDecisionErrorMessage("bad_verdict")).toBe(msg);
    expect(msg).toContain("再読み込み");
  });

  it("Route Handler が畳んだ一時障害は、既定の文言と区別する", () => {
    expect(claimDecisionErrorMessage("rpc_error")).not.toBe(
      claimDecisionErrorMessage(undefined)
    );
    expect(claimDecisionErrorMessage("rpc_error")).toContain("サーバログ");
  });

  it("未知のコードと undefined は既定の文言", () => {
    expect(claimDecisionErrorMessage(undefined)).toBe("処理に失敗しました");
    expect(claimDecisionErrorMessage("who_knows")).toBe("処理に失敗しました");
  });
});
