# /clubtasks 年度アーカイブの取り消し Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/clubtasks`の年度アーカイブ機能に、誤ってアーカイブした場合の復旧手段（ラベル単位の一括取り消し）を追加する。

**Architecture:** 新規テーブル・新規列は無し。`archive_organization_tasks`（マイグレーション057）と対称の新規RPC `unarchive_organization_label` を追加する（SECURITY DEFINER、owner/adminのみ実行可、指定ラベルの全タスクの`archived_at`・`archive_label`をNULLに戻す）。子テーブル（`task_checklist_items`・`task_attachments`・`task_comments`）のRLSは既に`archived_at IS NULL`を動的に見ているため、タスク側を戻せば自動的に通常通り編集可能に戻り、子テーブル側の変更は不要。UIは「アーカイブ履歴閲覧中」バナーに、owner/adminにのみ見える「取り消す」ボタンを追加し、確認モーダル経由でRPCを呼ぶ。

**Tech Stack:** Next.js 15 App Router / TypeScript / Supabase（Postgres・RLS・SECURITY DEFINER RPC）

## Global Constraints
- ロジックは`lib/`に純粋関数として切り出しテストする方針（CLAUDE.md §5）が基本だが、本機能のUI側ロジック（ボタン表示条件・確認モーダル・取り消し後の表示切替）は、既存の`handleArchive`と同様に宣言的な副作用処理であり、テスト可能な計算ロジックを含まないため、専用の純粋関数への切り出しは不要と設計段階で判断済み（`docs/superpowers/specs/2026-08-18-clubtasks-unarchive-design.md` §6）。
- デザインは`lib/design/tokens.ts`の6色トークンのみ使用（ink/seal/paper/mist/rule/graphite）。新しい色を足さない。
- 型チェックは`npx tsc --noEmit`を使う（`npm run build`は使わない）。
- 各タスクの最後で`npm test`を実行し、既存テストが全て通ることを確認してからコミットする（本機能はテストスイートに新規テストを追加しない。理由は上記の通り）。
- 新規RPCは`REVOKE ALL ... FROM PUBLIC`だけでは実効性が無い（Supabaseでは`anon`/`authenticated`への権限がデフォルト権限で直接付与されるため）。`REVOKE EXECUTE ... FROM anon`を明示し、`authenticated`にのみ`GRANT EXECUTE`する（既存の`archive_organization_tasks`・`list_organization_archive_labels`と同じ方針）。
- モーダル内に追加するUIは`<form>`要素を使わない（`type="button"`のボタンのみで完結させる）。
- 取り消し実行は「代表者（owner/admin）のみ」。UI側では`useClubOrganization()`が返す`activeRole`が`"owner"`または`"admin"`の場合のみボタンを表示する。ただしこれはUXのためのガードであり、実際の権限担保はRPC内部のrole検査が担う（既存の`archive_organization_tasks`と同じ設計）。
- Supabase本番プロジェクトID：`uhhofjcyotfyrlhaguvy`。マイグレーション適用は`mcp__claude_ai_Supabase__apply_migration`、検証は`mcp__claude_ai_Supabase__execute_sql`を使う。

---

## File Structure

**新規作成：**
- `supabase/migrations/063_unarchive_organization_label.sql` — 取り消し実行RPC

**変更：**
- `app/(club)/clubtasks/page.tsx` — 取り消しボタン・確認モーダル・`handleUnarchive`・既存アーカイブ確認モーダルの「元に戻せません」という文言の修正（取り消し機能ができたため事実と異なる記述になった）

---

### Task 1: マイグレーション（取り消し実行RPC）

**Files:**
- Create: `supabase/migrations/063_unarchive_organization_label.sql`

**Interfaces:**
- Produces: RPC `public.unarchive_organization_label(p_organization_id uuid, p_archive_label text) RETURNS integer`（更新した行数を返す。呼び出し元が対象団体のowner/adminでない場合は例外を投げる）。

- [ ] **Step 1: マイグレーションファイルを書く**

`supabase/migrations/063_unarchive_organization_label.sql`を作成：

