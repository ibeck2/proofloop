# /clubtasks 成果物・アウトプット添付機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/clubtasks`の各タスクに、ファイル添付（成果物・アウトプット）を追加できるようにする。担当者・作成者に限らず団体メンバー全員が読み書きできる。

**Architecture:** 新規テーブル`task_attachments`（`task_id`にぶら下がる、`organization_id`はBEFORE INSERT/UPDATEトリガーで`tasks`から自動導出——チェックリスト機能で見つかった「列指定トリガーの穴」の教訓を踏まえ、最初から列指定なしの`BEFORE INSERT OR UPDATE`で作る）。ファイル実体はSupabase Storageの非公開バケット`task-attachments`に保存し、パスの先頭セグメントを`organization_id`にすることでStorageのRLSも`is_org_member`関数で判定する（`finance-receipts`バケットと同じ設計、ただし添付は団体メンバー全員が読み書き可）。編集モーダル内に新設する`AttachmentSection`コンポーネントが自分でSupabase Storage/テーブルへの読み書きを行う。アップロードトリガーは`<form>`要素を使わず、hidden file inputへの`<label>`クリック方式にする（チェックリスト機能で見つかったフォーム入れ子バグの教訓）。

**Tech Stack:** Next.js 15 App Router / TypeScript / Supabase（Postgres・RLS・Storage）/ vitest

## Global Constraints
- ロジックは`lib/`に純粋関数として切り出しテストする（CLAUDE.md §5）。UIコンポーネントに計算を埋め込まない。
- デザインは`lib/design/tokens.ts`の6色トークンのみ使用（ink/seal/paper/mist/rule/graphite）。新しい色を足さない。
- 型チェックは`npx tsc --noEmit`を使う（`npm run build`は使わない。開発サーバー稼働中に叩くと`.next`が壊れる）。
- 各タスクの最後で`npm test`を実行し、既存テスト＋新規テストがすべて通ることを確認してからコミットする。
- 新規テーブルのRLSは既存`tasks`テーブルの`tasks_*_own_org`パターン（`organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))`、roleを見ない）を踏襲する。
- `organization_id`はクライアントから受け取らず、BEFORE INSERT/UPDATEトリガーで`tasks.organization_id`から自動導出する。トリガーは列指定せず全UPDATEを対象にする（`task_checklist_items`で列指定トリガーがRLSの取り違えを許した反省を踏まえる。詳細は`docs/task-board.md`セクションS参照）。
- Supabase本番プロジェクトID：`uhhofjcyotfyrlhaguvy`。マイグレーション適用は`mcp__claude_ai_Supabase__apply_migration`、検証は`mcp__claude_ai_Supabase__execute_sql`を使う。
- モーダル内に新設するUIは、既存の`<form onSubmit={handleSave}>`の中に置かれる。**`<form>`要素を新たに作らない**（ネストしたformのsubmitイベントが外側のフォームにバブリングし、タスクの意図しない保存・モーダルの意図しない終了を引き起こすバグが`ChecklistSection`で実際に発生し修正済み。同じ罠を踏まない）。ファイルアップロードのトリガーは、隠した`<input type="file">`をクリックする`<label>`要素で行う。

---

## File Structure

**新規作成：**
- `supabase/migrations/051_task_attachments.sql` — テーブル・RLS・organization_id自動導出トリガー・Storageバケット・Storage RLS
- `app/(club)/clubtasks/AttachmentSection.tsx` — 添付ファイルの一覧・アップロード・ダウンロード・削除（Supabase Storage/テーブル読み書きを内包）

**変更：**
- `lib/types/task.ts` — `AttachmentRow`型を追加
- `lib/tasks/taskFormatting.ts`（+テスト）— `formatFileSize`関数を追加
- `app/(club)/clubtasks/page.tsx` — 編集モーダルへの`AttachmentSection`組み込み

このバックエンド構造・データモデルはチェックリスト機能（`task_checklist_items`、`docs/superpowers/plans/2026-08-17-clubtasks-checklist.md`）とほぼ同じパターンだが、以下の点が異なる：
- ファイル実体をSupabase Storageに保存する（テーブルはメタデータのみ）ため、バケット作成とStorage RLSが追加で必要
- カンバンカードへの進捗バッジ表示は設計上求められていない（チェックリストの「2/5」バッジに相当するものは無い）ため、カード側コンポーネント（`TaskCardBody.tsx`・`DraggableTaskCard.tsx`・`SwimlaneBoard.tsx`）の変更は不要

