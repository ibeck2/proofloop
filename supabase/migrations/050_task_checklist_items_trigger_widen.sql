-- 050: task_checklist_items_set_org トリガーの適用範囲を拡張
--
-- 048のトリガーは BEFORE INSERT OR UPDATE OF task_id だったため、
-- task_idを触らずorganization_idだけを直接PATCHするリクエストでは
-- 発火しなかった。複数団体に所属するメンバーがこの経路でorganization_idを
-- 実際のtasksのorganization_idと異なる値に書き換えられる可能性があった
-- （RLSのUSING/WITH CHECKはどちらも「自分が所属する団体か」しか見ないため、
-- 複数団体に所属していると通ってしまう）。task_idの変更有無に関わらず
-- 常にorganization_idを再導出するよう、トリガーの適用範囲を広げる。
--
-- あわせて、049のREVOKE EXECUTEに加えて048のREVOKE ALL ... FROM PUBLIC
-- も明示的に再掲しておく（048時点で既に効いているため実害は無いが、
-- 適用順序に依存しない自己完結した状態にしておく）。

DROP TRIGGER IF EXISTS task_checklist_items_set_org ON public.task_checklist_items;

CREATE TRIGGER task_checklist_items_set_org
  BEFORE INSERT OR UPDATE ON public.task_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_task_checklist_item_org();

REVOKE ALL ON FUNCTION public.set_task_checklist_item_org() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_task_checklist_item_org() FROM anon, authenticated;
