import type { ChannelKind } from "./channels";

export type SignalColor = "green" | "gray" | "red";
export type GrantLevel = "full" | "limited";
export type ClaimStatus =
  | "issued" | "applied" | "approved" | "rejected" | "revoked" | "expired";

/**
 * organizations.claim_status。上の ClaimStatus（organization_claims 行の状態）とは
 * 別物なので混同しない。値は 028 の organizations_claim_status_check と対応する。
 * string で受けると "claimd" のような綴り間違いが実行時まで気づけない。
 */
export type OrganizationClaimStatus = "unclaimed" | "claimed" | "frozen";

/** apply_for_claim が SQL で集めた「生の事実」。判定はしない */
export type RawSignals = {
  channel: ChannelKind;
  channel_is_unique: boolean;
  /** 共有だった場合、同じハンドルを使う他団体の名前 */
  shared_with: string[];
  applicant_email: string | null;
  org_university: string | null;
  is_intercollege: boolean;
  /** 同じ団体に対する他の applied / approved の件数 */
  competing_claims: number;
  name_is_placeholder: boolean;
  applicant_profile_complete: boolean;
  applicant_account_age_days: number;
};

export type EvaluatedSignals = {
  channelExclusive: SignalColor;
  universityDomain: SignalColor;
  competingClaims: SignalColor;
  applicantIdentity: SignalColor;
  recordHealth: SignalColor;
};

export type PermissionFlags = {
  can_edit_profile: boolean;
  can_manage_posts: boolean;
  can_manage_finance: boolean;
  can_manage_members: boolean;
  can_manage_applications: boolean;
};

/** list_open_disputes（031/032）の戻り値の1行。 */
export type DisputeRow = {
  id: string;
  organization_id: string;
  organization_name: string | null;
  claim_id: string | null;
  reporter_name: string;
  reporter_contact: string;
  body: string;
  created_at: string;
  /** 032 で追加。false の場合は自動凍結がレート制限で見送られ、記録のみ。 */
  froze_organization: boolean;
};

/** list_approved_claims（038）の戻り値の1行。「発行の取消」の対象。 */
export type ApprovedClaimRow = {
  id: string;
  organization_id: string;
  organization_name: string | null;
  organization_university: string | null;
  /** 'frozen' のときは異議申立て対応中。取消ボタンを無効化し /admin/disputes へ誘導する */
  organization_claim_status: OrganizationClaimStatus;
  applicant_user_id: string | null;
  applicant_name: string | null;
  applicant_email: string | null;
  granted_level: GrantLevel | null;
  decided_at: string | null;
};

/** list_rejected_claims（040）の戻り値の1行。「再発行」の対象。 */
export type RejectedClaimRow = {
  id: string;
  organization_id: string;
  organization_name: string | null;
  organization_university: string | null;
  /** 'unclaimed' でなければ既に別のclaimで解決済み。再発行ボタンを無効化する */
  organization_claim_status: OrganizationClaimStatus;
  channel: ChannelKind;
  channel_handle: string | null;
  decision_note: string | null;
  decided_at: string | null;
  /** その団体に今も有効な未使用トークン（issued/applied・期限内）が何件あるか。
   *  1件以上あれば、再発行すると二重発行になる可能性を画面で警告する。 */
  live_sibling_count: number;
};
