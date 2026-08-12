-- ============================================
-- 037 ログイン済み全ユーザーが全ユーザーの profiles（email 含む）を
--     読めていたのを塞ぐ（リスク台帳 S12）
--
--    本番実測（2026-08-12）：
--      `profiles` の SELECT ポリシー `Public profiles are viewable by
--      everyone` が roles={authenticated} / qual: true。列権限も
--      `authenticated` に email・contact_email を含む全列SELECTが付いている。
--      RLSは複数ポリシーをORで評価するため、この1本があるだけで他の
--      関係ベースの4本（本人・同僚・応募者⇔団体）の絞り込みが意味を失う。
--
--    列権限（GRANT）は触らない。email 列は「本人」「団体メンバーが
--    応募者を見る」「応募者が団体の連絡先を見る」のいずれでも正当に
--    必要なため、列単位で絞ると必要な経路まで塞いでしまう
--    （030 の教訓：呼び出し側を確認せず絞ると壊れる）。問題は行レベルの
--    無条件許可だけなので、行ポリシーを1本消すだけで直る。
--
--    🚨 削除前に発覚した依存：get_owner_user_ids_for_applied_orgs は
--      role='owner' のメンバーしか返さない。ところが実際に「団体の連絡先」
--      として選ばれる相手は fetchOrganizationOwnerUserId
--      （lib/organizationMembers.ts：owner→admin→最古のメンバー の順）で
--      決まり、限定承認（role='member'）が選ばれるケースを想定している。
--      応募完了時の通知メール（OrganizationDetailClient.tsx の
--      fireApplyNotificationEmail）と応募DMの通知メール（ChatRoom.tsx の
--      fireChatEmailNotification）は、どちらもこの経路で
--      「応募者が団体の連絡先の contact_email を読む」ために
--      この関数のポリシーへ依存している。
--
--      無条件ポリシーを消すだけだと、限定承認の団体宛の通知メールが
--      今後 claim を承認するたびに静かに失敗するようになる
--      （claimが0件のため今は表面化していない）。
--      そこで関数側の role 制限も外し、「応募した団体のメンバーなら誰でも」
--      に広げる。これは対になる「Clubs can view applicant profiles」
--      （get_user_organization_ids・role制限なし）と対称になる変更でもある。
--
--    検証（BEGIN...ROLLBACK、本番実測 2026-08-12）：
--      修正前後で「応募者から owner の連絡先」「応募者から member(限定想定)
--      の連絡先」「本人」「同僚」はいずれも見える(1)のまま変化なし。
--      「無関係の第三者から誰かのプロフィール」だけが 1 → 0 に変化。
-- ============================================

CREATE OR REPLACE FUNCTION public.get_owner_user_ids_for_applied_orgs(p_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT om.user_id
  FROM public.organization_members om
  WHERE om.organization_id IN (
    SELECT organization_id FROM public.applications WHERE user_id = p_user_id
  );
$$;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- ============================================
-- この修正の対象外（既知だが今回は広げない・記録のみ）
--
--   「Clubs can view applicant profiles」は get_user_organization_ids
--   （role・フラグを問わない）を条件にしているため、団体の**どのメンバーでも**
--   その団体への応募者全員のプロフィールを見られる。can_manage_applications
--   フラグはここでは効かない（035 で塞いだのは applications /
--   application_messages テーブルへの到達であり、profiles 側の閲覧範囲は
--   別問題）。実害は「団体内の誰が見られるか」の範囲に留まり、S12
--   （全ログインユーザーへの無条件公開）とは重大度が異なるため、
--   今回はスコープに含めない。必要なら別途 risk-register に起票する。
-- ============================================
