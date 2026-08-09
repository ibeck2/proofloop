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
    // 最重要。共有ハンドルは「誰に届いたか保証できない」ことを意味する。
    // channel_is_unique はトークン発行時点の固定値なので、発行後・申請前に別団体が
    // 同じハンドルを登録すると古いままになる。申請時に実データから数え直した
    // shared_with と OR で見て、どちらかが共有を示したら赤にする
    // （発行時の判定と承認画面の警告枠が食い違い、監査に残る verdict が
    //   green になってしまう事故を防ぐ）。
    channelExclusive:
      r.channel_is_unique && (r.shared_with?.length ?? 0) === 0 ? "green" : "red",
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
