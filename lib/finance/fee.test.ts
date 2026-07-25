import { describe, it, expect } from "vitest";
import { buildFeePayload, type NewTxnPayload } from "./fee";

const base: NewTxnPayload = {
  organization_id: "o", period_id: "p", occurred_on: "2026-05-01",
  kind: "expense", category_id: "cat-main", project_id: "proj-1",
  amount: 5000, memo: "振込", receipt_no: "12", parent_transaction_id: null,
};

describe("buildFeePayload", () => {
  it("手数料0以下ならnull", () => {
    expect(buildFeePayload(base, "cat-fee", 0, "parent-1")).toBeNull();
    expect(buildFeePayload(base, "cat-fee", -100, "parent-1")).toBeNull();
  });
  it("手数料行を親に紐づけて生成", () => {
    const fee = buildFeePayload(base, "cat-fee", 330, "parent-1");
    expect(fee).not.toBeNull();
    expect(fee!.kind).toBe("expense");
    expect(fee!.category_id).toBe("cat-fee");
    expect(fee!.amount).toBe(330);
    expect(fee!.project_id).toBe("proj-1");
    expect(fee!.occurred_on).toBe("2026-05-01");
    expect(fee!.parent_transaction_id).toBe("parent-1");
    expect(fee!.receipt_no).toBeNull();
  });
});
