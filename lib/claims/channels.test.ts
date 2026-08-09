import { describe, it, expect } from "vitest";
import {
  normalizeHandle,
  findSharedHandles,
  pickPrimaryChannel,
  type OrgChannels,
} from "./channels";

const org = (id: string, over: Partial<OrgChannels> = {}): OrgChannels => ({
  id,
  x_id: null,
  instagram_id: null,
  website_url: null,
  line_url: null,
  ...over,
});

describe("normalizeHandle", () => {
  it("前後の空白と先頭の@を落として小文字化する", () => {
    expect(normalizeHandle("  @Waseda_Tennis ")).toBe("waseda_tennis");
  });
  it("空文字とnullはnullになる", () => {
    expect(normalizeHandle("")).toBeNull();
    expect(normalizeHandle("   ")).toBeNull();
    expect(normalizeHandle(null)).toBeNull();
    expect(normalizeHandle(undefined)).toBeNull();
  });
});

describe("findSharedHandles", () => {
  it("2団体以上が使うハンドルだけを共有として拾う", () => {
    const shared = findSharedHandles([
      org("a", { x_id: "suikyu_toh" }),
      org("b", { x_id: "@Suikyu_Toh" }),
      org("c", { x_id: "solo_only" }),
    ]);
    expect(shared.x.has("suikyu_toh")).toBe(true);
    expect(shared.x.has("solo_only")).toBe(false);
  });

  it("チャネルごとに独立して判定する", () => {
    const shared = findSharedHandles([
      org("a", { x_id: "same", instagram_id: "uniq1" }),
      org("b", { x_id: "same", instagram_id: "uniq2" }),
    ]);
    expect(shared.x.has("same")).toBe(true);
    expect(shared.instagram.size).toBe(0);
  });
});

describe("pickPrimaryChannel", () => {
  it("X > Instagram > website > LINE の優先順で専有チャネルを選ぶ", () => {
    const orgs = [org("a", { x_id: "mine", instagram_id: "ig", website_url: "https://w" })];
    const shared = findSharedHandles(orgs);
    expect(pickPrimaryChannel(orgs[0], shared)).toEqual({
      channel: "x",
      handle: "mine",
    });
  });

  it("上位が共有なら次の専有チャネルへ落ちる", () => {
    const orgs = [
      org("a", { x_id: "dup", instagram_id: "mine_ig" }),
      org("b", { x_id: "dup" }),
    ];
    const shared = findSharedHandles(orgs);
    expect(pickPrimaryChannel(orgs[0], shared)).toEqual({
      channel: "instagram",
      handle: "mine_ig",
    });
  });

  it("専有チャネルが1つも無ければ null（＝通知対象外）", () => {
    const orgs = [org("a", { x_id: "dup" }), org("b", { x_id: "dup" })];
    const shared = findSharedHandles(orgs);
    expect(pickPrimaryChannel(orgs[0], shared)).toBeNull();
  });

  it("チャネルが空の団体も null", () => {
    const orgs = [org("a")];
    expect(pickPrimaryChannel(orgs[0], findSharedHandles(orgs))).toBeNull();
  });
});
