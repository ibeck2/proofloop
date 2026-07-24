import { describe, expect, it } from "vitest";
import { buildOrgDescription, buildOrgTitle, parseMemberCount, type OrgMetaSource } from "./pageMetadata";

const base: OrgMetaSource = {
  name: "音楽部交響楽団",
  university: "京都大学",
  description: null,
  activity_frequency: null,
  member_count: null,
};

describe("buildOrgTitle", () => {
  it("団体名と大学名を組み合わせて一意にする", () => {
    expect(buildOrgTitle(base)).toBe("音楽部交響楽団（京都大学）");
  });

  it("大学名が無いときは団体名だけにする", () => {
    expect(buildOrgTitle({ ...base, university: null })).toBe("音楽部交響楽団");
  });

  it("空白だけの大学名は無いものとして扱う", () => {
    expect(buildOrgTitle({ ...base, university: "   " })).toBe("音楽部交響楽団");
  });

  it("末尾に「| ProofLoop」を付けない（root の title.template が付与するため）", () => {
    expect(buildOrgTitle(base)).not.toContain("ProofLoop");
  });
});

describe("buildOrgDescription", () => {
  it("団体自身の説明があればそれを使う", () => {
    const d = buildOrgDescription({ ...base, description: "オーケストラです。年2回の定期演奏会を開いています。" });
    expect(d).toBe("オーケストラです。年2回の定期演奏会を開いています。");
  });

  it("団体自身の説明が長いときは切り詰める", () => {
    const long = "あ".repeat(200);
    const d = buildOrgDescription({ ...base, description: long });
    expect(d.length).toBeLessThanOrEqual(120);
    expect(d.endsWith("…")).toBe(true);
  });

  it("説明が無いときは大学名と団体名で一意な文を作る", () => {
    const d = buildOrgDescription(base);
    expect(d).toContain("京都大学");
    expect(d).toContain("音楽部交響楽団");
  });

  it("持っていない情報には触れない（活動頻度・部員数が無いとき）", () => {
    const d = buildOrgDescription(base);
    expect(d).not.toContain("活動頻度");
    expect(d).not.toContain("メンバー");
  });

  it("活動頻度と部員数があるときだけ触れる", () => {
    const d = buildOrgDescription({ ...base, activity_frequency: "週2回", member_count: 60 });
    expect(d).toContain("活動頻度は週2回。");
    expect(d).toContain("メンバーは約60人。");
  });

  it("DBの実際の形式（「46人」のような文字列）でも部員数を出す", () => {
    // member_count カラムは text。数値として扱っていたため、実データでは
    // 一度も部員数が出ていなかった
    expect(buildOrgDescription({ ...base, member_count: "46人" })).toContain("メンバーは約46人。");
  });

  it("部員数が0や負値のときは触れない（未入力の代わりに0が入る場合がある）", () => {
    expect(buildOrgDescription({ ...base, member_count: 0 })).not.toContain("メンバー");
    expect(buildOrgDescription({ ...base, member_count: -1 })).not.toContain("メンバー");
    expect(buildOrgDescription({ ...base, member_count: "0人" })).not.toContain("メンバー");
  });

  it("団体ごとに異なる文になる（全ページ同一descriptionの解消）", () => {
    const a = buildOrgDescription(base);
    const b = buildOrgDescription({ ...base, name: "写真部", university: "上智大学" });
    expect(a).not.toBe(b);
  });
});

describe("parseMemberCount", () => {
  it("単位付きの文字列から人数を取り出す", () => {
    expect(parseMemberCount("46人")).toBe(46);
  });

  it("全角数字も扱える（実データに「１7人」「４０人」がある）", () => {
    expect(parseMemberCount("４０人")).toBe(40);
    expect(parseMemberCount("１7人")).toBe(17);
  });

  it("数値が入っていなければ null", () => {
    expect(parseMemberCount("非公開")).toBeNull();
    expect(parseMemberCount("")).toBeNull();
    expect(parseMemberCount(null)).toBeNull();
  });
});
