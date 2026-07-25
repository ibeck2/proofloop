# 財務DX（学生団体会計）v1 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 学生団体の会計担当が、日々の収支記録・領収書写真・予算対比・決算を1画面で行い、助成金/協賛の提出書類を整形済みExcelで出力できる財務モジュール（v1）を追加する。

**Architecture:** Supabase に `finance_*` 5テーブルを追加（RLSでメンバー限定・書き込みは `can_manage_finance` 権限）。計算ロジックは `lib/finance/` の純関数（vitestでTDD）に隔離し、UIは `app/(club)/clubfinance/` 配下の client ページから `supabase` を直呼び（既存 clubtasks と同じ流儀）。Excel出力は `exceljs` をブラウザ側で動的importして生成。

**Tech Stack:** Next.js 15 App Router / TypeScript / Tailwind（デザイントークン `ink/paper/mist/rule/graphite/seal`, `font-mincho`, `font-numeric tabular-nums`）/ Supabase(RLS + Storage) / vitest / exceljs(新規) / sonner(toast) / lucide-react。

## Global Constraints

- 設計書：`docs/superpowers/specs/2026-07-25-finance-dx-design.md`（本計画の根拠。齟齬があれば設計書が優先）。
- 金額はすべて**整数（円）**。小数は扱わない。
- 財務データは **public に公開しない**。RLS で SELECT はメンバー限定、INSERT/UPDATE/DELETE は `can_manage_finance = true` 限定。
- 追加する npm 依存は **`exceljs` の 1 点のみ**。他の依存は追加しない。
- スキーマ変更・Storage 設定・RPC 変更は影響が大きいため、Task 2 の適用はオーナー承認後に行う（`CLAUDE.md` §5）。
- 既存パターンに従う：ページは `page.tsx`(server) → client コンポーネント、`useClubOrganization()` で `activeOrgId` を取得、`supabase`(`@/lib/supabase`) 直呼び、`toast`(sonner)、`@/components/ui` の `Button/Input`。UI 文言は日本語。
- テスト実行：`npm test`（= `vitest run`）。単一ファイルは `npx vitest run <path>`。
- BS(貸借対照表)・複数口座・立替精算・OCR・協賛自動送信は **v1対象外**。

---

## ファイル構成

**新規**
- `supabase/migrations/026_finance_module.sql` — 5テーブル・CHECK・index・RLS関数/ポリシー・`can_manage_finance`追加・RPC更新・Storageバケット。
- `lib/finance/types.ts` — 型定義。
- `lib/finance/defaults.ts` — 初期費目・既定会計期間・領収書番号採番（純関数）＋ `defaults.test.ts`。
- `lib/finance/balance.ts` — 残高・合計・累計残高（純関数）＋ `balance.test.ts`。
- `lib/finance/fee.ts` — 手数料行の導出（純関数）＋ `fee.test.ts`。
- `lib/finance/aggregate.ts` — 費目別集計・予算対比・出納帳行・サマリ（純関数）＋ `aggregate.test.ts`。
- `lib/finance/xlsx.ts` — Excelブック組み立て。シート記述の純関数＋ `xlsx.test.ts`、および exceljs を動的importする薄い生成関数。
- `app/(club)/clubfinance/page.tsx` + `FinanceOverviewContent.tsx` + `TransactionModal.tsx`
- `app/(club)/clubfinance/settings/page.tsx` + `FinanceSettingsContent.tsx`
- `app/(club)/clubfinance/budget/page.tsx` + `FinanceBudgetContent.tsx`
- `app/(club)/clubfinance/report/page.tsx` + `FinanceReportContent.tsx`

**変更**
- `lib/types/organizationMember.ts` — `can_manage_finance` を権限型に追加。
- `app/(club)/clubsettings/members/page.tsx` — 招待時の権限に「会計担当」を追加。
- `app/api/emails/invite/route.ts` — 招待作成時に `can_manage_finance` を保存。
- `components/ClubSidebar.tsx` — 「会計・財務」リンク追加。

---

## Task 1: exceljs 依存の追加

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `exceljs` がプロジェクトで import 可能になる。

- [ ] **Step 1: インストール**

Run: `npm install exceljs@^4.4.0`
Expected: `package.json` の dependencies に `"exceljs": "^4.4.0"` が追加され、`package-lock.json` が更新される。

- [ ] **Step 2: 型が解決することを確認**

Run: `npx tsc --noEmit`
Expected: exceljs 由来のエラーが出ない（exceljs は型同梱）。既存のエラーがないこと。

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(finance): xlsx出力のため exceljs を追加"
```

---

## Task 2: マイグレーション 026（スキーマ・RLS・権限・RPC・Storage）

**Files:**
- Create: `supabase/migrations/026_finance_module.sql`

**Interfaces:**
- Produces: テーブル `finance_periods` / `finance_categories` / `finance_projects` / `finance_transactions` / `finance_budgets`、SQL関数 `is_org_member(uuid)` / `can_manage_org_finance(uuid)`、`organization_members.can_manage_finance` / `organization_invitations.can_manage_finance`、Storageバケット `finance-receipts`。

- [ ] **Step 1: マイグレーションSQLを作成**

Create `supabase/migrations/026_finance_module.sql`:

```sql
-- ============================================
-- 026 財務DX（学生団体会計）v1
-- finance_* テーブル / RLS / 権限フラグ / Storage
-- ============================================

-- --------------------------------------------
-- 0. メンバーシップ判定ヘルパ（RLS再帰回避のため SECURITY DEFINER）
-- --------------------------------------------
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS can_manage_finance boolean NOT NULL DEFAULT false;
ALTER TABLE public.organization_invitations
  ADD COLUMN IF NOT EXISTS can_manage_finance boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = p_org AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org_finance(p_org uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = p_org AND m.user_id = auth.uid() AND m.can_manage_finance = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_org_finance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_org_finance(uuid) TO authenticated;

-- --------------------------------------------
-- 1. 会計期間
-- --------------------------------------------
CREATE TABLE public.finance_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  opening_balance integer NOT NULL DEFAULT 0,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------
-- 2. 費目マスタ
-- --------------------------------------------
CREATE TABLE public.finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income','expense')),
  sort_order integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------
-- 3. 事業/イベント/協賛・助成源タグ
-- --------------------------------------------
CREATE TABLE public.finance_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'general' CHECK (kind IN ('event','grant','sponsor','general')),
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------
-- 4. 取引（出納帳の行）
-- --------------------------------------------
CREATE TABLE public.finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.finance_periods(id) ON DELETE CASCADE,
  occurred_on date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income','expense')),
  category_id uuid NOT NULL REFERENCES public.finance_categories(id),
  project_id uuid REFERENCES public.finance_projects(id) ON DELETE SET NULL,
  amount integer NOT NULL CHECK (amount >= 0),
  memo text,
  receipt_path text,
  receipt_no text,
  parent_transaction_id uuid REFERENCES public.finance_transactions(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------
-- 5. 予算
-- --------------------------------------------
CREATE TABLE public.finance_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.finance_periods(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.finance_categories(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('income','expense')),
  planned_amount integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, category_id)
);

-- --------------------------------------------
-- index
-- --------------------------------------------
CREATE INDEX idx_finance_periods_org ON public.finance_periods(organization_id);
CREATE INDEX idx_finance_categories_org ON public.finance_categories(organization_id);
CREATE INDEX idx_finance_projects_org ON public.finance_projects(organization_id);
CREATE INDEX idx_finance_transactions_org_period ON public.finance_transactions(organization_id, period_id);
CREATE INDEX idx_finance_transactions_parent ON public.finance_transactions(parent_transaction_id);
CREATE INDEX idx_finance_budgets_org_period ON public.finance_budgets(organization_id, period_id);

-- --------------------------------------------
-- RLS: SELECT=メンバー, 書き込み=会計担当
-- --------------------------------------------
ALTER TABLE public.finance_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'finance_periods','finance_categories','finance_projects','finance_transactions','finance_budgets'
  ] LOOP
    EXECUTE format($f$
      CREATE POLICY "%1$s_select" ON public.%1$s
        FOR SELECT USING (public.is_org_member(organization_id));
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "%1$s_write" ON public.%1$s
        FOR ALL TO authenticated
        USING (public.can_manage_org_finance(organization_id))
        WITH CHECK (public.can_manage_org_finance(organization_id));
    $f$, t);
  END LOOP;