```sql
-- 063: 年度アーカイブの取り消しRPC
--
-- archive_organization_tasks（057）と対称の設計。指定したarchive_labelに
-- 一致し、かつ現在アーカイブ済み（archived_at IS NOT NULL）の全タスクに
-- ついて、archived_at・archive_labelをともにNULLに戻す。
--
-- 子テーブル（task_checklist_items・task_attachments・task_comments）の
-- RLS（060・062で追加した「対象タスクがarchived_at IS NULLであること」
-- という EXISTS 条件）は、タスク側のarchived_atを動的に参照している。
-- そのためこのRPCでタスク側を戻すだけで、子テーブルへの通常の書き込みが
-- 自動的に再び可能になる。子テーブル側のポリシー変更は不要。
--
-- archived_at/archive_label列へのUPDATE権限は057/058でauthenticatedから
-- 剥がされ、archive_organization_tasksのみが書ける状態になっている。この
-- RPCもSECURITY DEFINER（テーブル所有者として実行されRLS・列GRANT制限を
-- バイパスする）のため、同じ制限の影響を受けずに書き込める。

CREATE OR REPLACE FUNCTION public.unarchive_organization_label(
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
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'only organization owner/admin can unarchive tasks';
  END IF;

  UPDATE public.tasks
  SET archived_at = NULL,
      archive_label = NULL
  WHERE organization_id = p_organization_id
    AND archive_label = p_archive_label
    AND archived_at IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.unarchive_organization_label(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.unarchive_organization_label(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.unarchive_organization_label(uuid, text) TO authenticated;
```

- [ ] **Step 2: 本番Supabase（project `uhhofjcyotfyrlhaguvy`）に適用**

`mcp__claude_ai_Supabase__apply_migration`で上記ファイルを適用する。適用後、`mcp__claude_ai_Supabase__execute_sql`で以下を実行し、関数が存在することを確認する：

```sql
SELECT proname FROM pg_proc WHERE proname = 'unarchive_organization_label' AND pronamespace = 'public'::regnamespace;
```

期待：1行。続けて`mcp__claude_ai_Supabase__get_advisors(type: "security")`を実行し、新規の警告が「`authenticated_security_definer_function_executable`が本関数について1件増える」以外に無いことを確認する（既存の`archive_organization_tasks`と同種の許容パターン）。

- [ ] **Step 3: 検証（BEGIN...ROLLBACKで本番に影響を残さない）**

まず`mcp__claude_ai_Supabase__execute_sql`で実在する団体1件とそのowner（`organization_id`・`owner_user_id`）、その団体に**所属しない**別の実在ユーザー（`non_member_user_id`）を特定する（Task 1系のマイグレーションでこれまで使ってきた特定方法と同じ：`SELECT id FROM public.organizations LIMIT 1;`→対応する`organization_members`のowner行→`SELECT id FROM public.profiles WHERE id NOT IN (SELECT user_id FROM public.organization_members WHERE organization_id = '<organization_id>') LIMIT 1;`）。

その`organization_id`・`owner_user_id`・`non_member_user_id`を使い、`mcp__claude_ai_Supabase__execute_sql`で以下を1回のクエリとして実行する：

```sql
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<owner_user_id>')::text, true);

-- 準備：まずarchive_organization_tasksで検証用のアーカイブ状態を作る
-- （archived_at/archive_label列はauthenticatedから直接UPDATEできないため、
-- 既存のRPC経由で作るしかない）
SELECT public.archive_organization_tasks('<organization_id>', '取り消し検証用2099') AS archived_count;

-- ケース1：owner以外（この団体の非メンバー）は取り消しを実行できない
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<non_member_user_id>')::text, true);

DO $$
BEGIN
  PERFORM public.unarchive_organization_label('<organization_id>', '取り消し検証用2099');
  RAISE NOTICE 'CASE1_UNEXPECTED_SUCCESS';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'CASE1_REJECTED: %', SQLERRM;
END $$;

-- ケース2：ownerは取り消しを実行できる。返り値は準備で作った件数と一致する
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<owner_user_id>')::text, true);

SELECT public.unarchive_organization_label('<organization_id>', '取り消し検証用2099') AS unarchived_count;

SELECT count(*) FROM public.tasks
WHERE organization_id = '<organization_id>' AND archive_label = '取り消し検証用2099';
-- 期待：0（archive_labelがNULLに戻っているため、このラベルに一致する行は無い）

-- ケース3：同じ操作を再実行しても何も起きない（既に取り消し済みのため対象0件）
SELECT public.unarchive_organization_label('<organization_id>', '取り消し検証用2099') AS second_call_count;
-- 期待：0

-- ケース4：取り消し後、通常の.update()相当の操作（title変更）が再び成功する
-- （archived_at IS NULLに戻ったことで、060で追加したRLSのarchived_at IS NULL
-- 条件を満たすようになったことの確認）
UPDATE public.tasks
SET title = title
WHERE organization_id = '<organization_id>' AND archive_label IS NULL
LIMIT 1
RETURNING id;
-- 期待：1行返る（更新が成功する）

RESET ROLE;
ROLLBACK;
```

