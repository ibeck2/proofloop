-- 066 schedule_polls: 日程調整（poll本体・候補日時）
--
-- 決定候補は schedule_polls に decided_candidate_id 列を持たせる循環参照を避け、
-- schedule_poll_candidates.is_decided の部分ユニーク索引で「1 pollにつき決定候補は
-- 最大1件」をDB側から保証する（decide_schedule_poll_candidate RPCは069で追加）。

CREATE TABLE public.schedule_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedule_polls_org_id ON public.schedule_polls(organization_id);

CREATE TABLE public.schedule_poll_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.schedule_polls(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  is_decided boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedule_poll_candidates_poll_id ON public.schedule_poll_candidates(poll_id);
CREATE INDEX idx_schedule_poll_candidates_org_id ON public.schedule_poll_candidates(organization_id);

-- 1 pollにつき決定候補は最大1件
CREATE UNIQUE INDEX uniq_schedule_poll_candidates_decided
  ON public.schedule_poll_candidates(poll_id)
  WHERE is_decided;

-- organization_id の自動導出（task_comments/053と同じパターン）
CREATE OR REPLACE FUNCTION public.set_schedule_poll_candidate_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.organization_id := (SELECT organization_id FROM public.schedule_polls WHERE id = NEW.poll_id);
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'poll_id % does not reference an existing schedule_polls row', NEW.poll_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_schedule_poll_candidate_org() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_schedule_poll_candidate_org() FROM anon, authenticated;

CREATE TRIGGER schedule_poll_candidates_set_org
  BEFORE INSERT ON public.schedule_poll_candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_schedule_poll_candidate_org();

ALTER TABLE public.schedule_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_poll_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_polls_select_own_org"
  ON public.schedule_polls FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

CREATE POLICY "schedule_polls_insert_own_org"
  ON public.schedule_polls FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

CREATE POLICY "schedule_poll_candidates_select_own_org"
  ON public.schedule_poll_candidates FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

CREATE POLICY "schedule_poll_candidates_insert_own_org"
  ON public.schedule_poll_candidates FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

-- UPDATE/DELETEポリシーは意図的に作らない。is_decidedの変更は069のRPC（SECURITY DEFINER）
-- 経由に限定し、クライアントからの直接UPDATEは許可しない。
