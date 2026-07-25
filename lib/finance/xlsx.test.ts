import { describe, it, expect } from "vitest";
import { buildReportSheetModel, reportFileName, type FinanceReportData } from "./xlsx";

const data: FinanceReportData = {
  orgName: "テスト団体",
  period: { id: "per", organization_id: "o", name: "2026年度", starts_on: "2026-04-01", ends_on: "2027-03-31", opening_balance: 5000, is_closed: false },
  summary: { incomeTotal: 10000, expenseTotal: 3330, openingBalance: 5000, closingBalance: 11670 },
  incomeRows: [{ category_id: "c1", category_name: "協賛金", kind: "income", planned: 8000, actual: 10000, diff: -2000 }],
  expenseRows: [
    { category_id: "c2", category_name: "会場費", kind: "expense", planned: 5000, actual: 3000, diff: 2000 },
    { category_id: "c3", category_name: "支払手数料", kind: "expense", planned: 0, actual: 330, diff: -330 },
  ],
  ledgerRows: [
    { id: "a", occurred_on: "2026-05-01", kindLabel: "収入", category_name: "協賛金", project_name: "夏合宿", memo: "A社", income: 10000, expense: 0, running_balance: 15000, receipt_no: "1" },
  ],
};

describe("buildReportSheetModel", () => {
  it("収支報告書シートに団体名・期間・費目・手数料・期末残高を含む", () => {
    const { reportSheet, ledgerSheet } = buildReportSheetModel(data);
    const flat = reportSheet.flat().join("\n");
    expect(flat).toContain("テスト団体");
    expect(flat).toContain("2026年度");
    expect(flat).toContain("協賛金");
    expect(flat).toContain("支払手数料");
    // 期末残高の数値が含まれる
    expect(reportSheet.flat()).toContain(11670);
    // 出納帳シートに明細行がある
    expect(ledgerSheet.flat().join("\n")).toContain("夏合宿");
  });
});

describe("reportFileName", () => {
  it("団体名と期間を含む .xlsx", () => {
    expect(reportFileName("テスト団体", "2026年度")).toBe("テスト団体_収支報告_2026年度.xlsx");
  });
});
