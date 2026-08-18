-- 053 task_comments: タスクへのコメント（活動ログ）
--
-- 投稿後の編集・削除機能を作らない設計（活動ログとしての性質上、後から書き換え
-- られる記録には価値が無い）。そのためRLSポリシーはSELECT/INSERTの2つのみで、
-- UPDATE/DELETEポリシーを一切作らない＝PostgreSQLレベルで誰にも（adminであっても
-- クライアント経由では）書き換え・削除ができない。
--
-- UPDATE経路がテーブルに一切存在しないため、organization_id自動導出トリガーは
-- BEFORE INSERTのみでよい。task_checklist_items（048/050）で問題になった
-- 「BEFORE INSERT OR UPDATE OF task_id という列指定トリガーの穴（task_idを
-- 触らずorganization_idだけを直接PATCHするとトリガーが発火しない）」という
-- 脆弱性クラスは、そもそもUPDATEの実行経路が無いこの設計では原理的に発生し得ない。
-- 詳細はdocs/task-board.mdセクションS参照。

CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_org_id ON public.task_comments(organization_id);

-- organization_id の自動導出（クライアント送信値は無視して上書きする）
CREATE OR REPLACE FUNCTION public.set_task_comment_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.organization_id := (SELECT organization_id FROM public.tasks WHERE id = NEW.task_id);
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'task_id % does not reference an existing task', NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_task_comment_org() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_task_comment_org() FROM anon, authenticated;

-- BEFORE INSERT のみ（UPDATEポリシーが無いため、UPDATE自体が発生しない）
CREATE TRIGGER task_comments_set_org
  BEFORE INSERT ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_task_comment_org();

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_comments_select_own_org"
  ON public.task_comments
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "task_comments_insert_own_org"
  ON public.task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

-- UPDATE/DELETEポリシーは意図的に作らない（活動ログは追記のみ）
