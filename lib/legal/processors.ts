/**
 * 個人情報の取扱いを委託している外部サービス。
 *
 * いずれも日本国外に所在するため、個人情報保護法の「外国にある第三者への提供」
 * として所在国の開示が要る。**新しい外部サービスを導入したら必ずここに追加する。**
 * 追加を忘れるとポリシーの記載が実態から外れる。
 */
export type Processor = {
  /** 利用者が識別できる名称 */
  name: string;
  /** 何のために使っているか */
  role: string;
  /** 事業者の所在国 */
  country: string;
  /** 補足（データの保存先リージョン等） */
  note?: string;
};

export const PROCESSORS: Processor[] = [
  {
    name: "Supabase",
    role: "データベースおよび認証基盤の提供",
    country: "アメリカ合衆国",
    note: "データの保存先リージョンとして日本（東京）を選択しています。",
  },
  {
    name: "Vercel",
    role: "ウェブサイトの配信基盤の提供",
    country: "アメリカ合衆国",
  },
  {
    name: "Resend",
    role: "メール送信基盤の提供",
    country: "アメリカ合衆国",
  },
  {
    name: "Google アナリティクス（Google LLC）",
    role: "利用状況の分析",
    country: "アメリカ合衆国",
  },
];