---

### Task 1: マイグレーション（テーブル・RLS・トリガー・Storageバケット）

**Files:**
- Create: `supabase/migrations/051_task_attachments.sql`

**Interfaces:**
- Produces: テーブル`public.task_attachments(id, task_id, organization_id, uploaded_by, file_path, file_name, file_size, mime_type, created_at)`。Storageバケット`task-attachments`（非公開）。`organization_id`はクライアントが送らなくても、BEFORE INSERT/UPDATEトリガーが`tasks.organization_id`から自動的に埋める（Task 3のクライアントコードはinsert時に`organization_id`を含めない）。

- [ ] **Step 1: マイグレーションファイルを書く**

`supabase/migrations/051_task_attachments.sql`を作成：

```sql
-- 051 task_attachments: タスクの成果物・アウトプット添付
--
-- ファイル実体はSupabase Storage（バケット task-attachments、非公開）に保存し、
-- このテーブルはメタデータのみを持つ。organization_id はクライアントから受け取らず、
-- BEFORE INSERT/UPDATE トリガーで tasks.organization_id から自動導出する
-- （task_checklist_items で「BEFORE INSERT OR UPDATE OF task_id」という列指定トリガーが
-- 穴になっていた反省を踏まえ、最初から列指定なしの BEFORE INSERT OR UPDATE にする。
-- 詳細は docs/task-board.md セクションS参照）。
--
-- 添付できるのは団体メンバー全員（担当者・作成者に限定しない）。finance-receipts
-- バケットと異なり can_manage_org_finance のような権限制限は付けない。

CREATE TABLE public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX idx_task_attachments_org_id ON public.task_attachments(organization_id);

-- organization_id の自動導出（クライアント送信値は無視して上書きする）
CREATE OR REPLACE FUNCTION public.set_task_attachment_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.organization_id := (SELECT organization_id FROM public.tasks WHERE id = NEW.task_id);
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'task_id % does not reference an existing task', NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_task_attachment_org() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_task_attachment_org() FROM anon, authenticated;

-- 列指定しない（task_checklist_items の反省を踏まえ、text/is_done相当の更新でも
-- 必ずorganization_idを再導出させる）
CREATE TRIGGER task_attachments_set_org
  BEFORE INSERT OR UPDATE ON public.task_attachments
  FOR EACH ROW EXECUTE FUNCTION public.set_task_attachment_org();

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_attachments_select_own_org"
  ON public.task_attachments
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "task_attachments_insert_own_org"
  ON public.task_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "task_attachments_update_own_org"
  ON public.task_attachments
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

CREATE POLICY "task_attachments_delete_own_org"
  ON public.task_attachments
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

-- --------------------------------------------
-- Storage: 添付ファイルバケット（非公開）
-- --------------------------------------------
-- パス規則：{organization_id}/{task_id}/{timestamp}_{filename}
-- storage.foldername(name)[1] が organization_id になるため、is_org_member で判定できる。
-- is_org_member(uuid) は 026_finance_module.sql で作成済みの既存関数を再利用する。

INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "task_attachments_storage_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'task-attachments'
         AND public.is_org_member(((storage.foldername(name))[1])::uuid));

CREATE POLICY "task_attachments_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-attachments'
              AND public.is_org_member(((storage.foldername(name))[1])::uuid));

CREATE POLICY "task_attachments_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'task-attachments'
         AND public.is_org_member(((storage.foldername(name))[1])::uuid));
```

- [ ] **Step 2: 本番Supabase（project `uhhofjcyotfyrlhaguvy`）に適用**

`mcp__claude_ai_Supabase__apply_migration`で上記ファイルを適用する。適用前に`mcp__claude_ai_Supabase__list_tables`で`task_attachments`が存在しないことを確認し、適用後に`mcp__claude_ai_Supabase__get_advisors(type: "security")`で新規の警告が増えていないことを確認する（`REVOKE ALL ... FROM PUBLIC`は本番Supabaseでは無効というCLAUDE.mdの既知の落とし穴があるが、このマイグレーションは`REVOKE EXECUTE ... FROM anon, authenticated`も明示しているため、`task_checklist_items`の048で起きたような新規警告は今回は出ないはず——実際に出ないことを確認する）。

- [ ] **Step 3: 動作確認（BEGIN...ROLLBACKで実地検証）**

