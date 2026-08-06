# 訴求と動線の再設計（触れる会計デモ）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/for-clubs` に実際に触れる会計デモを置き、灰色のモックを具体的な再現画面に差し替え、財務DXを訴求に加える。

**Architecture:** デモの計算には `lib/finance/` の既存の純粋関数をそのまま使う。デモデータは製品の型（`FinanceTransaction` 等）を満たすため、製品側の型が変わればビルドが落ちてデモの追随が強制される。データはUIから切り離して `lib/for-clubs/` に置き、テスト可能にする。

**Tech Stack:** Next.js 15 App Router / TypeScript / Tailwind（6色トークン）/ vitest

## Global Constraints

- 設計書は `docs/superpowers/specs/2026-08-06-for-clubs-demo-design.md`。
- 色は6色のみ。**深紅 seal は既にCTAで2箇所使っており上限。デモには絶対に使わない**（ink・mist・rule・graphite のみ）。
- 書体ロールは `mincho`（見出し）/ `body`（本文・UI）/ `numeric`（数値）。**金額は必ず `font-numeric tabular-nums`。**
- 架空の団体名は「**桜丘大学 ダンスサークル**」。実在の大学・団体を想起させる名前を使わない。
- **再現画面には「画面イメージ」表記を残す。会計デモには付けない**（代わりに「この計算は製品と同じコードが動いています」）。
- **Client Component で `new Date()` / `Date.now()` / `Math.random()` を初期stateに使わない。** SSRとクライアントで値がずれてハイドレーション不整合になる。日付の既定値は定数にする。
- 各タスクの最後に `npm test` が通ること。**`npm run dev` 稼働中に `npm run build` を叩かない。**

---

### Task 1: デモデータを作る

**Files:**
- Create: `lib/for-clubs/financeDemoData.ts`
- Test: `lib/for-clubs/financeDemoData.test.ts`

**Interfaces:**
- Consumes: `FinanceBudget` / `FinanceCategory` / `FinanceKind` / `FinanceTransaction`（`lib/finance/types.ts`）
- Produces:
  - `DEMO_ORG_NAME: string` / `DEMO_PERIOD_NAME: string` / `DEMO_OPENING_BALANCE: number` / `DEMO_DEFAULT_DATE: string`
  - `DEMO_CATEGORIES: FinanceCategory[]` / `DEMO_BUDGETS: FinanceBudget[]` / `DEMO_TRANSACTIONS: FinanceTransaction[]`
  - `makeDemoTransaction(input: { id: string; occurred_on: string; kind: FinanceKind; category_id: string; amount: number; memo: string }): FinanceTransaction`

- [ ] **Step 1: 失敗するテストを書く**

`lib/for-clubs/financeDemoData.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { aggregateByCategory, summarize } from "@/lib/finance/aggregate";
import { currentBalance } from "@/lib/finance/balance";
import {
  DEMO_BUDGETS,
  DEMO_CATEGORIES,
  DEMO_OPENING_BALANCE,
  DEMO_TRANSACTIONS,
  makeDemoTransaction,
} from "./financeDemoData";

describe("デモデータの整合", () => {
  // LPに出す数字が合っていないと逆効果になるため、製品の関数で検算する。
  it("期首残高＋収入−支出が残高と一致する", () => {
    const s = summarize(DEMO_OPENING_BALANCE, DEMO_TRANSACTIONS);
    expect(s.closingBalance).toBe(currentBalance(DEMO_OPENING_BALANCE, DEMO_TRANSACTIONS));
    expect(s.closingBalance).toBe(DEMO_OPENING_BALANCE + s.incomeTotal - s.expenseTotal);
  });

  it("費目別集計の合計が収支サマリと一致する（取引の取りこぼしが無い）", () => {
    const s = summarize(DEMO_OPENING_BALANCE, DEMO_TRANSACTIONS);
    const rows = aggregateByCategory(DEMO_CATEGORIES, DEMO_TRANSACTIONS, DEMO_BUDGETS);
    const income = rows.filter((r) => r.kind === "income").reduce((a, r) => a + r.actual, 0);
    const expense = rows.filter((r) => r.kind === "expense").reduce((a, r) => a + r.actual, 0);
    expect(income).toBe(s.incomeTotal);
    expect(expense).toBe(s.expenseTotal);
  });

  it("予算はすべて実在する費目に紐づいている", () => {
    const ids = new Set(DEMO_CATEGORIES.map((c) => c.id));
    for (const b of DEMO_BUDGETS) {
      expect(ids.has(b.category_id), `${b.category_id} が費目マスタに無い`).toBe(true);
    }
  });

  it("取引はすべて実在する費目に紐づき、収支区分が費目と一致する", () => {
    const byId = new Map(DEMO_CATEGORIES.map((c) => [c.id, c]));
    for (const t of DEMO_TRANSACTIONS) {
      const cat = byId.get(t.category_id);
      expect(cat, `${t.category_id} が費目マスタに無い`).toBeDefined();
      expect(t.kind, `${t.memo} の収支区分が費目と食い違う`).toBe(cat!.kind);
    }
  });

  it("金額はすべて正の整数（マイナス入力で符号を二重に扱わない）", () => {
    for (const t of DEMO_TRANSACTIONS) {
      expect(Number.isInteger(t.amount)).toBe(true);
      expect(t.amount).toBeGreaterThan(0);
    }
  });

  it("makeDemoTransaction は製品の型を満たす行を作る", () => {
    const t = makeDemoTransaction({
      id: "x1",
      occurred_on: "2026-07-01",
      kind: "expense",
      category_id: "cat-venue",
      amount: 5000,
      memo: "テスト",
    });
    expect(t.amount).toBe(5000);
    expect(t.project_id).toBeNull();
    expect(t.created_at.startsWith("2026-07-01")).toBe(true);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run lib/for-clubs/financeDemoData.test.ts`
