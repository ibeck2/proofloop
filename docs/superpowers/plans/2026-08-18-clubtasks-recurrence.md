# /clubtasks 定期タスク（繰り返し） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/clubtasks`のタスクに「繰り返し」設定（なし／毎週／隔週／毎月）を追加し、タスクが既存のステータスから新たに「完了」へ遷移した時点で、次回分のタスクを1件自動生成する（Todoist方式）。

**Architecture:** 新規テーブルは作らず、既存`tasks`テーブルに`recurrence_rule text`列（CHECK制約で`'weekly' | 'biweekly' | 'monthly' | NULL`のみ許可）を追加する。次回タスクのペイロード計算は`lib/tasks/taskRecurrence.ts`にDBアクセスの無い純粋関数として切り出し、TDDでカバーする。発火箇所は`page.tsx`の`handleSave`（編集モーダルでの保存）と`handleDragEnd`（カンバンでのドラッグ）のうち、旧ステータスが`done`以外→新ステータスが`done`になった瞬間のみ（既存の`shouldNotifyReviewAssigned`等と同じ「遷移」判定パターン）。生成されたタスクへ、元タスクのチェックリスト項目（`task_checklist_items`）を全件`is_done=false`でコピーする。コメント・添付ファイルはコピーしない。

**Tech Stack:** Next.js 15 App Router / TypeScript / Supabase（Postgres・RLS）/ vitest

## Global Constraints
- ロジックは`lib/`に純粋関数として切り出しテストする（CLAUDE.md §5）。UIコンポーネントに計算を埋め込まない。
- デザインは`lib/design/tokens.ts`の6色トークンのみ使用（ink/seal/paper/mist/rule/graphite）。新しい色を足さない。
- 型チェックは`npx tsc --noEmit`を使う（`npm run build`は使わない）。
- 各タスクの最後で`npm test`を実行し、既存テスト＋新規テストがすべて通ることを確認してからコミットする。
- 新規列`recurrence_rule`は既存`tasks`テーブルの`tasks_*_own_org`RLSポリシー（列を見ない、`organization_id`のみで判定）がそのまま適用されるため、新規ポリシーは不要。`tasks`テーブルの列レベルGRANT制限は無いことを確認済み（`pg_attribute.attacl`が既存全列でNULL＝テーブルレベルの標準GRANTのみ）なので、新規列への明示的な`GRANT`も不要。
- CHECK制約の値は既存`tasks_priority_check`・`tasks_status_check`と同じ方針（英語canonical値のみ許可、UIは日本語ラベルに分離）を踏襲する。
- モーダル内に追加するUIは、既存の`<form onSubmit={handleSave}>`の中に置かれる。**`<form>`要素を新たに作らない**（ネストしたformのsubmitイベントが外側のフォームにバブリングし、意図しない保存・モーダルクローズを引き起こすバグが`ChecklistSection`で実際に発生し修正済み。同じ罠を踏まない）。今回追加する繰り返しセレクトボックスは、既存のステータス・優先度セレクトボックスと同じ「外側form内の通常の`<select>`要素」なので、この罠自体には該当しないが、実装者は念のため意識すること。
- 定期タスクの自動生成は、新規タスクのinsert→チェックリストのinsertという複数回のDB書き込みを伴う。UI状態（タスク一覧・チェックリスト件数）の不整合を避けるため、生成処理は`await`で完了を待ってから後続の`loadTasks`/`toast`に進む（fire-and-forgetにしない）。生成に失敗した場合はエラーをtoastで表示するが、**タスクの保存・移動自体は失敗させない**（生成は付随的な処理であり、本体の保存操作を道連れにしない）。
- 新規生成タスクへの`review-assigned`/`assignee-changed`メール通知は、今回は発火させない（設計上は「自然に乗るなら発火してよい」とされているが、生成直後に`notifyTaskChange`を呼ぶには`orgName`等の追加の受け渡しが必要になり、専用の通知種別を作らないという設計方針とスコープが合わないため、明示的にスコープ外とする）。
- 新規タスクを直接「完了」ステータスで作成した場合（新規作成モーダルでステータスを最初から「完了」にして保存するケース）は、今回の自動生成の対象外とする。設計が想定する「完了への遷移」は既存タスクの状態変化であり、新規作成はその意味論に当てはまらないため。
- Supabase本番プロジェクトID：`uhhofjcyotfyrlhaguvy`。マイグレーション適用は`mcp__claude_ai_Supabase__apply_migration`、検証は`mcp__claude_ai_Supabase__execute_sql`を使う。

---

## File Structure

**新規作成：**
- `supabase/migrations/056_tasks_recurrence_rule.sql` — `tasks`への列追加＋CHECK制約
- `lib/tasks/taskRecurrence.ts` — 次回タスク生成の純粋関数
- `lib/tasks/taskRecurrence.test.ts` — 上記のテスト