まず実在するタスク1件のIDと、そのタスクが属する団体のメンバー（user_id）を1人特定する（`mcp__claude_ai_Supabase__execute_sql`で`SELECT id, organization_id FROM public.tasks LIMIT 1;`→`SELECT user_id FROM public.organization_members WHERE organization_id = '<上のorganization_id>' LIMIT 1;`）。同時に、**その団体に所属しない**別のユーザーも1人特定する（`SELECT id FROM public.profiles WHERE id NOT IN (SELECT user_id FROM public.organization_members WHERE organization_id = '<organization_id>') LIMIT 1;`）。

その2つのuser_idと1つのtask_idを使い、`mcp__claude_ai_Supabase__execute_sql`で以下を1回のクエリとして実行する（`SET LOCAL ROLE authenticated`切り替え後は`RESET ROLE`のタイミングに注意——CLAUDE.mdの落とし穴参照）：

```sql
BEGIN;

-- ---- ケース1：団体メンバーが自分の団体のタスクに添付メタデータを追加できる ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<member_user_id>')::text, true);

INSERT INTO public.task_attachments (task_id, uploaded_by, file_path, file_name, file_size, mime_type)
VALUES ('<task_id>', '<member_user_id>', 'spoofed/path/RLS検証用.txt', 'RLS検証用.txt', 100, 'text/plain')
RETURNING id, task_id, organization_id, file_name;
-- 期待：1行返る。organization_idはtasksの実際のorganization_idと一致する
-- （file_pathに実際の団体IDと違うパスを書いても、organization_id列自体は
-- トリガーで正しく上書きされることを確認する）

-- ---- ケース2：非メンバーは同じタスクに添付メタデータを追加できない ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<non_member_user_id>')::text, true);

INSERT INTO public.task_attachments (task_id, uploaded_by, file_path, file_name, file_size)
VALUES ('<task_id>', '<non_member_user_id>', 'x/y/z.txt', 'z.txt', 1);
-- 期待：new row violates row-level security policy エラーになる

-- ---- ケース3：organization_idだけを直接UPDATEしても再導出される（トリガー適用範囲の確認）----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<member_user_id>')::text, true);

-- ケース1で挿入した行のidを使う想定（同一トランザクション内なので参照できる）
UPDATE public.task_attachments
SET organization_id = (SELECT id FROM public.organizations WHERE id != '<the real organization_id>' LIMIT 1)
WHERE file_name = 'RLS検証用.txt'
RETURNING organization_id;
-- 期待：エラーにはならないが、返るorganization_idは指定した別団体のIDではなく
-- タスクの実際のorganization_idのまま（トリガーが再導出して上書きするため）

RESET ROLE;
ROLLBACK;
```

Expected: ケース1は1行返り`organization_id`がタスクの所属団体と一致、ケース2はRLS違反エラー、ケース3は`organization_id`が指定した別団体IDではなく元のタスクの団体IDのまま。`ROLLBACK`により、この検証で挿入した行は本番に残らない。

- [ ] **Step 4: Storageバケットの存在確認**

`mcp__claude_ai_Supabase__execute_sql`で`SELECT id, name, public FROM storage.buckets WHERE id = 'task-attachments';`を実行し、`public = false`のバケットが1件存在することを確認する。

- [ ] **Step 5: コミット**

```bash
git add supabase/migrations/051_task_attachments.sql
git commit -m "$(cat <<'EOF'
feat(clubtasks): 添付ファイル用テーブルtask_attachmentsとStorageバケットを追加

organization_idはBEFORE INSERT/UPDATE（列指定なし）トリガーでtasksから
自動導出。task_checklist_itemsで見つかった列指定トリガーの穴（048/050参照）
を最初から踏まない設計。RLSは既存tasksテーブルと同じtasks_*_own_orgパターン。
Storageはfinance-receiptsバケットと同じ設計だが、権限制限なし（団体メンバー
全員が読み書き可）。
EOF
)"
```

---

### Task 2: 型定義とファイルサイズ表示の純粋関数（TDD）

**Files:**
- Modify: `lib/types/task.ts`
- Modify: `lib/tasks/taskFormatting.ts`
- Modify: `lib/tasks/taskFormatting.test.ts`

**Interfaces:**
- Produces: `AttachmentRow`型（`@/lib/types/task`からexport）。`formatFileSize(bytes: number): string`（`@/lib/tasks/taskFormatting`からexport。Task 3で`AttachmentSection`が使用）

- [ ] **Step 1: `lib/types/task.ts`に`AttachmentRow`を追加**

