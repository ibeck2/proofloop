/**
 * Phase 5-A: ATS 応募（エントリー）関連の型定義
 */

export interface Application {
  id: string;
  user_id: string | null;
  organization_id: string;
  status: string;
  current_step: string;
  applicant_message: string | null;
  created_at?: string;
  /** Phase 6-A: 優先度（高・中・低・未設定） */
  priority?: string | null;
  /** 手動追加時の氏名 */
  manual_name?: string | null;
  /** 手動追加時の大学・学年など */
  manual_university?: string | null;
  /** 流入経路: ProofLoop / LINE / Google Form / その他 */
  source?: string | null;
  /** Phase 7-B: 最終メッセージ日時（トリガーで更新） */
  last_message_at?: string | null;
}

export interface ApplicationWithOrg extends Application {
  organizations: {
    id: string;
    name: string | null;
    university: string | null;
    category: string | null;
    logo_url: string | null;
  } | null;
}

export interface ProfileForEntry {
  display_name: string | null;
  university: string | null;
  faculty: string | null;
  enrollment_year: string | null;
}

/** Phase 5-B / 6-A: ATS用 - 応募 + 応募者プロフィール（user_id が null の場合は手動追加候補） */
export interface ApplicationWithProfile {
  id: string;
  user_id: string | null;
  organization_id: string;
  status: string;
  current_step: string;
  applicant_message: string | null;
  created_at?: string;
  last_message_at?: string | null;
  priority?: string | null;
  manual_name?: string | null;
  manual_university?: string | null;
  source?: string | null;
  profiles: {
    id: string;
    display_name: string | null;
    university: string | null;
    faculty: string | null;
    enrollment_year: string | null;
    email: string | null;
  } | null;
}

/** Phase 5-C / 6-D: 選考連絡履歴 */
export interface ApplicationMessage {
  id: string;
  application_id: string;
  sender_id: string;
  is_from_club: boolean;
  content: string;
  created_at?: string;
  /** 既読日時（団体側が開いたときに更新） */
  read_at?: string | null;
}