**変更：**
- `lib/types/task.ts` — `TaskRow`に`recurrence_rule`フィールドを追加
- `lib/tasks/taskFormatting.ts`（+テスト）— `recurrenceLabel`関数を追加（カンバンカードの繰り返しバッジ用）
- `app/(club)/clubtasks/page.tsx` — フォームに繰り返しセレクトボックスを追加、`loadTasks`のselect列を拡張、`handleSave`/`handleDragEnd`での生成トリガー呼び出し
- `app/(club)/clubtasks/TaskCardBody.tsx` — カンバンカードに繰り返しバッジを表示

---

### Task 1: マイグレーション（列追加・CHECK制約）

**Files:**
- Create: `supabase/migrations/056_tasks_recurrence_rule.sql`

**Interfaces:**
- Produces: `public.tasks.recurrence_rule`（`text`、`'weekly' | 'biweekly' | 'monthly' | NULL`のみ許可するCHECK制約`tasks_recurrence_rule_check`付き）

- [ ] **Step 1: マイグレーションファイルを書く**

`supabase/migrations/056_tasks_recurrence_rule.sql`を作成：

```sql
-- 056: tasksに定期タスク（繰り返し）用の列を追加
--
-- 新規テーブルは作らず、既存tasksへの列追加のみ。tasksのUPDATE/INSERT/SELECT
-- 権限はテーブルレベルの標準GRANTで、列ごとの制限が無いことを確認済み
-- （pg_attribute.attaclが既存全列でNULL。043の「profilesのような列制限は
-- 無い」という記録と一致）。そのため新規列に対する明示的なGRANTは不要で、
-- 既存のtasks_*_own_org RLSポリシー（列を見ない、organization_idのみで
-- 判定）もそのまま新規列に適用される。CHECK制約は既存の
-- tasks_priority_check・tasks_status_checkと同じ「英語canonical値のみ
-- 許可、UIは日本語ラベルに分離」方針を踏襲する。

ALTER TABLE public.tasks
  ADD COLUMN recurrence_rule text;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_recurrence_rule_check
  CHECK (recurrence_rule IN ('weekly', 'biweekly', 'monthly') OR recurrence_rule IS NULL);
```

- [ ] **Step 2: 本番Supabase（project `uhhofjcyotfyrlhaguvy`）に適用**

`mcp__claude_ai_Supabase__apply_migration`で上記ファイルを適用する。適用前に`mcp__claude_ai_Supabase__execute_sql`で次のクエリを実行し、列がまだ存在しないことを確認する：

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='tasks' AND column_name='recurrence_rule';
```

期待：0行。適用後、同じクエリで1行（`recurrence_rule`）が返ることを確認する。続けて`mcp__claude_ai_Supabase__get_advisors(type: "security")`を実行し、新規の警告が増えていないことを確認する（列追加のみでRLSポリシーは変更していないため、増えないはず）。

- [ ] **Step 3: 制約の検証（BEGIN...ROLLBACKで本番に影響を残さない）**

まず`mcp__claude_ai_Supabase__execute_sql`で実在するタスクを1件特定する：`SELECT id, organization_id FROM public.tasks LIMIT 1;`。続けてその`organization_id`に所属するメンバーを1人特定する：`SELECT user_id FROM public.organization_members WHERE organization_id = '<上のorganization_id>' LIMIT 1;`。

その`task_id`と`member_user_id`を使い、`mcp__claude_ai_Supabase__execute_sql`で以下を1回のクエリとして実行する：

```sql
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<member_user_id>')::text, true);

-- ケース1：許可された3値はいずれも更新できる
UPDATE public.tasks SET recurrence_rule = 'weekly' WHERE id = '<task_id>'
RETURNING id, recurrence_rule;
UPDATE public.tasks SET recurrence_rule = 'biweekly' WHERE id = '<task_id>'
RETURNING id, recurrence_rule;
UPDATE public.tasks SET recurrence_rule = 'monthly' WHERE id = '<task_id>'
RETURNING id, recurrence_rule;

-- ケース2：NULLに戻すことも許可される
UPDATE public.tasks SET recurrence_rule = NULL WHERE id = '<task_id>'
RETURNING id, recurrence_rule;

-- ケース3：許可外の値はCHECK制約で拒否される
DO $$
BEGIN
  UPDATE public.tasks SET recurrence_rule = 'daily' WHERE id = '<task_id>';
  RAISE NOTICE 'CASE3_UNEXPECTED_SUCCESS';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'CASE3_REJECTED: %', SQLERRM;
END $$;

RESET ROLE;
ROLLBACK;
```

Expected: ケース1は3回とも1行ずつ返り`recurrence_rule`が指定通り、ケース2はNULLで1行返る、ケース3は`CASE3_REJECTED`（`tasks_recurrence_rule_check`制約違反）のNOTICEが出る。`ROLLBACK`により、この検証による変更は本番に残らない。

- [ ] **Step 4: コミット**

```bash
git add supabase/migrations/056_tasks_recurrence_rule.sql
git commit -m "$(cat <<'EOF'
feat(clubtasks): tasksに定期タスク用のrecurrence_rule列を追加

