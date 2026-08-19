# /clubtasks ガント期間ドラッグ編集 Phase 1 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** タスクに正式な`start_date`（開始日）を持たせ、ガントチャートのバーを両端ドラッグで開始日・期限を変更できるようにする。あわせてバーの色をステータス色から種別色に変更する。

**Architecture:** `start_date`列をDBに追加（列単位GRANT対応込み）。ドラッグの日付計算は`lib/tasks/dateRangeDrag.ts`の純粋関数に切り出し、`GanttView.tsx`はPointer Capture APIで自前のドラッグを実装、確定時に`page.tsx`側でSupabase更新を1回発行する。

**Tech Stack:** Next.js 15 App Router / React / TypeScript / Tailwind CSS / Supabase / vitest

## Global Constraints

- ロジックは`lib/`の純粋関数に切り出し、テストを書く（UIコンポーネントに計算を埋め込まない）
- `tasks`テーブルは列単位GRANT（テーブル単位UPDATE/INSERTはREVOKE済み）。新しい列は明示的にGRANTしないと書き込めない
- ドラッグ中はローカルstateのみでプレビューし、確定時（pointerup）に1回だけSupabaseへ書き込む
- 開始日が期限を追い越す場合は、反対側の端と同じ日にクランプする（1日未満のタスクは作らない）
- アーカイブ履歴閲覧中（`isViewingArchiveHistory`）はドラッグを無効化する
- 各タスク実装後、`npm test`と`npx tsc --noEmit`を通す
- 設計は`docs/superpowers/specs/2026-08-19-clubtasks-gantt-calendar-dates-design.md`

---

### Task 1: 日付ドラッグの純粋関数

**Files:**
- Create: `lib/tasks/dateRangeDrag.ts`
- Test: `lib/tasks/dateRangeDrag.test.ts`

**Interfaces:**
- Produces: `pixelDeltaToDayDelta(deltaPx: number, dayWidthPx: number): number`、`applyDragToRange(current: DateRange, edge: DragEdge, dayDelta: number): DateRange`、`formatDateOnly(d: Date): string`、`type DateRange = { startDate: string; dueDate: string }`、`type DragEdge = "start" | "due"`。後続タスクはこれらをimportして使う。

- [ ] **Step 1: 失敗するテストを書く**

`lib/tasks/dateRangeDrag.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  applyDragToRange,
  formatDateOnly,
  pixelDeltaToDayDelta,
} from "./dateRangeDrag";

describe("pixelDeltaToDayDelta", () => {
  it("converts a positive pixel delta to a positive day delta", () => {
    expect(pixelDeltaToDayDelta(28, 28)).toBe(1);
    expect(pixelDeltaToDayDelta(56, 28)).toBe(2);
  });

  it("converts a negative pixel delta to a negative day delta", () => {
    expect(pixelDeltaToDayDelta(-28, 28)).toBe(-1);
    expect(pixelDeltaToDayDelta(-56, 28)).toBe(-2);
  });

  it("rounds to the nearest day", () => {
    expect(pixelDeltaToDayDelta(10, 28)).toBe(0);
    expect(pixelDeltaToDayDelta(20, 28)).toBe(1);
  });

  it("returns 0 when dayWidthPx is zero or negative (defensive)", () => {
    expect(pixelDeltaToDayDelta(100, 0)).toBe(0);
    expect(pixelDeltaToDayDelta(100, -10)).toBe(0);
  });
});

describe("applyDragToRange", () => {
  const base = { startDate: "2026-08-10", dueDate: "2026-08-20" };

  it("moves the start edge forward and backward within range", () => {
    expect(applyDragToRange(base, "start", 3)).toEqual({
      startDate: "2026-08-13",
      dueDate: "2026-08-20",
    });
    expect(applyDragToRange(base, "start", -3)).toEqual({
      startDate: "2026-08-07",
      dueDate: "2026-08-20",
    });
  });

  it("moves the due edge forward and backward within range", () => {
    expect(applyDragToRange(base, "due", 3)).toEqual({
      startDate: "2026-08-10",
      dueDate: "2026-08-23",
    });
    expect(applyDragToRange(base, "due", -3)).toEqual({
      startDate: "2026-08-10",
      dueDate: "2026-08-17",
    });
  });

  it("clamps the start edge to the due date when dragged past it", () => {
    expect(applyDragToRange(base, "start", 20)).toEqual({
      startDate: "2026-08-20",
      dueDate: "2026-08-20",
    });
  });

  it("clamps the due edge to the start date when dragged past it", () => {
    expect(applyDragToRange(base, "due", -20)).toEqual({
      startDate: "2026-08-10",
      dueDate: "2026-08-10",
    });
  });

  it("allows the start and due date to become the same day (1-day task)", () => {
    expect(applyDragToRange(base, "start", 10)).toEqual({
      startDate: "2026-08-20",
      dueDate: "2026-08-20",
    });
  });

  it("returns the same range unchanged when dayDelta is 0", () => {
    expect(applyDragToRange(base, "start", 0)).toEqual(base);
    expect(applyDragToRange(base, "due", 0)).toEqual(base);
  });
});

describe("formatDateOnly", () => {
  it("formats a Date as YYYY-MM-DD using local time components", () => {
    expect(formatDateOnly(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(formatDateOnly(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});
```

