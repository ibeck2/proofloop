-- 034 重いクエリのための索引
--
-- ✅ 本番適用済み 2026-08-11（オーナー承認済み）。
-- ⚠️ Supabase の履歴テーブルには name `query_performance_indexes` として記録されている
--    （033 と同様、`NNN_` 接頭辞が付いていない）。このファイルと同一のもの。
-- 適用後の実測：/clubdashboard の閲覧数取得が 49ブロックの全件走査 →
--    Index Only Scan で7バッファ（実行 0.152ms）。
--
-- 背景：2026-08-10 の本番停止は NANO のディスクI/O枯渇だった（容量ではなくI/O帯域）。
-- MICRO に上げたが枠は無限ではない。claim通知1,400件で団体ページ・ダッシュボードへ
-- 同時流入が起きるため、流入経路で走る全件走査を潰しておく。
--
-- 棚卸しの詳細と各項目の根拠は `docs/superpowers/plans/2026-08-10-query-performance.md`。
--
-- 対象テーブルはいずれも 1 MB 未満なので、CONCURRENTLY 無しでも作成は一瞬で終わり、
-- 書き込みロックの体感は無い（CONCURRENTLY はトランザクション内で使えず、
-- Supabase のマイグレーションはトランザクションで走るためこちらを選ぶ）。

-- ── 1. 団体の閲覧ログ（最優先）────────────────────────────────
-- 現状 organization_page_views には主キーしか無い。/clubdashboard は
--   ① 今月の閲覧数（count: "exact" ＝ PostgREST は同じ走査を2度行う）
--   ② 直近30日の created_at 一覧
-- の2本を organization_id で撃つが、どちらも全件走査になる。
-- 実測：2,634行・49ブロックを読んで該当3行（EXPLAIN ANALYZE, 2026-08-10）。
-- このテーブルは団体ページの閲覧ごとに1行増えるので、放置すると最も速く悪化する。
CREATE INDEX IF NOT EXISTS idx_org_page_views_org_created
  ON public.organization_page_views (organization_id, created_at DESC);

-- ── 2. 所属メンバー（user_id 起点）────────────────────────────
-- 既存の一意索引は (organization_id, user_id) なので、先頭列でない user_id 単独の
-- 絞り込みには効かない。ところが実際の問い合わせは user_id 起点が主で、
-- ClubOrganizationContext・fetchMyOrganizationMemberships に加えて、
-- organization_posts / organization_page_views の RLS が呼ぶ
-- get_user_organization_ids(auth.uid()) も user_id で引く。
-- claim で引き取った団体が増えるほど、この行数がそのまま増える。
CREATE INDEX IF NOT EXISTS idx_org_members_user
  ON public.organization_members (user_id);

-- ── 3. 団体詳細ページが毎回撃つ3本 ───────────────────────────
-- /organizations/[id] は ISR が効いておらず1アクセスごとにサーバで走る。
-- organizations 本体は主キー引きで速いが、下の3テーブルは organization_id に
-- 索引が無く全件走査になる。いま各32kB（4ブロック）なので実害は小さいが、
-- 引き取った団体がイベント・写真・口コミを入れ始めると素直に効いてくる。
CREATE INDEX IF NOT EXISTS idx_events_org_date
  ON public.events (organization_id, event_date);

CREATE INDEX IF NOT EXISTS idx_org_photos_org_created
  ON public.organization_photos (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_org_status
  ON public.reviews (organization_id, status);

-- ── 4. 応募まわり ─────────────────────────────────────────────
-- 既存の unique_proofloop_applicant は (user_id, organization_id) で、
-- 団体側から見る「この団体への応募」（/clubats・/clubdashboard）には効かない。
CREATE INDEX IF NOT EXISTS idx_applications_org_created
  ON public.applications (organization_id, created_at DESC);

-- 未読件数は application_id の IN で引くが、この表には主キーしか無い。
CREATE INDEX IF NOT EXISTS idx_application_messages_app
  ON public.application_messages (application_id, created_at);

-- ── 5. organizations 本体について ─────────────────────────────
-- あえて索引を足していない。理由：
--   * 承認済み2,421行・ヒープ680kB（85ブロック）が丸ごと共有バッファに載っており、
--     `WHERE is_approved` の全件走査は実測 1.0ms / 全ブロック shared hit。
--     この規模ではプランナは索引を選ばず、索引の維持コストだけが増える。
--   * `claim_status` は棚卸しの結果、**走査の絞り込み条件として一度も使われていない**。
--     アプリ側は /organizations/[id] が列を読むだけ、RPC 群は `WHERE id = ...` の
--     主キー引き、RLS の `claim_status <> 'frozen'` は UPDATE 側かつ不等号なので
--     索引が効かない。よって claim_status の索引は不要。
--   * 実際の重さは走査ではなく **1リクエスト643kB の直列化と転送** にあり、
--     索引では解決しない（/search の件数上限とキャッシュで対処する。計画書参照）。
-- 掲載が1万件規模になったら以下を再検討する：
--   CREATE INDEX idx_organizations_university ON public.organizations (university) WHERE is_approved;
--   CREATE INDEX idx_organizations_category   ON public.organizations (category)   WHERE is_approved;

ANALYZE public.organization_page_views;
ANALYZE public.organization_members;
ANALYZE public.events;
ANALYZE public.organization_photos;
ANALYZE public.reviews;
ANALYZE public.applications;
ANALYZE public.application_messages;
