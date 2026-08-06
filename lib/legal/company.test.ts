import { describe, expect, it } from "vitest";
import { COMPANY } from "./company";
import { PROCESSORS } from "./processors";

describe("COMPANY", () => {
  it("法務文書に必要な項目がすべて埋まっている", () => {
    expect(COMPANY.serviceName).toBe("ProofLoop");
    expect(COMPANY.legalName).toBe("株式会社iBECK");
    expect(COMPANY.representative).toBe("竹中　淳人");
    expect(COMPANY.postalCode).toBe("113-0033");
    expect(COMPANY.address).toContain("東京都文京区本郷");
    expect(COMPANY.contactEmail).toBe("contact@proofloop.jp");
  });

  it("どの項目も空文字ではない", () => {
    for (const [key, value] of Object.entries(COMPANY)) {
      expect(value, `${key} が空`).not.toBe("");
    }
  });
});

describe("PROCESSORS", () => {
  it("外部委託先が登録されている", () => {
    expect(PROCESSORS.length).toBeGreaterThanOrEqual(4);
  });

  // 越境移転の開示漏れを防ぐ。所在国が書かれていない委託先を1件でも許すと
  // 個人情報保護法28条の開示が不完全になる。
  it("全件に名称・役割・所在国が書かれている", () => {
    for (const p of PROCESSORS) {
      expect(p.name, "name が空").not.toBe("");
      expect(p.role, `${p.name} の role が空`).not.toBe("");
      expect(p.country, `${p.name} の country が空`).not.toBe("");
    }
  });
});
