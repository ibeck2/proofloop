import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const revalidateTag = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
}));

const { revalidateOrganizationPage } = await import("./revalidatePage");

const ORG = "002e59d9-d041-4893-ac46-537a34e06c90";

beforeEach(() => {
  revalidatePath.mockClear();
  revalidateTag.mockClear();
});

describe("revalidateOrganizationPage", () => {
  it("データキャッシュ（タグ）とページ（パス）の両方を捨てる", () => {
    expect(revalidateOrganizationPage(ORG)).toBe(true);
    expect(revalidateTag).toHaveBeenCalledWith(`organization:${ORG}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/organizations/${ORG}`);
  });

  it("タグとパスは同じ団体を指す（正規化のずれで半端に無効化しない）", () => {
    revalidateOrganizationPage(ORG.toUpperCase());
    expect(revalidateTag).toHaveBeenCalledWith(`organization:${ORG}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/organizations/${ORG}`);
  });

  /**
   * ここが本丸。`[id]` を revalidatePath に渡すと、その route の全ページ
   * （団体2,400件分）が一度に無効化される。呼んでしまわないことを固定する。
   */
  it("route 形式は何も無効化せず false を返す", () => {
    expect(revalidateOrganizationPage("[id]")).toBe(false);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("UUID でない値・空・null では何も呼ばない", () => {
    for (const bad of ["", "  ", "../../admin", "abc/def", null, undefined]) {
      expect(revalidateOrganizationPage(bad)).toBe(false);
    }
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
