import { describe, it, expect } from "vitest";
import { evaluateSignals, resolveVerdict } from "./signals";
import type { RawSignals } from "./types";

const raw = (over: Partial<RawSignals> = {}): RawSignals => ({
  channel: "x",
  channel_is_unique: true,
  shared_with: [],
  applicant_email: "a@waseda.jp",
  org_university: "早稲田大学",
  is_intercollege: false,
  competing_claims: 0,
  name_is_placeholder: false,
  applicant_profile_complete: true,
  applicant_account_age_days: 30,
  ...over,
});

describe("evaluateSignals", () => {
  it("すべて正常なら全部緑", () => {
    const s = evaluateSignals(raw());
    expect(s).toEqual({
      channelExclusive: "green",
      universityDomain: "green",
      competingClaims: "green",
      applicantIdentity: "green",
      recordHealth: "green",
    });
  });

  it("チャネルが共有なら赤", () => {
    const s = evaluateSignals(raw({ channel_is_unique: false, shared_with: ["柔道部", "陸上部"] }));
    expect(s.channelExclusive).toBe("red");
  });

  it("競合申請があれば赤", () => {
    expect(evaluateSignals(raw({ competing_claims: 1 })).competingClaims).toBe("red");
  });

  it("団体名がプレースホルダなら赤", () => {
    expect(evaluateSignals(raw({ name_is_placeholder: true })).recordHealth).toBe("red");
  });

  it("profileが空、または作成直後のアカウントは灰", () => {
    expect(evaluateSignals(raw({ applicant_profile_complete: false })).applicantIdentity).toBe("gray");
    expect(evaluateSignals(raw({ applicant_account_age_days: 0 })).applicantIdentity).toBe("gray");
  });
});

describe("resolveVerdict", () => {
  it("赤が1つも無ければ green（灰は赤として扱わない）", () => {
    expect(resolveVerdict(evaluateSignals(raw()))).toBe("green");
    expect(
      resolveVerdict(evaluateSignals(raw({ applicant_profile_complete: false, is_intercollege: true })))
    ).toBe("green");
  });

  it("赤が1つでもあれば red", () => {
    expect(resolveVerdict(evaluateSignals(raw({ channel_is_unique: false })))).toBe("red");
  });
});
