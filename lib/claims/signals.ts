import { matchUniversityDomain } from "./universityDomains";
import type { EvaluatedSignals, RawSignals, SignalColor } from "./types";

/** アカウント作成からこの日数未満なら「素性が薄い」とみなす */
const MIN_ACCOUNT_AGE_DAYS = 1;

/**
 * SQL が集めた生の事実を、承認画面に出す5つの色に変換する。
 * 判断そのものはしない。運営が「危険信号がないか」を見るための材料を作るだけ。
 */
export function evaluateSignals(r: RawSignals): EvaluatedSignals {
  return {
    // 最重要。共有ハンドルは「誰に届いたか保証できない」ことを意味する
    channelExclusive: r.channel_is_unique ? "green" : "red",
    universityDomain: matchUniversityDomain(
      r.applicant_email,
      r.org_university,
      r.is_intercollege
    ),
    competingClaims: r.competing_claims > 0 ? "red" : "green",
    applicantIdentity:
      r.applicant_profile_complete &&
      r.applicant_account_age_days >= MIN_ACCOUNT_AGE_DAYS
        ? "green"
        : "gray",
    recordHealth: r.name_is_placeholder ? "red" : "green",
  };
}

/**
 * 赤が1つでもあれば運営送り。灰は「判断材料にならない」であって危険信号ではないので
 * 赤として扱わない（灰を赤にすると、対応表の取りこぼしで正当な団体が弾かれる）。
 */
export function resolveVerdict(s: EvaluatedSignals): "green" | "red" {
  const colors: SignalColor[] = [
    s.channelExclusive,
    s.universityDomain,
    s.competingClaims,
    s.applicantIdentity,
    s.recordHealth,
  ];
  return colors.includes("red") ? "red" : "green";
}