新規テーブルは作らず既存tasksへの列追加のみ。列レベルのGRANT制限が
無いこと（pg_attribute.attaclが全列NULL）を確認済みのため、明示的な
GRANTは不要。既存のtasks_*_own_org RLSポリシーがそのまま適用される。
EOF
)"
```

---

### Task 2: 次回タスク生成ロジックとフォーマット関数（TDD）

**Files:**
- Create: `lib/tasks/taskRecurrence.ts`
- Create: `lib/tasks/taskRecurrence.test.ts`
- Modify: `lib/types/task.ts`
- Modify: `lib/tasks/taskFormatting.ts`
- Modify: `lib/tasks/taskFormatting.test.ts`

**Interfaces:**
- Consumes: なし（DBアクセスの無い純粋関数のみ）
- Produces: `isRecurrenceRule(value: string | null | undefined): value is RecurrenceRule`、`nextDueDate(dueDate: string | null, rule: RecurrenceRule, today?: Date): string`、`buildRecurringTask(source: RecurringTaskSource, checklistItems: ReadonlyArray<{ text: string; position: number }>, today?: Date): RecurringTaskGeneration | null`（すべて`@/lib/tasks/taskRecurrence`、Task 3で`page.tsx`が`buildRecurringTask`と`RecurringTaskSource`型を使用）。`recurrenceLabel(rule: string | null | undefined): string | null`（`@/lib/tasks/taskFormatting`、Task 3で`TaskCardBody.tsx`が使用）。`TaskRow.recurrence_rule: string | null`（`@/lib/types/task`、Task 3で`page.tsx`/`TaskCardBody.tsx`が使用）。

- [ ] **Step 1: `lib/types/task.ts`の`TaskRow`に`recurrence_rule`を追加**

`lib/types/task.ts`の`TaskRow`インターフェースを次に置き換える：

```ts
export interface TaskRow {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  assignee_id: string | null;
  reviewer_id: string | null;
  created_by: string | null;
  category: string | null;
  due_date: string | null;
  /** 'weekly' | 'biweekly' | 'monthly' | null。tasks_recurrence_rule_check制約で3値+NULLのみ許可 */
  recurrence_rule: string | null;
  /** DB に列がある場合のみ */
  created_at?: string;
  updated_at?: string;
}
```

- [ ] **Step 2: 失敗するテストを書く（`lib/tasks/taskRecurrence.test.ts`）**

`lib/tasks/taskRecurrence.test.ts`を作成：

```ts
import { describe, expect, it } from "vitest";
import {
  buildRecurringTask,
  isRecurrenceRule,
  nextDueDate,
} from "./taskRecurrence";

describe("isRecurrenceRule", () => {
  it("returns true for weekly/biweekly/monthly", () => {
    expect(isRecurrenceRule("weekly")).toBe(true);
    expect(isRecurrenceRule("biweekly")).toBe(true);
    expect(isRecurrenceRule("monthly")).toBe(true);
  });

  it("returns false for null, undefined, empty string, and unknown values", () => {
    expect(isRecurrenceRule(null)).toBe(false);
    expect(isRecurrenceRule(undefined)).toBe(false);
    expect(isRecurrenceRule("")).toBe(false);
    expect(isRecurrenceRule("daily")).toBe(false);
  });
});

describe("nextDueDate", () => {
  it("adds 7 days for weekly", () => {
    expect(nextDueDate("2026-08-20", "weekly")).toBe("2026-08-27");
  });

  it("adds 14 days for biweekly", () => {
    expect(nextDueDate("2026-08-20", "biweekly")).toBe("2026-09-03");
  });

  it("adds 1 month for monthly", () => {
    expect(nextDueDate("2026-08-20", "monthly")).toBe("2026-09-20");
  });

  it("follows JS Date's native month-overflow rollover for monthly (Jan 31 -> Mar 3, since Feb 2026 has 28 days)", () => {
    expect(nextDueDate("2026-01-31", "monthly")).toBe("2026-03-03");
  });

  it("uses the provided today as the base when due date is null", () => {
    const today = new Date(2026, 7, 18); // 2026-08-18 (JS month is 0-indexed)
    expect(nextDueDate(null, "weekly", today)).toBe("2026-08-25");
  });
});

