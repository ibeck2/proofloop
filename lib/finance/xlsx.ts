import type { FinancePeriod } from "./types";
import type { CategoryAggregate, FinancialSummary, LedgerRow } from "./aggregate";

export type FinanceReportData = {
  orgName: string;
  period: FinancePeriod;
  summary: FinancialSummary;
  incomeRows: CategoryAggregate[];
  expenseRows: CategoryAggregate[];
  ledgerRows: LedgerRow[];
};

type Cell = string | number;

/** 2シートを2次元配列で表現（テスト可能な純関数） */
export function buildReportSheetModel(data: FinanceReportData): {
  reportSheet: Cell[][];
  ledgerSheet: Cell[][];
} {
  const { orgName, period, summary, incomeRows, expenseRows } = data;
  const reportSheet: Cell[][] = [];
  reportSheet.push([`${orgName}　収支報告書`]);
  reportSheet.push([`会計期間：${period.name}（${period.starts_on} 〜 ${period.ends_on}）`]);
  reportSheet.push([]);
  reportSheet.push(["【収入の部】"]);
  reportSheet.push(["費目", "予算", "実績", "差額(予算-実績)"]);
  for (const r of incomeRows) reportSheet.push([r.category_name, r.planned, r.actual, r.diff]);
  reportSheet.push(["収入合計", "", summary.incomeTotal, ""]);
  reportSheet.push([]);
  reportSheet.push(["【支出の部】"]);
  reportSheet.push(["費目", "予算", "実績", "差額(予算-実績)"]);
  for (const r of expenseRows) reportSheet.push([r.category_name, r.planned, r.actual, r.diff]);
  reportSheet.push(["支出合計", "", summary.expenseTotal, ""]);
  reportSheet.push([]);
  reportSheet.push(["前期繰越金", summary.openingBalance]);
  reportSheet.push(["当期収入", summary.incomeTotal]);
  reportSheet.push(["当期支出", summary.expenseTotal]);
  reportSheet.push(["期末残高（次期繰越）", summary.closingBalance]);

  const ledgerSheet: Cell[][] = [];
  ledgerSheet.push(["日付", "区分", "費目", "事業/イベント", "摘要", "収入", "支出", "残高", "領収書番号"]);
  for (const r of data.ledgerRows) {
    ledgerSheet.push([
      r.occurred_on, r.kindLabel, r.category_name, r.project_name, r.memo,
      r.income, r.expense, r.running_balance, r.receipt_no,
    ]);
  }
  return { reportSheet, ledgerSheet };
}

export function reportFileName(orgName: string, periodName: string): string {
  return `${orgName}_収支報告_${periodName}.xlsx`;
}

/** exceljs を動的importして整形済みブックを Blob で返す（ブラウザで実行） */
export async function buildFinanceWorkbookBlob(data: FinanceReportData): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const { reportSheet, ledgerSheet } = buildReportSheetModel(data);

  const wb = new ExcelJS.Workbook();
  const thin = { style: "thin" as const, color: { argb: "FF9CA3AF" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const headerFill = {
    type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF002B5C" },
  };

  const ws1 = wb.addWorksheet("収支報告書");
  reportSheet.forEach((row) => ws1.addRow(row));
  ws1.getColumn(1).width = 24;
  [2, 3, 4].forEach((c) => (ws1.getColumn(c).width = 14));
  // タイトル
  ws1.getRow(1).font = { bold: true, size: 14, color: { argb: "FF002B5C" } };
  // 表ヘッダ行（"費目"を含む行）に罫線＋塗り、金額列に¥書式
  ws1.eachRow((row) => {
    const first = row.getCell(1).value;
    const isHeader = first === "費目";
    const isSectionOrTotal =
      typeof first === "string" && (first.startsWith("【") || first.endsWith("合計") || first.includes("残高") || first.includes("繰越") || first.startsWith("当期"));
    row.eachCell((cell, col) => {
      if (isHeader) {
        cell.border = border;
        cell.fill = headerFill;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: col === 1 ? "left" : "center" };
      } else if (typeof cell.value === "number") {
        cell.border = border;
        cell.numFmt = "¥#,##0";
        cell.alignment = { horizontal: "right" };
      } else if (typeof cell.value === "string" && cell.value !== "") {
        if (!isSectionOrTotal) cell.border = border;
      }
      if (isSectionOrTotal) cell.font = { bold: true };
    });
  });

  const ws2 = wb.addWorksheet("出納帳");
  ledgerSheet.forEach((row) => ws2.addRow(row));
  [12, 8, 16, 16, 28, 12, 12, 14, 10].forEach((w, i) => (ws2.getColumn(i + 1).width = w));
  const head = ws2.getRow(1);
  head.eachCell((cell) => {
    cell.border = border;
    cell.fill = headerFill;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center" };
  });
  ws2.eachRow((row, idx) => {
    if (idx === 1) return;
    row.eachCell((cell) => {
      cell.border = border;
      if (typeof cell.value === "number") {
        cell.numFmt = "¥#,##0";
        cell.alignment = { horizontal: "right" };
      }
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