`lib/types/task.ts`の末尾（`ChecklistItemRow`定義の後）に追記：

```ts

/** タスクの添付ファイル（task_attachments テーブル） */
export interface AttachmentRow {
  id: string;
  task_id: string;
  organization_id: string;
  uploaded_by: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  created_at?: string;
}
```

- [ ] **Step 2: 失敗するテストを書く**

`lib/tasks/taskFormatting.test.ts`の末尾（ファイル最後の`});`の後）に追記：

```ts

describe("formatFileSize", () => {
  it("formats bytes under 1KB as-is", () => {
    expect(formatFileSize(0)).toBe("0B");
    expect(formatFileSize(500)).toBe("500B");
    expect(formatFileSize(1023)).toBe("1023B");
  });

  it("formats kilobytes with one decimal place", () => {
    expect(formatFileSize(1024)).toBe("1.0KB");
    expect(formatFileSize(2048)).toBe("2.0KB");
    expect(formatFileSize(1536)).toBe("1.5KB");
  });

  it("formats megabytes with one decimal place", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0MB");
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.5MB");
  });
});
```

ファイル冒頭のimportを次に置き換える：

```ts
import { describe, expect, it } from "vitest";
import {
  checklistProgressLabel,
  formatDue,
  formatFileSize,
  priorityBadgeClass,
  priorityLabel,
} from "./taskFormatting";
```

- [ ] **Step 3: テストを実行し、失敗することを確認**

Run: `npm test -- taskFormatting`
Expected: FAIL（`formatFileSize`が存在しない）

- [ ] **Step 4: `lib/tasks/taskFormatting.ts`に実装を追加**

ファイル末尾に追記：

```ts

/**
 * 添付ファイルの一覧表示用に、バイト数を人間可読な文字列に変換する。
 * B → KB → MB のしきい値は 1024 単位（1000 ではない）。
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
```

- [ ] **Step 5: テストを実行し、通ることを確認**

Run: `npm test -- taskFormatting`
Expected: PASS（新規7テストを含め全て成功）

- [ ] **Step 6: 型チェック・全テスト実行**

Run: `npx tsc --noEmit && npm test`
Expected: 両方PASS

- [ ] **Step 7: コミット**

```bash
git add lib/types/task.ts lib/tasks/taskFormatting.ts lib/tasks/taskFormatting.test.ts
git commit -m "feat(clubtasks): 添付ファイルの型とファイルサイズ表示関数を追加"
```

---

### Task 3: `AttachmentSection`コンポーネントと編集モーダルへの組み込み

**Files:**
- Create: `app/(club)/clubtasks/AttachmentSection.tsx`
- Modify: `app/(club)/clubtasks/page.tsx`

**Interfaces:**
- Consumes: `AttachmentRow`（`@/lib/types/task`、Task 2）、`formatFileSize`（`@/lib/tasks/taskFormatting`、Task 2）
- Produces: `AttachmentSection`（デフォルトexport）。Props：`{ taskId: string; organizationId: string }`

- [ ] **Step 1: `app/(club)/clubtasks/AttachmentSection.tsx`を作成**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Paperclip, Trash2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { AttachmentRow } from "@/lib/types/task";
import { formatFileSize } from "@/lib/tasks/taskFormatting";

type Props = {
  taskId: string;
  organizationId: string;
};