Expected: FAIL（`Failed to resolve import "./financeDemoData"`）

- [ ] **Step 3: デモデータを実装する**

`lib/for-clubs/financeDemoData.ts`:

```typescript
import type {
  FinanceBudget,
  FinanceCategory,
  FinanceKind,
  FinanceTransaction,
} from "@/lib/finance/types";

/**
 * /for-clubs の会計デモで使う架空データ。
 *
 * 製品の型をそのまま満たすため、`lib/finance/types.ts` が変わればここで
 * ビルドが落ちる。デモが実態から静かにずれるのを型で防いでいる。
 * 団体名・大学名は架空。実在の団体をLPの宣伝素材に使わない。
 */

export const DEMO_ORG_NAME = "桜丘大学 ダンスサークル";
export const DEMO_PERIOD_NAME = "2026年度";
export const DEMO_OPENING_BALANCE = 120_000;

/** 入力欄の日付の既定値。`new Date()` を使うとSSRとクライアントでずれる */
export const DEMO_DEFAULT_DATE = "2026-07-01";

const ORG = "demo-org";
const PERIOD = "demo-period";

export const DEMO_CATEGORIES: FinanceCategory[] = [
  { id: "cat-fee", organization_id: ORG, name: "部費収入", kind: "income", sort_order: 1, is_archived: false },
  { id: "cat-sponsor", organization_id: ORG, name: "協賛金", kind: "income", sort_order: 2, is_archived: false },
  { id: "cat-venue", organization_id: ORG, name: "会場費", kind: "expense", sort_order: 3, is_archived: false },
  { id: "cat-equip", organization_id: ORG, name: "備品費", kind: "expense", sort_order: 4, is_archived: false },
  { id: "cat-travel", organization_id: ORG, name: "交通費", kind: "expense", sort_order: 5, is_archived: false },
];

export const DEMO_BUDGETS: FinanceBudget[] = [
  { id: "bud-fee", organization_id: ORG, period_id: PERIOD, category_id: "cat-fee", kind: "income", planned_amount: 240_000 },
  { id: "bud-sponsor", organization_id: ORG, period_id: PERIOD, category_id: "cat-sponsor", kind: "income", planned_amount: 50_000 },
  { id: "bud-venue", organization_id: ORG, period_id: PERIOD, category_id: "cat-venue", kind: "expense", planned_amount: 180_000 },
  { id: "bud-equip", organization_id: ORG, period_id: PERIOD, category_id: "cat-equip", kind: "expense", planned_amount: 60_000 },
  { id: "bud-travel", organization_id: ORG, period_id: PERIOD, category_id: "cat-travel", kind: "expense", planned_amount: 40_000 },
];

export function makeDemoTransaction(input: {
  id: string;
  occurred_on: string;
  kind: FinanceKind;
  category_id: string;
  amount: number;
  memo: string;
}): FinanceTransaction {
  return {
    id: input.id,
    organization_id: ORG,
    period_id: PERIOD,
    occurred_on: input.occurred_on,
    kind: input.kind,
    category_id: input.category_id,
    project_id: null,
    amount: input.amount,
    memo: input.memo,
    receipt_path: null,
    receipt_no: null,
    parent_transaction_id: null,
    created_by: null,
    created_at: `${input.occurred_on}T09:00:00.000Z`,
  };
}

export const DEMO_TRANSACTIONS: FinanceTransaction[] = [
  makeDemoTransaction({ id: "d1", occurred_on: "2026-04-08", kind: "income", category_id: "cat-fee", amount: 180_000, memo: "前期部費（36名分）" }),
  makeDemoTransaction({ id: "d2", occurred_on: "2026-04-20", kind: "expense", category_id: "cat-venue", amount: 64_000, memo: "スタジオ利用料（4月）" }),
  makeDemoTransaction({ id: "d3", occurred_on: "2026-05-11", kind: "expense", category_id: "cat-equip", amount: 23_800, memo: "スピーカー購入" }),
  makeDemoTransaction({ id: "d4", occurred_on: "2026-05-30", kind: "income", category_id: "cat-sponsor", amount: 30_000, memo: "学祭パンフ協賛" }),
  makeDemoTransaction({ id: "d5", occurred_on: "2026-06-15", kind: "expense", category_id: "cat-travel", amount: 12_400, memo: "地区大会 交通費" }),
];
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run lib/for-clubs/financeDemoData.test.ts`
Expected: PASS（6テスト）

