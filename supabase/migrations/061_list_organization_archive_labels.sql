-- 061: 団体のアーカイブラベル一覧を集約して返すRPC
--
-- 「表示」フィルタのドロップダウンに出す選択肢（過去にアーカイブされた
-- ラベルの一覧）を、これまでは団体の全アーカイブ済み行を丸ごと取得して
-- クライアント側で重複排除・ソートしていたが、年度アーカイブを重ねる
-- ほど行数が増え、Supabase/PostgRESTの応答上限（既定1000行）を超えると
-- ドロップダウンから特定の年度が無言で消えうる（最終レビューで指摘）。
--
-- 本関数はSQL側でGROUP BYして集約するため、応答は「ラベルの種類数」に
-- 比例し、タスク総数には比例しない。SECURITY DEFINERにはしない
-- （呼び出し元自身のRLS＝tasks_select_own_orgがそのまま働けば十分で、
-- 昇格権限は不要なため。DEFINERにしない方が権限モデルとして単純で安全）。

CREATE OR REPLACE FUNCTION public.list_organization_archive_labels(
  p_organization_id uuid
)
RETURNS TABLE (archive_label text, latest_archived_at timestamptz)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT archive_label, max(archived_at) AS latest_archived_at
  FROM public.tasks
  WHERE organization_id = p_organization_id
    AND archive_label IS NOT NULL
  GROUP BY archive_label
  ORDER BY max(archived_at) DESC;
$$;

REVOKE ALL ON FUNCTION public.list_organization_archive_labels(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_organization_archive_labels(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_organization_archive_labels(uuid) TO authenticated;
