# /clubtasks 年度アーカイブ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/clubtasks`に、団体の代表者（`role IN ('owner','admin')`）が「年度アーカイブ」を実行できる機能を追加する。実行すると、その時点で未アーカイブの全タスクに一括で`archived_at`・`archive_label`が書き込まれ、以降デフォルトの4ビュー（カンバン・表・カレンダー・ガント）から除外される。「表示」フィルタから過去のアーカイブを参照専用で閲覧できる。

**Architecture:** 新規テーブルは作らず、既存`tasks`に`archived_at timestamptz`・`archive_label text`列を追加する。誰でも書き込める既存の`tasks_update_own_org`RLSではrole判定ができないため、この2列だけは`authenticated`/`anon`からUPDATE権限を明示的に剥がし、`SECURITY DEFINER`のRPC`archive_organization_tasks`経由でのみ書き込めるようにする（RPC内部で呼び出し元のrole＝owner/adminをチェックしてから一括UPDATEする）。フィルタリング（現在のタスクのみ表示・特定のアーカイブラベルのみ表示）はDBアクセスの無い純粋関数に切り出しTDDでカバーする。アーカイブ履歴閲覧中はドラッグ操作・新規タスク追加を無効化し「参照専用」を実現する。

**Tech Stack:** Next.js 15 App Router / TypeScript / Supabase（Postgres・RLS・SECURITY DEFINER RPC）/ vitest

## Global Constraints
- ロジックは`lib/`に純粋関数として切り出しテストする（CLAUDE.md §5）。UIコンポーネントに計算を埋め込まない。
- デザインは`lib/design/tokens.ts`の6色トークンのみ使用（ink/seal/paper/mist/rule/graphite）。新しい色を足さない。
- 型チェックは`npx tsc --noEmit`を使う（`npm run build`は使わない）。
- 各タスクの最後で`npm test`を実行し、既存テスト＋新規テストがすべて通ることを確認してからコミットする。
- **`archived_at`・`archive_label`の書き込みは、SECURITY DEFINER RPC `archive_organization_tasks`経由のみに限定する。** クライアントの`.update()`が誰でもこの2列を直接書き換えられる状態のままだと、「代表者のみが年度アーカイブを実行できる」という要件がRLSレベルで担保されない（CLAUDE.mdの既知の落とし穴：「フラグ列があるから効いている」とは限らない、を踏まえた設計）。列レベルの`REVOKE UPDATE (archived_at, archive_label)`で塞ぎ、RPCは`SECURITY DEFINER`（＝呼び出し元ロールではなく関数所有者の権限で実行される）ため、この列制限の影響を受けずに書き込める。
- 列レベルの`REVOKE`を入れる前に、既存の保存経路（`page.tsx`の`handleSave`の`.update()`）が`archived_at`・`archive_label`を一切含まない、列を明示列挙する形の更新であることを確認済み（upsert/`ON CONFLICT DO UPDATE`ではないため、CLAUDE.mdの「upsertは触っていない列にもUPDATE権限が要る」という既知の落とし穴には該当しない）。
- `tasks`テーブル自体は列レベルのGRANT制限が無い（`pg_attribute.attacl`が既存列で全てNULL＝テーブルレベルの標準GRANT）ことを確認済みなので、`archived_at`・`archive_label`列の追加自体には明示的なGRANTは不要（上記の意図的なREVOKEを除く）。
- 新規RPCは`REVOKE ALL ... FROM PUBLIC`だけでは実効性が無い（CLAUDE.mdの既知の落とし穴：Supabaseでは`anon`/`authenticated`への権限がデフォルト権限で直接付与されるため）。`REVOKE EXECUTE ... FROM anon`を明示し、`authenticated`にのみ`GRANT EXECUTE`する。
- モーダル内に追加するUIは`<form>`要素を使わない（`type="button"`のボタンのみで完結させる。今回追加するアーカイブ確認モーダルはタスク編集モーダルとは独立した別のダイアログなので、既存の`<form onSubmit={handleSave}>`との入れ子は発生しないが、念のため新規に`<form>`を作らないことを徹底する）。
- アーカイブ実行は「代表者（owner/admin）のみ」。UI側では`useClubOrganization()`が返す`activeRole`が`"owner"`または`"admin"`の場合のみ「年度アーカイブ」ボタンを表示する。ただしこれはUXのためのガードであり、実際の権限担保はRPC内部のrole検査（上記）が担う。
- Supabase本番プロジェクトID：`uhhofjcyotfyrlhaguvy`。マイグレーション適用は`mcp__claude_ai_Supabase__apply_migration`、検証は`mcp__claude_ai_Supabase__execute_sql`を使う。