describe("buildRecurringTask", () => {
  const baseSource = {
    organization_id: "org-1",
    title: "週次ミーティング議事録作成",
    category: "運営",
    priority: "medium",
    assignee_id: "user-1",
    reviewer_id: "user-2",
    due_date: "2026-08-20",
    recurrence_rule: "weekly",
  };

  it("builds the next task payload when recurrence_rule is set", () => {
    const result = buildRecurringTask(baseSource, [], new Date(2026, 7, 20));
    expect(result).not.toBeNull();
    expect(result?.task).toEqual({
      organization_id: "org-1",
      title: "週次ミーティング議事録作成",
      category: "運営",
      priority: "medium",
      assignee_id: "user-1",
      reviewer_id: "user-2",
      due_date: "2026-08-27",
      status: "todo",
      recurrence_rule: "weekly",
    });
  });

  it("returns null when recurrence_rule is null", () => {
    expect(
      buildRecurringTask({ ...baseSource, recurrence_rule: null }, [])
    ).toBeNull();
  });

  it("returns null when recurrence_rule is an invalid value (defense against a value that slipped past the DB CHECK constraint)", () => {
    expect(
      buildRecurringTask({ ...baseSource, recurrence_rule: "daily" }, [])
    ).toBeNull();
  });

  it("returns an empty checklist array when there are no checklist items", () => {
    const result = buildRecurringTask(baseSource, []);
    expect(result?.checklistItems).toEqual([]);
  });

  it("copies checklist items sorted by original position, all marked not done, with position renumbered from 0", () => {
    const result = buildRecurringTask(baseSource, [
      { text: "会場を予約する", position: 2 },
      { text: "議題を集める", position: 0 },
      { text: "参加者に連絡する", position: 1 },
    ]);
    expect(result?.checklistItems).toEqual([
      { text: "議題を集める", position: 0, is_done: false },
      { text: "参加者に連絡する", position: 1, is_done: false },
      { text: "会場を予約する", position: 2, is_done: false },
    ]);
  });
});
```

- [ ] **Step 3: テストが失敗することを確認**

Run: `npx vitest run lib/tasks/taskRecurrence.test.ts`
Expected: FAIL（`./taskRecurrence`モジュールが存在しない）

- [ ] **Step 4: `lib/tasks/taskRecurrence.ts`を実装**

`lib/tasks/taskRecurrence.ts`を作成：

```ts
/**
 * 定期タスク（繰り返し）の次回生成ロジック。
 * DBアクセスをせず、「元タスクの値＋チェックリスト項目の配列」を受け取り、
 * 「次回タスクのinsertペイロード＋チェックリストのinsertペイロード配列」を
 * 返す。recurrence_ruleが未設定・不正な値ならnullを返す（呼び出し側の判定
 * 漏れやDBのCHECK制約をすり抜けたケースに対する最後の砦として、この関数
 * 自体もガードを持つ）。
 */

import type { TaskStatus } from "@/lib/types/task";

export type RecurrenceRule = "weekly" | "biweekly" | "monthly";

const RECURRENCE_RULES: readonly RecurrenceRule[] = [
  "weekly",
  "biweekly",
  "monthly",
];

export function isRecurrenceRule(
  value: string | null | undefined
): value is RecurrenceRule {
  return !!value && (RECURRENCE_RULES as readonly string[]).includes(value);
}

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * ruleに応じて基準日から次回日付を計算する。monthlyはJS Dateのネイティブな
 * setMonth()の挙動（例：1/31 + 1ヶ月 → 2月が31日まで無いため3/3に繰り上がる）
 * をそのまま採用する。月末に丸めるクランプ処理は今回のスコープ外（YAGNI）。
 */
function addInterval(base: Date, rule: RecurrenceRule): Date {
  const next = new Date(base.getTime());
  if (rule === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setDate(next.getDate() + (rule === "weekly" ? 7 : 14));
  }
  return next;
}

export function nextDueDate(
  dueDate: string | null,
  rule: RecurrenceRule,
  today: Date = new Date()
): string {
  const base = dueDate ? parseDateOnly(dueDate) : today;
  return formatDateOnly(addInterval(base, rule));
}

export interface RecurringTaskSource {
  organization_id: string;
  title: string;
  category: string | null;
  priority: string | null;
  assignee_id: string | null;
  reviewer_id: string | null;
  due_date: string | null;
  recurrence_rule: string | null;
}

export interface RecurringTaskInsert {
  organization_id: string;
  title: string;
  category: string | null;
  priority: string | null;
  assignee_id: string | null;
  reviewer_id: string | null;
  due_date: string;
  status: TaskStatus;
  recurrence_rule: RecurrenceRule;
}

export interface RecurringChecklistItemInsert {
  text: string;
  position: number;
  is_done: false;
}

export interface RecurringTaskGeneration {
  task: RecurringTaskInsert;
  checklistItems: RecurringChecklistItemInsert[];
}