export default function AttachmentSection({ taskId, organizationId }: Props) {
  const [items, setItems] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("task_attachments")
      .select(
        "id, task_id, organization_id, uploaded_by, file_path, file_name, file_size, mime_type, created_at"
      )
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.error("attachments fetch error:", error);
      toast.error("添付ファイルの読み込みに失敗しました");
      return;
    }
    setItems((data as AttachmentRow[]) ?? []);
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const path = `${organizationId}/${taskId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage
      .from("task-attachments")
      .upload(path, file);
    if (upErr) {
      console.error("attachment upload error:", upErr);
      toast.error("ファイルのアップロードに失敗しました");
      setUploading(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: insErr } = await supabase.from("task_attachments").insert({
      task_id: taskId,
      uploaded_by: user?.id ?? null,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
    });
    setUploading(false);
    if (insErr) {
      console.error("attachment insert error:", insErr);
      toast.error("添付情報の保存に失敗しました");
      await supabase.storage.from("task-attachments").remove([path]);
      return;
    }
    await load();
  };

  const handleOpen = async (item: AttachmentRow) => {
    const { data, error } = await supabase.storage
      .from("task-attachments")
      .createSignedUrl(item.file_path, 60);
    if (error || !data) {
      console.error("attachment signed url error:", error);
      toast.error("ファイルを開けませんでした");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const handleDelete = async (item: AttachmentRow) => {
    const { error } = await supabase
      .from("task_attachments")
      .delete()
      .eq("id", item.id);
    if (error) {
      console.error("attachment delete error:", error);
      toast.error("添付ファイルの削除に失敗しました");
      return;
    }
    await supabase.storage.from("task-attachments").remove([item.file_path]);
    await load();
  };

  return (
    <div>
      <label className="block text-sm font-bold text-ink mb-1">
        成果物・アウトプット
      </label>
      {loading ? (
        <p className="text-xs text-graphite/70">読み込み中...</p>
      ) : (
        <ul className="space-y-1 mb-2">
          {items.length === 0 && (
            <li className="text-xs text-graphite/70">
              添付ファイルはまだありません。
            </li>
          )}
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpen(item)}
                className="flex-1 flex items-center gap-2 min-w-0 text-left text-sm text-ink hover:underline"
              >
                <Paperclip
                  className="w-4 h-4 shrink-0 text-graphite/50"
                  aria-hidden="true"
                />
                <span className="truncate">{item.file_name}</span>
                <span className="text-xs text-graphite/50 shrink-0">
                  ({formatFileSize(item.file_size)})
                </span>
              </button>
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
      <label className="inline-flex items-center gap-2 text-sm border border-rule rounded-lg px-3 py-1.5 cursor-pointer hover:bg-mist w-fit">
        <Upload className="w-4 h-4" aria-hidden="true" />
        {uploading ? "アップロード中..." : "ファイルを追加"}
        <input
          type="file"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>
    </div>
  );
}
```

**注意**：この`<label>`＋隠し`<input type="file">`のパターンは`<form>`要素を一切使わない。`ChecklistSection`で発生した「ネストしたformのsubmitイベントが外側のタスク編集フォームにバブリングし、モーダルが意図せず閉じる」バグと同じ構造を避けるための意図的な選択。

- [ ] **Step 2: 編集モーダルに`AttachmentSection`を組み込む**

`app/(club)/clubtasks/page.tsx`の以下のブロック（`{editingTask ? ( <ChecklistSection ... /> ) : ( <p ...>チェックリストは保存後に追加できます。</p> )}`、この文字列で一意に検索できる）：

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

を次に置き換える：

```tsx
              {editingTask ? (
                <>
                  <ChecklistSection
                    taskId={editingTask.id}
                    onCountChange={handleChecklistCountChange}
                  />
                  <AttachmentSection
                    taskId={editingTask.id}
                    organizationId={editingTask.organization_id}
                  />
                </>
              ) : (
                <p className="text-xs text-graphite/60">
                  チェックリスト・添付ファイルは保存後に追加できます。
                </p>
              )}
```

ファイル冒頭のimportに追加（`import ChecklistSection from "./ChecklistSection";`の直後）：

```tsx
import AttachmentSection from "./AttachmentSection";
```

- [ ] **Step 3: 型チェック・全テスト実行**

Run: `npx tsc --noEmit && npm test`
Expected: 両方PASS

- [ ] **Step 4: ブラウザで手動確認**

`npm run dev`を起動し、`/clubtasks`で既存タスクの編集モーダルを開く：
- 「成果物・アウトプット」欄が表示され、「添付ファイルはまだありません。」と出ること
- 「ファイルを追加」をクリックしてファイルを選択すると、**モーダルが閉じずに**アップロードされ一覧に追加されること（フォーム入れ子バグが再発していないことの確認が最重要）
- 追加したファイル名をクリックすると、新しいタブでファイルが開くこと（署名付きURL）
- 削除ボタンでファイルが一覧から消えること
- 新規タスク作成モーダルでは「チェックリスト・添付ファイルは保存後に追加できます。」と表示され、チェックリスト・添付どちらのUIも出ないこと
- ブラウザのコンソールにエラーが出ていないこと

確認後、開発サーバーを停止する。

- [ ] **Step 5: コミット**

```bash
git add app/\(club\)/clubtasks/AttachmentSection.tsx app/\(club\)/clubtasks/page.tsx
git commit -m "feat(clubtasks): 添付ファイルのアップロード・一覧・削除UIを編集モーダルに追加"
```