- [ ] **Step 2: テストを実行して失敗することを確認**

Run: `npx vitest run lib/tasks/dateRangeDrag.test.ts`
Expected: FAIL（`./dateRangeDrag`が存在しない）

- [ ] **Step 3: 実装を書く**

`lib/tasks/dateRangeDrag.ts`:

```ts
/**
 * ガント・カレンダーの「バーの端をドラッグして開始日/期限を変える」操作を
 * 支える純粋関数。日付の表現はDBのdate型と同じ "YYYY-MM-DD" 文字列。
 * UIコンポーネント側はピクセル量・pointerイベントの配線のみを持ち、
 * 日付計算はすべてここに集約する（CLAUDE.md §5の既存方針）。
 */

export type DateRange = { startDate: string; dueDate: string };
export type DragEdge = "start" | "due";

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, days: number): string {
  const d = parseDateOnly(iso);
  d.setDate(d.getDate() + days);
  return formatDateOnly(d);
}

/**
 * ドラッグ量(px)を日数に変換する。dayWidthPxで割って四捨五入する。
 * dayWidthPxが0以下の場合は0を返す（呼び出し側の防御。ゼロ除算回避）。
 */
export function pixelDeltaToDayDelta(
  deltaPx: number,
  dayWidthPx: number
): number {
  if (dayWidthPx <= 0) return 0;
  return Math.round(deltaPx / dayWidthPx);
}

/**
 * ドラッグ中の端（"start"=開始日側／"due"=期限側）を、dayDelta日ぶんずらした
 * 新しい範囲を返す。開始日が期限を追い越す（またはその逆）場合は、
 * 反対側の端と同じ日にクランプする（1日だけのタスクになる。それより
 * 短い範囲は作らない）。文字列比較で日付の前後を判定できる
 * （"YYYY-MM-DD"形式は辞書順＝時系列順に一致するため）。
 */
export function applyDragToRange(
  current: DateRange,
  edge: DragEdge,
  dayDelta: number
): DateRange {
  if (edge === "start") {
    const newStart = addDays(current.startDate, dayDelta);
    if (newStart > current.dueDate) {
      return { startDate: current.dueDate, dueDate: current.dueDate };
    }
    return { startDate: newStart, dueDate: current.dueDate };
  }
  const newDue = addDays(current.dueDate, dayDelta);
  if (newDue < current.startDate) {
    return { startDate: current.startDate, dueDate: current.startDate };
  }
  return { startDate: current.startDate, dueDate: newDue };
}
```

- [ ] **Step 4: テストを実行して通ることを確認**

Run: `npx vitest run lib/tasks/dateRangeDrag.test.ts`
Expected: PASS（11 tests）

- [ ] **Step 5: コミット**

```bash
git add lib/tasks/dateRangeDrag.ts lib/tasks/dateRangeDrag.test.ts
git commit -m "$(cat <<'EOF'
feat(clubtasks): ガント/カレンダーの日付ドラッグ用の純粋関数を追加

ピクセル量→日数変換、ドラッグ後の開始日/期限の計算（交差時のクランプ
込み）を純粋関数化。GanttView（Phase1）・CalendarView（Phase2）の
両方から使う共通ロジック。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 2: `start_date`列の追加（DBスキーマ変更・本番適用込み）

**Files:**
- Create: `supabase/migrations/064_tasks_start_date.sql`

**Interfaces:**
- Produces: `tasks.start_date`列（`date null`）。`authenticated`はINSERT/UPDATEとも可能。

⚠️ **これは本番Supabaseへのスキーマ変更を含むタスクです。** 着手前に`.claude/skills/migration-safety/SKILL.md`を読むこと（このリポジトリに既存のスキル）。Supabase MCPツールが未ロードの場合は`ToolSearch`で`mcp__claude_ai_Supabase__execute_sql`・`mcp__claude_ai_Supabase__apply_migration`を検索してロードすること。プロジェクトIDは`uhhofjcyotfyrlhaguvy`。

- [ ] **Step 1: マイグレーションファイルを書く**

`supabase/migrations/064_tasks_start_date.sql`:

```sql
-- 064: tasksにstart_date列を追加し、ガント/カレンダーの期間ドラッグ編集を可能にする
--
-- start_dateはarchived_at/archive_labelと違い、通常のメンバーが自由に編集して
-- よい列（RPC経由に絞る必要はない）。ただしtasksは057でテーブル単位の
-- UPDATE/INSERTをREVOKEし、許可する列だけを明示的にGRANTし直す設計に
-- なっているため、start_dateを追加しても列GRANTに加えない限り
-- authenticatedは書き込めない（CLAUDE.mdの既知の落とし穴）。
-- 列レベルGRANTは列ごとに独立して加算されるため、既存の列を再列挙する
-- 必要はなく、対象列だけの追加GRANTで足りる。