END $$;

-- --------------------------------------------
-- accept_organization_invitation を can_manage_finance 込みで更新
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.organization_invitations%ROWTYPE;
  uemail text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO inv FROM public.organization_invitations WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = auth.uid();
  IF uemail IS NULL OR lower(trim(uemail)) <> lower(trim(inv.email)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_mismatch');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = inv.organization_id AND user_id = auth.uid()
  ) THEN
    DELETE FROM public.organization_invitations WHERE token = p_token;
    RETURN jsonb_build_object('ok', true, 'already_member', true);
  END IF;

  INSERT INTO public.organization_members (
    organization_id, user_id, role,
    can_edit_profile, can_manage_posts, can_manage_members, can_manage_applications, can_manage_finance
  )
  VALUES (
    inv.organization_id, auth.uid(), inv.role,
    COALESCE(inv.can_edit_profile, false),
    COALESCE(inv.can_manage_posts, true),
    COALESCE(inv.can_manage_members, false),
    COALESCE(inv.can_manage_applications, true),
    COALESCE(inv.can_manage_finance, false)
  );

  DELETE FROM public.organization_invitations WHERE token = p_token;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_organization_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(uuid) TO authenticated;

-- --------------------------------------------
-- Storage: 領収書バケット（非公開）
-- --------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('finance-receipts', 'finance-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "finance_receipts_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'finance-receipts'
         AND public.is_org_member(((storage.foldername(name))[1])::uuid));

CREATE POLICY "finance_receipts_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'finance-receipts'
              AND public.can_manage_org_finance(((storage.foldername(name))[1])::uuid));

CREATE POLICY "finance_receipts_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'finance-receipts'
         AND public.can_manage_org_finance(((storage.foldername(name))[1])::uuid));
```

- [ ] **Step 2: 適用（オーナー承認後）**

MCP `mcp__claude_ai_Supabase__apply_migration`（name: `026_finance_module`, query: 上記SQL）で本番プロジェクトへ適用。**適用前にオーナーへ確認する**。適用後、`mcp__claude_ai_Supabase__get_advisors`（type: security）で新テーブルの RLS 警告が無いことを確認する。

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/026_finance_module.sql
git commit -m "feat(finance): 財務テーブル/RLS/権限/Storageのマイグレーション(026)"
```

---

## Task 3: 権限型と招待UIへの「会計担当」追加

**Files:**
- Modify: `lib/types/organizationMember.ts`
- Modify: `app/(club)/clubsettings/members/page.tsx`
- Modify: `app/api/emails/invite/route.ts`

**Interfaces:**
- Consumes: Task 2 の `organization_invitations.can_manage_finance`。
- Produces: `OrganizationMemberPermissions` に `can_manage_finance: boolean` を含む。招待作成時に `can_manage_finance` が保存される。

- [ ] **Step 1: 権限型に追加**

`lib/types/organizationMember.ts` の `OrganizationMemberPermissions` を更新:

```ts
export type OrganizationMemberPermissions = {
  can_edit_profile: boolean;
  can_manage_posts: boolean;
  can_manage_members: boolean;
  can_manage_applications: boolean;
  can_manage_finance: boolean;
};
```

- [ ] **Step 2: 招待UIにチェックボックスを追加**

`app/(club)/clubsettings/members/page.tsx` を開き、既存の権限チェックボックス群（`can_manage_members` 等を扱っている form state と JSX）に倣って `can_manage_finance` を1項目追加する。ラベルは「会計・財務の管理（会計担当）」。
- form 初期値・送信 payload・チェックボックスJSXの3箇所を、既存 `can_manage_members` と同じ形で複製して `can_manage_finance` にする。

- [ ] **Step 3: 招待API で保存**

`app/api/emails/invite/route.ts` の `organization_invitations` への insert（および受け取る body）に `can_manage_finance` を追加する。既存の `can_manage_members` を参照している箇所すべてに、同じ形で `can_manage_finance` を1つ足す（既定 `false`）。

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし（`can_manage_finance` を参照する全箇所が解決）。

- [ ] **Step 5: Commit**

```bash
git add lib/types/organizationMember.ts "app/(club)/clubsettings/members/page.tsx" app/api/emails/invite/route.ts
git commit -m "feat(finance): 招待に会計担当権限(can_manage_finance)を追加"
```

---

## Task 4: `lib/finance/types.ts`（型定義）

**Files:**
- Create: `lib/finance/types.ts`

**Interfaces:**
- Produces: 下記の型（後続タスク全てが参照）。

- [ ] **Step 1: 型を定義**

Create `lib/finance/types.ts`:

```ts
export type FinanceKind = "income" | "expense";
export type ProjectKind = "event" | "grant" | "sponsor" | "general";

export type FinancePeriod = {
  id: string;
  organization_id: string;
  name: string;
  starts_on: string; // YYYY-MM-DD
  ends_on: string;   // YYYY-MM-DD
  opening_balance: number;
  is_closed: boolean;
};

export type FinanceCategory = {
  id: string;
  organization_id: string;
  name: string;
  kind: FinanceKind;
  sort_order: number;
  is_archived: boolean;
};

export type FinanceProject = {
  id: string;
  organization_id: string;
  name: string;
  kind: ProjectKind;
  is_archived: boolean;
};

export type FinanceTransaction = {
  id: string;
  organization_id: string;
  period_id: string;
  occurred_on: string; // YYYY-MM-DD
  kind: FinanceKind;
  category_id: string;
  project_id: string | null;
  amount: number;
  memo: string | null;
  receipt_path: string | null;
  receipt_no: string | null;
  parent_transaction_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type FinanceBudget = {
  id: string;
  organization_id: string;
  period_id: string;
  category_id: string;
  kind: FinanceKind;
  planned_amount: number;
};
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし。

- [ ] **Step 3: Commit**

```bash
git add lib/finance/types.ts
git commit -m "feat(finance): 財務モジュールの型定義を追加"
```

---

## Task 5: `lib/finance/defaults.ts`（初期費目・既定期間・領収書採番）

**Files:**
- Create: `lib/finance/defaults.ts`
- Test: `lib/finance/defaults.test.ts`

**Interfaces:**
- Consumes: `FinanceKind`, `FinanceTransaction`（types.ts）。
- Produces:
  - `DEFAULT_CATEGORIES: { name: string; kind: FinanceKind }[]`（並び順＝配列順）
  - `defaultPeriodForDate(date: Date): { name: string; starts_on: string; ends_on: string }`（4月始まり年度）
  - `nextReceiptNo(txns: Pick<FinanceTransaction,"receipt_no">[]): string`（既存の数値番号の最大+1、無ければ "1"）

- [ ] **Step 1: 失敗するテストを書く**

Create `lib/finance/defaults.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { DEFAULT_CATEGORIES, defaultPeriodForDate, nextReceiptNo } from "./defaults";

describe("DEFAULT_CATEGORIES", () => {
  it("支払手数料を支出費目に含む", () => {
    const names = DEFAULT_CATEGORIES.filter((c) => c.kind === "expense").map((c) => c.name);
    expect(names).toContain("支払手数料");
  });
  it("収入と支出の両方を持つ", () => {
    expect(DEFAULT_CATEGORIES.some((c) => c.kind === "income")).toBe(true);
    expect(DEFAULT_CATEGORIES.some((c) => c.kind === "expense")).toBe(true);
  });
});

