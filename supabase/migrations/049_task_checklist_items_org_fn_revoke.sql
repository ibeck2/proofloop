-- 049: set_task_checklist_item_org()のセキュリティアドバイザ警告を解消
--
-- 048の REVOKE ALL ... FROM PUBLIC は本番Supabaseでは効かない（CLAUDE.mdの既知の
-- 落とし穴：public スキーマのデフォルト権限でanon/authenticatedに直接EXECUTEが
-- 付くため、PUBLIC経由の取り消しでは剥がせない）。関数自体はtrigger型を返すため
-- 直接呼び出しは元々Postgresレベルで拒否される（実害は無い）が、アドバイザの
-- ノイズを消し、将来の本当の警告を見分けやすくするため明示的にREVOKEする。

REVOKE EXECUTE ON FUNCTION public.set_task_checklist_item_org() FROM anon, authenticated;
