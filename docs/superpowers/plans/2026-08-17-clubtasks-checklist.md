# /clubtasks チェックリスト機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/clubtasks`の各タスクに、テキスト＋完了フラグのみのシンプルなチェックリストを追加する（担当者・期限は持たない）。カンバンカード上に「2/5」のような進捗バッジを表示する。

**Architecture:** 新規テーブル`task_checklist_items`（`task_id`にぶら下がる、`organization_id`はBEFORE INSERT/UPDATEトリガーで`tasks`から自動導出してRLSの取り違えを防ぐ）。編集モーダル内に新設する`ChecklistSection`コンポーネントが自分でSupabaseへの読み書きを行い、追加/チェック切替/削除のたびに`onCountChange`コールバックで`page.tsx`側の集計状態を更新する。カード側は`page.tsx`が起動時に全チェックリスト行を1回だけ集計ロードし、`TaskCardBody`まで`checklistCountByTaskId`マップをバケツリレーする。

**Tech Stack:** Next.js 15 App Router / TypeScript / Supabase（Postgres・RLS）/ vitest

## Global Constraints
- ロジックは`lib/`に純粋関数として切り出しテストする（CLAUDE.md §5）。UIコンポーネントに計算を埋め込まない。
- デザインは`lib/design/tokens.ts`の6色トークンのみ使用（ink/seal/paper/mist/rule/graphite）。新しい色を足さない。
- 型チェックは`npx tsc --noEmit`を使う（`npm run build`は使わない。開発サーバー稼働中に叩くと`.next`が壊れる）。
- 各タスクの最後で`npm test`を実行し、既存テスト＋新規テストがすべて通ることを確認してからコミットする。
- 新規テーブルのRLSは既存`tasks`テーブルの`tasks_*_own_org`パターン（`organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))`、roleを見ない）を踏襲する。
- Supabase本番プロジェクトID：`uhhofjcyotfyrlhaguvy`。マイグレーション適用は`mcp__claude_ai_Supabase__apply_migration`、検証は`mcp__claude_ai_Supabase__execute_sql`を使う。

---

## File Structure

**新規作成：**
- `supabase/migrations/048_task_checklist_items.sql` — テーブル・RLS・organization_id自動導出トリガー
- `app/(club)/clubtasks/ChecklistSection.tsx` — チェックリストの表示・追加・チェック切替・削除（Supabase読み書きを内包）

**変更：**
- `lib/types/task.ts` — `ChecklistItemRow`型を追加
- `lib/tasks/taskFormatting.ts`（+テスト）— `checklistProgressLabel`関数を追加
- `app/(club)/clubtasks/page.tsx` — 集計状態・ローダー・モーダルへの`ChecklistSection`組み込み・カード呼び出し2箇所への`checklistCountByTaskId`受け渡し
- `app/(club)/clubtasks/TaskCardBody.tsx` — 進捗バッジの表示
- `app/(club)/clubtasks/DraggableTaskCard.tsx` — `checklistCountByTaskId`のバケツリレー
- `app/(club)/clubtasks/SwimlaneBoard.tsx` — `checklistCountByTaskId`のバケツリレー

---

### Task 1: マイグレーション（テーブル・RLS・organization_id自動導出トリガー）

**Files:**
- Create: `supabase/migrations/048_task_checklist_items.sql`

**Interfaces:**
- Produces: テーブル`public.task_checklist_items(id, task_id, organization_id, text, is_done, position, created_at)`。`organization_id`はクライアントが送らなくても、BEFORE INSERT/UPDATE OF task_idトリガーが`tasks.organization_id`から自動的に埋める（Task 3のクライアントコードはinsert時に`organization_id`を含めない）。

- [ ] **Step 1: マイグレーションファイルを書く**

`supabase/migrations/048_task_checklist_items.sql`を作成：