---

## File Structure

**新規作成：**
- `supabase/migrations/057_tasks_archive.sql` — `tasks`への列追加・列レベルREVOKE・アーカイブ実行RPC
- `lib/tasks/taskArchive.ts` — アーカイブ表示のフィルタリング・ラベル一覧の純粋関数
- `lib/tasks/taskArchive.test.ts` — 上記のテスト

**変更：**
- `lib/types/task.ts` — `TaskRow`に`archived_at`・`archive_label`フィールドを追加
- `app/(club)/clubtasks/page.tsx` — 「表示」フィルタ（現在のタスク／過去のアーカイブ）・「年度アーカイブ」ボタンと確認モーダル・アーカイブ履歴閲覧中のドラッグ/新規追加無効化

---

### Task 1: マイグレーション（列追加・列レベルREVOKE・アーカイブ実行RPC）

**Files:**
- Create: `supabase/migrations/057_tasks_archive.sql`

**Interfaces:**
- Produces: `public.tasks.archived_at`（`timestamptz`、null許容）・`public.tasks.archive_label`（`text`、null許容）。RPC `public.archive_organization_tasks(p_organization_id uuid, p_archive_label text) RETURNS integer`（更新した行数を返す。呼び出し元が対象団体のowner/adminでない場合は例外を投げる）。

- [ ] **Step 1: マイグレーションファイルを書く**

`supabase/migrations/057_tasks_archive.sql`を作成：

```sql
-- 057: tasksに年度アーカイブ用の列とアーカイブ実行RPCを追加
--
-- 列追加自体は056と同じ理由でGRANT不要（tasksは列レベルGRANT制限が無い
-- テーブルレベル標準GRANT。pg_attribute.attaclで確認済み）。ただし
-- archived_at/archive_labelは「代表者（owner/admin）のみが一括で書き込む」
-- という要件があるため、この2列だけは意図的にUPDATE権限をauthenticated/anon
-- から剥がし、SECURITY DEFINER RPC（archive_organization_tasks）経由での
-- 書き込みのみを許可する。SECURITY DEFINER関数は呼び出し元ロールではなく
-- 関数所有者の権限で実行されるため、この列レベルREVOKEの影響を受けない。
-- upsert（ON CONFLICT DO UPDATE）ではなく、handleSave側の.update()は明示的に
-- 列を列挙する形（archived_at/archive_labelを含まない）なので、この
-- REVOKEが既存の保存経路を壊さないことを確認済み（CLAUDE.mdの列レベル
-- GRANT×upsertの既知の落とし穴はここでは該当しない）。

ALTER TABLE public.tasks
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN archive_label text;

CREATE INDEX idx_tasks_org_archived_at ON public.tasks(organization_id, archived_at);

REVOKE UPDATE (archived_at, archive_label) ON public.tasks FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.archive_organization_tasks(
  p_organization_id uuid,
  p_archive_label text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_label text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'only organization owner/admin can archive tasks';
  END IF;

  v_label := btrim(p_archive_label);
  IF v_label IS NULL OR v_label = '' THEN
    RAISE EXCEPTION 'archive_label must not be empty';
  END IF;

  UPDATE public.tasks
  SET archived_at = now(),
      archive_label = v_label
  WHERE organization_id = p_organization_id
    AND archived_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_organization_tasks(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.archive_organization_tasks(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.archive_organization_tasks(uuid, text) TO authenticated;
```

