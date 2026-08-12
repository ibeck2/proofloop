import { describe, it, expect } from "vitest";
import {
  freezeStatus,
  resolutionHelpText,
  resolveDisputeErrorMessage,
  resolveDisputeSuccessMessage,
} from "./disputeResolution";

describe("freezeStatus", () => {
  it("frozen: true → 「凍結済み」、掲載は巻き戻し済みと説明する", () => {
    const status = freezeStatus(true);
    expect(status.tone).toBe("frozen");
    expect(status.label).toBe("凍結済み");
    expect(status.description).toContain("巻き戻し済み");
  });

  it("frozen: false → 「凍結されていません」、掲載は現状のままと明示する", () => {
    const status = freezeStatus(false);
    expect(status.tone).toBe("unfrozen");
    expect(status.label).toBe("凍結されていません");
    expect(status.description).toContain("現状のまま公開");
  });

  it("tone は frozen/unfrozen で必ず異なる（視覚的な出し分けの根拠になる）", () => {
    expect(freezeStatus(true).tone).not.toBe(freezeStatus(false).tone);
  });
});

describe("resolutionHelpText", () => {
  it("uphold・凍結済み → 権限剥奪のみと説明し、巻き戻し済みである旨を含む", () => {
    const text = resolutionHelpText("uphold", true);
    expect(text).toContain("権限を剥奪");
    expect(text).toContain("既に引き取り前");
  });

  it("uphold・未凍結 → ここで巻き戻すと明示する", () => {
    const text = resolutionHelpText("uphold", false);
    expect(text).toContain("権限を剥奪");
    expect(text).toContain("引き取り前の内容に戻します");
  });

  it("dismiss・凍結済み → 凍結直前の内容に復帰すると説明する", () => {
    const text = resolutionHelpText("dismiss", true);
    expect(text).toContain("凍結を解除");
    expect(text).toContain("復帰");
  });

  it("dismiss・未凍結 → 掲載内容には触れないと明示する（誤解を防ぐ）", () => {
    const text = resolutionHelpText("dismiss", false);
    expect(text).toContain("掲載内容には触れません");
  });

  it("4通りの文言はすべて異なる", () => {
    const texts = new Set([
      resolutionHelpText("uphold", true),
      resolutionHelpText("uphold", false),
      resolutionHelpText("dismiss", true),
      resolutionHelpText("dismiss", false),
    ]);
    expect(texts.size).toBe(4);
  });
});

describe("resolveDisputeErrorMessage", () => {
  it("forbidden", () => {
    expect(resolveDisputeErrorMessage("forbidden")).toBe("権限がありません");
  });

  it("bad_resolution", () => {
    expect(resolveDisputeErrorMessage("bad_resolution")).toBe("不正な処理区分です");
  });

  it("invalid", () => {
    expect(resolveDisputeErrorMessage("invalid")).toBe(
      "この申立てはすでに処理済みか、存在しません"
    );
  });

  it("revoke_failed（032で追加。brief未対応だったコード）は未処理のままである旨を伝える", () => {
    const msg = resolveDisputeErrorMessage("revoke_failed");
    expect(msg).toContain("剥奪に失敗");
    expect(msg).toContain("未処理");
  });

  it("未知のコード・undefined はフォールバック文言", () => {
    expect(resolveDisputeErrorMessage("something_unexpected")).toBe("処理に失敗しました");
    expect(resolveDisputeErrorMessage(undefined)).toBe("処理に失敗しました");
  });

  it("rpc_error は既定と区別し、サーバログを見る先を示す", () => {
    const msg = resolveDisputeErrorMessage("rpc_error");
    expect(msg).not.toBe(resolveDisputeErrorMessage(undefined));
    expect(msg).toContain("サーバログ");
  });
});

describe("resolveDisputeSuccessMessage", () => {
  it("upheld・凍結済み → 既に引き取り前の内容である旨（今回巻き戻したとは言わない）", () => {
    const msg = resolveDisputeSuccessMessage({ ok: true, resolution: "upheld" }, true);
    expect(msg).toContain("既に引き取り前");
  });

  it("upheld・未凍結 → 今回はじめて巻き戻した旨", () => {
    const msg = resolveDisputeSuccessMessage({ ok: true, resolution: "upheld" }, false);
    expect(msg).toContain("引き取り前の内容に戻しました");
  });

  it("dismissed・凍結済み → 凍結直前の内容に復帰した旨", () => {
    const msg = resolveDisputeSuccessMessage(
      { ok: true, resolution: "dismissed", claim_status: "claimed" },
      true
    );
    expect(msg).toContain("凍結直前の掲載内容に復帰");
  });

  it("dismissed・未凍結 → 掲載内容に変更が無い旨を明示する", () => {
    const msg = resolveDisputeSuccessMessage(
      { ok: true, resolution: "dismissed", claim_status: "claimed" },
      false
    );
    expect(msg).toContain("掲載内容に変更はありません");
  });

  it("dismissed・未凍結・claim_status unclaimed でも掲載内容に触れていない文言のまま", () => {
    const msg = resolveDisputeSuccessMessage(
      { ok: true, resolution: "dismissed", claim_status: "unclaimed" },
      false
    );
    expect(msg).toContain("掲載内容に変更はありません");
  });

  // 032 は「却下時に承認済み claim が無ければ unclaimed に戻す」分岐を持つ。
  // これが発火した団体は管理者不在で残るので、運営に必ず伝える必要がある。
  // 伝えないと「却下したのだから元に戻ったはず」と誤解して放置される。
  it("dismissed・claim_status unclaimed → 管理者不在になったことを伝える", () => {
    const frozen = resolveDisputeSuccessMessage(
      { ok: true, resolution: "dismissed", claim_status: "unclaimed" },
      true
    );
    expect(frozen).toContain("凍結直前の掲載内容に復帰");
    expect(frozen).toContain("管理者が居ない");

    const notFrozen = resolveDisputeSuccessMessage(
      { ok: true, resolution: "dismissed", claim_status: "unclaimed" },
      false
    );
    expect(notFrozen).toContain("管理者が居ない");
  });

  it("dismissed・claim_status claimed のときは管理者不在の注記を付けない", () => {
    for (const froze of [true, false]) {
      const msg = resolveDisputeSuccessMessage(
        { ok: true, resolution: "dismissed", claim_status: "claimed" },
        froze
      );
      expect(msg).not.toContain("管理者が居ない");
    }
  });
});
