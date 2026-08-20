-- 070 schedule_poll_views: 日程調整の既読記録（初回閲覧時刻のみ）
--
-- INSERT ... ON CONFLICT DO NOTHING はSET句が無いためUPDATE権限を必要としない
-- （068のresponsesと異なり、ここはRPCを使わずテーブル直接INSERTで安全に書ける）。

CREATE TABLE public.schedule_poll_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.schedule_polls(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_schedule_poll_views_poll_user
  ON public.schedule_poll_views(poll_id, user_id);
CREATE INDEX idx_schedule_poll_views_org_id ON public.schedule_poll_views(organization_id);

CREATE OR REPLACE FUNCTION public.set_schedule_poll_view_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.organization_id := (SELECT organization_id FROM public.schedule_polls WHERE id = NEW.poll_id);
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'poll_id % does not reference an existing schedule_polls row', NEW.poll_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_schedule_poll_view_org() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_schedule_poll_view_org() FROM anon, authenticated;

CREATE TRIGGER schedule_poll_views_set_org
  BEFORE INSERT ON public.schedule_poll_views
  FOR EACH ROW EXECUTE FUNCTION public.set_schedule_poll_view_org();

ALTER TABLE public.schedule_poll_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_poll_views_select_own_org"
  ON public.schedule_poll_views FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

CREATE POLICY "schedule_poll_views_insert_own_org"
  ON public.schedule_poll_views FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  );

-- UPDATE/DELETEポリシーは作らない（既読は初回記録のみで十分、書き換え不要）。
