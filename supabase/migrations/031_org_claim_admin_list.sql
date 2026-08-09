-- ============================================
-- 031 運営が申請と申立てを一覧するための RPC
-- organization_claims / organization_disputes は SELECT ポリシーが無いため、
-- admin 向けの読み取りも RPC 経由にする
-- ============================================

CREATE OR REPLACE FUNCTION public.list_pending_claims()
RETURNS TABLE (
  id uuid, organization_id uuid, organization_name text,
  organization_university text, channel text, channel_handle text,
  applicant_user_id uuid, applicant_role text, applicant_note text,
  applied_at timestamptz, signals jsonb
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT c.id, c.organization_id, o.name, o.university,
         c.channel, c.channel_handle,
         c.applicant_user_id, c.applicant_role, c.applicant_note,
         c.applied_at, c.signals
  FROM public.organization_claims c
  JOIN public.organizations o ON o.id = c.organization_id
  WHERE public.is_system_admin() AND c.status = 'applied'
  ORDER BY c.applied_at ASC;
$$;

-- froze_organization は概念としては 032（自動凍結のレート制限）の列だが、
-- 列を追加するのは 032 なのに参照するのは 031 という前後関係になると、
-- 番号順に適用したときに 031 が
-- "column d.froze_organization does not exist" で落ちる
-- （LANGUAGE sql の関数本体は CREATE 時に解決されるため）。
-- IF NOT EXISTS にしてあるので、032 側の同じ ALTER は no-op になる。
ALTER TABLE public.organization_disputes
  ADD COLUMN IF NOT EXISTS froze_organization boolean NOT NULL DEFAULT false;

-- froze_at も同様に 032 の列だが、froze_organization と対で扱う（片方だけ
-- 存在する状態を作らない）。凍結した「時刻」を通報時刻（created_at）から
-- 分離するための列で、032 のレート制限カウンタはこちらを基準に数える。
-- 詳細な理由は 032 の先頭コメントを参照。
ALTER TABLE public.organization_disputes
  ADD COLUMN IF NOT EXISTS froze_at timestamptz;

-- 戻り値の列を増やすため CREATE OR REPLACE では差し替えられない（旧定義が
-- 残っている環境で "cannot change return type of existing function" になる）。
DROP FUNCTION IF EXISTS public.list_open_disputes();

CREATE OR REPLACE FUNCTION public.list_open_disputes()
RETURNS TABLE (
  id uuid, organization_id uuid, organization_name text, claim_id uuid,
  reporter_name text, reporter_contact text, body text, created_at timestamptz,
  froze_organization boolean
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  -- froze_organization は 032 で追加。これが無いと運営は「この申立ては
  -- 実際に団体を凍結したのか、レート制限で記録だけされたのか」を判別できず、
  -- 凍結されていない団体を凍結中だと思い込んで対応してしまう。
  SELECT d.id, d.organization_id, o.name, d.claim_id,
         d.reporter_name, d.reporter_contact, d.body, d.created_at,
         d.froze_organization
  FROM public.organization_disputes d
  JOIN public.organizations o ON o.id = d.organization_id
  WHERE public.is_system_admin() AND d.status = 'open'
  ORDER BY d.created_at ASC;
$$;

-- ⚠ Supabase では REVOKE ALL ... FROM PUBLIC が効かない（no-op）。public スキーマの
--   デフォルト権限（pg_default_acl）により、新規関数には疑似ロール PUBLIC 経由ではなく
--   anon / authenticated / service_role へ「直接」EXECUTE が付与されるため、
--   PUBLIC への付与しか取り消さない FROM PUBLIC は届かない（032 §3・CLAUDE.md 参照）。
--   この2関数は内部の is_system_admin() ガードで anon が呼んでも0行になるが、
--   reporter_contact（通報者の連絡先）を返す関数なので、意図した権限モデルどおりに
--   anon から明示的に剥奪する。「関数を足したら anon から呼べる」を既定にしない。
REVOKE ALL ON FUNCTION public.list_pending_claims() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_open_disputes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_pending_claims() FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_open_disputes() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_pending_claims() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_open_disputes() TO authenticated;