Expected: 準備のarchived_countは団体の未アーカイブタスク数（0件の場合は準備自体が意味を持たないため、Step 3実行前に対象団体に最低1件タスクがあることを確認しておく。無ければ別の団体を選ぶか、検証用に1件だけタスクを作ってこのトランザクション内でarchive_organization_tasksに渡してもよい）。ケース1は`CASE1_REJECTED`、ケース2は準備と同じ件数が返り、直後のcountクエリが0、ケース3は0、ケース4は1行返る。`ROLLBACK`により、この検証による変更（準備で作ったアーカイブ状態も含めて）は本番に一切残らない。

- [ ] **Step 4: コミット**

```bash
git add supabase/migrations/063_unarchive_organization_label.sql
git commit -m "$(cat <<'EOF'
feat(clubtasks): 年度アーカイブの取り消しRPCを追加

archive_organization_tasksと対称の設計。指定ラベルの全タスクの
archived_at/archive_labelをNULLに戻すSECURITY DEFINER RPC。owner/admin
のみ実行可。子テーブルのRLS（060/062）はarchived_atを動的に見ている
ため、子テーブル側の変更は不要。
EOF
)"
```

---

### Task 2: UI統合（取り消しボタン・確認モーダル）

**Files:**
- Modify: `app/(club)/clubtasks/page.tsx`

**Interfaces:**
- Consumes: RPC `unarchive_organization_label`（Task 1で定義）。既存の`archiveView`・`activeRole`・`loadArchiveLabels`（いずれも既存のまま、変更不要）。

- [ ] **Step 1: importに`Undo2`アイコンを追加**

次のブロック：

```tsx
import { Plus, CheckCircle2, X, Archive, Lock } from "lucide-react";
```

を次に置き換える：

```tsx
import { Plus, CheckCircle2, X, Archive, Lock, Undo2 } from "lucide-react";
```

- [ ] **Step 2: 取り消し関連のstateを追加**

次のブロック：

```tsx
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveLabelInput, setArchiveLabelInput] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [archiveLabelOpts, setArchiveLabelOpts] = useState<string[]>([]);
```

を次に置き換える：

```tsx
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveLabelInput, setArchiveLabelInput] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [archiveLabelOpts, setArchiveLabelOpts] = useState<string[]>([]);
  const [unarchiveModalOpen, setUnarchiveModalOpen] = useState(false);
  const [unarchiving, setUnarchiving] = useState(false);
```

- [ ] **Step 3: `handleUnarchive`関数を追加**

次のブロック（`handleArchive`の宣言全体の直後、`if (ctxLoading) {`の手前）：

```tsx
    setArchiveModalOpen(false);
    setArchiveLabelInput("");
    await loadTasks();
    await loadArchiveLabels();
    await loadChecklistCounts();
  };

  if (ctxLoading) {
```

を次に置き換える：

```tsx
    setArchiveModalOpen(false);
    setArchiveLabelInput("");
    await loadTasks();
    await loadArchiveLabels();
    await loadChecklistCounts();
  };

  const handleUnarchive = async () => {
    if (!orgId || archiveView.type !== "label") return;
    const label = archiveView.label;
    setUnarchiving(true);
    const { data, error } = await supabase.rpc(
      "unarchive_organization_label",
      { p_organization_id: orgId, p_archive_label: label }
    );
    setUnarchiving(false);
    if (error) {
      console.error("unarchive_organization_label error:", error);
      toast.error("アーカイブの取り消しに失敗しました");
      return;
    }
    const restoredCount = data ?? 0;
    if (restoredCount > 0) {
      toast.success(`${restoredCount}件のタスクを現在のタスクに戻しました`);
    } else {
      toast.error("対象のタスクが見つかりませんでした");
    }
    setUnarchiveModalOpen(false);
    // "current"に戻すことで、loadTasks/loadChecklistCountsがarchiveView
    // への依存経由で自動的に再取得する（表示ドロップダウンの切替と同じ
    // 仕組み。ここで明示的にloadTasksを呼ぶと、このクロージャが束縛して
    // いる「取り消し前のarchiveView」向けのクエリを再実行してしまうため
    // 呼ばない）。loadArchiveLabelsはarchiveViewに依存しない独立effectの
    // ため、ここで明示的に呼ぶ必要がある。
    setArchiveView({ type: "current" });
    await loadArchiveLabels();
  };

  if (ctxLoading) {
```