ALTER TABLE public.tasks ADD COLUMN start_date date;

GRANT INSERT (start_date) ON public.tasks TO authenticated;
GRANT UPDATE (start_date) ON public.tasks TO authenticated;
```

- [ ] **Step 2: 本番でBEGIN…ROLLBACK検証する**

`mcp__claude_ai_Supabase__execute_sql`（project_id: `uhhofjcyotfyrlhaguvy`）で以下を実行し、想定通りの結果になることを確認する：

```sql
BEGIN;

ALTER TABLE public.tasks ADD COLUMN start_date date;
GRANT INSERT (start_date) ON public.tasks TO authenticated;
GRANT UPDATE (start_date) ON public.tasks TO authenticated;

-- 検証1: authenticatedロールでstart_dateへのUPDATEが通ることを確認
SET LOCAL ROLE authenticated;
-- 実在するorganization_idを持つ既存タスク1件を対象に、実際にUPDATEを試す
-- （事前にSELECTで対象タスクのidを1件取得しておくこと）
-- UPDATE public.tasks SET start_date = '2026-01-01' WHERE id = '<既存タスクのid>';
RESET ROLE;

ROLLBACK;
```

実タスクIDの取得には`SELECT id FROM public.tasks LIMIT 1;`を先に実行する。UPDATE文が`permission denied`にならず正常に完了することを確認できたら、ROLLBACKで本番データには影響を残さない。

- [ ] **Step 3: 本番に適用する**

`mcp__claude_ai_Supabase__apply_migration`で`064_tasks_start_date.sql`の内容を本番（project_id: `uhhofjcyotfyrlhaguvy`）に適用する。適用後、`mcp__claude_ai_Supabase__execute_sql`で以下を実行し列が実在することを確認する：

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'tasks' AND column_name = 'start_date';
```

Expected: 1行返り、`data_type`が`date`であること。

- [ ] **Step 4: コミット**

```bash
git add supabase/migrations/064_tasks_start_date.sql
git commit -m "$(cat <<'EOF'
feat(clubtasks): tasksにstart_date列を追加（本番適用済み）

ガント/カレンダーの期間ドラッグ編集の土台。テーブル単位REVOKE後の
列単位GRANTモデルに合わせ、INSERT/UPDATEとも明示的にGRANT。
本番でBEGIN…ROLLBACK検証（authenticatedロールでのUPDATE成功を確認）
した上で適用済み。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 3: `TaskRow`型に`start_date`を追加

**Files:**
- Modify: `lib/types/task.ts`

**Interfaces:**
- Produces: `TaskRow.start_date: string | null`

- [ ] **Step 1: 型を追加**

`lib/types/task.ts`の`TaskRow`インターフェースで、`due_date`フィールドの直後に追加する：

変更前：
```ts
  category: string | null;
  due_date: string | null;
  /** 'weekly' | 'biweekly' | 'monthly' | null。tasks_recurrence_rule_check制約で3値+NULLのみ許可 */
  recurrence_rule: string | null;
```

変更後：
```ts
  category: string | null;
  due_date: string | null;
  /** 開始日。未設定（null）のタスクはガント/カレンダーでcreated_atを仮の開始日として表示する（編集不可の代用値） */
  start_date: string | null;
  /** 'weekly' | 'biweekly' | 'monthly' | null。tasks_recurrence_rule_check制約で3値+NULLのみ許可 */
  recurrence_rule: string | null;
```

- [ ] **Step 2: 型チェックを実行**

Run: `npx tsc --noEmit`
Expected: エラーなし（この時点ではまだ`start_date`を使うコードが無いため）

- [ ] **Step 3: コミット**

```bash
git add lib/types/task.ts
git commit -m "$(cat <<'EOF'
feat(clubtasks): TaskRow型にstart_dateを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 4: `page.tsx`に開始日フォーム・保存経路を追加

**Files:**
- Modify: `app/(club)/clubtasks/page.tsx`

**Interfaces:**
- Consumes: `TaskRow.start_date`（Task 3）

- [ ] **Step 1: `loadTasks`のSELECT列に`start_date`を追加**

`app/(club)/clubtasks/page.tsx`内、`loadTasks`の`.select(...)`を変更する：

変更前：
```ts
      .select(
        "id, organization_id, title, description, status, priority, assignee_id, reviewer_id, created_by, category, due_date, created_at, recurrence_rule, archived_at, archive_label"
      )
```