```sql
-- 048 task_checklist_items: タスクのチェックリスト（担当者・期限は持たないシンプル仕様）
--
-- organization_id はクライアントから受け取らず、BEFORE INSERT/UPDATE OF task_id
-- トリガーで tasks.organization_id から自動導出する。これにより、クライアントが
-- 自分の別の団体のorganization_idを詐称して他団体のタスクにぶら下げる、といった
-- RLSの取り違えを構造的に防ぐ（CLAUDE.mdの既知の落とし穴：RLSは「フラグ列がある
-- から効いている」とは限らない、という教訓を踏まえた設計）。

CREATE TABLE public.task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_checklist_items_task_id ON public.task_checklist_items(task_id);
CREATE INDEX idx_task_checklist_items_org_id ON public.task_checklist_items(organization_id);

-- organization_id の自動導出（クライアント送信値は無視して上書きする）
CREATE OR REPLACE FUNCTION public.set_task_checklist_item_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.organization_id := (SELECT organization_id FROM public.tasks WHERE id = NEW.task_id);
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'task_id % does not reference an existing task', NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_task_checklist_item_org() FROM PUBLIC;

CREATE TRIGGER task_checklist_items_set_org
  BEFORE INSERT OR UPDATE OF task_id ON public.task_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_task_checklist_item_org();

ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_checklist_items_select_own_org"
  ON public.task_checklist_items
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "task_checklist_items_insert_own_org"
  ON public.task_checklist_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "task_checklist_items_update_own_org"
  ON public.task_checklist_items
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "task_checklist_items_delete_own_org"
  ON public.task_checklist_items
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );
```

- [ ] **Step 2: 本番Supabase（project `uhhofjcyotfyrlhaguvy`）に適用**

`mcp__claude_ai_Supabase__apply_migration`で上記ファイルを適用する。適用前に`mcp__claude_ai_Supabase__list_tables`で`task_checklist_items`が存在しないことを確認し、適用後に`mcp__claude_ai_Supabase__get_advisors(type: "security")`で新規の警告が増えていないことを確認する。

- [ ] **Step 3: 動作確認（BEGIN...ROLLBACKで実地検証）**

まず実在するタスク1件のIDと、そのタスクが属する団体のメンバー（user_id）を1人特定する（`mcp__claude_ai_Supabase__execute_sql`で`SELECT id, organization_id FROM public.tasks LIMIT 1;`→`SELECT user_id FROM public.organization_members WHERE organization_id = '<上のorganization_id>' LIMIT 1;`）。同時に、**その団体に所属しない**別のユーザー（`SELECT id FROM public.profiles WHERE id NOT IN (SELECT user_id FROM public.organization_members WHERE organization_id = '<organization_id>') LIMIT 1;`）も1人特定する。

その2つのuser_idと1つのtask_idを使い、`mcp__claude_ai_Supabase__execute_sql`で以下を1回のクエリとして実行する（**過去のセッションで`SET LOCAL ROLE authenticated`切り替え後に強いロールが必要なクエリを混ぜて失敗した例が複数回ある**ので、`RESET ROLE`のタイミングに注意する。CLAUDE.mdの落とし穴参照）：

```sql
BEGIN;

-- ---- ケース1：団体メンバーが自分の団体のタスクにチェックリスト項目を追加できる ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<member_user_id>')::text, true);

INSERT INTO public.task_checklist_items (task_id, text, position)
VALUES ('<task_id>', 'RLS検証用アイテム', 0)
RETURNING id, task_id, organization_id, text, is_done;
-- 期待：1行返る。organization_idはtasksの実際のorganization_idと一致する
-- （挿入時にorganization_idを渡していないのに自動で埋まっていることを確認する）

-- ---- ケース2：非メンバーは同じタスクにチェックリスト項目を追加できない ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<non_member_user_id>')::text, true);

INSERT INTO public.task_checklist_items (task_id, text, position)
VALUES ('<task_id>', '非メンバーからの挿入（失敗するはず）', 1);
-- 期待：new row violates row-level security policy エラーになる

RESET ROLE;
ROLLBACK;
```

Expected: ケース1は1行返り`organization_id`がタスクの所属団体と一致、ケース2はRLS違反エラー。`ROLLBACK`により、この検証で挿入した行は本番に残らない。

