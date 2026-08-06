import { describe, expect, it } from "vitest";
import { COMPANY } from "./company";
import { LEGAL_DOCUMENTS, PRIVACY } from "./documents";

/** 文書中のすべてのテキストを1本に連結する */
function allText(doc: (typeof LEGAL_DOCUMENTS)[number]): string {
  return [
    doc.title,
    doc.description,
    ...doc.intro,
    ...doc.clauses.flatMap((c) => [c.heading, ...(c.paragraphs ?? []), ...(c.list ?? [])]),
  ].join("\n");
}

describe("LEGAL_DOCUMENTS", () => {
  it("4文書がそろっている", () => {
    expect(LEGAL_DOCUMENTS.map((d) => d.id).sort()).toEqual(
      ["about", "listing-policy", "privacy", "terms"].sort()
    );
  });

  it("すべての文書に有効な改定日がある", () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(doc.revisedAt, `${doc.id} の改定日`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("すべての文書に見出しと本文がある", () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(doc.clauses.length, `${doc.id} の条項数`).toBeGreaterThan(0);
      for (const clause of doc.clauses) {
        expect(clause.heading, `${doc.id} に見出しのない条項`).not.toBe("");
        const hasBody = (clause.paragraphs?.length ?? 0) + (clause.list?.length ?? 0) > 0;
        expect(hasBody, `${doc.id} / ${clause.heading} が空`).toBe(true);
      }
    }
  });

  // ハードコードされた別アドレスの混入を検出する。窓口が2つあると
  // 片方が死んだときに気づけない。
  it("文書中に現れるメールアドレスは問い合わせ窓口だけ", () => {
    const emailPattern = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
    for (const doc of LEGAL_DOCUMENTS) {
      const found = allText(doc).match(emailPattern) ?? [];
      for (const email of found) {
        expect(email, `${doc.id} に想定外のアドレス`).toBe(COMPANY.contactEmail);
      }
    }
  });

  it("問い合わせ窓口がどの文書にも1回以上書かれている", () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(allText(doc), `${doc.id} に窓口の記載がない`).toContain(COMPANY.contactEmail);
    }
  });

  it("プライバシーポリシーは外部委託先の表を出す設定になっている", () => {
    expect(PRIVACY.showsProcessors).toBe(true);
  });
});
