import { describe, expect, it } from "vitest";
import {
  shouldRevalidateAfterClaimDecision,
  shouldRevalidateAfterDispute,
  shouldRevalidateAfterDisputeResolution,
} from "./revalidationTriggers";

describe("shouldRevalidateAfterDispute", () => {
  it("凍結したら捨てる", () => {
    expect(shouldRevalidateAfterDispute({ ok: true, frozen: true })).toBe(true);
  });

  it("レート制限で記録のみなら捨てない（表示が変わらないため）", () => {
    expect(shouldRevalidateAfterDispute({ ok: true, frozen: false })).toBe(false);
  });

  it("frozen キーが無い応答は凍結側に倒す（032 未適用の submit_dispute）", () => {
    expect(shouldRevalidateAfterDispute({ ok: true })).toBe(true);
  });

  it("失敗したら捨てない", () => {
    expect(shouldRevalidateAfterDispute({ ok: false, frozen: true })).toBe(false);
    expect(shouldRevalidateAfterDispute(null)).toBe(false);
    expect(shouldRevalidateAfterDispute(undefined)).toBe(false);
    expect(shouldRevalidateAfterDispute({})).toBe(false);
  });
});

describe("shouldRevalidateAfterClaimDecision", () => {
  it("承認なら捨てる", () => {
    expect(
      shouldRevalidateAfterClaimDecision({ ok: true, decision: "approved" })
    ).toBe(true);
  });

  it("却下は claim_status を変えないので捨てない", () => {
    expect(
      shouldRevalidateAfterClaimDecision({ ok: true, decision: "rejected" })
    ).toBe(false);
  });

  it("失敗したら捨てない", () => {
    expect(
      shouldRevalidateAfterClaimDecision({ ok: false, decision: "approved" })
    ).toBe(false);
    expect(shouldRevalidateAfterClaimDecision(null)).toBe(false);
    expect(shouldRevalidateAfterClaimDecision({ ok: true })).toBe(false);
  });
});

describe("shouldRevalidateAfterDisputeResolution", () => {
  it("認容・却下のどちらも claim_status を変えるので、成功なら常に捨てる", () => {
    expect(shouldRevalidateAfterDisputeResolution({ ok: true })).toBe(true);
  });

  it("失敗したら捨てない", () => {
    expect(shouldRevalidateAfterDisputeResolution({ ok: false })).toBe(false);
    expect(shouldRevalidateAfterDisputeResolution(null)).toBe(false);
    expect(shouldRevalidateAfterDisputeResolution(undefined)).toBe(false);
  });
});
