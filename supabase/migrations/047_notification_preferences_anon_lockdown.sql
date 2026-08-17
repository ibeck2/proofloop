-- 047: is_notification_enabled は anon にもEXECUTEが付いたままだった
-- （046のREVOKE ALL FROM PUBLICはこのプロジェクトではno-op。CLAUDE.md参照）。
-- list_approved_claims（038）と同じパターンで anon から明示的に剥がす。
REVOKE EXECUTE ON FUNCTION public.is_notification_enabled(uuid, text, uuid) FROM anon;
