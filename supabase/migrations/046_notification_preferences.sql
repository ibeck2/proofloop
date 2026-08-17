-- 046 notification_preferences: 通知のオプトアウト設定
--
-- 設計原則：行が存在しない＝有効（デフォルトON）。オプトアウトした時だけ
-- enabled=false の行を作る（オプトインテーブルではなくオプトアウトテーブル）。
--
-- RLSは本人のみ読み書き可。ただし通知を送る側（actor）は受信者（recipient）の
-- 設定を確認する必要があるため、その cross-user 確認は is_notification_enabled
-- （SECURITY DEFINER）経由で行う。この関数はbooleanしか返さないため、
-- 露出する情報は最小限（list_approved_claims・submit_dispute と同じ、
-- 関数が露出範囲を制御する設計）。

CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- organization_id が NULL の行同士は標準UNIQUE制約では重複を許してしまうため、
-- 部分ユニークインデックスを2本に分ける。
CREATE UNIQUE INDEX uniq_notification_preferences_org
  ON public.notification_preferences (user_id, notification_type, organization_id)
  WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX uniq_notification_preferences_global
  ON public.notification_preferences (user_id, notification_type)
  WHERE organization_id IS NULL;

CREATE INDEX idx_notification_preferences_user
  ON public.notification_preferences(user_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_select_own"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_insert_own"
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_update_own"
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_delete_own"
  ON public.notification_preferences FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- cross-user の確認用。呼び出し元は自分以外のuser_idを渡せるが、
-- 返すのはboolean 1個だけなので情報漏洩の余地が無い。
CREATE OR REPLACE FUNCTION public.is_notification_enabled(
  p_user_id uuid, p_notification_type text, p_organization_id uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.notification_preferences
     WHERE user_id = p_user_id
       AND notification_type = p_notification_type
       AND organization_id IS NOT DISTINCT FROM p_organization_id
     LIMIT 1),
    true
  );
$$;

REVOKE ALL ON FUNCTION public.is_notification_enabled(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_notification_enabled(uuid, text, uuid) TO authenticated;
