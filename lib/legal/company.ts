/**
 * 事業者情報と問い合わせ窓口の唯一の定義元。
 *
 * 法務文書（利用規約・プライバシーポリシー・運営者情報・掲載ポリシー）と
 * フッターは必ずここを参照する。4文書に同じ文字列を書くと、住所や窓口が
 * 変わったときに片方だけ古いまま残る。
 */
export const COMPANY = {
  serviceName: "ProofLoop",
  legalName: "株式会社iBECK",
  representative: "竹中　淳人",
  postalCode: "113-0033",
  address: "東京都文京区本郷2-27-17 ICNビル4階B",
  contactEmail: "contact@proofloop.jp",
} as const;