- [ ] **Step 2: 本番Supabase（project `uhhofjcyotfyrlhaguvy`）に適用**

`mcp__claude_ai_Supabase__apply_migration`で上記ファイルを適用する。適用前に`mcp__claude_ai_Supabase__execute_sql`で次のクエリを実行し、列がまだ存在しないことを確認する：

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='tasks' AND column_name IN ('archived_at','archive_label');
```

期待：0行。適用後、同じクエリで2行返ることを確認する。続けて`mcp__claude_ai_Supabase__get_advisors(type: "security")`を実行し、新規の警告が増えていないことを確認する。

- [ ] **Step 3: 検証（BEGIN...ROLLBACKで本番に影響を残さない）**

まず`mcp__claude_ai_Supabase__execute_sql`で以下を確認する：
- 実在する団体1件とそのowner：`SELECT id FROM public.organizations LIMIT 1;` に対応する`organization_members`から`role='owner'`の行を1件（`organization_id`・`user_id`を控える）。
- その団体に**所属しない**別の実在ユーザーを1件（`SELECT id FROM public.profiles WHERE id NOT IN (SELECT user_id FROM public.organization_members WHERE organization_id = '<上のorganization_id>') LIMIT 1;`）。
- その団体に属する未アーカイブのタスク件数：`SELECT count(*) FROM public.tasks WHERE organization_id = '<organization_id>' AND archived_at IS NULL;`（0件でも検証は可能。0件の場合はケース1の返り値が0件になる想定で読み替える）。

この`organization_id`・`owner_user_id`・`non_member_user_id`を使い、`mcp__claude_ai_Supabase__execute_sql`で以下を1回のクエリとして実行する：

```sql
BEGIN;

-- ---- ケース1：ownerはRPC経由でアーカイブを実行できる ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<owner_user_id>')::text, true);

SELECT public.archive_organization_tasks('<organization_id>', '2099年度検証用') AS archived_count;
-- 期待：事前に数えた未アーカイブ件数と同じ数が返る

SELECT count(*) FROM public.tasks
WHERE organization_id = '<organization_id>' AND archive_label = '2099年度検証用';
-- 期待：直前のarchived_countと同じ件数

-- ---- ケース2：同じ操作を再実行しても再アーカイブされない（対象が既に0件） ----
SELECT public.archive_organization_tasks('<organization_id>', '2099年度検証用2回目') AS second_call_count;
-- 期待：0（archived_at IS NULLの行がもう無いため）

-- ---- ケース3：この団体に所属しない別ユーザーはRPCを実行できない ----
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<non_member_user_id>')::text, true);

DO $$
BEGIN
  PERFORM public.archive_organization_tasks('<organization_id>', '非メンバーによる試行');
  RAISE NOTICE 'CASE3_UNEXPECTED_SUCCESS';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'CASE3_REJECTED: %', SQLERRM;
END $$;

-- ---- ケース4：RPCを経由せず直接archived_atを更新しようとすると列権限で拒否される ----
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<owner_user_id>')::text, true);

DO $$
BEGIN
  UPDATE public.tasks SET archived_at = now()
  WHERE organization_id = '<organization_id>' LIMIT 1;
  RAISE NOTICE 'CASE4_UNEXPECTED_SUCCESS';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'CASE4_REJECTED: %', SQLERRM;
END $$;

RESET ROLE;
ROLLBACK;
```

Expected: ケース1はタスク件数分アーカイブされ`archive_label`が一致、ケース2は0件（多重アーカイブされない）、ケース3は`CASE3_REJECTED`（owner/admin以外は例外）、ケース4は`CASE4_REJECTED`（列権限で直接UPDATEは拒否される。`permission denied for column archived_at`のようなエラーになるはず）。`ROLLBACK`により、この検証による変更は本番に残らない。

**注記**：本番データの制約上、「団体には所属しているがrole='member'（owner/adminではない）」というケースを実データで再現できない場合がある（既存の検証環境ではその団体唯一の実メンバーがownerであることが多い）。その場合はケース3（団体に全く所属しない非メンバー）のみで「role検査が機能している」ことの実証とし、報告書にその制約を明記すること。

- [ ] **Step 4: コミット**

```bash
git add supabase/migrations/057_tasks_archive.sql
git commit -m "$(cat <<'EOF'
feat(clubtasks): 年度アーカイブ用の列とarchive_organization_tasks RPCを追加

