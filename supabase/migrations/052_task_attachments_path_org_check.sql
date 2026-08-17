-- 052: task_attachments の file_path と organization_id の整合性をトリガーで強制
--
-- 051時点では、テーブル行のorganization_id（tasks由来で自動導出）とStorageの
-- file_pathの先頭セグメント（クライアントが構成）が独立していた。将来
-- サーバーサイド（service_role）で署名URLを発行する実装に変わった場合、
-- 複数団体に所属するメンバーが「file_pathは自団体Aのフォルダ、task_idは
-- 別団体Bのタスク」という行を作ることで、団体Aの非公開ファイルが団体Bの
-- メンバーから閲覧可能になるクロステナント漏洩の経路になり得た
-- （クライアントサイド署名のみの現状では、Storage RLSにより実害はない）。
--
-- file_pathの先頭セグメントが、トリガーで導出したorganization_idと一致する
-- ことを強制し、この経路を将来の実装変更に関わらず恒久的に閉じる。

CREATE OR REPLACE FUNCTION public.set_task_attachment_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.organization_id := (SELECT organization_id FROM public.tasks WHERE id = NEW.task_id);
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'task_id % does not reference an existing task', NEW.task_id;
  END IF;
  IF split_part(NEW.file_path, '/', 1) IS DISTINCT FROM NEW.organization_id::text THEN
    RAISE EXCEPTION 'file_path organization segment does not match the task''s organization';
  END IF;
  RETURN NEW;
END;
$$;
