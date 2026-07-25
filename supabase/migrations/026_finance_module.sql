-- ============================================
-- 026 財務DX（学生団体会計）v1
-- finance_* テーブル / RLS / 権限フラグ / Storage
-- ============================================

-- --------------------------------------------
-- 0. メンバーシップ判定ヘルパ（RLS再帰回避のため SECURITY DEFINER）
-- --------------------------------------------
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS can_manage_finance boolean NOT NULL DEFAULT false;
ALTER TABLE public.organization_invitations
  ADD COLUMN IF NOT EXISTS can_manage_finance boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = p_org AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org_finance(p_org uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = p_org AND m.user_id = auth.uid() AND m.can_manage_finance = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_org_finance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_org_finance(uuid) TO authenticated;

-- --------------------------------------------
-- 1. 会計期間
-- --------------------------------------------
CREATE TABLE public.finance_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  opening_balance integer NOT NULL DEFAULT 0,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------
-- 2. 費目マスタ
-- --------------------------------------------
CREATE TABLE public.finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income','expense')),
  sort_order integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------
-- 3. 事業/イベント/協賛・助成源タグ
-- --------------------------------------------
CREATE TABLE public.finance_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'general' CHECK (kind IN ('event','grant','sponsor','general')),
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------
-- 4. 取引（出納帳の行）
-- --------------------------------------------
CREATE TABLE public.finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.finance_periods(id) ON DELETE CASCADE,
  occurred_on date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income','expense')),
  category_id uuid NOT NULL REFERENCES public.finance_categories(id),
  project_id uuid REFERENCES public.finance_projects(id) ON DELETE SET NULL,
  amount integer NOT NULL CHECK (amount >= 0),
  memo text,
  receipt_path text,
  receipt_no text,
  parent_transaction_id uuid REFERENCES public.finance_transactions(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- --------------------------------------------
-- 5. 予算
-- --------------------------------------------
CREATE TABLE public.finance_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.finance_periods(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.finance_categories(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('income','expense')),
  planned_amount integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, category_id)
);

-- --------------------------------------------
-- index
-- --------------------------------------------
CREATE INDEX idx_finance_periods_org ON public.finance_periods(organization_id);
CREATE INDEX idx_finance_categories_org ON public.finance_categories(organization_id);
CREATE INDEX idx_finance_projects_org ON public.finance_projects(organization_id);
CREATE INDEX idx_finance_transactions_org_period ON public.finance_transactions(organization_id, period_id);
CREATE INDEX idx_finance_transactions_parent ON public.finance_transactions(parent_transaction_id);
CREATE INDEX idx_finance_budgets_org_period ON public.finance_budgets(organization_id, period_id);

-- --------------------------------------------
-- RLS: SELECT=メンバー, 書き込み=会計担当
-- --------------------------------------------
ALTER TABLE public.finance_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'finance_periods','finance_categories','finance_projects','finance_transactions','finance_budgets'
  ] LOOP
    EXECUTE format($f$
      CREATE POLICY "%1$s_select" ON public.%1$s
        FOR SELECT USING (public.is_org_member(organization_id));
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "%1$s_write" ON public.%1$s
        FOR ALL TO authenticated
        USING (public.can_manage_org_finance(organization_id))
        WITH CHECK (public.can_manage_org_finance(organization_id));
    $f$, t);
  END LOOP;
END $$;

-- --------------------------------------------
-- accept_organization_invitation を can_manage_finance 込みで更新
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.organization_invitations%ROWTYPE;
  uemail text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO inv FROM public.organization_invitations WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = auth.uid();
  IF uemail IS NULL OR lower(trim(uemail)) <> lower(trim(inv.email)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_mismatch');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = inv.organization_id AND user_id = auth.uid()
  ) THEN
    DELETE FROM public.organization_invitations WHERE token = p_token;
    RETURN jsonb_build_object('ok', true, 'already_member', true);
  END IF;

  INSERT INTO public.organization_members (
    organization_id, user_id, role,
    can_edit_profile, can_manage_posts, can_manage_members, can_manage_applications, can_manage_finance
  )
  VALUES (
    inv.organization_id, auth.uid(), inv.role,
    COALESCE(inv.can_edit_profile, false),
    COALESCE(inv.can_manage_posts, true),
    COALESCE(inv.can_manage_members, false),
    COALESCE(inv.can_manage_applications, true),
    COALESCE(inv.can_manage_finance, false)
  );

  DELETE FROM public.organization_invitations WHERE token = p_token;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_organization_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(uuid) TO authenticated;

-- --------------------------------------------
-- Storage: 領収書バケット（非公開）
-- --------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('finance-receipts', 'finance-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "finance_receipts_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'finance-receipts'
         AND public.is_org_member(((storage.foldername(name))[1])::uuid));

CREATE POLICY "finance_receipts_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'finance-receipts'
              AND public.can_manage_org_finance(((storage.foldername(name))[1])::uuid));

CREATE POLICY "finance_receipts_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'finance-receipts'
         AND public.can_manage_org_finance(((storage.foldername(name))[1])::uuid));