archived_at/archive_labelはRLSのrole判定では守れないため、列レベルの
UPDATE権限をauthenticated/anonから剥がし、SECURITY DEFINER RPC経由の
書き込みのみに限定した。RPC内部でowner/adminロールを検査してから
未アーカイブの全タスクを一括更新する。
EOF
)"
```

---

### Task 2: アーカイブ表示の純粋関数と型定義（TDD）

**Files:**
- Create: `lib/tasks/taskArchive.ts`
- Create: `lib/tasks/taskArchive.test.ts`
- Modify: `lib/types/task.ts`

**Interfaces:**
- Consumes: なし（DBアクセスの無い純粋関数のみ）
- Produces: `type ArchiveView = { type: "current" } | { type: "label"; label: string }`、`filterTasksByArchiveView(tasks: TaskRow[], view: ArchiveView): TaskRow[]`、`archiveLabelOptions(tasks: TaskRow[]): string[]`（すべて`@/lib/tasks/taskArchive`、Task 3で`page.tsx`が使用）。`TaskRow.archived_at: string | null`・`TaskRow.archive_label: string | null`（`@/lib/types/task`、Task 3で`page.tsx`が使用）。

- [ ] **Step 1: `lib/types/task.ts`の`TaskRow`に列を追加**

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
  /** 年度アーカイブでarchive_organization_tasks RPCがセットする。nullなら現役タスク */
  archived_at: string | null;
  archive_label: string | null;
  /** DB に列がある場合のみ */
  created_at?: string;
  updated_at?: string;
}
```

- [ ] **Step 2: 失敗するテストを書く（`lib/tasks/taskArchive.test.ts`）**

`lib/tasks/taskArchive.test.ts`を作成：

```ts
import { describe, expect, it } from "vitest";
import { archiveLabelOptions, filterTasksByArchiveView } from "./taskArchive";
import type { TaskRow } from "@/lib/types/task";

function makeTask(overrides: Partial<TaskRow> & { id: string }): TaskRow {
  return {
    organization_id: "org-1",
    title: "タスク",
    description: null,
    status: "todo",
    priority: "medium",
    assignee_id: null,
    reviewer_id: null,
    created_by: null,
    category: null,
    due_date: null,
    recurrence_rule: null,
    archived_at: null,
    archive_label: null,
    ...overrides,
  };
}

describe("filterTasksByArchiveView", () => {
  it("returns only tasks without archived_at when view is current", () => {
    const tasks = [
      makeTask({ id: "1", archived_at: null }),
      makeTask({ id: "2", archived_at: "2026-08-18T00:00:00Z", archive_label: "2026年度" }),
    ];
    expect(filterTasksByArchiveView(tasks, { type: "current" })).toEqual([
      tasks[0],
    ]);
  });

  it("returns only tasks matching the given archive label, excluding current tasks", () => {
    const tasks = [
      makeTask({ id: "1", archived_at: null }),
      makeTask({ id: "2", archived_at: "2026-08-18T00:00:00Z", archive_label: "2026年度" }),
      makeTask({ id: "3", archived_at: "2025-08-18T00:00:00Z", archive_label: "2025年度" }),
    ];
    expect(
      filterTasksByArchiveView(tasks, { type: "label", label: "2026年度" })
    ).toEqual([tasks[1]]);
  });

  it("returns an empty array when no task matches the given label", () => {
    const tasks = [makeTask({ id: "1", archived_at: null })];
    expect(
      filterTasksByArchiveView(tasks, { type: "label", label: "2026年度" })
    ).toEqual([]);
  });
});

describe("archiveLabelOptions", () => {
  it("returns an empty array when nothing has been archived", () => {
    const tasks = [makeTask({ id: "1", archived_at: null })];
    expect(archiveLabelOptions(tasks)).toEqual([]);
  });

  it("dedupes labels and ignores rows missing archived_at or archive_label", () => {
    const tasks = [
      makeTask({ id: "1", archived_at: "2026-08-18T00:00:00Z", archive_label: "2026年度" }),
      makeTask({ id: "2", archived_at: "2026-08-19T00:00:00Z", archive_label: "2026年度" }),
      makeTask({ id: "3", archived_at: null, archive_label: null }),
    ];
    expect(archiveLabelOptions(tasks)).toEqual(["2026年度"]);
  });

  it("sorts labels by most recently archived first", () => {
    const tasks = [
      makeTask({ id: "1", archived_at: "2025-08-18T00:00:00Z", archive_label: "2025年度" }),
      makeTask({ id: "2", archived_at: "2026-08-18T00:00:00Z", archive_label: "2026年度" }),
    ];
    expect(archiveLabelOptions(tasks)).toEqual(["2026年度", "2025年度"]);
  });
});
```