- [ ] **Step 5: Commit**

```bash
git add lib/for-clubs/financeDemoData.ts lib/for-clubs/financeDemoData.test.ts
git commit -m "feat(for-clubs): 会計デモのデータを追加（製品の型と関数で検算）"
```

---

### Task 2: 触れる会計デモのコンポーネント

**Files:**
- Create: `components/for-clubs/FinanceDemo.tsx`

**Interfaces:**
- Consumes: Task 1 の全エクスポート、`currentBalance`（`lib/finance/balance.ts`）、`aggregateByCategory` / `summarize`（`lib/finance/aggregate.ts`）
- Produces: `FinanceDemo()` — Client Component、引数なし

- [ ] **Step 1: コンポーネントを実装する**

`components/for-clubs/FinanceDemo.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { aggregateByCategory, summarize } from "@/lib/finance/aggregate";
import type { FinanceKind, FinanceTransaction } from "@/lib/finance/types";
import {
  DEMO_BUDGETS,
  DEMO_CATEGORIES,
  DEMO_DEFAULT_DATE,
  DEMO_OPENING_BALANCE,
  DEMO_ORG_NAME,
  DEMO_PERIOD_NAME,
  DEMO_TRANSACTIONS,
  makeDemoTransaction,
} from "@/lib/for-clubs/financeDemoData";

const yen = new Intl.NumberFormat("ja-JP");

export default function FinanceDemo() {
  const [txns, setTxns] = useState<FinanceTransaction[]>(DEMO_TRANSACTIONS);
  const [seq, setSeq] = useState(0);
  const [date, setDate] = useState(DEMO_DEFAULT_DATE);
  const [kind, setKind] = useState<FinanceKind>("expense");
  const [categoryId, setCategoryId] = useState("cat-venue");
  const [amount, setAmount] = useState("8000");
  const [memo, setMemo] = useState("スタジオ利用料（7月）");

  const summary = useMemo(() => summarize(DEMO_OPENING_BALANCE, txns), [txns]);
  const rows = useMemo(
    () => aggregateByCategory(DEMO_CATEGORIES, txns, DEMO_BUDGETS),
    [txns]
  );
  const recent = useMemo(
    () => [...txns].sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : -1)).slice(0, 5),
    [txns]
  );

  const selectable = DEMO_CATEGORIES.filter((c) => c.kind === kind);

  function handleKindChange(next: FinanceKind) {
    setKind(next);
    const first = DEMO_CATEGORIES.find((c) => c.kind === next);
    if (first) setCategoryId(first.id);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    const next = seq + 1;
    setSeq(next);
    setTxns((prev) => [
      ...prev,
      makeDemoTransaction({
        id: `demo-new-${next}`,
        occurred_on: date,
        kind,
        category_id: categoryId,
        amount: Math.round(value),
        memo: memo.trim() || "（摘要なし）",
      }),
    ]);
    setAmount("");
    setMemo("");
  }

  function handleReset() {
    setTxns(DEMO_TRANSACTIONS);
    setSeq(0);
    setDate(DEMO_DEFAULT_DATE);
    handleKindChange("expense");
    setAmount("8000");
    setMemo("スタジオ利用料（7月）");
  }

  const field =
    "w-full border border-rule bg-paper px-3 py-2 text-sm text-graphite focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-ink";

  return (
    <div className="border border-rule bg-paper">
      {/* 見出し */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule bg-mist px-5 py-3">
        <span className="text-sm font-bold text-ink">{DEMO_ORG_NAME}</span>
        <span className="text-xs text-graphite">{DEMO_PERIOD_NAME}の会計</span>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-2">
        {/* 左：残高と予算対比 */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs text-graphite">現在の残高</p>
            <p className="font-numeric tabular-nums text-3xl font-black text-ink">
              ¥{yen.format(summary.closingBalance)}
            </p>
            <div className="mt-2 flex gap-4 text-xs text-graphite">
              <span>
                収入{" "}
                <strong className="font-numeric tabular-nums text-ink">
                  ¥{yen.format(summary.incomeTotal)}
                </strong>
              </span>
              <span>
                支出{" "}
                <strong className="font-numeric tabular-nums text-ink">
                  ¥{yen.format(summary.expenseTotal)}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-ink">費目別の予算対比</p>
            {rows.map((r) => {
              const ratio = r.planned > 0 ? Math.min(r.actual / r.planned, 1) : 0;
              return (
                <div key={r.category_id} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-graphite">{r.category_name}</span>
                    <span className="font-numeric tabular-nums text-graphite">
                      {yen.format(r.actual)} / {yen.format(r.planned)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-mist">
                    <div
                      className="h-1.5 bg-ink transition-all duration-300"
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右：入力と履歴 */}
        <div className="flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <p className="text-xs font-bold text-ink">記録してみる</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                aria-label="日付"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={field}
              />
              <select
                aria-label="収支区分"
                value={kind}
                onChange={(e) => handleKindChange(e.target.value as FinanceKind)}
                className={field}
              >
                <option value="expense">支出</option>
                <option value="income">収入</option>
              </select>
              <select
                aria-label="費目"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={field}
              >
                {selectable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                aria-label="金額"
                placeholder="金額"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${field} font-numeric tabular-nums`}
              />
            </div>
            <input
              type="text"
              aria-label="摘要"
              placeholder="摘要"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className={field}
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="bg-ink px-5 py-2 text-sm font-bold text-paper transition hover:bg-ink/90"
              >
                記録する
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs text-graphite underline transition hover:text-ink"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                最初に戻す
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-1 border-t border-rule pt-3">
            <p className="text-xs font-bold text-ink">最近の記録</p>
            <ul className="flex flex-col">
              {recent.map((t) => {
                const cat = DEMO_CATEGORIES.find((c) => c.id === t.category_id);
                return (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 border-b border-rule py-1.5 text-xs last:border-0"
                  >
                    <span className="font-numeric tabular-nums text-graphite">{t.occurred_on}</span>
                    <span className="flex-1 truncate text-graphite">
                      {cat?.name}／{t.memo}
                    </span>
                    <span className="font-numeric tabular-nums font-bold text-ink">
                      {t.kind === "income" ? "+" : "−"}
                      {yen.format(t.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <p className="border-t border-rule bg-mist px-5 py-3 text-xs text-graphite">
        この計算は製品と同じコードが動いています（残高・費目別集計・予算対比）。
      </p>
    </div>
  );
}
```

- [ ] **Step 2: 型チェックが通ることを確認する**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add components/for-clubs/FinanceDemo.tsx
git commit -m "feat(for-clubs): 実際に触れる会計デモのコンポーネント"
```

---

### Task 3: デモをLPに組み込み、ヒーローを直す

**Files:**
- Modify: `app/for-clubs/page.tsx`（import追加、ヒーロー直下にデモ、サブコピー修正）

**Interfaces:**
- Consumes: `FinanceDemo`（Task 2）
- Produces: なし

- [ ] **Step 1: import を追加する**

`app/for-clubs/page.tsx` の既存 import 群の末尾に追加する。

```tsx
import FinanceDemo from "@/components/for-clubs/FinanceDemo";
```

- [ ] **Step 2: ヒーローのサブコピーに会計を入れる**

以下を置き換える（現行217-219行付近）。

```tsx
          <p className="mt-6 text-lg md:text-xl text-ink font-bold">
            新メンバー募集・タスク管理・イベント告知を、一つの画面で。
          </p>
```

置換後：

```tsx
          <p className="mt-6 text-lg md:text-xl text-ink font-bold">
            会計・新メンバー募集・タスク管理・イベント告知を、一つの画面で。
          </p>
```

- [ ] **Step 3: metadata の説明文にも会計を入れる**

ヒーローと同じ理由で、`metadata.description` と `openGraph.description`（現行17行・24行）の「新メンバー募集・タスク管理・イベント告知」を「**会計・新メンバー募集・タスク管理・イベント告知**」に置き換える。2箇所とも直す。

- [ ] **Step 4: ヒーロー直下にデモを差し込む**

`{/* ── 課題提起：Before ── */}` の**直前**に以下を挿入する。

```tsx
      {/* ── 触れる会計デモ ── */}
      <section id="demo" className="border-b border-rule bg-paper py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-8 text-center">
            <h2 className="font-mincho text-2xl font-black leading-snug text-ink md:text-3xl">
              まず、触ってみてください。
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-graphite">
              下は会計機能のデモです。金額を入れて「記録する」を押すと、残高・費目別の集計・予算対比がその場で動きます。登録もログインも要りません。
            </p>
          </div>
          <FinanceDemo />
        </div>
      </section>
```

- [ ] **Step 5: ビルドを確認する**

事前に `npm run dev` が動いていないことを確認：`Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue`

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: すべて成功。`/for-clubs` が出力に現れる

- [ ] **Step 6: 出力HTMLにデモの初期値が入っていることを確認する**

Run: `grep -o "桜丘大学 ダンスサークル\|229,800\|この計算は製品と同じコードが動いています" .next/server/app/for-clubs.html | sort | uniq -c`
Expected: 3種すべてが1件以上（残高 229,800 = 120,000 + 210,000 − 100,200）

- [ ] **Step 7: Commit**

```bash
git add app/for-clubs/page.tsx
git commit -m "feat(for-clubs): ヒーロー直下に触れる会計デモを設置"
```

---

### Task 4: 灰色のモックを具体的な再現画面に差し替える

**Files:**
- Modify: `app/for-clubs/page.tsx`（`MockChrome` / `MockInboxKanban` / `MockTimeline` / `MockCalendarEvent` / `MockTasksInvite`）

**Interfaces:**
- Consumes: なし
- Produces: なし（同名のコンポーネントを中身だけ差し替える）

- [ ] **Step 1: `MockChrome` のドメイン誤りを直し、可変にする**

現行の `MockChrome`（33-42行）を置き換える。`proofloop.app` は誤りで、正しくは `proofloop.jp`。

```tsx
function MockChrome({ path }: { path: string }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-rule bg-mist px-3 py-2">
      <span className="size-2.5 rounded-full bg-rule" />
      <span className="size-2.5 rounded-full bg-rule" />
      <span className="size-2.5 rounded-full bg-rule" />
      <span className="ml-2 text-[10px] font-medium tracking-wide text-graphite/70">
        proofloop.jp{path}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: `MockInboxKanban` を具体化する**

現行の `MockInboxKanban`（44-87行）を置き換える。灰色の箱をやめ、実際の応募者名とステータスを入れる。

```tsx
const DEMO_APPLICANTS = [
  { name: "佐藤 みなみ", faculty: "文学部1年", stage: "新規" },
  { name: "鈴木 大地", faculty: "経済学部2年", stage: "面談中" },
  { name: "高橋 あやか", faculty: "理工学部1年", stage: "面談中" },
  { name: "田中 りく", faculty: "法学部1年", stage: "内定" },
];

function MockInboxKanban() {
  return (
    <div className="flex flex-col overflow-hidden border border-rule bg-mist">
      <MockChrome path="/clubats" />
      <div className="flex min-h-0 flex-1 gap-3 p-4">
        <div className="flex w-[38%] flex-col gap-2 border border-rule bg-paper p-3">
          <div className="flex items-center gap-2 text-ink">
            <Inbox className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="text-[11px] font-bold">応募 4件</span>
          </div>
          {DEMO_APPLICANTS.map((a) => (
            <div key={a.name} className="border border-rule bg-mist p-2">
              <p className="text-[11px] font-bold text-ink">{a.name}</p>
              <p className="text-[10px] text-graphite">{a.faculty}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2 border border-rule bg-paper p-3">
          <div className="flex items-center gap-2 text-ink">
            <Kanban className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="text-[11px] font-bold">採用ボード</span>
          </div>
          <div className="flex min-h-0 flex-1 gap-2">
            {["新規", "面談中", "内定"].map((stage) => (
              <div key={stage} className="flex-1 border border-dashed border-rule bg-mist p-2">
                <span className="text-[9px] font-bold tracking-wider text-graphite/70">
                  {stage}
                </span>
                <div className="mt-2 flex flex-col gap-1.5">
                  {DEMO_APPLICANTS.filter((a) => a.stage === stage).map((a) => (
                    <div key={a.name} className="border border-rule bg-paper px-2 py-1.5">
                      <p className="truncate text-[10px] font-bold text-ink">{a.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `MockTimeline` を具体化する**

現行の `MockTimeline`（89-121行付近）を置き換える。

```tsx
const DEMO_POSTS = [
  { title: "夏合宿、無事に終わりました！", meta: "8月2日 ・ いいね 24" },
  { title: "新歓公演のリハーサル風景", meta: "7月28日 ・ いいね 17" },
  { title: "初心者歓迎の体験練習やります", meta: "7月21日 ・ いいね 31" },
];

function MockTimeline() {
  return (
    <div className="flex flex-col overflow-hidden border border-rule bg-mist">
      <MockChrome path="/timeline" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        {DEMO_POSTS.map((p) => (
          <div key={p.title} className="flex gap-3 border border-rule bg-paper p-3">
            <div className="size-9 shrink-0 border border-rule bg-mist" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-ink">桜丘大学 ダンスサークル</p>
              <p className="truncate text-[11px] text-graphite">{p.title}</p>
              <p className="mt-1 text-[10px] text-graphite/70">{p.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `MockCalendarEvent` を具体化する**

現行の `MockCalendarEvent`（123-158行付近）を置き換える。

```tsx
const DEMO_EVENTS = [
  { day: "9/14", title: "新歓体験練習", place: "第2体育館", count: "参加 18人" },
  { day: "9/21", title: "OB・OG交流会", place: "学生会館 3F", count: "参加 12人" },
  { day: "10/5", title: "学祭ステージ本番", place: "中央広場", count: "参加 36人" },
];

function MockCalendarEvent() {
  return (
    <div className="flex flex-col overflow-hidden border border-rule bg-mist">
      <MockChrome path="/clubevents" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        {DEMO_EVENTS.map((e) => (
          <div key={e.title} className="flex items-center gap-3 border border-rule bg-paper p-3">
            <div className="flex size-11 shrink-0 flex-col items-center justify-center border border-rule bg-mist">
              <span className="font-numeric tabular-nums text-[11px] font-black text-ink">
                {e.day}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-ink">{e.title}</p>
              <p className="text-[10px] text-graphite">{e.place}</p>
            </div>
            <span className="shrink-0 text-[10px] text-graphite">{e.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `MockTasksInvite` を具体化する**

現行の `MockTasksInvite`（160-200行付近）を置き換える。

```tsx
const DEMO_TASKS = [
  { title: "学祭の申請書を提出", owner: "田中", done: true },
  { title: "衣装の見積もりを取る", owner: "佐藤", done: true },
  { title: "音源を編集して共有", owner: "鈴木", done: false },
  { title: "OB会の案内を送る", owner: "高橋", done: false },
];

function MockTasksInvite() {
  return (
    <div className="flex flex-col overflow-hidden border border-rule bg-mist">
      <MockChrome path="/clubtasks" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        {DEMO_TASKS.map((t) => (
          <div key={t.title} className="flex items-center gap-3 border border-rule bg-paper p-2.5">
            <span
              className={`size-3.5 shrink-0 border ${
                t.done ? "border-ink bg-ink" : "border-rule bg-paper"
              }`}
              aria-hidden="true"
            />
            <p
              className={`min-w-0 flex-1 truncate text-[11px] ${
                t.done ? "text-graphite/60 line-through" : "text-ink"
              }`}
            >
              {t.title}
            </p>
            <span className="shrink-0 text-[10px] text-graphite">{t.owner}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 使われなくなった import を外す**

差し替えにより **`LayoutGrid`・`ListTodo`・`UserPlus` の3つが未使用になる**（実測で確認済み。それぞれ旧 `MockCalendarEvent` 149行・旧 `MockTasksInvite` 167行・184行でのみ使われていた）。1行目の import から**この3つだけ**を削除する。

`Inbox`・`Kanban` は新しい `MockInboxKanban` で引き続き使う。`Users`・`CalendarDays`・`Rss`・`MessageSquare`・`Sparkles` はセクションのバッジで使っているため**残す**。

置換後の import：

```tsx
import {
  ArrowRight, CalendarDays, Inbox, Kanban,
  MessageSquare, Rss, Sparkles, Users,
  CheckCircle2, TrendingUp, Shield, Zap,
} from "lucide-react";
```

Run: `npx eslint app/for-clubs/page.tsx`
Expected: 未使用変数の警告が出ないこと

- [ ] **Step 7: ビルドと表示を確認する**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: すべて成功

Run: `grep -c "proofloop.app" app/for-clubs/page.tsx`
Expected: `0`

Run: `grep -o "佐藤 みなみ\|夏合宿、無事に終わりました！\|新歓体験練習\|学祭の申請書を提出" .next/server/app/for-clubs.html | sort | uniq -c`
Expected: 4種すべてが1件以上

- [ ] **Step 8: Commit**

```bash
git add app/for-clubs/page.tsx
git commit -m "feat(for-clubs): 灰色のモックを具体的な再現画面に差し替え・ドメイン誤記を修正"
```

---

### Task 5: 機能紹介に会計を追加し、FAQを1件足す

**Files:**
- Modify: `app/for-clubs/page.tsx`（機能紹介の先頭に会計、FAQに1件）

**Interfaces:**
- Consumes: なし
- Produces: なし

- [ ] **Step 1: 機能紹介の先頭に会計セクションを追加する**

`{/* ① 応募管理 */}` の**直前**に以下を挿入する。番号は既存の `01 ／ 応募・採用管理` と重複するため、あわせて既存4本の番号を 02〜05 に振り直す（Step 2）。

```tsx
        {/* ① 会計・財務 */}
        <section className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="order-2 space-y-6 lg:order-1">
            <div className="inline-flex items-center gap-2 bg-mist px-3 py-1.5 text-xs font-bold text-ink">
              <Wallet className="size-3.5 shrink-0" aria-hidden="true" />01 ／ 会計・財務
            </div>
            <h2 className="font-mincho text-2xl font-black leading-snug text-ink md:text-3xl">
              代替わりで消える帳簿を、<br />なくす。
            </h2>
            <p className="text-base leading-relaxed text-graphite">
              大学へ提出する年次の収支報告は、紙のレシートと手集計で毎年つくり直しになります。ProofLoopなら記録した時点で残高・費目別集計・予算対比が出そろい、そのままExcelで書き出せます。
            </p>
            <ul className="flex flex-col gap-2">
              {["出納帳・費目別集計・予算対比を自動で計算", "領収書の写真を取引に添付", "収支報告書と出納帳をExcelで出力", "会計担当だけが記録／閲覧は全員（透明性）"].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-graphite">
                  <CheckCircle2 className="size-4 shrink-0 text-ink" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <a href="#demo" className="inline-block text-sm font-bold text-ink underline underline-offset-4">
              上のデモで実際に試す
            </a>
          </div>
          <div className="order-1 lg:order-2">
            <MockFinance />
            <p className="mt-3 text-center text-xs text-graphite/70">会計・財務の画面イメージ</p>
          </div>
        </section>
```

`Wallet` を `lucide-react` の import に追加する。

- [ ] **Step 2: 既存4本の番号を振り直す**

`01 ／ 応募・採用管理` → `02 ／ 応募・採用管理`
`02 ／ タイムライン発信` → `05 ／ タイムライン発信`
`03 ／ イベント告知・集客` → `04 ／ イベント告知・集客`
`04 ／ タスク・メンバー管理` → `03 ／ タスク・メンバー管理`

番号だけを書き換える。セクションの並び順は変えない（Zレイアウトの左右交互が崩れるため）。

- [ ] **Step 3: `MockFinance` を追加する**

`MockTasksInvite` の直後に以下を追加する。

```tsx
function MockFinance() {
  return (
    <div className="flex flex-col overflow-hidden border border-rule bg-mist">
      <MockChrome path="/clubfinance" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="border border-rule bg-paper p-3">
          <p className="text-[10px] text-graphite">現在の残高</p>
          <p className="font-numeric tabular-nums text-xl font-black text-ink">¥229,800</p>
        </div>
        <div className="flex flex-col gap-2 border border-rule bg-paper p-3">
          <p className="text-[10px] font-bold text-ink">費目別の予算対比</p>
          {[
            { name: "会場費", ratio: 0.36 },
            { name: "備品費", ratio: 0.4 },
            { name: "交通費", ratio: 0.31 },
          ].map((r) => (
            <div key={r.name} className="flex flex-col gap-1">
              <span className="text-[10px] text-graphite">{r.name}</span>
              <div className="h-1.5 w-full bg-mist">
                <div className="h-1.5 bg-ink" style={{ width: `${r.ratio * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: FAQ に会計の項目を追加する**

FAQ の配列（現行420行付近）に以下を1件追加する。

```tsx
              { q: "会計担当以外にも帳簿が見えてしまいませんか？", a: "記録・編集ができるのは会計担当の権限を持つ方だけですが、閲覧はメンバー全員が可能です。お金の流れが見えることは学生団体の信頼の土台になるため、あえてこの設計にしています。" },
```

- [ ] **Step 5: ビルドを確認する**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: すべて成功

Run: `grep -o "01 ／ 会計・財務\|02 ／ 応募・採用管理\|03 ／ タスク・メンバー管理\|04 ／ イベント告知・集客\|05 ／ タイムライン発信" app/for-clubs/page.tsx | sort`
Expected: 5行すべてが1件ずつ

- [ ] **Step 6: Commit**

```bash
git add app/for-clubs/page.tsx
git commit -m "feat(for-clubs): 機能紹介に会計・財務を追加（財務DXが訴求から抜けていた）"
```

---

### Task 6: 動線を整える

**Files:**
- Modify: `components/Footer.tsx:14`（コメント）
- Modify: `app/manual/page.tsx`（冒頭に `/for-clubs` への導線）
- Modify: `app/for-clubs/page.tsx`（最終CTAの隣に `/manual`）
- Modify: `docs/risk-register.md`（R3・R5 の状態）

**Interfaces:**
- Consumes: なし
- Produces: なし

- [ ] **Step 1: フッターのコメントを方針決定に書き換える**

`components/Footer.tsx` の以下のコメント行を置き換える。

```tsx
// /for-students リンクは該当ページが存在しないため削除（404）。ページ実装時にここで復活させる。
```

置換後：

```tsx
// /for-students は作らない方針（2026-08-06 決定）。学生向けの入口は /guide ハブ・
// /gpa・/baito が担っており、専用ページを作ると内容が重複するため。
```

- [ ] **Step 2: `/manual` の冒頭に訴求面への導線を置く**

`app/manual/page.tsx` の、リード文「ProofLoopをサークル・学生団体で使うための手順書です。登録から新歓の応募管理までを、実際に触る順番で並べています。」を含む `<p>` の**直後**に以下を挿入する。

```tsx
          <p className="mt-3 text-sm text-graphite">
            何ができるのかを先に知りたい方は{" "}
            <Link href="/for-clubs" className="font-bold text-ink underline">
              サークル・学生団体の方へ
            </Link>{" "}
            をご覧ください。会計機能は登録なしでその場で試せます。
          </p>
```

`Link` が未 import なら `import Link from "next/link";` を追加する。

- [ ] **Step 3: `/for-clubs` の最終CTAに `/manual` を並べる**

最終CTAセクション（現行433行付近）の `/signup` ボタンの直後に、以下のリンクを追加する。

```tsx
            <Link href="/manual" className="text-sm font-bold text-ink/70 underline underline-offset-4 transition hover:text-ink">
              登録後の使い方を見る
            </Link>
```

既存のボタンとの並びが崩れる場合は、囲っている `div` に `flex flex-col sm:flex-row items-center justify-center gap-4` を付ける。

- [ ] **Step 4: リスク台帳を更新する**

`docs/risk-register.md` の R3 と R5 の行を以下に置き換える。

R3：
```markdown
| R3 | `/for-students` が404なのにGA4で表示が発生している | GA4 28日（2026-07-09〜08-05）で6表示・4ユーザー | 低 | 低 | オーナー | **ページは作らない方針で決定（2026-08-06）。** 学生向けの入口は `/guide` ハブ・`/gpa`・`/baito` が担う。フッターのコメントに方針を明記した | ✅対応済み（2026-08-06） |
```

R5：
```markdown
| R5 | `/for-clubs`・`/manual` の訴求不足と動線 | モックが灰色の箱・財務DXの記載なし・ドメイン誤記 | 中 | 中 | Claude実装 | 触れる会計デモを設置し、モックを具体的な再現に差し替え、機能紹介に会計を追加。`/manual` 冒頭と最終CTAに相互の導線を追加 | ✅対応済み（2026-08-06） |
```

- [ ] **Step 5: 全体を確認する**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: すべて成功

Run: `grep -c "for-students は作らない方針" components/Footer.tsx`
Expected: `1`

- [ ] **Step 6: Commit**

```bash
git add components/Footer.tsx app/manual/page.tsx app/for-clubs/page.tsx docs/risk-register.md
git commit -m "feat(for-clubs): 訴求面と手順書の相互導線を整備・/for-students は作らない方針を明記"
```

---

## 完了条件

- `/for-clubs` のヒーロー直下に会計デモがあり、金額を入力すると残高・費目別集計・予算対比が動く
- デモの初期残高が `¥229,800`（＝120,000 ＋ 210,000 − 100,200）で表示される
- 機能紹介が 01〜05 の5本になり、01が会計・財務
- モックに灰色の箱（中身のないプレースホルダ）が無く、`proofloop.app` の記載が0件
- 再現画面には「画面イメージ」表記があり、会計デモには無い
- `/manual` 冒頭から `/for-clubs` へ、`/for-clubs` 最終CTAから `/manual` へ行ける
- フッターのコメントが「作らない方針」になっている
- `npm test` が全件通る（Task 1 で6件が新規）
