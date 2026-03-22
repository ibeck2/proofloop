-- 団体管理者申請の承認 RPC（organization_members への INSERT を含む）
-- クライアントは supabase.rpc('approve_admin_request', { target_request_id: uuid })

-- ---------------------------------------------------------------------------
-- organization_admin_requests（未作成環境向け）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  sns_type text,
  proof_link text NOT NULL DEFAULT '',
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  new_org_name text,
  new_org_university text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_admin_requests
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_organization_admin_requests_status
  ON public.organization_admin_requests (status);

CREATE INDEX IF NOT EXISTS idx_organization_admin_requests_user_id
  ON public.organization_admin_requests (user_id);

-- ---------------------------------------------------------------------------
-- organization_members: organization_id 単独 UNIQUE などがあれば複数メンバー不可のため除去
-- （organization_id, user_id）の複合ユニークのみ残す
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public'
      AND rel.relname = 'organization_members'
      AND c.contype = 'u'
      AND array_length(c.conkey, 1) = 1
      AND EXISTS (
        SELECT 1
        FROM unnest(c.conkey) WITH ORDINALITY AS u(attnum, ord)
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid AND a.attnum = u.attnum
        WHERE a.attname = 'organization_id'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
    RAISE NOTICE 'Dropped single-column UNIQUE on organization_members: %', r.conname;
  END LOOP;
END;
$$;

DO $idx$
BEGIN
  IF to_regclass('public.organization_members') IS NOT NULL THEN
    EXECUTE
      'CREATE UNIQUE INDEX IF NOT EXISTS organization_members_org_user_uidx
       ON public.organization_members (organization_id, user_id)';
  END IF;
END;
$idx$;

-- ---------------------------------------------------------------------------
-- approve_admin_request: SECURITY DEFINER で RLS をバイパスしメンバー行を確実に INSERT
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_admin_request(target_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.organization_admin_requests%ROWTYPE;
  caller_id uuid := auth.uid();
  new_org_id uuid;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated: ログインが必要です';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = caller_id
      AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'forbidden: システム管理者（profiles.role = admin）のみ承認できます';
  END IF;

  SELECT *
    INTO req
  FROM public.organization_admin_requests
  WHERE id = target_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_found: 申請 ID が見つかりません: %', target_request_id;
  END IF;

  IF req.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'not_pending: すでに処理済みです（status=%）', req.status;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = req.user_id) THEN
    RAISE EXCEPTION 'applicant_no_profiles_row: 申請者が public.profiles に存在しません（マイページでプロフィール保存後に再試行） user_id=%', req.user_id;
  END IF;

  -- 既存団体への参加申請
  IF req.organization_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = req.organization_id) THEN
      RAISE EXCEPTION 'organization_not_found: 団体が存在しません id=%', req.organization_id;
    END IF;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (req.organization_id, req.user_id, 'admin')
    ON CONFLICT (organization_id, user_id) DO NOTHING;

  ELSE
    -- 新規団体設立申請
    IF req.new_org_name IS NULL OR btrim(req.new_org_name) = '' THEN
      RAISE EXCEPTION 'new_org_name_required: 新規団体名が空です';
    END IF;

    INSERT INTO public.organizations (user_id, name, university)
    VALUES (
      req.user_id,
      btrim(req.new_org_name),
      NULLIF(btrim(COALESCE(req.new_org_university, '')), '')
    )
    RETURNING id INTO new_org_id;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'is_approved'
    ) THEN
      UPDATE public.organizations
      SET is_approved = true
      WHERE id = new_org_id;
    END IF;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (new_org_id, req.user_id, 'owner')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;

  UPDATE public.organization_admin_requests
  SET
    status = 'approved',
    updated_at = now()
  WHERE id = target_request_id;

  RETURN jsonb_build_object(
    'ok', true,
    'organization_id', COALESCE(req.organization_id, new_org_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_admin_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_admin_request(uuid) TO authenticated;

COMMENT ON FUNCTION public.approve_admin_request(uuid) IS
  '運営が団体管理者申請を承認。既存団体は admin、新規団体は organizations 作成＋申請者を owner で organization_members に登録。';
