import { describe, it, expect } from "vitest";
import { pickOrganizationContactUserId, type ContactCandidate } from "./organizationMembers";

const m = (over: Partial<ContactCandidate> & { user_id: string }): ContactCandidate => ({
  role: "member",
  created_at: null,
  ...over,
});

describe("pickOrganizationContactUserId", () => {
  it("owner が居ればその人を選ぶ", () => {
    const picked = pickOrganizationContactUserId([
      m({ user_id: "u-member" }),
      m({ user_id: "u-owner", role: "owner" }),
      m({ user_id: "u-admin", role: "admin" }),
    ]);
    expect(picked).toBe("u-owner");
  });

  it("owner が居なければ admin に降りる", () => {
    const picked = pickOrganizationContactUserId([
      m({ user_id: "u-member" }),
      m({ user_id: "u-admin", role: "admin" }),
    ]);
    expect(picked).toBe("u-admin");
  });

  // claim を「限定」で承認された団体の代表は role='member'。ここで null を返すと
  // 「この団体に連絡」が黙って機能しなくなる
  it("owner も admin も居なければ member を選ぶ", () => {
    const picked = pickOrganizationContactUserId([m({ user_id: "u-limited" })]);
    expect(picked).toBe("u-limited");
  });

  it("同順位なら参加が早い方を選ぶ", () => {
    const picked = pickOrganizationContactUserId([
      m({ user_id: "u-late", role: "admin", created_at: "2026-08-09T00:00:00Z" }),
      m({ user_id: "u-early", role: "admin", created_at: "2026-07-01T00:00:00Z" }),
    ]);
    expect(picked).toBe("u-early");
  });

  it("created_at が無い行は、ある行より後回しにする", () => {
    const picked = pickOrganizationContactUserId([
      m({ user_id: "u-null", role: "admin", created_at: null }),
      m({ user_id: "u-dated", role: "admin", created_at: "2026-07-01T00:00:00Z" }),
    ]);
    expect(picked).toBe("u-dated");
  });

  it("未知の role は member と同じ順位として扱う（owner に負ける）", () => {
    const picked = pickOrganizationContactUserId([
      m({ user_id: "u-weird", role: "treasurer" }),
      m({ user_id: "u-owner", role: "owner" }),
    ]);
    expect(picked).toBe("u-owner");
  });

  it("メンバーが居なければ null", () => {
    expect(pickOrganizationContactUserId([])).toBeNull();
  });
});
