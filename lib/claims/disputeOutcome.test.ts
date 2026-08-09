import { describe, it, expect } from "vitest";
import { disputeErrorMessage, disputeCompletionMessage, didFreeze } from "./disputeOutcome";

describe("disputeErrorMessage", () => {
  it("missing_fields", () => {
    expect(disputeErrorMessage("missing_fields")).toBe(
      "お名前・ご連絡先・状況をすべてご記入ください"
    );
  });

  it("not_found", () => {
    expect(disputeErrorMessage("not_found")).toBe("この団体が見つかりませんでした");
  });

  it("not_claimed", () => {
    expect(disputeErrorMessage("not_claimed")).toBe(
      "この団体はまだ引き取られていません"
    );
  });

  it("already_open", () => {
    expect(disputeErrorMessage("already_open")).toBe(
      "この団体については既に対応中です"
    );
  });

  it("未知のコードはフォールバックで「送信に失敗しました」", () => {
    expect(disputeErrorMessage("something_unexpected")).toBe("送信に失敗しました");
    expect(disputeErrorMessage(undefined)).toBe("送信に失敗しました");
  });
});

describe("didFreeze", () => {
  it("frozen:true → true（032 が凍結した）", () => {
    expect(didFreeze(true)).toBe(true);
  });

  it("frozen:false → false（レート制限で凍結を見送った）", () => {
    expect(didFreeze(false)).toBe(false);
  });

  it("キー欠落（undefined）→ true。032 未適用の 029 は必ず凍結して返すため", () => {
    expect(didFreeze(undefined)).toBe(true);
  });

  it("欠落を false に倒すと凍結中の団体を未凍結と案内してしまうので、文言も凍結側になる", () => {
    expect(disputeCompletionMessage(didFreeze(undefined)).body).toContain(
      "引き取り前の状態に戻しました"
    );
  });
});

describe("disputeCompletionMessage", () => {
  it("frozen:true → 凍結・巻き戻しが行われた前提の文言", () => {
    const msg = disputeCompletionMessage(true);
    expect(msg.title).toBe("申告を受け付けました");
    expect(msg.body).toContain("編集を一時的に停止し");
    expect(msg.body).toContain("引き取り前の状態に戻しました");
  });

  it("frozen:false → 凍結された前提の表現を含まない", () => {
    const msg = disputeCompletionMessage(false);
    expect(msg.title).toBe("受け付けました");
    expect(msg.body).not.toContain("停止");
    expect(msg.body).not.toContain("戻しました");
  });
});
