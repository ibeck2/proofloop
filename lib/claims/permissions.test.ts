import { describe, it, expect } from "vitest";
import { resolvePermissions } from "./permissions";

describe("resolvePermissions", () => {
  it("full はすべて許可", () => {
    expect(resolvePermissions("full")).toEqual({
      can_edit_profile: true,
      can_manage_posts: true,
      can_manage_finance: true,
      can_manage_members: true,
      can_manage_applications: true,
    });
  });

  it("limited はメンバー管理と応募者管理だけを止める", () => {
    expect(resolvePermissions("limited")).toEqual({
      can_edit_profile: true,
      can_manage_posts: true,
      can_manage_finance: true,
      can_manage_members: false,
      can_manage_applications: false,
    });
  });

  it("limited でも財務は開ける（実運用団体のKPIを塞がないため）", () => {
    expect(resolvePermissions("limited").can_manage_finance).toBe(true);
  });
});
