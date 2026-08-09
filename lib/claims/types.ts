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