- [ ] **Step 3: テストが失敗することを確認**

Run: `npx vitest run lib/tasks/taskArchive.test.ts`
Expected: FAIL（`./taskArchive`モジュールが存在しない）

- [ ] **Step 4: `lib/tasks/taskArchive.ts`を実装**

`lib/tasks/taskArchive.ts`を作成：

```ts
/**
 * 年度アーカイブ（Phase 3）の表示フィルタリング・ラベル一覧の純粋関数。
 * DBアクセスをせず、既に読み込み済みのタスク配列に対して絞り込む。
 */

import type { TaskRow } from "@/lib/types/task";

export type ArchiveView =
  | { type: "current" }
  | { type: "label"; label: string };

/**
 * "current"（既定）はarchived_atが無い現役タスクのみを返す。
 * "label"は指定されたarchive_labelに一致するアーカイブ済みタスクのみを
 * 返す（現役タスクは含まない＝アーカイブ履歴閲覧中は参照専用の一覧になる）。
 */
export function filterTasksByArchiveView(
  tasks: TaskRow[],
  view: ArchiveView
): TaskRow[] {
  if (view.type === "current") {
    return tasks.filter((t) => !t.archived_at);
  }
  return tasks.filter((t) => t.archive_label === view.label);
}

/**
 * 過去にアーカイブされたラベルの一覧を、直近にアーカイブされた順（降順）で
 * 返す。同じラベルで複数回アーカイブされることは想定していないが、念のため
 * 各ラベルの最も新しいarchived_atを代表値として採用する。
 */
export function archiveLabelOptions(tasks: TaskRow[]): string[] {
  const latestByLabel = new Map<string, number>();
  for (const t of tasks) {
    if (!t.archive_label || !t.archived_at) continue;
    const ts = new Date(t.archived_at).getTime();
    const prev = latestByLabel.get(t.archive_label);
    if (prev === undefined || ts > prev) {
      latestByLabel.set(t.archive_label, ts);
    }
  }
  return Array.from(latestByLabel.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label);
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `npm test`
Expected: PASS（既存の全テスト＋新規テストが通る）

- [ ] **Step 6: コミット**

```bash
git add lib/types/task.ts lib/tasks/taskArchive.ts lib/tasks/taskArchive.test.ts
git commit -m "$(cat <<'EOF'
feat(clubtasks): 年度アーカイブの表示フィルタ純粋関数を追加