- [ ] **Step 4: コミット**

```bash
git add supabase/migrations/048_task_checklist_items.sql
git commit -m "$(cat <<'EOF'
feat(clubtasks): チェックリスト用テーブルtask_checklist_itemsを追加

organization_idはBEFORE INSERT/UPDATEトリガーでtasksから自動導出し、
クライアントの詐称を構造的に防ぐ。RLSは既存tasksテーブルと同じ
tasks_*_own_orgパターン（roleを見ない・団体メンバー全員が読み書き可）。
EOF
)"
```

---

### Task 2: 型定義と進捗ラベルの純粋関数（TDD）

**Files:**
- Modify: `lib/types/task.ts`
- Modify: `lib/tasks/taskFormatting.ts:1-38`（全体）
- Modify: `lib/tasks/taskFormatting.test.ts:1-51`（全体）

**Interfaces:**
- Produces: `ChecklistItemRow`型（`@/lib/types/task`からexport）。`checklistProgressLabel(done: number, total: number): string | null`（`@/lib/tasks/taskFormatting`からexport。Task 4で`TaskCardBody`が使用）

- [ ] **Step 1: `lib/types/task.ts`に`ChecklistItemRow`を追加**

`lib/types/task.ts`の末尾に追記：

```ts

/** タスクのチェックリスト項目（task_checklist_items テーブル） */
export interface ChecklistItemRow {
  id: string;
  task_id: string;
  organization_id: string;
  text: string;
  is_done: boolean;
  position: number;
  created_at?: string;
}
```

- [ ] **Step 2: 失敗するテストを書く**

`lib/tasks/taskFormatting.test.ts`の末尾（ファイル最後の`});`の後）に追記：

```ts

describe("checklistProgressLabel", () => {
  it("returns null when there are no checklist items", () => {
    expect(checklistProgressLabel(0, 0)).toBeNull();
  });

  it("formats done/total when items exist", () => {
    expect(checklistProgressLabel(2, 5)).toBe("2/5");
  });

  it("formats correctly when all items are done", () => {
    expect(checklistProgressLabel(3, 3)).toBe("3/3");
  });

  it("formats correctly when none are done yet", () => {
    expect(checklistProgressLabel(0, 4)).toBe("0/4");
  });
});
```

ファイル冒頭のimportを次に置き換える：

```ts
import { describe, expect, it } from "vitest";
import { checklistProgressLabel, formatDue, priorityBadgeClass, priorityLabel } from "./taskFormatting";
```

- [ ] **Step 3: テストを実行し、失敗することを確認**

Run: `npm test -- taskFormatting`
Expected: FAIL（`checklistProgressLabel`が存在しない）

- [ ] **Step 4: `lib/tasks/taskFormatting.ts`に実装を追加**

ファイル末尾に追記：

```ts

/**
 * カンバンカードの「2/5」のような進捗バッジ用ラベル。
 * チェックリスト項目が1件も無いタスクにはバッジ自体を出さないため null を返す。
 */
export function checklistProgressLabel(
  done: number,
  total: number
): string | null {
  if (total <= 0) return null;
  return `${done}/${total}`;
}
```

- [ ] **Step 5: テストを実行し、通ることを確認**

Run: `npm test -- taskFormatting`
Expected: PASS（新規4テストを含め全て成功）

- [ ] **Step 6: 型チェック・全テスト実行**

Run: `npx tsc --noEmit && npm test`
Expected: 両方PASS

- [ ] **Step 7: コミット**

```bash
git add lib/types/task.ts lib/tasks/taskFormatting.ts lib/tasks/taskFormatting.test.ts
git commit -m "feat(clubtasks): チェックリスト項目の型と進捗ラベル関数を追加"
```

---

### Task 3: `ChecklistSection`コンポーネントと編集モーダルへの組み込み

**Files:**
- Create: `app/(club)/clubtasks/ChecklistSection.tsx`
- Modify: `app/(club)/clubtasks/page.tsx`

