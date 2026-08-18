-- 057: tasksに年度アーカイブ用の列とアーカイブ実行RPCを追加
--
-- 列追加自体は056と同じ理由でGRANT不要（tasksは列レベルGRANT制限が無い
-- テーブルレベル標準GRANT。pg_attribute.attaclで確認済み）。ただし
-- archived_at/archive_labelは「代表者（owner/admin）のみが一括で書き込む」
-- という要件があるため、この2列だけは意図的にUPDATE権限をauthenticated/anon
-- から剥がし、SECURITY DEFINER RPC（archive_organization_tasks）経由での
-- 書き込みのみを許可する。SECURITY DEFINER関数は呼び出し元ロールではなく
-- 関数所有者の権限で実行されるため、この列レベルREVOKEの影響を受けない。
-- upsert（ON CONFLICT DO UPDATE）ではなく、handleSave側の.update()は明示的に
-- 列を列挙する形（archived_at/archive_labelを含まない）なので、この
-- REVOKEが既存の保存経路を壊さないことを確認済み（CLAUDE.mdの列レベル
-- GRANT×upsertの既知の落とし穴はここでは該当しない）。
--
-- ⚠ Postgres の落とし穴（本番検証のケース4で実際に踏んだ・029/030と同じ手法で
--   回避）：tasksにはテーブルレベルの標準GRANT UPDATE ON tasks TO authenticated,
--   anon（relacl）が既に存在するため、`REVOKE UPDATE (archived_at, archive_label)
--   ON tasks FROM authenticated, anon` のように列を指定したREVOKEだけを打っても
--   何も効かない（列レベルACLに既存エントリが無いためREVOKEがno-opになり、
--   テーブルレベルのUPDATE権限がそのまま両列にも及ぶ）。実際にBEGIN…ROLLBACK
--   検証のケース4で、列REVOKEのみの版はowner本人による直接UPDATEを拒否できず
--   UNEXPECTED_SUCCESSになった。正しくは、いったんテーブルレベルのUPDATEを
--   REVOKEしてから、許可する列だけをGRANT UPDATE (...)で明示的に列挙し直す
--   （029のorganizations.user_id・030のprofiles.roleと同じ手法）。

ALTER TABLE public.tasks
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN archive_label text;

CREATE INDEX idx_tasks_org_archived_at ON public.tasks(organization_id, archived_at);

-- テーブル単位を一旦REVOKEしてから、archived_at/archive_label以外の13列だけを
-- GRANTし直す（anonには再GRANTしない＝anonはtasksのUPDATEを一切持たない。
-- 元々RLSがauth.uid()前提でanonの行アクセスを塞いでいたため実質的な後退はない）。
REVOKE UPDATE ON TABLE public.tasks FROM authenticated, anon;

GRANT UPDATE (
  id, organization_id, title, description, status, priority, assignee_id,
  due_date, created_at, created_by, reviewer_id, category, recurrence_rule
) ON public.tasks TO authenticated;

CREATE OR REPLACE FUNCTION public.archive_organization_tasks(
  p_organization_id uuid,
  p_archive_label text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_label text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'only organization owner/admin can archive tasks';
  END IF;

  v_label := btrim(p_archive_label);
  IF v_label IS NULL OR v_label = '' THEN
    RAISE EXCEPTION 'archive_label must not be empty';
  END IF;

  UPDATE public.tasks
  SET archived_at = now(),
      archive_label = v_label
  WHERE organization_id = p_organization_id
    AND archived_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_organization_tasks(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.archive_organization_tasks(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.archive_organization_tasks(uuid, text) TO authenticated;
