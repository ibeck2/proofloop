-- チャット通知などで相手の contact_email を参照するための profiles SELECT ポリシー
-- 以前の名前で作成済みの環境向けに先に削除
DROP POLICY IF EXISTS "profiles_select_applicants_of_my_organization" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_owner_of_applied_organization" ON public.profiles;
DROP POLICY IF EXISTS "Clubs can view applicant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Applicants can view club admin profiles" ON public.profiles;

-- 1. 団体管理者が、自団体への応募者のプロフィール（連絡先）を取得できるようにする
CREATE POLICY "Clubs can view applicant profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT user_id
      FROM public.applications
      WHERE organization_id IN (
        SELECT id FROM public.organizations WHERE user_id = auth.uid()
      )
    )
  );

-- 2. 応募者が、応募先団体の管理者（オーナー）のプロフィール（連絡先）を取得できるようにする
CREATE POLICY "Applicants can view club admin profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT user_id
      FROM public.organizations
      WHERE id IN (
        SELECT organization_id FROM public.applications WHERE user_id = auth.uid()
      )
    )
  );