export function buildRecurringTask(
  source: RecurringTaskSource,
  checklistItems: ReadonlyArray<{ text: string; position: number }>,
  today: Date = new Date()
): RecurringTaskGeneration | null {
  if (!isRecurrenceRule(source.recurrence_rule)) return null;
  const rule = source.recurrence_rule;

  return {
    task: {
      organization_id: source.organization_id,
      title: source.title,
      category: source.category,
      priority: source.priority,
      assignee_id: source.assignee_id,
      reviewer_id: source.reviewer_id,
      due_date: nextDueDate(source.due_date, rule, today),
      status: "todo",
      recurrence_rule: rule,
    },
    checklistItems: [...checklistItems]
      .sort((a, b) => a.position - b.position)
      .map((item, index) => ({
        text: item.text,
        position: index,
        is_done: false as const,
      })),
  };
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `npx vitest run lib/tasks/taskRecurrence.test.ts`
Expected: PASS（全12ケース）

- [ ] **Step 6: `recurrenceLabel`の失敗するテストを書く（`lib/tasks/taskFormatting.test.ts`）**

`lib/tasks/taskFormatting.test.ts`の末尾（`describe("formatDateTime", ...)`ブロックの直後）に追記：

```ts

describe("recurrenceLabel", () => {
  it("returns null when there is no recurrence rule", () => {
    expect(recurrenceLabel(null)).toBeNull();
    expect(recurrenceLabel(undefined)).toBeNull();
    expect(recurrenceLabel("")).toBeNull();
  });

  it("labels known recurrence rules in Japanese", () => {
    expect(recurrenceLabel("weekly")).toBe("毎週");
    expect(recurrenceLabel("biweekly")).toBe("隔週");
    expect(recurrenceLabel("monthly")).toBe("毎月");
  });

  it("returns null for an unknown recurrence rule", () => {
    expect(recurrenceLabel("daily")).toBeNull();
  });
});
```

同じファイル冒頭のimportに`recurrenceLabel`を追加する：

```ts
import {
  checklistProgressLabel,
  formatDateTime,
  formatDue,
  formatFileSize,
  priorityBadgeClass,
  priorityLabel,
  recurrenceLabel,
} from "./taskFormatting";
```

- [ ] **Step 7: テストが失敗することを確認**

Run: `npx vitest run lib/tasks/taskFormatting.test.ts`
Expected: FAIL（`recurrenceLabel`が存在しない）

- [ ] **Step 8: `recurrenceLabel`を実装**

`lib/tasks/taskFormatting.ts`の末尾に追記：

```ts

const RECURRENCE_LABEL: Record<string, string> = {
  weekly: "毎週",
  biweekly: "隔週",
  monthly: "毎月",
};

/**
 * カンバンカードの繰り返しバッジ用ラベル。recurrence_ruleが無い・不明な
 * タスクにはバッジ自体を出さないため null を返す。
 */
export function recurrenceLabel(rule: string | null | undefined): string | null {
  if (!rule) return null;
  return RECURRENCE_LABEL[rule] ?? null;
}
```

- [ ] **Step 9: テストが通ることを確認**

Run: `npm test`
Expected: PASS（既存の全テスト＋新規テストが通る）

- [ ] **Step 10: コミット**

```bash
git add lib/types/task.ts lib/tasks/taskRecurrence.ts lib/tasks/taskRecurrence.test.ts lib/tasks/taskFormatting.ts lib/tasks/taskFormatting.test.ts
git commit -m "$(cat <<'EOF'
feat(clubtasks): 定期タスクの次回生成ロジックと繰り返しラベルを追加

buildRecurringTask()はDBアクセスの無い純粋関数として、元タスクと
チェックリスト項目の配列から次回タスクのinsertペイロードを計算する。
recurrence_ruleが未設定・不正な値ならnullを返し、呼び出し側の判定
漏れやDB制約をすり抜けたケースに対しても関数自体が防御する。
EOF
)"
```

---

### Task 3: UI統合（フォーム・生成トリガー・カンバンバッジ）

**Files:**
- Modify: `app/(club)/clubtasks/page.tsx`
- Modify: `app/(club)/clubtasks/TaskCardBody.tsx`

**Interfaces:**
- Consumes: `buildRecurringTask`・`RecurringTaskSource`型（`@/lib/tasks/taskRecurrence`、Task 2で定義）。`recurrenceLabel`（`@/lib/tasks/taskFormatting`、Task 2で定義）。`TaskRow.recurrence_rule`（`@/lib/types/task`、Task 2で追加）。

- [ ] **Step 1: `page.tsx`にimportを追加**

`app/(club)/clubtasks/page.tsx`の次のブロック：

```tsx
import {
  decodeSwimlaneDroppableId,
  resolveSwimlaneRowChange,
  swimlaneRowKeyForTask,
  type SwimlaneAxis,
} from "@/lib/tasks/taskSwimlanes";
import ChecklistSection from "./ChecklistSection";
```

を次に置き換える（`taskRecurrence`のimportを追加）：

```tsx
import {
  decodeSwimlaneDroppableId,
  resolveSwimlaneRowChange,
  swimlaneRowKeyForTask,
  type SwimlaneAxis,
} from "@/lib/tasks/taskSwimlanes";
import {
  buildRecurringTask,
  type RecurringTaskSource,
} from "@/lib/tasks/taskRecurrence";
import ChecklistSection from "./ChecklistSection";
```

- [ ] **Step 2: `loadTasks`のselect列に`recurrence_rule`を追加**

次のブロック：

```tsx
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id, organization_id, title, description, status, priority, assignee_id, reviewer_id, created_by, category, due_date, created_at"
      )
      .eq("organization_id", orgId);
```

を次に置き換える：

```tsx
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id, organization_id, title, description, status, priority, assignee_id, reviewer_id, created_by, category, due_date, created_at, recurrence_rule"
      )
      .eq("organization_id", orgId);
```

- [ ] **Step 3: `emptyForm`に`recurrence_rule`のデフォルト値を追加**

次のブロック：

```tsx
const emptyForm = {
  title: "",
  description: "",
  status: "todo" as TaskStatus,
  priority: "medium",
  due_date: "",
  assignee_id: "",
  reviewer_id: "",
  category: "",
};
```

を次に置き換える：

```tsx
const emptyForm = {
  title: "",
  description: "",
  status: "todo" as TaskStatus,
  priority: "medium",
  due_date: "",
  assignee_id: "",
  reviewer_id: "",
  category: "",
  recurrence_rule: "",
};
```

- [ ] **Step 4: `openEditModal`で既存タスクの`recurrence_rule`をフォームへ反映**

次のブロック：

```tsx
  const openEditModal = (task: TaskRow) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      status: normalizeStatus(task.status),
      priority: task.priority && ["high", "medium", "low"].includes(task.priority) ? task.priority : "medium",
      due_date: task.due_date
        ? task.due_date.slice(0, 10)
        : "",
      assignee_id: task.assignee_id ?? "",
      reviewer_id: task.reviewer_id ?? "",
      category: task.category ?? "",
    });
    setModalOpen(true);
  };
```

を次に置き換える：

```tsx
  const openEditModal = (task: TaskRow) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      status: normalizeStatus(task.status),
      priority: task.priority && ["high", "medium", "low"].includes(task.priority) ? task.priority : "medium",
      due_date: task.due_date
        ? task.due_date.slice(0, 10)
        : "",
      assignee_id: task.assignee_id ?? "",
      reviewer_id: task.reviewer_id ?? "",
      category: task.category ?? "",
      recurrence_rule: task.recurrence_rule ?? "",
    });
    setModalOpen(true);
  };
```

- [ ] **Step 5: `handleCommentAdded`の直後に`maybeGenerateRecurringTask`を追加**

次のブロック（`handleCommentAdded`の宣言全体）：

```tsx
  const handleCommentAdded = useCallback(async () => {
    if (!editingTask) return;
    const recipients = commentNotificationRecipients(
      {
        assigneeId: editingTask.assignee_id,
        reviewerId: editingTask.reviewer_id,
        createdBy: editingTask.created_by,
      },
      currentUserId ?? ""
    );
    // 逐次await：複数人に同時発火するとResendのレート制限に触れて
    // 一部だけ無言で失敗しうるため、直列に送ってその余地を無くす。
    for (const recipientId of recipients) {
      await notifyTaskChange({
        type: "task_comment_added",
        recipientId,
        taskTitle: editingTask.title,
      });
    }
  }, [editingTask, currentUserId, notifyTaskChange]);

  const categoryOptions = useMemo(() => {
```

を次に置き換える（`maybeGenerateRecurringTask`を`handleCommentAdded`と`categoryOptions`の間に挿入）：

```tsx
  const handleCommentAdded = useCallback(async () => {
    if (!editingTask) return;
    const recipients = commentNotificationRecipients(
      {
        assigneeId: editingTask.assignee_id,
        reviewerId: editingTask.reviewer_id,
        createdBy: editingTask.created_by,
      },
      currentUserId ?? ""
    );
    // 逐次await：複数人に同時発火するとResendのレート制限に触れて
    // 一部だけ無言で失敗しうるため、直列に送ってその余地を無くす。
    for (const recipientId of recipients) {
      await notifyTaskChange({
        type: "task_comment_added",
        recipientId,
        taskTitle: editingTask.title,
      });
    }
  }, [editingTask, currentUserId, notifyTaskChange]);

  /**
   * タスクが「完了」に新しく遷移した際、recurrence_ruleが設定されていれば
   * 次回分のタスクを1件自動生成する（Todoist方式）。生成に失敗しても
   * 呼び出し元の保存・移動操作自体は失敗させない（付随処理として扱う）。
   */
  const maybeGenerateRecurringTask = useCallback(
    async (source: RecurringTaskSource, sourceTaskId: string) => {
      if (!source.recurrence_rule) return;

      const { data: checklistData, error: checklistError } = await supabase
        .from("task_checklist_items")
        .select("text, position")
        .eq("task_id", sourceTaskId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (checklistError) {
        console.error(
          "recurring task checklist fetch error:",
          checklistError
        );
      }

      const generation = buildRecurringTask(
        source,
        (checklistData as Array<{ text: string; position: number }>) ?? []
      );
      if (!generation) return;

      const { data: newTask, error: insertError } = await supabase
        .from("tasks")
        .insert({ ...generation.task, created_by: currentUserId })
        .select("id")
        .single();
      if (insertError || !newTask) {
        console.error("recurring task insert error:", insertError);
        toast.error("定期タスクの自動生成に失敗しました");
        return;
      }

      if (generation.checklistItems.length > 0) {
        const { error: checklistInsertError } = await supabase
          .from("task_checklist_items")
          .insert(
            generation.checklistItems.map((item) => ({
              task_id: newTask.id,
              text: item.text,
              position: item.position,
              is_done: item.is_done,
            }))
          );
        if (checklistInsertError) {
          console.error(
            "recurring task checklist insert error:",
            checklistInsertError
          );
        }
      }

      toast.success("次回分の定期タスクを自動生成しました");
      await loadTasks();
      await loadChecklistCounts();
    },
    [currentUserId, loadTasks, loadChecklistCounts]
  );

  const categoryOptions = useMemo(() => {
```

- [ ] **Step 6: `handleSave`のpayloadと更新オブジェクトに`recurrence_rule`を追加**

次のブロック：

```tsx
      const payload = {
        organization_id: orgId,
        title,
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority || null,
        due_date: form.due_date || null,
        assignee_id: form.assignee_id || null,
        reviewer_id: form.reviewer_id || null,
        category: form.category.trim() || null,
      };

      if (editingTask) {
        const { error } = await supabase
          .from("tasks")
          .update({
            title: payload.title,
            description: payload.description,
            status: payload.status,
            priority: payload.priority,
            due_date: payload.due_date,
            assignee_id: payload.assignee_id,
            reviewer_id: payload.reviewer_id,
            category: payload.category,
          })
          .eq("id", editingTask.id);
        if (error) throw error;
        toast.success("タスクを更新しました");
```

を次に置き換える：

```tsx
      const payload = {
        organization_id: orgId,
        title,
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority || null,
        due_date: form.due_date || null,
        assignee_id: form.assignee_id || null,
        reviewer_id: form.reviewer_id || null,
        category: form.category.trim() || null,
        recurrence_rule: form.recurrence_rule || null,
      };

      if (editingTask) {
        const { error } = await supabase
          .from("tasks")
          .update({
            title: payload.title,
            description: payload.description,
            status: payload.status,
            priority: payload.priority,
            due_date: payload.due_date,
            assignee_id: payload.assignee_id,
            reviewer_id: payload.reviewer_id,
            category: payload.category,
            recurrence_rule: payload.recurrence_rule,
          })
          .eq("id", editingTask.id);
        if (error) throw error;
        toast.success("タスクを更新しました");
```

- [ ] **Step 7: `handleSave`の編集分岐に生成トリガーを追加**

次のブロック（editingTask分岐内、担当者変更通知の直後・`await loadTasks();`の手前）：

```tsx
        const prevAssignee = { assigneeId: editingTask.assignee_id };
        const nextAssignee = { assigneeId: payload.assignee_id };
        if (shouldNotifyAssigneeChanged(prevAssignee, nextAssignee, currentUserId)) {
          void notifyTaskChange({
            type: "task_assignee_changed",
            recipientId: payload.assignee_id!,
            taskTitle: payload.title,
          });
        }
      } else {
```

を次に置き換える：

```tsx
        const prevAssignee = { assigneeId: editingTask.assignee_id };
        const nextAssignee = { assigneeId: payload.assignee_id };
        if (shouldNotifyAssigneeChanged(prevAssignee, nextAssignee, currentUserId)) {
          void notifyTaskChange({
            type: "task_assignee_changed",
            recipientId: payload.assignee_id!,
            taskTitle: payload.title,
          });
        }

        const prevStatus = normalizeStatus(editingTask.status);
        if (prevStatus !== "done" && payload.status === "done") {
          await maybeGenerateRecurringTask(
            {
              organization_id: orgId,
              title: payload.title,
              category: payload.category,
              priority: payload.priority,
              assignee_id: payload.assignee_id,
              reviewer_id: payload.reviewer_id,
              due_date: payload.due_date,
              recurrence_rule: payload.recurrence_rule,
            },
            editingTask.id
          );
        }
      } else {
```

- [ ] **Step 8: `handleDragEnd`に生成トリガーを追加し依存配列を更新**

次のブロック（担当者変更通知の直後・`toast.success("移動しました");`の手前）：

```tsx
      const prevAssignee = { assigneeId: task.assignee_id };
      const nextAssignee = {
        assigneeId:
          "assignee_id" in rowChange
            ? (rowChange.assignee_id ?? null)
            : task.assignee_id,
      };
      if (shouldNotifyAssigneeChanged(prevAssignee, nextAssignee, currentUserId)) {
        void notifyTaskChange({
          type: "task_assignee_changed",
          recipientId: nextAssignee.assigneeId!,
          taskTitle: task.title,
        });
      }

      toast.success("移動しました");
    },
    [tasks, notifyTaskChange, currentUserId, swimlaneAxis]
  );
```

を次に置き換える：

```tsx
      const prevAssignee = { assigneeId: task.assignee_id };
      const nextAssignee = {
        assigneeId:
          "assignee_id" in rowChange
            ? (rowChange.assignee_id ?? null)
            : task.assignee_id,
      };
      if (shouldNotifyAssigneeChanged(prevAssignee, nextAssignee, currentUserId)) {
        void notifyTaskChange({
          type: "task_assignee_changed",
          recipientId: nextAssignee.assigneeId!,
          taskTitle: task.title,
        });
      }

      if (normalizeStatus(task.status) !== "done" && newStatus === "done") {
        await maybeGenerateRecurringTask(
          {
            organization_id: task.organization_id,
            title: task.title,
            category:
              "category" in rowChange
                ? (rowChange.category ?? null)
                : task.category,
            priority: task.priority,
            assignee_id: nextAssignee.assigneeId,
            reviewer_id: task.reviewer_id,
            due_date: task.due_date,
            recurrence_rule: task.recurrence_rule ?? null,
          },
          task.id
        );
      }

      toast.success("移動しました");
    },
    [tasks, notifyTaskChange, currentUserId, swimlaneAxis, maybeGenerateRecurringTask]
  );
```

- [ ] **Step 9: 編集モーダルに繰り返しセレクトボックスを追加**

次のブロック（種別/レビュー者のグリッドの直後、`{editingTask ? (` の手前）：

```tsx
                  <select
                    value={form.reviewer_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, reviewer_id: e.target.value }))
                    }
                    disabled={saving}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
                  >
                    <option value="">未定</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {formatMemberOption(m)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {editingTask ? (
```

を次に置き換える：

```tsx
                  <select
                    value={form.reviewer_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, reviewer_id: e.target.value }))
                    }
                    disabled={saving}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
                  >
                    <option value="">未定</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {formatMemberOption(m)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-ink mb-1">
                  繰り返し
                </label>
                <select
                  value={form.recurrence_rule}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      recurrence_rule: e.target.value,
                    }))
                  }
                  disabled={saving}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
                >
                  <option value="">なし</option>
                  <option value="weekly">毎週</option>
                  <option value="biweekly">隔週</option>
                  <option value="monthly">毎月</option>
                </select>
                <p className="text-xs text-graphite/60 mt-1">
                  設定すると、このタスクが「完了」になった時点で次回分を自動的に作成します。
                </p>
              </div>
              {editingTask ? (
```

- [ ] **Step 10: `TaskCardBody.tsx`に繰り返しバッジを追加**

`app/(club)/clubtasks/TaskCardBody.tsx`の次のブロック：

```tsx
import { CalendarDays, Eye, ListChecks, User } from "lucide-react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import {
  checklistProgressLabel,
  formatDue,
  priorityBadgeClass,
  priorityLabel,
} from "@/lib/tasks/taskFormatting";
```

を次に置き換える：

```tsx
import { CalendarDays, Eye, ListChecks, Repeat, User } from "lucide-react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import {
  checklistProgressLabel,
  formatDue,
  priorityBadgeClass,
  priorityLabel,
  recurrenceLabel,
} from "@/lib/tasks/taskFormatting";
```

続けて、次のブロック：

```tsx
  const checklistProgress = checklistCountByTaskId[task.id];
  const checklistLabel = checklistProgress
    ? checklistProgressLabel(checklistProgress.done, checklistProgress.total)
    : null;
```

を次に置き換える：

```tsx
  const checklistProgress = checklistCountByTaskId[task.id];
  const checklistLabel = checklistProgress
    ? checklistProgressLabel(checklistProgress.done, checklistProgress.total)
    : null;
  const recurrence = recurrenceLabel(task.recurrence_rule);
```

最後に、次のブロック：

```tsx
      {checklistLabel && (
        <p className="text-xs text-graphite/70 flex items-center gap-1 mt-0.5">
          <ListChecks className="w-[14px] h-[14px]" aria-hidden="true" />
          {checklistLabel}
        </p>
      )}
    </button>
  );
}
```

を次に置き換える：

```tsx
      {checklistLabel && (
        <p className="text-xs text-graphite/70 flex items-center gap-1 mt-0.5">
          <ListChecks className="w-[14px] h-[14px]" aria-hidden="true" />
          {checklistLabel}
        </p>
      )}
      {recurrence && (
        <p className="text-xs text-graphite/70 flex items-center gap-1 mt-0.5">
          <Repeat className="w-[14px] h-[14px]" aria-hidden="true" />
          {recurrence}
        </p>
      )}
    </button>
  );
}
```

- [ ] **Step 11: 型チェックとテストを実行**

Run: `npx tsc --noEmit`
Expected: エラー無し

Run: `npm test`
Expected: PASS（既存テスト＋Task 2の新規テストがすべて通る。UIの手動確認はこの後の統合レビュー・ライブQAで行う）

- [ ] **Step 12: コミット**

```bash
git add app/\(club\)/clubtasks/page.tsx app/\(club\)/clubtasks/TaskCardBody.tsx
git commit -m "$(cat <<'EOF'
feat(clubtasks): 繰り返し設定UIと完了時の定期タスク自動生成を追加

編集モーダルに繰り返し（なし/毎週/隔週/毎月）セレクトボックスを追加。
タスクがdone以外からdoneへ新しく遷移した瞬間（handleSave/handleDragEnd
の両方）にmaybeGenerateRecurringTaskを呼び、buildRecurringTask()の
計算結果で次回タスク+チェックリストをinsertする。生成失敗は本体の
保存・移動操作を失敗させない。カンバンカードには繰り返しバッジを表示。
EOF
)"
```

---