**Interfaces:**
- Consumes: `ChecklistItemRow`（`@/lib/types/task`、Task 2）
- Produces: `ChecklistSection`（デフォルトexport）。Props：`{ taskId: string; onCountChange: (taskId: string, done: number, total: number) => void }`（Task 4で`page.tsx`の集計状態がこのコールバックを受け取る）

- [ ] **Step 1: `app/(club)/clubtasks/ChecklistSection.tsx`を作成**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui";
import type { ChecklistItemRow } from "@/lib/types/task";

type Props = {
  taskId: string;
  onCountChange: (taskId: string, done: number, total: number) => void;
};

function reportCounts(
  taskId: string,
  items: ChecklistItemRow[],
  onCountChange: Props["onCountChange"]
) {
  onCountChange(
    taskId,
    items.filter((i) => i.is_done).length,
    items.length
  );
}

export default function ChecklistSection({ taskId, onCountChange }: Props) {
  const [items, setItems] = useState<ChecklistItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("task_checklist_items")
      .select("id, task_id, organization_id, text, is_done, position, created_at")
      .eq("task_id", taskId)
      .order("position", { ascending: true });
    setLoading(false);
    if (error) {
      console.error("checklist items fetch error:", error);
      toast.error("チェックリストの読み込みに失敗しました");
      return;
    }
    const rows = (data as ChecklistItemRow[]) ?? [];
    setItems(rows);
    reportCounts(taskId, rows, onCountChange);
  }, [taskId, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newText.trim();
    if (!text) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("task_checklist_items")
      .insert({ task_id: taskId, text, position: items.length })
      .select("id, task_id, organization_id, text, is_done, position, created_at")
      .single();
    setAdding(false);
    if (error || !data) {
      console.error("checklist item insert error:", error);
      toast.error("チェックリスト項目の追加に失敗しました");
      return;
    }
    const next = [...items, data as ChecklistItemRow];
    setItems(next);
    setNewText("");
    reportCounts(taskId, next, onCountChange);
  };

  const handleToggle = async (item: ChecklistItemRow) => {
    const prevItems = items;
    const next = items.map((i) =>
      i.id === item.id ? { ...i, is_done: !i.is_done } : i
    );
    setItems(next);
    reportCounts(taskId, next, onCountChange);

    const { error } = await supabase
      .from("task_checklist_items")
      .update({ is_done: !item.is_done })
      .eq("id", item.id);
    if (error) {
      console.error("checklist item update error:", error);
      toast.error("チェックリストの更新に失敗しました");
      setItems(prevItems);
      reportCounts(taskId, prevItems, onCountChange);
    }
  };

  const handleDelete = async (item: ChecklistItemRow) => {
    const prevItems = items;
    const next = items.filter((i) => i.id !== item.id);
    setItems(next);
    reportCounts(taskId, next, onCountChange);

    const { error } = await supabase
      .from("task_checklist_items")
      .delete()
      .eq("id", item.id);
    if (error) {
      console.error("checklist item delete error:", error);
      toast.error("チェックリスト項目の削除に失敗しました");
      setItems(prevItems);
      reportCounts(taskId, prevItems, onCountChange);
    }
  };

  return (
    <div>
      <label className="block text-sm font-bold text-ink mb-1">
        チェックリスト
      </label>
      {loading ? (
        <p className="text-xs text-graphite/70">読み込み中...</p>
      ) : (
        <ul className="space-y-1 mb-2">
          {items.length === 0 && (
            <li className="text-xs text-graphite/70">項目はまだありません。</li>
          )}
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.is_done}
                onChange={() => handleToggle(item)}
                className="w-4 h-4 accent-ink shrink-0"
              />
              <span
                className={`flex-1 text-sm ${
                  item.is_done ? "line-through text-graphite/50" : "text-ink"
                }`}
              >
                {item.text}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="p-1 text-graphite/50 hover:text-seal shrink-0"
                aria-label="削除"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="項目を追加"
          disabled={adding}
          className="flex-1"
        />
        <Button
          type="submit"
          variant="outlineMuted"
          disabled={adding || !newText.trim()}
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: `page.tsx`に集計状態とローダーを追加**

`app/(club)/clubtasks/page.tsx`内の`const [currentUserId, setCurrentUserId] = useState<string | null>(null);`という行の直後に追加：

```tsx
  const [checklistCountByTaskId, setChecklistCountByTaskId] = useState<
    Record<string, { done: number; total: number }>
  >({});
```

ファイル冒頭のimportに追加（`import GanttView from "./GanttView";`の直前）：

```tsx
import ChecklistSection from "./ChecklistSection";
```

次の`useEffect(() => { if (orgId) { loadTasks(); loadMembers(); } }, [orgId, loadTasks, loadMembers]);`ブロック（この文字列で一意に検索できる）の直前に、新しいローダーを追加する。**注意**：`page.tsx`には`}, [orgId]);`という行が`loadTasks`と`loadMembers`の両方の末尾に1つずつ計2箇所存在するため、それ単体を目印にしない。必ずこの`useEffect(...)`ブロック全体を目印にすること：

```tsx
  const loadChecklistCounts = useCallback(async () => {
    if (!orgId) return;
    const { data, error } = await supabase
      .from("task_checklist_items")
      .select("task_id, is_done")
      .eq("organization_id", orgId);
    if (error) {
      console.error("checklist counts fetch error:", error);
      return;
    }
    const counts: Record<string, { done: number; total: number }> = {};
    for (const row of (data as Array<{ task_id: string; is_done: boolean }>) ?? []) {
      const c = counts[row.task_id] ?? { done: 0, total: 0 };
      c.total += 1;
      if (row.is_done) c.done += 1;
      counts[row.task_id] = c;
    }
    setChecklistCountByTaskId(counts);
  }, [orgId]);
```

続けて、その直後にある`useEffect(() => { if (orgId) { loadTasks(); loadMembers(); } }, [orgId, loadTasks, loadMembers]);`を次に置き換える：

```tsx
  useEffect(() => {
    if (orgId) {
      loadTasks();
      loadMembers();
      loadChecklistCounts();
    }
  }, [orgId, loadTasks, loadMembers, loadChecklistCounts]);
```

`memberEmailById`の`useMemo`の直後（`notifyTaskChange`の`useCallback`の直前）に、集計更新コールバックを追加：

```tsx
  const handleChecklistCountChange = useCallback(
    (taskId: string, done: number, total: number) => {
      setChecklistCountByTaskId((prev) => ({
        ...prev,
        [taskId]: { done, total },
      }));
    },
    []
  );
```

- [ ] **Step 3: 編集モーダルに`ChecklistSection`を組み込む**

`app/(club)/clubtasks/page.tsx`内の、モーダルフォームの`<div className="flex justify-end gap-2 pt-2">`（キャンセル・保存ボタンの行）の直前に、次を挿入する：

```tsx
              {editingTask ? (
                <ChecklistSection
                  taskId={editingTask.id}
                  onCountChange={handleChecklistCountChange}
                />
              ) : (
                <p className="text-xs text-graphite/60">
                  チェックリストは保存後に追加できます。
                </p>
              )}
```

- [ ] **Step 4: 型チェック・全テスト実行**

Run: `npx tsc --noEmit && npm test`
Expected: 両方PASS

- [ ] **Step 5: ブラウザで手動確認**

`npm run dev`を起動し、`/clubtasks`で既存タスクの編集モーダルを開く：
- 「チェックリスト」欄が表示され、「項目はまだありません。」と出ること
- 項目を追加できること（入力→＋ボタン）
- チェックを入り切りできること、取り消し線が付くこと
- 削除ボタンで項目が消えること
- 新規タスク作成モーダル（「新規タスク追加」ボタン）では「チェックリストは保存後に追加できます。」と表示され、チェックリストUIが出ないこと

確認後、開発サーバーを停止する。

- [ ] **Step 6: コミット**

```bash
git add app/\(club\)/clubtasks/ChecklistSection.tsx app/\(club\)/clubtasks/page.tsx
git commit -m "feat(clubtasks): チェックリストの追加・チェック・削除UIを編集モーダルに追加"
```

---

### Task 4: カンバンカードへの進捗バッジ表示

**Files:**
- Modify: `app/(club)/clubtasks/TaskCardBody.tsx`
- Modify: `app/(club)/clubtasks/DraggableTaskCard.tsx`
- Modify: `app/(club)/clubtasks/SwimlaneBoard.tsx`
- Modify: `app/(club)/clubtasks/page.tsx`

**Interfaces:**
- Consumes: `checklistProgressLabel`（`@/lib/tasks/taskFormatting`、Task 2）

- [ ] **Step 1: `TaskCardBody.tsx`にバッジを追加**

`app/(club)/clubtasks/TaskCardBody.tsx`のimportを次に置き換える：

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

`type Props = { ... };`を次に置き換える：

```tsx
type Props = {
  task: TaskRow;
  status: TaskStatus;
  memberNameById: Record<string, string>;
  checklistCountByTaskId: Record<string, { done: number; total: number }>;
  onOpen: (task: TaskRow) => void;
};
```

`export default function TaskCardBody({ ... }: Props) {`を次に置き換える：

```tsx
export default function TaskCardBody({
  task,
  status,
  memberNameById,
  checklistCountByTaskId,
  onOpen,
}: Props) {
  const checklistProgress = checklistCountByTaskId[task.id];
  const checklistLabel = checklistProgress
    ? checklistProgressLabel(checklistProgress.done, checklistProgress.total)
    : null;

```

（この直後に既存の`return ( <button ...`が続く。`return`の前に上記のローカル変数計算を挿入する形）

レビュー者表示のブロック（`{status === "in_review" && task.reviewer_id && memberNameById[task.reviewer_id] && ( ... )}`）の直後、`</button>`の直前に追加：

```tsx
      {checklistLabel && (
        <p className="text-xs text-graphite/70 flex items-center gap-1 mt-0.5">
          <ListChecks className="w-[14px] h-[14px]" aria-hidden="true" />
          {checklistLabel}
        </p>
      )}
```

- [ ] **Step 2: `DraggableTaskCard.tsx`でバケツリレー**

`app/(club)/clubtasks/DraggableTaskCard.tsx`の`type Props = { ... };`を次に置き換える：

```tsx
type Props = {
  task: TaskRow;
  index: number;
  status: TaskStatus;
  isDone: boolean;
  tint: string | null;
  memberNameById: Record<string, string>;
  checklistCountByTaskId: Record<string, { done: number; total: number }>;
  onOpen: (task: TaskRow) => void;
};
```

`export default function DraggableTaskCard({ ... }: Props) {`の引数分解を次に置き換える：

```tsx
export default function DraggableTaskCard({
  task,
  index,
  status,
  isDone,
  tint,
  memberNameById,
  checklistCountByTaskId,
  onOpen,
}: Props) {
```

内部の`<TaskCardBody task={task} status={status} memberNameById={memberNameById} onOpen={onOpen} />`を次に置き換える：

```tsx
          <TaskCardBody
            task={task}
            status={status}
            memberNameById={memberNameById}
            checklistCountByTaskId={checklistCountByTaskId}
            onOpen={onOpen}
          />
```

- [ ] **Step 3: `SwimlaneBoard.tsx`でバケツリレー**

`app/(club)/clubtasks/SwimlaneBoard.tsx`の`type Props = { ... };`に1行追加する（`memberNameById: Record<string, string>;`の直後）：

```tsx
  memberNameById: Record<string, string>;
  checklistCountByTaskId: Record<string, { done: number; total: number }>;
```

`export default function SwimlaneBoard({ ... }: Props) {`の引数分解に追加（`memberNameById,`の直後）：

```tsx
  memberNameById,
  checklistCountByTaskId,
```

`SwimlaneBoard.tsx`内の次のブロック（`{items.map((task, index) => (`から対応する`))}`まで。ファイル内で唯一の`DraggableTaskCard`呼び出しなので、`<DraggableTaskCard`という文字列で一意に検索できる）：

```tsx
                        {items.map((task, index) => (
                          <DraggableTaskCard
                            key={task.id}
                            task={task}
                            index={index}
                            status={lane.id}
                            isDone={isDone}
                            tint={tint}
                            memberNameById={memberNameById}
                            onOpen={onOpen}
                          />
                        ))}
```

を次に置き換える：

```tsx
                        {items.map((task, index) => (
                          <DraggableTaskCard
                            key={task.id}
                            task={task}
                            index={index}
                            status={lane.id}
                            isDone={isDone}
                            tint={tint}
                            memberNameById={memberNameById}
                            checklistCountByTaskId={checklistCountByTaskId}
                            onOpen={onOpen}
                          />
                        ))}
```

- [ ] **Step 4: `page.tsx`の2つの呼び出し箇所に`checklistCountByTaskId`を渡す**

`page.tsx`のフラットかんばん内、次のブロック（`{items.map((task, index) => (`から対応する`))}`まで。`page.tsx`内で唯一の`DraggableTaskCard`呼び出しなので、`<DraggableTaskCard`という文字列で一意に検索できる）：

```tsx
                          {items.map((task, index) => (
                            <DraggableTaskCard
                              key={task.id}
                              task={task}
                              index={index}
                              status={lane.id}
                              isDone={isDone}
                              tint={tint}
                              memberNameById={memberNameById}
                              onOpen={openEditModal}
                            />
                          ))}
```

を次に置き換える：

```tsx
                          {items.map((task, index) => (
                            <DraggableTaskCard
                              key={task.id}
                              task={task}
                              index={index}
                              status={lane.id}
                              isDone={isDone}
                              tint={tint}
                              memberNameById={memberNameById}
                              checklistCountByTaskId={checklistCountByTaskId}
                              onOpen={openEditModal}
                            />
                          ))}
```

`page.tsx`内の次のブロック（`page.tsx`内で唯一の`<SwimlaneBoard`呼び出しなので、その文字列で一意に検索できる）：

```tsx
            <SwimlaneBoard
              tasks={visibleTasks}
              axis={swimlaneAxis}
              lanes={LANES}
              laneTintById={STATUS_TINT}
              whiteTextLanes={WHITE_TEXT_LANES}
              normalizeStatus={normalizeStatus}
              sortTasksInLane={sortTasksInLane}
              memberNameById={memberNameById}
              onOpen={openEditModal}
            />
```

を次に置き換える：

```tsx
            <SwimlaneBoard
              tasks={visibleTasks}
              axis={swimlaneAxis}
              lanes={LANES}
              laneTintById={STATUS_TINT}
              whiteTextLanes={WHITE_TEXT_LANES}
              normalizeStatus={normalizeStatus}
              sortTasksInLane={sortTasksInLane}
              memberNameById={memberNameById}
              checklistCountByTaskId={checklistCountByTaskId}
              onOpen={openEditModal}
            />
```

- [ ] **Step 5: 型チェック・全テスト実行**

Run: `npx tsc --noEmit && npm test`
Expected: 両方PASS

- [ ] **Step 6: ブラウザで手動確認**

`npm run dev`を起動し、`/clubtasks`で：
- チェックリスト項目を追加したタスクのカンバンカードに「0/1」のようなバッジが表示されること
- チェックを入れるとカードのバッジが「1/1」に更新されること（モーダルを閉じた後、カードの表示に反映される）
- チェックリスト項目が無いタスクのカードにはバッジが出ないこと
- 表型ビュー・カレンダービューには今回バッジを追加していないため、表示に変化が無いこと（意図通り）
- カンバンのスイムレーン表示（種別ごと／担当者ごと）でもバッジが正しく出ること

確認後、開発サーバーを停止する。

- [ ] **Step 7: コミット**

```bash
git add app/\(club\)/clubtasks/TaskCardBody.tsx app/\(club\)/clubtasks/DraggableTaskCard.tsx app/\(club\)/clubtasks/SwimlaneBoard.tsx app/\(club\)/clubtasks/page.tsx
git commit -m "feat(clubtasks): カンバンカードにチェックリストの進捗バッジを表示"
```