filterTasksByArchiveView()は「現在のタスクのみ」「特定のアーカイブ
ラベルのみ」の2種類の表示を計算する。archiveLabelOptions()は過去に
アーカイブされたラベルを直近順に列挙し、フィルタの選択肢を提供する。
EOF
)"
```

---

### Task 3: UI統合（表示フィルタ・アーカイブ実行ボタンとモーダル・参照専用化）

**Files:**
- Modify: `app/(club)/clubtasks/page.tsx`

**Interfaces:**
- Consumes: `filterTasksByArchiveView`・`archiveLabelOptions`・`type ArchiveView`（`@/lib/tasks/taskArchive`、Task 2で定義）。`TaskRow.archived_at`・`TaskRow.archive_label`（`@/lib/types/task`、Task 2で追加）。`useClubOrganization()`が返す`activeRole: string | null`（既存の`contexts/ClubOrganizationContext.tsx`、変更不要）。

- [ ] **Step 1: importを追加**

`app/(club)/clubtasks/page.tsx`の次のブロック：

```tsx
import { Plus, CheckCircle2, X } from "lucide-react";
```

を次に置き換える：

```tsx
import { Plus, CheckCircle2, X, Archive, Lock } from "lucide-react";
```

続けて、次のブロック：

```tsx
import {
  buildRecurringTask,
  type RecurringTaskSource,
} from "@/lib/tasks/taskRecurrence";
import ChecklistSection from "./ChecklistSection";
```

を次に置き換える（`taskArchive`のimportを追加）：

```tsx
import {
  buildRecurringTask,
  type RecurringTaskSource,
} from "@/lib/tasks/taskRecurrence";
import {
  archiveLabelOptions,
  filterTasksByArchiveView,
  type ArchiveView,
} from "@/lib/tasks/taskArchive";
import ChecklistSection from "./ChecklistSection";
```

- [ ] **Step 2: `useClubOrganization()`から`activeRole`を取得**

次のブロック：

```tsx
  const {
    loading: ctxLoading,
    activeOrgId: orgId,
    activeOrgName: orgName,
    hasNoMemberships,
    isReady,
  } = useClubOrganization();
```

を次に置き換える：

```tsx
  const {
    loading: ctxLoading,
    activeOrgId: orgId,
    activeOrgName: orgName,
    activeRole,
    hasNoMemberships,
    isReady,
  } = useClubOrganization();
```

- [ ] **Step 3: アーカイブ関連のstateを追加**

次のブロック：

```tsx
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [checklistCountByTaskId, setChecklistCountByTaskId] = useState<
    Record<string, { done: number; total: number }>
  >({});
```

を次に置き換える：

```tsx
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [checklistCountByTaskId, setChecklistCountByTaskId] = useState<
    Record<string, { done: number; total: number }>
  >({});
  const [archiveView, setArchiveView] = useState<ArchiveView>({
    type: "current",
  });
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveLabelInput, setArchiveLabelInput] = useState("");
  const [archiving, setArchiving] = useState(false);
```

- [ ] **Step 4: `loadTasks`のselect列に`archived_at`・`archive_label`を追加**

次のブロック：

```tsx
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id, organization_id, title, description, status, priority, assignee_id, reviewer_id, created_by, category, due_date, created_at, recurrence_rule"
      )
      .eq("organization_id", orgId);
```

を次に置き換える：

```tsx
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id, organization_id, title, description, status, priority, assignee_id, reviewer_id, created_by, category, due_date, created_at, recurrence_rule, archived_at, archive_label"
      )
      .eq("organization_id", orgId);
```

- [ ] **Step 5: `archiveLabelOpts`・`isViewingArchiveHistory`・`visibleTasks`を更新**

次のブロック：

```tsx
  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        tasks
          .map((t) => t.category?.trim())
          .filter((c): c is string => Boolean(c))
      )
    );
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    if (!categoryFilter) return tasks;
    return tasks.filter((t) => (t.category ?? "").trim() === categoryFilter);
  }, [tasks, categoryFilter]);
```

を次に置き換える：

```tsx
  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        tasks
          .map((t) => t.category?.trim())
          .filter((c): c is string => Boolean(c))
      )
    );
  }, [tasks]);

  const archiveLabelOpts = useMemo(() => archiveLabelOptions(tasks), [tasks]);

  const isViewingArchiveHistory = archiveView.type !== "current";

  const visibleTasks = useMemo(() => {
    const archived = filterTasksByArchiveView(tasks, archiveView);
    if (!categoryFilter) return archived;
    return archived.filter(
      (t) => (t.category ?? "").trim() === categoryFilter
    );
  }, [tasks, archiveView, categoryFilter]);