describe("defaultPeriodForDate", () => {
  it("4月以降は当年始まりの年度", () => {
    const p = defaultPeriodForDate(new Date("2026-07-25T00:00:00+09:00"));
    expect(p.name).toBe("2026年度");
    expect(p.starts_on).toBe("2026-04-01");
    expect(p.ends_on).toBe("2027-03-31");
  });
  it("3月以前は前年始まりの年度", () => {
    const p = defaultPeriodForDate(new Date("2026-02-10T00:00:00+09:00"));
    expect(p.name).toBe("2025年度");
    expect(p.starts_on).toBe("2025-04-01");
    expect(p.ends_on).toBe("2026-03-31");
  });
});

describe("nextReceiptNo", () => {
  it("空なら1", () => {
    expect(nextReceiptNo([])).toBe("1");
  });
  it("既存数値の最大+1", () => {
    expect(nextReceiptNo([{ receipt_no: "3" }, { receipt_no: "7" }, { receipt_no: null }])).toBe("8");
  });
  it("数値でない番号は無視", () => {
    expect(nextReceiptNo([{ receipt_no: "A-1" }, { receipt_no: "2" }])).toBe("3");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run lib/finance/defaults.test.ts`
Expected: FAIL（`defaults.ts` が無い）。

- [ ] **Step 3: 実装**

Create `lib/finance/defaults.ts`:

```ts
import type { FinanceKind, FinanceTransaction } from "./types";

export const DEFAULT_CATEGORIES: { name: string; kind: FinanceKind }[] = [
  { name: "部費・会費", kind: "income" },
  { name: "協賛金", kind: "income" },
  { name: "助成金・補助金", kind: "income" },
  { name: "イベント収入", kind: "income" },
  { name: "その他収入", kind: "income" },
  { name: "備品・消耗品費", kind: "expense" },
  { name: "会場費", kind: "expense" },
  { name: "印刷・広報費", kind: "expense" },
  { name: "交通費", kind: "expense" },
  { name: "飲食・交流費", kind: "expense" },
  { name: "通信費", kind: "expense" },
  { name: "謝礼・報酬", kind: "expense" },
  { name: "支払手数料", kind: "expense" },
  { name: "その他支出", kind: "expense" },
];

/** 支払手数料の費目名（手数料行の自動生成で参照） */
export const FEE_CATEGORY_NAME = "支払手数料";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 4月始まりの会計年度を返す */
export function defaultPeriodForDate(date: Date): {
  name: string;
  starts_on: string;
  ends_on: string;
} {
  const y = date.getFullYear();
  const m = date.getMonth() + 1; // 1-12
  const startYear = m >= 4 ? y : y - 1;
  return {
    name: `${startYear}年度`,
    starts_on: `${startYear}-04-01`,
    ends_on: `${startYear + 1}-03-31`,
  };
}

/** 既存取引の数値領収書番号の最大+1（無ければ "1"） */
export function nextReceiptNo(
  txns: Pick<FinanceTransaction, "receipt_no">[]
): string {
  let max = 0;
  for (const t of txns) {
    const n = Number(t.receipt_no);
    if (t.receipt_no != null && Number.isInteger(n) && n > max) max = n;
  }
  return String(max + 1);
}
```

（`pad2` は将来の日付整形用に用意。未使用警告が出る場合は `defaultPeriodForDate` 内の月日整形に使うか、この行を削除してよい。）

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run lib/finance/defaults.test.ts`
Expected: PASS（全ケース）。

- [ ] **Step 5: Commit**

```bash
git add lib/finance/defaults.ts lib/finance/defaults.test.ts
git commit -m "feat(finance): 初期費目・既定年度・領収書採番の純関数"
```

---

## Task 6: `lib/finance/balance.ts`（残高・合計・累計）

**Files:**
- Create: `lib/finance/balance.ts`
- Test: `lib/finance/balance.test.ts`

**Interfaces:**
- Consumes: `FinanceKind`, `FinanceTransaction`。
- Produces:
  - `sumByKind(txns, kind: FinanceKind): number`
  - `currentBalance(openingBalance: number, txns): number`
  - `sortForLedger(txns): FinanceTransaction[]`（occurred_on 昇順→created_at 昇順）
  - `withRunningBalance(openingBalance, txns): (FinanceTransaction & { running_balance: number })[]`

- [ ] **Step 1: 失敗するテストを書く**

Create `lib/finance/balance.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sumByKind, currentBalance, withRunningBalance } from "./balance";
import type { FinanceTransaction } from "./types";

function tx(p: Partial<FinanceTransaction>): FinanceTransaction {
  return {
    id: "x", organization_id: "o", period_id: "p",
    occurred_on: "2026-05-01", kind: "expense", category_id: "c",
    project_id: null, amount: 0, memo: null, receipt_path: null,
    receipt_no: null, parent_transaction_id: null, created_by: null,
    created_at: "2026-05-01T00:00:00Z", ...p,
  };
}

describe("sumByKind", () => {
  it("種別ごとに合計", () => {
    const list = [tx({ kind: "income", amount: 1000 }), tx({ kind: "expense", amount: 300 }), tx({ kind: "income", amount: 500 })];
    expect(sumByKind(list, "income")).toBe(1500);
    expect(sumByKind(list, "expense")).toBe(300);
  });
});

describe("currentBalance", () => {
  it("期首+収入-支出", () => {
    const list = [tx({ kind: "income", amount: 1000 }), tx({ kind: "expense", amount: 300 })];
    expect(currentBalance(2000, list)).toBe(2700);
  });
});

describe("withRunningBalance", () => {
  it("日付順に累計残高を付与", () => {
    const list = [
      tx({ id: "b", occurred_on: "2026-05-02", kind: "expense", amount: 200, created_at: "2026-05-02T00:00:00Z" }),
      tx({ id: "a", occurred_on: "2026-05-01", kind: "income", amount: 1000, created_at: "2026-05-01T00:00:00Z" }),
    ];
    const out = withRunningBalance(0, list);
    expect(out.map((r) => r.id)).toEqual(["a", "b"]);
    expect(out[0].running_balance).toBe(1000);
    expect(out[1].running_balance).toBe(800);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run lib/finance/balance.test.ts`
Expected: FAIL。

- [ ] **Step 3: 実装**

Create `lib/finance/balance.ts`:

```ts
import type { FinanceKind, FinanceTransaction } from "./types";

export function sumByKind(txns: FinanceTransaction[], kind: FinanceKind): number {
  return txns.reduce((acc, t) => (t.kind === kind ? acc + t.amount : acc), 0);
}

export function currentBalance(openingBalance: number, txns: FinanceTransaction[]): number {
  return openingBalance + sumByKind(txns, "income") - sumByKind(txns, "expense");
}

export function sortForLedger(txns: FinanceTransaction[]): FinanceTransaction[] {
  return [...txns].sort((a, b) => {
    if (a.occurred_on !== b.occurred_on) return a.occurred_on < b.occurred_on ? -1 : 1;
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function withRunningBalance(
  openingBalance: number,
  txns: FinanceTransaction[]
): (FinanceTransaction & { running_balance: number })[] {
  let bal = openingBalance;
  return sortForLedger(txns).map((t) => {
    bal += t.kind === "income" ? t.amount : -t.amount;
    return { ...t, running_balance: bal };
  });
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run lib/finance/balance.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/finance/balance.ts lib/finance/balance.test.ts
git commit -m "feat(finance): 残高・合計・累計残高の純関数"
```

---

## Task 7: `lib/finance/fee.ts`（手数料行の導出）

**Files:**
- Create: `lib/finance/fee.ts`
- Test: `lib/finance/fee.test.ts`

**Interfaces:**
- Consumes: `FinanceProject`, `FinanceKind`。
- Produces:
  - `type NewTxnPayload`（DB insert 用の1行ぶんのペイロード：`organization_id, period_id, occurred_on, kind, category_id, project_id, amount, memo, receipt_no, parent_transaction_id`）
  - `buildFeePayload(base, feeCategoryId, feeAmount, parentId): NewTxnPayload | null`（`feeAmount<=0` なら null）

- [ ] **Step 1: 失敗するテストを書く**

Create `lib/finance/fee.test.ts`:

```ts
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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run lib/finance/fee.test.ts`
Expected: FAIL。

- [ ] **Step 3: 実装**

Create `lib/finance/fee.ts`:

```ts
import type { FinanceKind } from "./types";

export type NewTxnPayload = {
  organization_id: string;
  period_id: string;
  occurred_on: string;
  kind: FinanceKind;
  category_id: string;
  project_id: string | null;
  amount: number;
  memo: string | null;
  receipt_no: string | null;
  parent_transaction_id: string | null;
};

/**
 * 本体取引から手数料行（支払手数料の支出）を導出する。
 * 手数料は本体の日付・事業タグを継承し、常に expense。領収書番号は持たない。
 */
export function buildFeePayload(
  base: NewTxnPayload,
  feeCategoryId: string,
  feeAmount: number,
  parentId: string
): NewTxnPayload | null {
  if (!Number.isFinite(feeAmount) || feeAmount <= 0) return null;
  return {
    organization_id: base.organization_id,
    period_id: base.period_id,
    occurred_on: base.occurred_on,
    kind: "expense",
    category_id: feeCategoryId,
    project_id: base.project_id,
    amount: Math.round(feeAmount),
    memo: base.memo ? `${base.memo}（振込手数料）` : "振込手数料",
    receipt_no: null,
    parent_transaction_id: parentId,
  };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run lib/finance/fee.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/finance/fee.ts lib/finance/fee.test.ts
git commit -m "feat(finance): 手数料行を本体取引から導出する純関数"
```

---

## Task 8: `lib/finance/aggregate.ts`（費目別集計・予算対比・出納帳行・サマリ）

**Files:**
- Create: `lib/finance/aggregate.ts`
- Test: `lib/finance/aggregate.test.ts`

**Interfaces:**
- Consumes: `FinanceCategory`, `FinanceProject`, `FinanceTransaction`, `FinanceBudget`, `FinanceKind`。`balance.ts` の `sumByKind` / `withRunningBalance`。
- Produces:
  - `type CategoryAggregate = { category_id; category_name; kind; planned; actual; diff }`（`diff = planned - actual`）
  - `aggregateByCategory(categories, txns, budgets): CategoryAggregate[]`（categories の並び順を維持、archived 含む場合も実績があれば出す）
  - `type FinancialSummary = { incomeTotal; expenseTotal; openingBalance; closingBalance }`
  - `summarize(openingBalance, txns): FinancialSummary`
  - `type LedgerRow = { id; occurred_on; kindLabel; category_name; project_name; memo; income; expense; running_balance; receipt_no }`
  - `buildLedgerRows(openingBalance, txns, categories, projects): LedgerRow[]`

- [ ] **Step 1: 失敗するテストを書く**

Create `lib/finance/aggregate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { aggregateByCategory, summarize, buildLedgerRows } from "./aggregate";
import type { FinanceCategory, FinanceProject, FinanceTransaction, FinanceBudget } from "./types";

const cats: FinanceCategory[] = [
  { id: "c1", organization_id: "o", name: "協賛金", kind: "income", sort_order: 0, is_archived: false },
  { id: "c2", organization_id: "o", name: "会場費", kind: "expense", sort_order: 1, is_archived: false },
];
const projs: FinanceProject[] = [
  { id: "p1", organization_id: "o", name: "夏合宿", kind: "event", is_archived: false },
];
function tx(p: Partial<FinanceTransaction>): FinanceTransaction {
  return {
    id: "x", organization_id: "o", period_id: "per",
    occurred_on: "2026-05-01", kind: "expense", category_id: "c2",
    project_id: null, amount: 0, memo: null, receipt_path: null,
    receipt_no: null, parent_transaction_id: null, created_by: null,
    created_at: "2026-05-01T00:00:00Z", ...p,
  };
}

describe("aggregateByCategory", () => {
  it("費目別に実績と予算差を出す", () => {
    const txns = [tx({ category_id: "c1", kind: "income", amount: 10000 }), tx({ category_id: "c2", kind: "expense", amount: 3000 })];
    const budgets: FinanceBudget[] = [
      { id: "b1", organization_id: "o", period_id: "per", category_id: "c2", kind: "expense", planned_amount: 5000 },
    ];
    const agg = aggregateByCategory(cats, txns, budgets);
    const venue = agg.find((a) => a.category_id === "c2")!;
    expect(venue.actual).toBe(3000);
    expect(venue.planned).toBe(5000);
    expect(venue.diff).toBe(2000); // planned - actual
    const spon = agg.find((a) => a.category_id === "c1")!;
    expect(spon.actual).toBe(10000);
    expect(spon.planned).toBe(0);
  });
});

describe("summarize", () => {
  it("収支と期末残高", () => {
    const txns = [tx({ kind: "income", amount: 10000 }), tx({ kind: "expense", amount: 3000 })];
    const s = summarize(2000, txns);
    expect(s.incomeTotal).toBe(10000);
    expect(s.expenseTotal).toBe(3000);
    expect(s.openingBalance).toBe(2000);
    expect(s.closingBalance).toBe(9000);
  });
});

describe("buildLedgerRows", () => {
  it("収入/支出を分けて費目名・事業名・累計残高を付ける", () => {
    const txns = [
      tx({ id: "a", occurred_on: "2026-05-01", category_id: "c1", kind: "income", amount: 10000, project_id: "p1", receipt_no: "1" }),
      tx({ id: "b", occurred_on: "2026-05-02", category_id: "c2", kind: "expense", amount: 3000 }),
    ];
    const rows = buildLedgerRows(0, txns, cats, projs);
    expect(rows[0]).toMatchObject({ id: "a", category_name: "協賛金", project_name: "夏合宿", income: 10000, expense: 0, running_balance: 10000, receipt_no: "1" });
    expect(rows[1]).toMatchObject({ id: "b", category_name: "会場費", project_name: "", income: 0, expense: 3000, running_balance: 7000 });
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run lib/finance/aggregate.test.ts`
Expected: FAIL。

- [ ] **Step 3: 実装**

Create `lib/finance/aggregate.ts`:

```ts
import type {
  FinanceBudget, FinanceCategory, FinanceProject, FinanceTransaction,
} from "./types";
import { sumByKind, withRunningBalance } from "./balance";

export type CategoryAggregate = {
  category_id: string;
  category_name: string;
  kind: "income" | "expense";
  planned: number;
  actual: number;
  diff: number; // planned - actual
};

export function aggregateByCategory(
  categories: FinanceCategory[],
  txns: FinanceTransaction[],
  budgets: FinanceBudget[]
): CategoryAggregate[] {
  const actualByCat = new Map<string, number>();
  for (const t of txns) {
    actualByCat.set(t.category_id, (actualByCat.get(t.category_id) ?? 0) + t.amount);
  }
  const plannedByCat = new Map<string, number>();
  for (const b of budgets) {
    plannedByCat.set(b.category_id, b.planned_amount);
  }
  return categories.map((c) => {
    const actual = actualByCat.get(c.id) ?? 0;
    const planned = plannedByCat.get(c.id) ?? 0;
    return {
      category_id: c.id,
      category_name: c.name,
      kind: c.kind,
      planned,
      actual,
      diff: planned - actual,
    };
  });
}

export type FinancialSummary = {
  incomeTotal: number;
  expenseTotal: number;
  openingBalance: number;
  closingBalance: number;
};

export function summarize(
  openingBalance: number,
  txns: FinanceTransaction[]
): FinancialSummary {
  const incomeTotal = sumByKind(txns, "income");
  const expenseTotal = sumByKind(txns, "expense");
  return {
    incomeTotal,
    expenseTotal,
    openingBalance,
    closingBalance: openingBalance + incomeTotal - expenseTotal,
  };
}

export type LedgerRow = {
  id: string;
  occurred_on: string;
  kindLabel: string;
  category_name: string;
  project_name: string;
  memo: string;
  income: number;
  expense: number;
  running_balance: number;
  receipt_no: string;
};

export function buildLedgerRows(
  openingBalance: number,
  txns: FinanceTransaction[],
  categories: FinanceCategory[],
  projects: FinanceProject[]
): LedgerRow[] {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const projName = new Map(projects.map((p) => [p.id, p.name]));
  return withRunningBalance(openingBalance, txns).map((t) => ({
    id: t.id,
    occurred_on: t.occurred_on,
    kindLabel: t.kind === "income" ? "収入" : "支出",
    category_name: catName.get(t.category_id) ?? "",
    project_name: t.project_id ? projName.get(t.project_id) ?? "" : "",
    memo: t.memo ?? "",
    income: t.kind === "income" ? t.amount : 0,
    expense: t.kind === "expense" ? t.amount : 0,
    running_balance: t.running_balance,
    receipt_no: t.receipt_no ?? "",
  }));
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run lib/finance/aggregate.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/finance/aggregate.ts lib/finance/aggregate.test.ts
git commit -m "feat(finance): 費目別集計・予算対比・出納帳行・サマリの純関数"
```

---

## Task 9: `lib/finance/xlsx.ts`（Excelブック組み立て）

**Files:**
- Create: `lib/finance/xlsx.ts`
- Test: `lib/finance/xlsx.test.ts`

**Interfaces:**
- Consumes: `CategoryAggregate`, `FinancialSummary`, `LedgerRow`（aggregate.ts）, `FinancePeriod`（types.ts）。
- Produces:
  - `type FinanceReportData = { orgName; period; summary; incomeRows; expenseRows; ledgerRows }`
  - `buildReportSheetModel(data): { reportSheet: (string|number)[][]; ledgerSheet: (string|number)[][] }`（純関数・テスト対象。2シートを2次元配列で表現）
  - `buildFinanceWorkbookBlob(data): Promise<Blob>`（`exceljs` を動的importして整形済みブックを返す。単体テスト対象外）
  - `reportFileName(orgName, period): string`

- [ ] **Step 1: 失敗するテストを書く（シートモデルの純関数のみ）**

Create `lib/finance/xlsx.test.ts`:

```ts
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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run lib/finance/xlsx.test.ts`
Expected: FAIL。

- [ ] **Step 3: 実装**

Create `lib/finance/xlsx.ts`:

```ts
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
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run lib/finance/xlsx.test.ts`
Expected: PASS（純関数のみ検証。`buildFinanceWorkbookBlob` は Task 13 の実ブラウザ動作で確認）。

- [ ] **Step 5: Commit**

```bash
git add lib/finance/xlsx.ts lib/finance/xlsx.test.ts
git commit -m "feat(finance): Excel収支報告書・出納帳の生成(exceljs)"
```

---

## Task 10: サイドバー導線 ＋ 出納帳ページ（取引記録の主戦場）

**Files:**
- Modify: `components/ClubSidebar.tsx`
- Create: `app/(club)/clubfinance/page.tsx`
- Create: `app/(club)/clubfinance/FinanceOverviewContent.tsx`
- Create: `app/(club)/clubfinance/TransactionModal.tsx`

**Interfaces:**
- Consumes: `useClubOrganization()`（`activeOrgId`, `activeOrgName`, `withOrgQuery`, `loading`, `hasNoMemberships`, `isReady`）、`supabase`、`lib/finance/*`。
- Produces: `/clubfinance` 画面。取引の作成（手数料行自動生成込み）・編集・削除・領収書アップロード。他ページはこの画面のブートストラップ（期間/費目の自動生成）に依存する。

**共通のブートストラップ規約（このタスクで実装し、他ページは読むだけ）:**
- 初回ロードで `finance_periods` を取得。0件かつ会計担当なら `defaultPeriodForDate(new Date())` で1件作成。
- `finance_categories` を取得。0件かつ会計担当なら `DEFAULT_CATEGORIES` を `sort_order = index` で一括 insert。
- 会計担当でなく、かつ期間/費目が未作成の場合は「会計担当が初期設定を行ってください」を表示。

- [ ] **Step 1: サイドバーにリンク追加**

`components/ClubSidebar.tsx`:
- import に `Wallet` を追加：`import { ..., Star, Wallet, LogOut } from "lucide-react";`
- 「タスク管理」リンクの直後に以下を挿入：

```tsx
<Link className={linkClass("/clubfinance", true)} href={withOrgQuery("/clubfinance")}>
  <Wallet className="w-6 h-6" aria-hidden="true" />
  <span className="text-sm font-medium">会計・財務</span>
</Link>
```

- [ ] **Step 2: サーバページ**

Create `app/(club)/clubfinance/page.tsx`:

```tsx
import FinanceOverviewContent from "./FinanceOverviewContent";

export default function ClubFinancePage() {
  return <FinanceOverviewContent />;
}
```

- [ ] **Step 3: 取引モーダル**

Create `app/(club)/clubfinance/TransactionModal.tsx`. 責務は「1取引の入力フォーム（区分・費目・事業・日付・金額・摘要・振込手数料・領収書ファイル）」。保存処理は親から渡される `onSubmit` に委譲する。

```tsx
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
  open, editing, categories, projects, defaultReceiptNo, saving, onClose, onSubmit,
}: {
  open: boolean;
  editing: FinanceTransaction | null;
  categories: FinanceCategory[];
  projects: FinanceProject[];
  defaultReceiptNo: string;
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
        fee: "",
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
  }, [open, editing, defaultReceiptNo]);

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
```

- [ ] **Step 4: 出納帳本体**

Create `app/(club)/clubfinance/FinanceOverviewContent.tsx`. 責務：ブートストラップ、残高サマリ、取引一覧、モーダル経由のCRUD。supabase 呼び出しは clubtasks と同じ流儀。

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Paperclip } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";
import type { FinanceCategory, FinancePeriod, FinanceProject, FinanceTransaction } from "@/lib/finance/types";
import { DEFAULT_CATEGORIES, FEE_CATEGORY_NAME, defaultPeriodForDate, nextReceiptNo } from "@/lib/finance/defaults";
import { currentBalance, sumByKind, sortForLedger } from "@/lib/finance/balance";
import { buildFeePayload, type NewTxnPayload } from "@/lib/finance/fee";
import TransactionModal, { type TxnSubmit } from "./TransactionModal";

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default function FinanceOverviewContent() {
  const { loading: ctxLoading, activeOrgId: orgId, activeOrgName: orgName, hasNoMemberships, isReady } = useClubOrganization();

  const [canManage, setCanManage] = useState(false);
  const [period, setPeriod] = useState<FinancePeriod | null>(null);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [projects, setProjects] = useState<FinanceProject[]>([]);
  const [txns, setTxns] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceTransaction | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

    // 権限
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id ?? null;
    let manage = false;
    if (uid) {
      const { data: mem } = await supabase.from("organization_members")
        .select("can_manage_finance").eq("organization_id", orgId).eq("user_id", uid).maybeSingle();
      manage = !!(mem as { can_manage_finance?: boolean } | null)?.can_manage_finance;
    }
    setCanManage(manage);

    // 期間（無ければ会計担当が作成）
    let { data: periods } = await supabase.from("finance_periods")
      .select("*").eq("organization_id", orgId).order("starts_on", { ascending: false });
    if ((!periods || periods.length === 0) && manage) {
      const def = defaultPeriodForDate(new Date());
      const { data: created, error } = await supabase.from("finance_periods")
        .insert({ organization_id: orgId, ...def, opening_balance: 0 }).select("*").single();
      if (error) { toast.error("会計期間の作成に失敗しました"); }
      periods = created ? [created] : [];
    }
    const activePeriod = (periods?.[0] as FinancePeriod) ?? null;
    setPeriod(activePeriod);

    // 費目（無ければ会計担当が初期投入）
    let { data: cats } = await supabase.from("finance_categories")
      .select("*").eq("organization_id", orgId).order("sort_order", { ascending: true });
    if ((!cats || cats.length === 0) && manage) {
      const rows = DEFAULT_CATEGORIES.map((c, i) => ({ organization_id: orgId, name: c.name, kind: c.kind, sort_order: i }));
      const { data: inserted } = await supabase.from("finance_categories").insert(rows).select("*");
      cats = inserted ?? [];
    }
    setCategories((cats as FinanceCategory[]) ?? []);

    const { data: projs } = await supabase.from("finance_projects")
      .select("*").eq("organization_id", orgId).order("created_at", { ascending: true });
    setProjects((projs as FinanceProject[]) ?? []);

    if (activePeriod) {
      const { data: tx } = await supabase.from("finance_transactions")
        .select("*").eq("organization_id", orgId).eq("period_id", activePeriod.id);
      setTxns((tx as FinanceTransaction[]) ?? []);
    } else {
      setTxns([]);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => { if (orgId) load(); }, [orgId, load]);

  const ledger = useMemo(() => sortForLedger(txns), [txns]);
  const balance = period ? currentBalance(period.opening_balance, txns) : 0;
  const feeCategory = categories.find((c) => c.kind === "expense" && c.name === FEE_CATEGORY_NAME) ?? null;

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (t: FinanceTransaction) => { setEditing(t); setModalOpen(true); };

  const handleSubmit = async ({ values, file }: TxnSubmit) => {
    if (!orgId || !period) return;
    const amount = Math.round(Number(values.amount));
    if (!values.category_id || !Number.isFinite(amount) || amount < 0) {
      toast.error("費目と金額を正しく入力してください");
      return;
    }
    setSaving(true);
    try {
      const base: NewTxnPayload = {
        organization_id: orgId, period_id: period.id, occurred_on: values.occurred_on,
        kind: values.kind, category_id: values.category_id,
        project_id: values.project_id || null, amount, memo: values.memo.trim() || null,
        receipt_no: values.receipt_no.trim() || null, parent_transaction_id: null,
      };

      let txnId: string;
      if (editing) {
        const { error } = await supabase.from("finance_transactions")
          .update({ ...base, updated_at: new Date().toISOString() }).eq("id", editing.id);
        if (error) throw error;
        txnId = editing.id;
      } else {
        const { data, error } = await supabase.from("finance_transactions").insert(base).select("id").single();
        if (error) throw error;
        txnId = (data as { id: string }).id;
      }

      // 領収書アップロード
      if (file) {
        const path = `${orgId}/${txnId}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from("finance-receipts").upload(path, file, { upsert: true });
        if (upErr) { toast.error("領収書の保存に失敗しました"); }
        else { await supabase.from("finance_transactions").update({ receipt_path: path }).eq("id", txnId); }
      }

      // 手数料行（新規時のみ・支出のみ）
      const feeAmount = Math.round(Number(values.fee));
      if (!editing && values.kind === "expense" && feeAmount > 0) {
        if (!feeCategory) { toast.error("『支払手数料』費目が見つかりません（設定で追加してください）"); }
        else {
          const feePayload = buildFeePayload(base, feeCategory.id, feeAmount, txnId);
          if (feePayload) {
            const { error: feeErr } = await supabase.from("finance_transactions").insert(feePayload);
            if (feeErr) throw feeErr;
          }
        }
      }

      toast.success(editing ? "取引を更新しました" : "取引を追加しました");
      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: FinanceTransaction) => {
    // 子（手数料行）は ON DELETE CASCADE。親のみ削除でよい。
    const { error } = await supabase.from("finance_transactions").delete().eq("id", t.id);
    if (error) { toast.error("削除に失敗しました"); return; }
    toast.success("削除しました");
    await load();
  };

  if (ctxLoading || loading) {
    return <div className="p-6 md:p-10"><p className="text-graphite/70 py-20 text-center">読み込み中...</p></div>;
  }
  if (hasNoMemberships || !isReady || !orgId) {
    return (
      <div className="p-6 md:p-10">
        <div className="rounded-lg border border-rule border-l-4 border-l-seal bg-mist p-6 text-center">
          <p className="text-ink font-medium">管理できる団体がありません</p>
        </div>
      </div>
    );
  }
  if (!period) {
    return (
      <div className="p-6 md:p-10">
        <div className="rounded-lg border border-rule bg-mist p-6 text-center">
          <p className="text-ink font-medium">会計はまだ初期設定されていません</p>
          <p className="text-graphite text-sm mt-1">会計担当が最初にアクセスすると自動で初期設定されます。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink font-mincho">会計・財務</h1>
          <p className="text-graphite text-sm mt-1">{orgName}・{period.name}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/clubfinance/report?orgId=${orgId}`}><Button variant="outlineMuted">集計・Excel出力</Button></Link>
          {canManage && (
            <Button variant="primary" onClick={openNew} className="inline-flex items-center gap-2">
              <Plus className="w-5 h-5" aria-hidden="true" />取引を追加
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-rule bg-paper p-4">
          <p className="text-xs text-graphite">現在残高</p>
          <p className="text-2xl font-bold text-ink font-numeric tabular-nums">{yen(balance)}</p>
        </div>
        <div className="rounded-xl border border-rule bg-paper p-4">
          <p className="text-xs text-graphite">当期収入計</p>
          <p className="text-2xl font-bold text-ink font-numeric tabular-nums">{yen(sumByKind(txns, "income"))}</p>
        </div>
        <div className="rounded-xl border border-rule bg-paper p-4">
          <p className="text-xs text-graphite">当期支出計</p>
          <p className="text-2xl font-bold text-ink font-numeric tabular-nums">{yen(sumByKind(txns, "expense"))}</p>
        </div>
      </div>

      {ledger.length === 0 ? (
        <div className="rounded-lg border border-rule bg-mist p-6 text-center text-graphite">まだ取引がありません。</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-rule bg-paper">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-mist text-graphite">
              <tr>
                <th className="text-left px-3 py-2">日付</th>
                <th className="text-left px-3 py-2">費目</th>
                <th className="text-left px-3 py-2">事業</th>
                <th className="text-left px-3 py-2">摘要</th>
                <th className="text-right px-3 py-2">収入</th>
                <th className="text-right px-3 py-2">支出</th>
                <th className="px-3 py-2"></th>
                {canManage && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {ledger.map((t) => {
                const cat = categories.find((c) => c.id === t.category_id);
                const proj = projects.find((p) => p.id === t.project_id);
                return (
                  <tr key={t.id} className="border-t border-rule">
                    <td className="px-3 py-2 font-numeric tabular-nums">{t.occurred_on}</td>
                    <td className="px-3 py-2">{cat?.name ?? ""}{t.parent_transaction_id && <span className="text-xs text-graphite/60">（手数料）</span>}</td>
                    <td className="px-3 py-2">{proj?.name ?? ""}</td>
                    <td className="px-3 py-2">{t.memo ?? ""}</td>
                    <td className="px-3 py-2 text-right font-numeric tabular-nums">{t.kind === "income" ? yen(t.amount) : ""}</td>
                    <td className="px-3 py-2 text-right font-numeric tabular-nums">{t.kind === "expense" ? yen(t.amount) : ""}</td>
                    <td className="px-3 py-2 text-center">{t.receipt_path && <Paperclip className="w-4 h-4 inline text-graphite/70" aria-label="領収書あり" />}</td>
                    {canManage && (
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {!t.parent_transaction_id && <button className="text-xs text-ink underline mr-2" onClick={() => openEdit(t)}>編集</button>}
                        <button className="text-xs text-seal underline" onClick={() => handleDelete(t)}>削除</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (
        <TransactionModal
          open={modalOpen}
          editing={editing}
          categories={categories}
          projects={projects}
          defaultReceiptNo={nextReceiptNo(txns)}
          saving={saving}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: 型・Lint チェック**

Run: `npx tsc --noEmit && npm run lint`
Expected: 新規ファイルにエラーなし。

- [ ] **Step 6: 動作確認（会計担当ユーザーで）**

`npm run dev` → `/clubfinance` を開く。会計担当なら：初回に費目・期間が自動作成される／「取引を追加」で支出＋手数料を入れると出納帳に2行（本体＋手数料）が出て、現在残高が手数料込みで減る／領収書写真を添付するとクリップアイコンが出る。会計担当でないユーザーでは「取引を追加」ボタンが出ず閲覧のみになる。

- [ ] **Step 7: Commit**

```bash
git add components/ClubSidebar.tsx "app/(club)/clubfinance/page.tsx" "app/(club)/clubfinance/FinanceOverviewContent.tsx" "app/(club)/clubfinance/TransactionModal.tsx"
git commit -m "feat(finance): 会計・財務の出納帳ページ(記録/手数料/領収書)"
```

---

## Task 11: 設定ページ（費目・事業・会計期間の管理）

**Files:**
- Create: `app/(club)/clubfinance/settings/page.tsx`
- Create: `app/(club)/clubfinance/FinanceSettingsContent.tsx`

**Interfaces:**
- Consumes: `supabase`、`useClubOrganization()`、`FinanceCategory`/`FinanceProject`/`FinancePeriod`。
- Produces: `/clubfinance/settings`。費目の追加/改名/アーカイブ、事業タグの追加/アーカイブ、期間の期首残高(繰越金)編集。

- [ ] **Step 1: サーバページ**

Create `app/(club)/clubfinance/settings/page.tsx`:

```tsx
import FinanceSettingsContent from "../FinanceSettingsContent";

export default function ClubFinanceSettingsPage() {
  return <FinanceSettingsContent />;
}
```

- [ ] **Step 2: 設定本体**

Create `app/(club)/clubfinance/FinanceSettingsContent.tsx`. 権限が無い場合は閲覧のみ（追加/編集ボタンを出さない）。費目は `kind` ごとにリスト表示し、`name` のインライン編集・`is_archived` トグル・新規追加を行う。事業タグは `name` と `kind`(event/grant/sponsor/general) を持つ追加フォーム。期間は `opening_balance`(繰越金) と `name` を編集。

実装要点（clubtasks の supabase 流儀を踏襲）:
- 読み込み：`finance_categories`(sort_order昇順) / `finance_projects`(created_at昇順) / `finance_periods`(starts_on降順) を `organization_id` で取得。権限は Task 10 と同じ `organization_members.can_manage_finance` を取得。
- 費目追加：`insert({ organization_id, name, kind, sort_order: <現在の最大+1> })` → 再読込。
- 費目改名：`update({ name }).eq("id", ...)`。
- 費目アーカイブ切替：`update({ is_archived: !cur })`。
- 事業追加：`insert({ organization_id, name, kind })`。
- 事業アーカイブ切替：`update({ is_archived: !cur })`。
- 期間更新：`update({ opening_balance: <整数>, name }).eq("id", ...)`。
- すべて成功/失敗を `toast` で通知。
- UI は Task 10 と同じトークン（`border-rule`, `bg-paper`, `text-ink`, `Button`, `Input`）。見出しは `font-mincho`。ページ上部に `/clubfinance` へ戻るリンク。

（費目の並び順ドラッグ替えは v1 対象外。追加順＝末尾でよい。）

- [ ] **Step 3: 型・Lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: エラーなし。

- [ ] **Step 4: 動作確認**

`/clubfinance/settings` で費目を1つ追加→出納帳モーダルの費目一覧に出る。期首残高（繰越金）を設定→`/clubfinance` の現在残高に反映される。事業タグを追加→取引モーダルの事業選択に出る。

- [ ] **Step 5: Commit**

```bash
git add "app/(club)/clubfinance/settings/page.tsx" "app/(club)/clubfinance/FinanceSettingsContent.tsx"
git commit -m "feat(finance): 費目・事業タグ・期首残高の設定ページ"
```

---

## Task 12: 予算ページ（費目別予算入力）

**Files:**
- Create: `app/(club)/clubfinance/budget/page.tsx`
- Create: `app/(club)/clubfinance/FinanceBudgetContent.tsx`

**Interfaces:**
- Consumes: `supabase`、`useClubOrganization()`、`FinanceCategory`/`FinancePeriod`/`FinanceBudget`。
- Produces: `/clubfinance/budget`。アクティブ期間について、費目ごとに `planned_amount` を入力保存（`finance_budgets` に upsert）。

- [ ] **Step 1: サーバページ**

Create `app/(club)/clubfinance/budget/page.tsx`:

```tsx
import FinanceBudgetContent from "../FinanceBudgetContent";

export default function ClubFinanceBudgetPage() {
  return <FinanceBudgetContent />;
}
```

- [ ] **Step 2: 予算本体**

Create `app/(club)/clubfinance/FinanceBudgetContent.tsx`. 実装要点：
- 読み込み：アクティブ期間（`finance_periods` starts_on降順の先頭）、費目（`is_archived=false`）、既存予算（`finance_budgets` where period_id）。権限取得は Task 10 と同じ。
- 収入費目・支出費目を分けて表示し、各費目に数値入力（既存予算があれば初期値）。
- 保存：各費目について `finance_budgets` を **upsert**。upsert は `UNIQUE (period_id, category_id)` に依存：
  ```ts
  await supabase.from("finance_budgets").upsert(
    { organization_id: orgId, period_id: periodId, category_id: cat.id, kind: cat.kind, planned_amount: value },
    { onConflict: "period_id,category_id" }
  );
  ```
- 権限が無ければ入力を disabled にして閲覧のみ。
- UI は既存トークン。上部に `/clubfinance` へ戻るリンク。

- [ ] **Step 3: 型・Lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: エラーなし。

- [ ] **Step 4: 動作確認**

`/clubfinance/budget` で会場費に予算5000を入れて保存→ Task 13 のレポートで予算対比に反映される。

- [ ] **Step 5: Commit**

```bash
git add "app/(club)/clubfinance/budget/page.tsx" "app/(club)/clubfinance/FinanceBudgetContent.tsx"
git commit -m "feat(finance): 費目別予算の入力ページ"
```

---

## Task 13: レポートページ（費目別集計＋予算対比＋Excel出力）

**Files:**
- Create: `app/(club)/clubfinance/report/page.tsx`
- Create: `app/(club)/clubfinance/FinanceReportContent.tsx`

**Interfaces:**
- Consumes: `supabase`、`useClubOrganization()`、`lib/finance/aggregate`(`aggregateByCategory`, `summarize`, `buildLedgerRows`)、`lib/finance/xlsx`(`buildFinanceWorkbookBlob`, `reportFileName`, `FinanceReportData`)。
- Produces: `/clubfinance/report`。画面に費目別集計（予算対比）を表示し、「Excelで出力」で .xlsx をダウンロード。

- [ ] **Step 1: サーバページ**

Create `app/(club)/clubfinance/report/page.tsx`:

```tsx
import FinanceReportContent from "../FinanceReportContent";

export default function ClubFinanceReportPage() {
  return <FinanceReportContent />;
}
```

- [ ] **Step 2: レポート本体**

Create `app/(club)/clubfinance/FinanceReportContent.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";
import type { FinanceBudget, FinanceCategory, FinancePeriod, FinanceProject, FinanceTransaction } from "@/lib/finance/types";
import { aggregateByCategory, summarize, buildLedgerRows, type CategoryAggregate } from "@/lib/finance/aggregate";
import { buildFinanceWorkbookBlob, reportFileName, type FinanceReportData } from "@/lib/finance/xlsx";

function yen(n: number): string { return `¥${n.toLocaleString("ja-JP")}`; }

export default function FinanceReportContent() {
  const { loading: ctxLoading, activeOrgId: orgId, activeOrgName: orgName, isReady, hasNoMemberships } = useClubOrganization();
  const [period, setPeriod] = useState<FinancePeriod | null>(null);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [projects, setProjects] = useState<FinanceProject[]>([]);
  const [txns, setTxns] = useState<FinanceTransaction[]>([]);
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data: periods } = await supabase.from("finance_periods")
      .select("*").eq("organization_id", orgId).order("starts_on", { ascending: false });
    const p = (periods?.[0] as FinancePeriod) ?? null;
    setPeriod(p);
    const { data: cats } = await supabase.from("finance_categories")
      .select("*").eq("organization_id", orgId).order("sort_order", { ascending: true });
    setCategories((cats as FinanceCategory[]) ?? []);
    const { data: projs } = await supabase.from("finance_projects").select("*").eq("organization_id", orgId);
    setProjects((projs as FinanceProject[]) ?? []);
    if (p) {
      const { data: tx } = await supabase.from("finance_transactions").select("*").eq("organization_id", orgId).eq("period_id", p.id);
      setTxns((tx as FinanceTransaction[]) ?? []);
      const { data: bd } = await supabase.from("finance_budgets").select("*").eq("organization_id", orgId).eq("period_id", p.id);
      setBudgets((bd as FinanceBudget[]) ?? []);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => { if (orgId) load(); }, [orgId, load]);

  const agg = useMemo(() => aggregateByCategory(categories, txns, budgets), [categories, txns, budgets]);
  const income = agg.filter((a) => a.kind === "income");
  const expense = agg.filter((a) => a.kind === "expense");
  const summary = period ? summarize(period.opening_balance, txns) : null;

  const handleExport = async () => {
    if (!period || !summary) return;
    setExporting(true);
    try {
      const data: FinanceReportData = {
        orgName: orgName ?? "学生団体",
        period,
        summary,
        incomeRows: income,
        expenseRows: expense,
        ledgerRows: buildLedgerRows(period.opening_balance, txns, categories, projects),
      };
      const blob = await buildFinanceWorkbookBlob(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = reportFileName(data.orgName, period.name);
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Excelの生成に失敗しました");
    } finally {
      setExporting(false);
    }
  };

  if (ctxLoading || loading) return <div className="p-6 md:p-10"><p className="text-graphite/70 py-20 text-center">読み込み中...</p></div>;
  if (hasNoMemberships || !isReady || !orgId || !period || !summary) {
    return <div className="p-6 md:p-10"><div className="rounded-lg border border-rule bg-mist p-6 text-center text-graphite">会計データがありません。</div></div>;
  }

  const Table = ({ title, rows, totalLabel, total }: { title: string; rows: CategoryAggregate[]; totalLabel: string; total: number }) => (
    <div className="rounded-xl border border-rule bg-paper overflow-x-auto mb-6">
      <div className="px-4 py-2 bg-mist font-bold text-ink">{title}</div>
      <table className="w-full text-sm min-w-[520px]">
        <thead className="text-graphite">
          <tr>
            <th className="text-left px-3 py-2">費目</th>
            <th className="text-right px-3 py-2">予算</th>
            <th className="text-right px-3 py-2">実績</th>
            <th className="text-right px-3 py-2">差額</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category_id} className="border-t border-rule">
              <td className="px-3 py-2">{r.category_name}</td>
              <td className="px-3 py-2 text-right font-numeric tabular-nums">{yen(r.planned)}</td>
              <td className="px-3 py-2 text-right font-numeric tabular-nums">{yen(r.actual)}</td>
              <td className="px-3 py-2 text-right font-numeric tabular-nums">{yen(r.diff)}</td>
            </tr>
          ))}
          <tr className="border-t border-rule bg-mist font-bold">
            <td className="px-3 py-2">{totalLabel}</td>
            <td></td>
            <td className="px-3 py-2 text-right font-numeric tabular-nums">{yen(total)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink font-mincho">集計・レポート</h1>
          <p className="text-graphite text-sm mt-1">{orgName}・{period.name}</p>
          <Link href={`/clubfinance?orgId=${orgId}`} className="text-sm text-ink underline">← 出納帳に戻る</Link>
        </div>
        <Button variant="primary" onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-2">
          <Download className="w-5 h-5" aria-hidden="true" />{exporting ? "生成中..." : "Excelで出力"}
        </Button>
      </div>

      <Table title="収入の部" rows={income} totalLabel="収入合計" total={summary.incomeTotal} />
      <Table title="支出の部" rows={expense} totalLabel="支出合計" total={summary.expenseTotal} />

      <div className="rounded-xl border border-rule bg-paper p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div><p className="text-xs text-graphite">前期繰越金</p><p className="text-lg font-bold text-ink font-numeric tabular-nums">{yen(summary.openingBalance)}</p></div>
        <div><p className="text-xs text-graphite">当期収入</p><p className="text-lg font-bold text-ink font-numeric tabular-nums">{yen(summary.incomeTotal)}</p></div>
        <div><p className="text-xs text-graphite">当期支出</p><p className="text-lg font-bold text-ink font-numeric tabular-nums">{yen(summary.expenseTotal)}</p></div>
        <div><p className="text-xs text-graphite">期末残高</p><p className="text-lg font-bold text-ink font-numeric tabular-nums">{yen(summary.closingBalance)}</p></div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 型・Lint・全テスト**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: すべて成功（`lib/finance` の全テスト PASS）。

- [ ] **Step 4: 動作確認（Excel出力）**

`/clubfinance/report` で「Excelで出力」→ `.xlsx` がダウンロードされ、Excel/Numbersで開くと「収支報告書」「出納帳」の2シートが罫線・¥書式で整形され、手数料が支払手数料として計上、期末残高が繰越金＋収入−支出で一致することを確認。

- [ ] **Step 5: Commit**

```bash
git add "app/(club)/clubfinance/report/page.tsx" "app/(club)/clubfinance/FinanceReportContent.tsx"
git commit -m "feat(finance): 費目別集計・予算対比・Excel出力のレポートページ"
```

---

## 自己レビュー結果（spec 対応表）

| spec の要件 | 対応タスク |
| --- | --- |
| 取引記録（出納帳） | Task 10 |
| 費目マスタ（デフォルト投入＋編集） | Task 5（既定）/ Task 10（初回投入）/ Task 11（編集） |
| 事業/イベント/協賛・助成源タグ | Task 2（列）/ Task 11（管理）/ Task 10（付与） |
| 予算対比 | Task 8（集計）/ Task 12（入力）/ Task 13（表示・出力） |
| 会計期間・繰越金・期末残高 | Task 2 / Task 5 / Task 10 / Task 11 |
| 残高表示 | Task 6 / Task 10 |
| 振込・出金手数料 | Task 7 / Task 10 |
| 領収書写真（Storage・非公開） | Task 2（バケット/ポリシー）/ Task 10（アップロード） |
| .xlsx エクスポート（罫線・2シート） | Task 1 / Task 9 / Task 13 |
| 会計担当権限・全メンバー閲覧 | Task 2（RLS/列/RPC）/ Task 3（招待UI）/ Task 10-13（UI gating） |
| BS・複数口座・立替・OCR・協賛自動送信は対象外 | 実装せず（Global Constraints に明記） |

**未解決点**：なし。§10（設計書）の未確定3点は本計画で確定済み（年度=4月始まり＝Task 5、領収書番号=期内通し自動サジェスト＝Task 5、exceljs 動的import＝Task 9）。

---

## 実行順の注意

- Task 1→2→3 は基盤（依存・スキーマ・権限）。**Task 2 の適用はオーナー承認が必要**。承認前でも Task 4〜9（`lib/finance` の純関数・テスト）は先行して進められる。
- Task 10〜13 の実ブラウザ確認は Task 2 適用後でないと通らない（テーブル/RLS/バケットが必要）。
