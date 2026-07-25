"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button, Input } from "@/components/ui";
import type { FinanceCategory, FinanceProject, FinanceKind, FinanceTransaction } from "@/lib/finance/types";

export type TxnFormValues = {
  kind: FinanceKind;
  occurred_on: string;
  category_id: string;
  project_id: string;
  amount: string;
  memo: string;
  fee: string;
  receipt_no: string;
};

export type TxnSubmit = {
  values: TxnFormValues;
  file: File | null;
};

export default function TransactionModal({
  open, editing, categories, projects, defaultReceiptNo, defaultFee, saving, onClose, onSubmit,
}: {
  open: boolean;
  editing: FinanceTransaction | null;
  categories: FinanceCategory[];
  projects: FinanceProject[];
  defaultReceiptNo: string;
  /** 編集対象に紐づく既存の手数料額（0 なら手数料なし）。編集時に手数料欄へ初期表示する。 */
  defaultFee: number;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: TxnSubmit) => void;
}) {
  const [form, setForm] = useState<TxnFormValues>({
    kind: "expense", occurred_on: "", category_id: "", project_id: "",
    amount: "", memo: "", fee: "", receipt_no: "",
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        kind: editing.kind,
        occurred_on: editing.occurred_on,
        category_id: editing.category_id,
        project_id: editing.project_id ?? "",
        amount: String(editing.amount),
        memo: editing.memo ?? "",
        fee: defaultFee > 0 ? String(defaultFee) : "",
        receipt_no: editing.receipt_no ?? "",
      });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setForm({
        kind: "expense", occurred_on: today, category_id: "", project_id: "",
        amount: "", memo: "", fee: "", receipt_no: defaultReceiptNo,
      });
    }
    setFile(null);
  }, [open, editing, defaultReceiptNo, defaultFee]);

  if (!open) return null;

  const cats = categories.filter((c) => c.kind === form.kind && !c.is_archived);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-xl bg-paper border border-rule shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-rule flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-ink">{editing ? "取引を編集" : "取引を追加"}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-graphite hover:bg-mist" aria-label="閉じる">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <form className="p-5 space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ values: form, file }); }}>
          <div className="grid grid-cols-2 gap-3">
            <button type="button"
              className={`py-2 rounded-lg border text-sm font-bold ${form.kind === "expense" ? "border-ink bg-ink text-paper" : "border-rule bg-paper text-graphite"}`}
              onClick={() => setForm((f) => ({ ...f, kind: "expense", category_id: "" }))}>支出</button>
            <button type="button"
              className={`py-2 rounded-lg border text-sm font-bold ${form.kind === "income" ? "border-ink bg-ink text-paper" : "border-rule bg-paper text-graphite"}`}
              onClick={() => setForm((f) => ({ ...f, kind: "income", category_id: "" }))}>収入</button>
          </div>
          <div>
            <label className="block text-sm font-bold text-ink mb-1">日付 *</label>
            <input type="date" required value={form.occurred_on}
              onChange={(e) => setForm((f) => ({ ...f, occurred_on: e.target.value }))}
              className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink" />
          </div>
          <div>
            <label className="block text-sm font-bold text-ink mb-1">費目 *</label>
            <select required value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink">
              <option value="">選択してください</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-ink mb-1">事業・イベント（任意）</label>
            <select value={form.project_id}
              onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
              className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink">
              <option value="">なし</option>
              {projects.filter((p) => !p.is_archived).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-ink mb-1">金額（円）*</label>
            <Input type="number" min="0" required value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" />
          </div>
          {form.kind === "expense" && (
            <div>
              <label className="block text-sm font-bold text-ink mb-1">振込手数料（円・任意）</label>
              <Input type="number" min="0" value={form.fee}
                onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))} placeholder="例: 330" />
              <p className="text-xs text-graphite/70 mt-1">入力すると「支払手数料」として別行で自動記録します。</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-ink mb-1">摘要（任意）</label>
            <Input value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} placeholder="支払先・内容など" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-ink mb-1">領収書番号（任意）</label>
              <Input value={form.receipt_no} onChange={(e) => setForm((f) => ({ ...f, receipt_no: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink mb-1">領収書写真（任意）</label>
              <input type="file" accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-graphite" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outlineMuted" onClick={onClose} disabled={saving}>キャンセル</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