```

- [ ] **Step 6: `handleArchive`関数を追加**

次のブロック（`handleDragEnd`の宣言全体の直後）：

```tsx
      toast.success("移動しました");

      if (
        shouldGenerateRecurringTask(
          {
            status: normalizeStatus(task.status),
            recurrenceRule: task.recurrence_rule ?? null,
          },
          { status: newStatus, recurrenceRule: task.recurrence_rule ?? null }
        )
      ) {
        await maybeGenerateRecurringTask(
          {
            organization_id: task.organization_id,
            title: task.title,
            description: task.description,
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
    },
    [tasks, notifyTaskChange, currentUserId, swimlaneAxis, maybeGenerateRecurringTask]
  );

  if (ctxLoading) {
```

を次に置き換える（`handleDragEnd`本体の先頭に参照専用ガードを追加し、依存配列に`archiveView`を足し、`handleArchive`を新設）：

```tsx
      toast.success("移動しました");

      if (
        shouldGenerateRecurringTask(
          {
            status: normalizeStatus(task.status),
            recurrenceRule: task.recurrence_rule ?? null,
          },
          { status: newStatus, recurrenceRule: task.recurrence_rule ?? null }
        )
      ) {
        await maybeGenerateRecurringTask(
          {
            organization_id: task.organization_id,
            title: task.title,
            description: task.description,
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
    },
    [
      tasks,
      notifyTaskChange,
      currentUserId,
      swimlaneAxis,
      maybeGenerateRecurringTask,
      archiveView,
    ]
  );

  const handleArchive = async () => {
    if (!orgId) return;
    const label = archiveLabelInput.trim();
    if (!label) {
      toast.error("アーカイブ名を入力してください");
      return;
    }
    setArchiving(true);
    const { data, error } = await supabase.rpc("archive_organization_tasks", {
      p_organization_id: orgId,
      p_archive_label: label,
    });
    setArchiving(false);
    if (error) {
      console.error("archive_organization_tasks error:", error);
      toast.error("アーカイブに失敗しました");
      return;
    }
    toast.success(`${data ?? 0}件のタスクをアーカイブしました`);
    setArchiveModalOpen(false);
    setArchiveLabelInput("");
    await loadTasks();
  };

  if (ctxLoading) {
```

- [ ] **Step 7: `handleDragEnd`本体の先頭に参照専用ガードを追加**

次のブロック（`handleDragEnd`のuseCallback本体の最初の行）：

```tsx
  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
```

を次に置き換える：

```tsx
  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (archiveView.type !== "current") return;
      const { source, destination, draggableId } = result;
      if (!destination) return;
```

- [ ] **Step 8: ヘッダーに「年度アーカイブ」ボタンを追加し、「新規タスク追加」をアーカイブ閲覧中は無効化**

次のブロック：

```tsx
        <Button
          type="button"
          variant="primary"
          onClick={openNewModal}
          className="inline-flex items-center gap-2 shrink-0"
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
          新規タスク追加
        </Button>
      </div>
```

を次に置き換える：

```tsx
        <div className="flex items-center gap-2 shrink-0">
          {(activeRole === "owner" || activeRole === "admin") && (
            <Button
              type="button"
              variant="outlineMuted"
              onClick={() => setArchiveModalOpen(true)}
              className="inline-flex items-center gap-2"
            >
              <Archive className="w-5 h-5" aria-hidden="true" />
              年度アーカイブ
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            onClick={openNewModal}
            disabled={isViewingArchiveHistory}
            title={
              isViewingArchiveHistory
                ? "アーカイブ履歴を閲覧中は新規タスクを追加できません"
                : undefined
            }
            className="inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            新規タスク追加
          </Button>
        </div>
      </div>
```

- [ ] **Step 9: フィルタ行に「表示」セレクトボックスを追加**

次のブロック（種別フィルタの`</div>`の直後、スイムレーングルーピングの条件レンダリングの手前）：

```tsx
            <option value="">すべて</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {view === "kanban" && (
```

を次に置き換える：

```tsx
            <option value="">すべて</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {archiveLabelOpts.length > 0 && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="archive-view"
              className="text-sm text-graphite/70 shrink-0"
            >
              表示
            </label>
            <select
              id="archive-view"
              value={archiveView.type === "current" ? "" : archiveView.label}
              onChange={(e) =>
                setArchiveView(
                  e.target.value
                    ? { type: "label", label: e.target.value }
                    : { type: "current" }
                )
              }
              className="border border-rule rounded-lg px-2 py-1.5 text-sm bg-paper text-ink"
            >
              <option value="">現在のタスク</option>
              {archiveLabelOpts.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
        {view === "kanban" && (
```

- [ ] **Step 10: アーカイブ履歴閲覧中のバナーを追加**

次のブロック（フィルタ行を閉じる`</div>`の直後、ビュー切り替えレンダリングの手前）：

```tsx
        </div>
      </div>

      {view === "gantt" ? (
```

を次に置き換える：

```tsx
        </div>
      </div>

      {isViewingArchiveHistory && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-rule bg-mist px-4 py-2 text-sm text-graphite">
          <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
          「{archiveView.type === "label" ? archiveView.label : ""}」のアーカイブ履歴を閲覧中です（参照専用。ドラッグでの移動・新規タスク追加はできません）
        </div>
      )}

      {view === "gantt" ? (
```

- [ ] **Step 11: フラットかんばんの`Droppable`にドロップ無効化を追加**

次のブロック：

```tsx
                    <Droppable droppableId={lane.id}>
```

を次に置き換える：

```tsx
                    <Droppable
                      droppableId={lane.id}
                      isDropDisabled={isViewingArchiveHistory}
                    >
```

- [ ] **Step 12: アーカイブ確認モーダルを追加**

次のブロック（タスク編集モーダルを閉じる`)}`の直後、コンポーネントの最後の閉じタグの手前）：

```tsx
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

を次に置き換える：

```tsx
            </form>
          </div>
        </div>
      )}

      {archiveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !archiving) {
              setArchiveModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-paper border border-rule shadow-xl">
            <div className="p-5 border-b border-rule">
              <h2
                id="archive-modal-title"
                className="text-lg font-bold text-ink"
              >
                年度アーカイブ
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-graphite">
                現在アーカイブされていない全てのタスクに、入力したアーカイブ名を付けて一括でアーカイブします。アーカイブ後は既存の表示から除外されますが、コメント・添付ファイル・チェックリストを含め削除はされず、「表示」の絞り込みからいつでも参照できます。この操作は元に戻せません。
              </p>
              <div>
                <label className="block text-sm font-bold text-ink mb-1">
                  アーカイブ名
                </label>
                <Input
                  value={archiveLabelInput}
                  onChange={(e) => setArchiveLabelInput(e.target.value)}
                  placeholder="例：2026年度"
                  disabled={archiving}
                  className="w-full"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outlineMuted"
                  onClick={() => setArchiveModalOpen(false)}
                  disabled={archiving}
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleArchive}
                  disabled={archiving || !archiveLabelInput.trim()}
                >
                  {archiving ? "アーカイブ中..." : "アーカイブする"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 13: 型チェックとテストを実行**

Run: `npx tsc --noEmit`
Expected: エラー無し

Run: `npm test`
Expected: PASS（既存テスト＋Task 2の新規テストがすべて通る。UIの手動確認はこの後の統合レビュー・ライブQAで行う）

- [ ] **Step 14: コミット**

```bash
git add app/\(club\)/clubtasks/page.tsx
git commit -m "$(cat <<'EOF'
feat(clubtasks): 年度アーカイブの表示フィルタと実行UIを追加

代表者（owner/admin）のみに表示される「年度アーカイブ」ボタンから、
確認モーダル経由でarchive_organization_tasks RPCを呼ぶ。「表示」
フィルタで現在のタスク／過去のアーカイブラベルを切り替えられる。
アーカイブ履歴閲覧中はドラッグでの移動・新規タスク追加を無効化し、
参照専用であることをバナーで明示する。
EOF
)"
```

---
