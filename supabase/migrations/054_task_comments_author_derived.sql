-- 054: task_comments のauthor_idをサーバー側で自動導出、ヘッダーコメントを訂正
--
-- author_idはこれまでクライアント指定（task_attachments.uploaded_byと同じ規約）
-- だったが、コメントは編集・削除が一切できない設計（活動ログ）であるため、
-- 誤った投稿者属性を後から訂正する手段が無い。organization_idと同じBEFORE
-- INSERTトリガーでauth.uid()から自動導出するよう変更し、クライアント送信値は
-- 無視する（テーブルはまだ0件のため、無コストで直せるうちに直す）。
--
-- あわせて、053のヘッダーコメントの「誰にも削除できない」という主張を訂正する。
-- 個々のコメント行はUPDATE/DELETEポリシーが無く編集・削除できないが、
-- tasksの既存DELETEポリシー（020_fix_rls_recursion.sql）経由でタスクごと
-- 削除されると、task_idのON DELETE CASCADEによりコメントもまとめて
-- 削除される（現状/clubtasksにタスク削除機能自体は無い）。

CREATE OR REPLACE FUNCTION public.set_task_comment_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.organization_id := (SELECT organization_id FROM public.tasks WHERE id = NEW.task_id);
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'task_id % does not reference an existing task', NEW.task_id;
  END IF;
  NEW.author_id := auth.uid();
  RETURN NEW;
END;
$$;

COMMENT ON TABLE public.task_comments IS
  '個々のコメントは投稿後に編集・削除できない（UPDATE/DELETEポリシー無し）。ただし親タスクが削除されると、tasksのON DELETE CASCADEによりコメントもまとめて削除される（現状タスク削除機能は存在しない）。author_idはBEFORE INSERTトリガーでauth.uid()から自動導出し、クライアント指定値は無視する。';