- [ ] **Step 4: アーカイブ履歴バナーに取り消しボタンを追加**

次のブロック：

```tsx
      {isViewingArchiveHistory && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-rule bg-mist px-4 py-2 text-sm text-graphite">
          <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
          「{archiveView.type === "label" ? archiveView.label : ""}」のアーカイブ履歴を閲覧中です（参照専用。ドラッグでの移動・新規タスク追加はできません）
        </div>
      )}
```

を次に置き換える：

```tsx
      {isViewingArchiveHistory && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-rule bg-mist px-4 py-2 text-sm text-graphite">
          <span className="flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
            「{archiveView.type === "label" ? archiveView.label : ""}」のアーカイブ履歴を閲覧中です（参照専用。ドラッグでの移動・新規タスク追加はできません）
          </span>
          {(activeRole === "owner" || activeRole === "admin") && (
            <Button
              type="button"
              variant="outlineMuted"
              onClick={() => setUnarchiveModalOpen(true)}
              className="inline-flex items-center gap-2 shrink-0"
            >
              <Undo2 className="w-4 h-4" aria-hidden="true" />
              このアーカイブを取り消す
            </Button>
          )}
        </div>
      )}
```

- [ ] **Step 5: アーカイブ確認モーダルの「元に戻せません」という文言を修正**

次のブロック：

```tsx
              <p className="text-sm text-graphite">
                現在アーカイブされていない全てのタスクに、入力したアーカイブ名を付けて一括でアーカイブします。アーカイブ後は既存の表示から除外されますが、コメント・添付ファイル・チェックリストを含め削除はされず、「表示」の絞り込みからいつでも参照できます。この操作は元に戻せません。
              </p>
```

を次に置き換える（取り消し機能ができたため、事実と異なる「元に戻せません」という記述を修正する）：

```tsx
              <p className="text-sm text-graphite">
                現在アーカイブされていない全てのタスクに、入力したアーカイブ名を付けて一括でアーカイブします。アーカイブ後は既存の表示から除外されますが、コメント・添付ファイル・チェックリストを含め削除はされず、「表示」の絞り込みからいつでも参照できます。間違えてアーカイブした場合は、「表示」でこのラベルを選び、表示されるバナーの「このアーカイブを取り消す」から一括で元に戻せます。
              </p>
```

- [ ] **Step 6: 取り消し確認モーダルを追加**

次のブロック（既存のアーカイブ確認モーダルを閉じる`)}`の直後、コンポーネントの最後の閉じタグの手前）：

```tsx
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

を次に置き換える：

```tsx
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

      {unarchiveModalOpen && archiveView.type === "label" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unarchive-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !unarchiving) {
              setUnarchiveModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-paper border border-rule shadow-xl">
            <div className="p-5 border-b border-rule">
              <h2
                id="unarchive-modal-title"
                className="text-lg font-bold text-ink"
              >
                アーカイブの取り消し
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-graphite">
                「{archiveView.label}」を取り消し、{tasks.length}
                件のタスクを現在のタスクへ戻します。チェックリスト・添付ファイル・コメントも通常通り編集できる状態に戻ります。
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outlineMuted"
                  onClick={() => setUnarchiveModalOpen(false)}
                  disabled={unarchiving}
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleUnarchive}
                  disabled={unarchiving}
                >
                  {unarchiving ? "取り消し中..." : "取り消す"}
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

- [ ] **Step 7: 型チェックとテストを実行**

Run: `npx tsc --noEmit`
Expected: エラー無し

Run: `npm test`
Expected: PASS（既存テストが全て通る。本機能はテストスイートへの追加が無い）

- [ ] **Step 8: コミット**

```bash
git add app/\(club\)/clubtasks/page.tsx
git commit -m "$(cat <<'EOF'
feat(clubtasks): 年度アーカイブの取り消しUIを追加

アーカイブ履歴閲覧中のバナーに、代表者（owner/admin）にのみ見える
「このアーカイブを取り消す」ボタンを追加。確認モーダル経由で
unarchive_organization_label RPCを呼び、成功後は表示を現在のタスクへ
自動的に戻す。アーカイブ確認モーダルの「元に戻せません」という
文言も、取り消し機能ができたことに合わせて修正した。
EOF
)"
```

---