変更後：
```ts
      .select(
        "id, organization_id, title, description, status, priority, assignee_id, reviewer_id, created_by, category, due_date, start_date, created_at, recurrence_rule, archived_at, archive_label"
      )
```

- [ ] **Step 2: `emptyForm`に`start_date`を追加**

変更前：
```ts
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

変更後：
```ts
const emptyForm = {
  title: "",
  description: "",
  status: "todo" as TaskStatus,
  priority: "medium",
  due_date: "",
  start_date: "",
  assignee_id: "",
  reviewer_id: "",
  category: "",
  recurrence_rule: "",
};
```

- [ ] **Step 3: `openEditModal`で`start_date`を読み込む**

変更前：
```ts
      due_date: task.due_date
        ? task.due_date.slice(0, 10)
        : "",
      assignee_id: task.assignee_id ?? "",
```

変更後：
```ts
      due_date: task.due_date
        ? task.due_date.slice(0, 10)
        : "",
      start_date: task.start_date
        ? task.start_date.slice(0, 10)
        : "",
      assignee_id: task.assignee_id ?? "",
```

- [ ] **Step 4: `handleSave`に開始日のバリデーションと保存を追加**

`handleSave`冒頭のタイトル必須チェックのすぐ後に、開始日が期限を追い越していないかのチェックを追加する。

変更前：
```ts
    const title = form.title.trim();
    if (!title) {
      toast.error("タイトルは必須です");
      return;
    }
    setSaving(true);
    try {
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
```

変更後：
```ts
    const title = form.title.trim();
    if (!title) {
      toast.error("タイトルは必須です");
      return;
    }
    if (form.start_date && form.due_date && form.start_date > form.due_date) {
      toast.error("開始日は期限より後にできません");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        organization_id: orgId,
        title,
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority || null,
        due_date: form.due_date || null,
        start_date: form.start_date || null,
        assignee_id: form.assignee_id || null,
        reviewer_id: form.reviewer_id || null,
        category: form.category.trim() || null,
        recurrence_rule: form.recurrence_rule || null,
      };
```

（`"YYYY-MM-DD"`形式の文字列同士なので、`>`による比較がそのまま日付の前後判定になる。`lib/tasks/dateRangeDrag.ts`の`applyDragToRange`と同じ考え方）

新規タスク作成（`insert`）は既に`...payload`をスプレッドしているため、`start_date`は自動的に含まれる。編集（`update`）は列を明示的に列挙しているため、そちらにも追加する：

変更前：
```ts
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
```

変更後：
```ts
        const { error } = await supabase
          .from("tasks")
          .update({
            title: payload.title,
            description: payload.description,
            status: payload.status,
            priority: payload.priority,
            due_date: payload.due_date,
            start_date: payload.start_date,
            assignee_id: payload.assignee_id,
            reviewer_id: payload.reviewer_id,
            category: payload.category,
            recurrence_rule: payload.recurrence_rule,
          })
          .eq("id", editingTask.id);
```

- [ ] **Step 5: モーダルに「開始日」の入力欄を追加**

既存の「期限／担当者」の2列グリッド行を、「開始日／期限／担当者」の3列グリッドに変更する。

変更前：
```tsx
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-ink mb-1">
                    期限
                  </label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, due_date: e.target.value }))
                    }
                    disabled={saving || isViewingArchiveHistory}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-ink mb-1">
                    担当者
                  </label>
                  <select
                    value={form.assignee_id}
                    onChange={(e) =>
```

変更後：
```tsx
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-ink mb-1">
                    開始日
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, start_date: e.target.value }))
                    }
                    disabled={saving || isViewingArchiveHistory}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-ink mb-1">
                    期限
                  </label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, due_date: e.target.value }))
                    }
                    disabled={saving || isViewingArchiveHistory}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-ink mb-1">
                    担当者
                  </label>
                  <select
                    value={form.assignee_id}
                    onChange={(e) =>
```

（この`<select>`の残りの中身は変更しない。開始/閉じタグの対応はそのまま3列目の`<div>`として続く）

- [ ] **Step 6: 型チェックとテストを実行**

Run: `npx tsc --noEmit`
Expected: エラーなし

Run: `npm test`
Expected: 全テストPASS

- [ ] **Step 7: コミット**

```bash
git add "app/(club)/clubtasks/page.tsx"
git commit -m "$(cat <<'EOF'
feat(clubtasks): タスク編集モーダルに開始日フィールドを追加

start_dateの読み込み・保存（新規/編集とも）・開始日が期限を
追い越していないかのバリデーションを追加。モーダルの期限/担当者の
行を開始日/期限/担当者の3列に拡張。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 5: ガントチャートのバー色を種別色に、開始日を`start_date`優先に

**Files:**
- Modify: `app/(club)/clubtasks/GanttView.tsx`（全体書き換え）
- Modify: `app/(club)/clubtasks/page.tsx`（`<GanttView>`呼び出し箇所）

**Interfaces:**
- Consumes: `categoryColor`（`lib/tasks/taskCategoryColor.ts`）、`TaskRow.start_date`（Task 3）

- [ ] **Step 1: `GanttView.tsx`を全体書き換え**

`app/(club)/clubtasks/GanttView.tsx`の全体を次の内容に置き換える：

```tsx
"use client";

import { useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import { categoryColor } from "@/lib/tasks/taskCategoryColor";

type Props = {
  tasks: TaskRow[];
  laneTitleById: Record<TaskStatus, string>;
  normalizeStatus: (s: string | null | undefined) => TaskStatus;
};

const DAY_WIDTH = 28;
const LABEL_COL_WIDTH = 200;
const FALLBACK_BAR_COLOR = "#9AA5B1";

function toDateOnly(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export default function GanttView({
  tasks,
  laneTitleById,
  normalizeStatus,
}: Props) {
  const rows = useMemo(() => {
    return tasks
      .filter((t): t is TaskRow & { due_date: string } => Boolean(t.due_date))
      .map((t) => {
        const due = toDateOnly(t.due_date);
        const startSource = t.start_date ?? t.created_at ?? null;
        const startRaw = startSource ? toDateOnly(startSource) : due;
        const start = startRaw.getTime() <= due.getTime() ? startRaw : due;
        return { task: t, start, due };
      })
      .sort((a, b) => a.due.getTime() - b.due.getTime());
  }, [tasks]);

  const hiddenCount = tasks.length - rows.length;

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-rule bg-mist p-6 text-center text-sm text-graphite/70">
        期限が設定されているタスクがありません。ガントチャートには期限のあるタスクのみ表示されます。
      </div>
    );
  }

  const rangeStart = rows.reduce(
    (min, r) => (r.start < min ? r.start : min),
    rows[0].start
  );
  const today = toDateOnly(new Date().toISOString());
  const latestDue = rows.reduce(
    (max, r) => (r.due > max ? r.due : max),
    rows[0].due
  );
  const rangeEnd = latestDue > today ? latestDue : today;
  const totalDays = Math.max(diffDays(rangeStart, rangeEnd) + 1, 1);
  const todayOffset = diffDays(rangeStart, today);

  return (
    <div className="rounded-xl border border-rule bg-paper overflow-hidden">
      {hiddenCount > 0 && (
        <p className="px-4 py-2 text-xs text-graphite/70 border-b border-rule bg-mist">
          期限未設定のタスク{hiddenCount}件は表示していません。
        </p>
      )}
      <div className="overflow-x-auto">
        <div
          className="relative"
          style={{ minWidth: totalDays * DAY_WIDTH + LABEL_COL_WIDTH }}
        >
          <div className="flex border-b border-rule bg-mist">
            <div
              className="shrink-0 px-3 py-2 text-xs font-bold text-graphite/70"
              style={{ width: LABEL_COL_WIDTH }}
            >
              タスク
            </div>
            <div className="relative flex-1" style={{ height: 32 }}>
              {Array.from({ length: totalDays }).map((_, i) => {
                const d = new Date(rangeStart);
                d.setDate(d.getDate() + i);
                const showLabel =
                  totalDays <= 31 || d.getDate() === 1 || d.getDay() === 1;
                return (
                  <div
                    key={i}
                    className="absolute top-0 h-full border-l border-rule/60 text-[10px] text-graphite/60 pl-1 pt-1"
                    style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                  >
                    {showLabel ? `${d.getMonth() + 1}/${d.getDate()}` : ""}
                  </div>
                );
              })}
            </div>
          </div>

          {rows.map(({ task, start, due }) => {
            const status = normalizeStatus(task.status);
            const catColor = categoryColor(task.category);
            const barColor = catColor?.hex ?? FALLBACK_BAR_COLOR;
            const offset = diffDays(rangeStart, start);
            const span = Math.max(diffDays(start, due) + 1, 1);
            return (
              <div key={task.id} className="flex border-b border-rule last:border-b-0">
                <div
                  className="shrink-0 px-3 py-2 text-xs text-ink truncate"
                  style={{ width: LABEL_COL_WIDTH }}
                  title={task.title}
                >
                  {task.title}
                  {task.category && catColor && (
                    <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-graphite/60">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: catColor.hex }}
                        aria-hidden="true"
                      />
                      （{task.category}）
                    </span>
                  )}
                </div>
                <div className="relative flex-1" style={{ height: 36 }}>
                  <div
                    className="absolute top-1.5 h-3 rounded-full flex items-center justify-center"
                    style={{
                      left: offset * DAY_WIDTH,
                      width: span * DAY_WIDTH - 4,
                      backgroundColor: barColor,
                    }}
                    title={`${laneTitleById[status]}・${task.title}`}
                  >
                    {status === "done" && (
                      <CheckCircle2
                        className="w-[10px] h-[10px] text-paper"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {todayOffset >= 0 && todayOffset < totalDays && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-ink/60"
              style={{ left: LABEL_COL_WIDTH + todayOffset * DAY_WIDTH }}
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

（`laneTintById`propを削除した。バー色はもう種別色のみで決まり、ステータス色は使わないため）

- [ ] **Step 2: `page.tsx`の`<GanttView>`呼び出しから`laneTintById`を削除**

変更前：
```tsx
        <GanttView
          tasks={visibleTasks}
          laneTitleById={LANE_TITLE_BY_ID}
          laneTintById={STATUS_TINT}
          normalizeStatus={normalizeStatus}
        />
```

変更後：
```tsx
        <GanttView
          tasks={visibleTasks}
          laneTitleById={LANE_TITLE_BY_ID}
          normalizeStatus={normalizeStatus}
        />
```

- [ ] **Step 3: 型チェックとテストを実行**

Run: `npx tsc --noEmit`
Expected: エラーなし（`STATUS_TINT`が他で使われていない場合は未使用変数警告が出ないことも確認。`STATUS_TINT`はSwimlaneBoard等でも使われているため`page.tsx`内の定義自体は削除しない）

Run: `npm test`
Expected: 全テストPASS

- [ ] **Step 4: コミット**

```bash
git add "app/(club)/clubtasks/GanttView.tsx" "app/(club)/clubtasks/page.tsx"
git commit -m "$(cat <<'EOF'
feat(clubtasks): ガントのバー色を種別色に変更、開始日はstart_date優先に

laneTintById（ステータス色）ではなくcategoryColor()（種別色）で
バーを塗るように変更。完了タスクはバーにチェックマークを重ねる。
開始日の算出もstart_dateが設定されていればそちらを優先し、
未設定時のみ従来通りcreated_atにフォールバックする。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 6: ガントチャートのバー両端ドラッグ

**Files:**
- Modify: `app/(club)/clubtasks/GanttView.tsx`
- Modify: `app/(club)/clubtasks/page.tsx`

**Interfaces:**
- Consumes: `applyDragToRange`・`pixelDeltaToDayDelta`・`formatDateOnly`・`DateRange`・`DragEdge`（Task 1、`@/lib/tasks/dateRangeDrag`）
- Produces: `GanttView`の新規prop`onDateRangeChange: (taskId: string, range: DateRange) => void`・`isDragDisabled?: boolean`

- [ ] **Step 1: `GanttView.tsx`にドラッグ機能を追加**

`app/(club)/clubtasks/GanttView.tsx`の全体を次の内容に置き換える（Task 5の内容をベースに、ドラッグ機能を追加したもの）：

```tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import { categoryColor } from "@/lib/tasks/taskCategoryColor";
import {
  applyDragToRange,
  formatDateOnly,
  pixelDeltaToDayDelta,
  type DateRange,
  type DragEdge,
} from "@/lib/tasks/dateRangeDrag";

type Props = {
  tasks: TaskRow[];
  laneTitleById: Record<TaskStatus, string>;
  normalizeStatus: (s: string | null | undefined) => TaskStatus;
  onDateRangeChange: (taskId: string, range: DateRange) => void;
  isDragDisabled?: boolean;
};

const DAY_WIDTH = 28;
const LABEL_COL_WIDTH = 200;
const FALLBACK_BAR_COLOR = "#9AA5B1";

function toDateOnly(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

type DragState = {
  taskId: string;
  edge: DragEdge;
  pointerId: number;
  startClientX: number;
  originalRange: DateRange;
};

export default function GanttView({
  tasks,
  laneTitleById,
  normalizeStatus,
  onDateRangeChange,
  isDragDisabled = false,
}: Props) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [previewRanges, setPreviewRanges] = useState<
    Record<string, DateRange>
  >({});

  const rows = useMemo(() => {
    return tasks
      .filter((t): t is TaskRow & { due_date: string } => Boolean(t.due_date))
      .map((t) => {
        const due = toDateOnly(t.due_date);
        const startSource = t.start_date ?? t.created_at ?? null;
        const startRaw = startSource ? toDateOnly(startSource) : due;
        const start = startRaw.getTime() <= due.getTime() ? startRaw : due;
        return { task: t, start, due };
      })
      .sort((a, b) => a.due.getTime() - b.due.getTime());
  }, [tasks]);

  const handlePointerDown = useCallback(
    (
      e: React.PointerEvent<HTMLDivElement>,
      taskId: string,
      edge: DragEdge,
      range: DateRange
    ) => {
      if (isDragDisabled) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({
        taskId,
        edge,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        originalRange: range,
      });
    },
    [isDragDisabled]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const deltaPx = e.clientX - drag.startClientX;
      const dayDelta = pixelDeltaToDayDelta(deltaPx, DAY_WIDTH);
      const nextRange = applyDragToRange(
        drag.originalRange,
        drag.edge,
        dayDelta
      );
      setPreviewRanges((prev) => ({ ...prev, [drag.taskId]: nextRange }));
    },
    [drag]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      const finalRange = previewRanges[drag.taskId] ?? drag.originalRange;
      onDateRangeChange(drag.taskId, finalRange);
      const taskId = drag.taskId;
      setDrag(null);
      setPreviewRanges((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    },
    [drag, previewRanges, onDateRangeChange]
  );

  const hiddenCount = tasks.length - rows.length;

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-rule bg-mist p-6 text-center text-sm text-graphite/70">
        期限が設定されているタスクがありません。ガントチャートには期限のあるタスクのみ表示されます。
      </div>
    );
  }

  const rangeStart = rows.reduce(
    (min, r) => (r.start < min ? r.start : min),
    rows[0].start
  );
  const today = toDateOnly(new Date().toISOString());
  const latestDue = rows.reduce(
    (max, r) => (r.due > max ? r.due : max),
    rows[0].due
  );
  const rangeEnd = latestDue > today ? latestDue : today;
  const totalDays = Math.max(diffDays(rangeStart, rangeEnd) + 1, 1);
  const todayOffset = diffDays(rangeStart, today);

  return (
    <div className="rounded-xl border border-rule bg-paper overflow-hidden">
      {hiddenCount > 0 && (
        <p className="px-4 py-2 text-xs text-graphite/70 border-b border-rule bg-mist">
          期限未設定のタスク{hiddenCount}件は表示していません。
        </p>
      )}
      <div className="overflow-x-auto">
        <div
          className="relative"
          style={{ minWidth: totalDays * DAY_WIDTH + LABEL_COL_WIDTH }}
        >
          <div className="flex border-b border-rule bg-mist">
            <div
              className="shrink-0 px-3 py-2 text-xs font-bold text-graphite/70"
              style={{ width: LABEL_COL_WIDTH }}
            >
              タスク
            </div>
            <div className="relative flex-1" style={{ height: 32 }}>
              {Array.from({ length: totalDays }).map((_, i) => {
                const d = new Date(rangeStart);
                d.setDate(d.getDate() + i);
                const showLabel =
                  totalDays <= 31 || d.getDate() === 1 || d.getDay() === 1;
                return (
                  <div
                    key={i}
                    className="absolute top-0 h-full border-l border-rule/60 text-[10px] text-graphite/60 pl-1 pt-1"
                    style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                  >
                    {showLabel ? `${d.getMonth() + 1}/${d.getDate()}` : ""}
                  </div>
                );
              })}
            </div>
          </div>

          {rows.map(({ task, start, due }) => {
            const status = normalizeStatus(task.status);
            const catColor = categoryColor(task.category);
            const barColor = catColor?.hex ?? FALLBACK_BAR_COLOR;
            const baseRange: DateRange = {
              startDate: formatDateOnly(start),
              dueDate: formatDateOnly(due),
            };
            const effectiveRange = previewRanges[task.id] ?? baseRange;
            const effectiveStart = toDateOnly(effectiveRange.startDate);
            const effectiveDue = toDateOnly(effectiveRange.dueDate);
            const offset = diffDays(rangeStart, effectiveStart);
            const span = Math.max(diffDays(effectiveStart, effectiveDue) + 1, 1);
            const isDraggingThisTask = drag?.taskId === task.id;
            return (
              <div key={task.id} className="flex border-b border-rule last:border-b-0">
                <div
                  className="shrink-0 px-3 py-2 text-xs text-ink truncate"
                  style={{ width: LABEL_COL_WIDTH }}
                  title={task.title}
                >
                  {task.title}
                  {task.category && catColor && (
                    <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-graphite/60">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: catColor.hex }}
                        aria-hidden="true"
                      />
                      （{task.category}）
                    </span>
                  )}
                </div>
                <div className="relative flex-1" style={{ height: 36 }}>
                  <div
                    className={`absolute top-1.5 h-3 rounded-full flex items-center justify-center ${
                      isDraggingThisTask ? "ring-2 ring-ink/40" : ""
                    }`}
                    style={{
                      left: offset * DAY_WIDTH,
                      width: span * DAY_WIDTH - 4,
                      backgroundColor: barColor,
                    }}
                    title={`${laneTitleById[status]}・${task.title}`}
                  >
                    {status === "done" && (
                      <CheckCircle2
                        className="w-[10px] h-[10px] text-paper"
                        aria-hidden="true"
                      />
                    )}
                    {!isDragDisabled && (
                      <>
                        <div
                          className="absolute -left-1 top-0 h-full w-2 cursor-ew-resize touch-none"
                          onPointerDown={(e) =>
                            handlePointerDown(e, task.id, "start", baseRange)
                          }
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          aria-label={`${task.title}の開始日を変更`}
                        />
                        <div
                          className="absolute -right-1 top-0 h-full w-2 cursor-ew-resize touch-none"
                          onPointerDown={(e) =>
                            handlePointerDown(e, task.id, "due", baseRange)
                          }
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          aria-label={`${task.title}の期限を変更`}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {todayOffset >= 0 && todayOffset < totalDays && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-ink/60"
              style={{ left: LABEL_COL_WIDTH + todayOffset * DAY_WIDTH }}
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `page.tsx`に`handleDateRangeChange`を追加し、`<GanttView>`に配線する**

`page.tsx`の先頭のimportに`DateRange`型を追加する：

変更前：
```ts
import {
  filterTasksByArchiveView,
  type ArchiveView,
} from "@/lib/tasks/taskArchive";
```

変更後：
```ts
import {
  filterTasksByArchiveView,
  type ArchiveView,
} from "@/lib/tasks/taskArchive";
import type { DateRange } from "@/lib/tasks/dateRangeDrag";
```

`handleArchive`関数の直前あたり（`maybeGenerateRecurringTask`の後、`categoryOptions`の前など、他のハンドラ関数と同じ並びの場所）に新しい関数を追加する。目印として`const categoryOptions = useMemo(`の直前に挿入する：

変更前：
```ts
  const categoryOptions = useMemo(() => {
```

変更後：
```ts
  const handleDateRangeChange = useCallback(
    async (taskId: string, range: DateRange) => {
      if (archiveView.type !== "current") return;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const prevTasks = tasks;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, start_date: range.startDate, due_date: range.dueDate }
            : t
        )
      );
      const { error } = await supabase
        .from("tasks")
        .update({ start_date: range.startDate, due_date: range.dueDate })
        .eq("id", taskId);
      if (error) {
        setTasks(prevTasks);
        toast.error("期間の変更に失敗しました");
        return;
      }
      toast.success("期間を変更しました");
    },
    [tasks, archiveView]
  );

  const categoryOptions = useMemo(() => {
```

`<GanttView>`の呼び出しに`onDateRangeChange`と`isDragDisabled`を追加する：

変更前：
```tsx
        <GanttView
          tasks={visibleTasks}
          laneTitleById={LANE_TITLE_BY_ID}
          normalizeStatus={normalizeStatus}
        />
```

変更後：
```tsx
        <GanttView
          tasks={visibleTasks}
          laneTitleById={LANE_TITLE_BY_ID}
          normalizeStatus={normalizeStatus}
          onDateRangeChange={handleDateRangeChange}
          isDragDisabled={isViewingArchiveHistory}
        />
```

- [ ] **Step 3: 型チェックとテストを実行**

Run: `npx tsc --noEmit`
Expected: エラーなし

Run: `npm test`
Expected: 全テストPASS

- [ ] **Step 4: コミット**

```bash
git add "app/(club)/clubtasks/GanttView.tsx" "app/(club)/clubtasks/page.tsx"
git commit -m "$(cat <<'EOF'
feat(clubtasks): ガントのバー両端ドラッグで開始日・期限を変更可能に

Pointer Capture APIで自前のドラッグを実装。ドラッグ中はローカル
stateのみでプレビューし、pointerup時に1回だけSupabaseへ書き込む。
lib/tasks/dateRangeDrag.tsの純粋関数（クランプ込み）を使用。
アーカイブ履歴閲覧中はドラッグを無効化。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 7: 最終確認（ブラウザ実機・全体テスト）

**Files:** なし（確認のみ）

- [ ] **Step 1: 全テストとビルドを実行**

Run: `npm test`
Expected: 全テストPASS

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 2: 開発サーバーを起動し、`claude-in-chrome`で`/clubtasks`のガントチャートを実機確認する**

確認項目：
- 期限が設定された既存タスクのバーが、種別色で塗られているか（表・カンバン等の種別バッジと同じ色になっているか）
- 完了ステータスのタスクのバーにチェックマークが重なっているか
- バーの左端をドラッグすると開始日が変わり、保存後に再読み込みしても反映されているか
- バーの右端をドラッグすると期限が変わり、保存後に再読み込みしても反映されているか
- 開始日を期限より後にドラッグしようとしたとき、期限と同じ日にクランプされるか（1日未満にならないか）
- タスク編集モーダルに「開始日」欄が追加され、期限より後の日付を入力して保存しようとするとエラーになるか
- アーカイブ履歴を閲覧中は、バーの端をドラッグしても反応しないか

- [ ] **Step 3: 気づいた不具合があれば個別に修正しコミットする**

このタスク自体はコミット不要（確認のみ）。修正が発生した場合は、修正内容に応じたメッセージで別コミットにする。
