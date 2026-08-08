-- ============================================
-- 030 profiles.role の自己昇格を塞ぐ
--
--    本番実測（2026-08-07）：
--    ・profiles の UPDATE ポリシー「Users can update own profile」は
--      USING (auth.uid() = id)、WITH CHECK は null、適用ロールは {public}
--    ・profiles の INSERT ポリシー「Users can insert own profile」は
--      WITH CHECK (auth.uid() = id)、適用ロールは {public}
--    ・どちらのポリシーも列を制限していない
--    ・authenticated と anon は profiles.role 列に UPDATE / INSERT の
--      テーブル権限（column privilege）を持っている
--    ・profiles に CHECK 制約もトリガーも 0 件
--
--    この4つが揃うと、ログインした利用者が自分自身の行に対して
--        update profiles set role = 'admin' where id = auth.uid();
--    をそのまま実行でき、運営（admin）に昇格できてしまう。プロフィール行が
--    まだ無い新規ユーザーでも upsert（INSERT ... ON CONFLICT DO UPDATE）経由で
--    同じことができる。profiles.role = 'admin' は /admin 配下（reviews /
--    requests / jobs）全体の唯一の認可根拠であり、影響は全面的。
--
--    ポリシー自体（USING / WITH CHECK）には触らない。「Users can update own
--    profile」等の既存8本の閲覧系ポリシーを書き換えると波及範囲が読み切れない
--    ため、代わりに列レベルの GRANT/REVOKE で role 列だけを塞ぐ。
--    ＝ 029（organizations の user_id）と同じ手法・同じ思想。
--
--    ⚠ Postgres の落とし穴：テーブルレベルの GRANT UPDATE/INSERT が残ったまま
--       REVOKE UPDATE (col) / REVOKE INSERT (col) しても効かない。
--       いったんテーブルレベルを REVOKE してから、許可する列だけを GRANT し
--       直す（029 の organizations に対する手法をそのまま踏襲）。
--
--    role を変更する正当な経路（運営が誰かを admin にする）は、この変更の後は
--    service_role 経由の操作か、Supabase 上での SQL 直実行に限られる。
--    authenticated 用の「admin に昇格させる」RPC は意図的に用意しない
--    （そのRPC自体が新たな自己昇格経路になるため）。
-- ============================================

-- --------------------------------------------
-- 1. UPDATE: テーブル単位を一旦 REVOKE してから、role 以外の11列だけ GRANT し直す
--    role 以外の全11列：
--    email, display_name, university, faculty, enrollment_year, updated_at,
--    contact_email, graduation_year, full_name, admission_year
--    （id は主キーであり、本人が自分の行を更新する理由が無いため UPDATE には含めない）
-- --------------------------------------------
REVOKE UPDATE ON TABLE public.profiles FROM authenticated, anon;

GRANT UPDATE (
  email, display_name, university, faculty, enrollment_year, updated_at,
  contact_email, graduation_year, full_name, admission_year
) ON public.profiles TO authenticated;

-- --------------------------------------------
-- 2. INSERT: 同様にテーブル単位を REVOKE してから、role 以外の11列（id を含む）を
--    GRANT し直す。app/mypage/page.tsx・app/signup/page.tsx の upsert は
--    INSERT ... ON CONFLICT DO UPDATE として実行されるため、初回行作成の
--    主キー（id）は INSERT 側にだけ必要。
-- --------------------------------------------
REVOKE INSERT ON TABLE public.profiles FROM authenticated, anon;

GRANT INSERT (
  id, email, display_name, university, faculty, enrollment_year, updated_at,
  contact_email, graduation_year, full_name, admission_year
) ON public.profiles TO authenticated;

-- anon には profiles の UPDATE / INSERT を一切与えない
-- （未ログインが自分のプロフィールを持つ経路は存在しない）。
-- SELECT と service_role の全権限には触れていない。

-- --------------------------------------------
-- 意図的に含めない列と、その理由：
--   role … 唯一の認可根拠。authenticated から書ける経路を持たせない。
--          正当な変更経路は service_role か SQL 直実行のみ。
-- --------------------------------------------
