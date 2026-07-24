//
// ProofLoop リソースカードのリンク集約。
// 【就活系NG】母体 iBECK が就活事業者のため、新卒スカウト・逆求人・転職
// エージェント系（ビズリーチ / UTBoard / OfferBox / dodaキャンパス 等）への
// アフィリエイト直リンクは禁止。バイト・インターン・クラウドソーシングは可。
// 【一次情報が主役】各グループに非アフィリエイトを1つ以上（findAdOnlyGroups で担保）。
// 【シード】以下は安定した公式ドメインの初期値。深い一次情報ソースと実際の
// アフィリエイト(MyLink)URL は Phase 0/1 で拡充する。
// 【誤ラベル防止】広告(バリューコマース/MyLink)のURLは必ず kind:"affiliate" にする。
// official/guide に置くと開示が消える(findMislabeledAffiliateLinks が検出)。
export type { ResourceKind } from "./resourceLink";
import type { ResourceKind } from "./resourceLink";

export interface ResourceLink {
  kind: ResourceKind;
  label: string;
  url: string;
  note?: string;       // 「公式・無料」などの補足
  advertiser?: string; // kind==='affiliate' のとき GA 計測に使う識別子
}

export interface ResourceGroupData {
  id: string;          // ページ内一意。GA の position に使う
  heading: string;
  links: ResourceLink[];
}

export const LIVING_ALONE_RESOURCES: ResourceGroupData[] = [
  {
    id: "moving",
    heading: "引越しを安くする",
    links: [
      {
        kind: "official",
        label: "国民生活センター（引越しサービスの相談）",
        url: "https://www.kokusen.go.jp/",
        note: "公式・無料",
      },
    ],
  },
  {
    id: "housing",
    heading: "部屋を探す・契約の基礎",
    links: [
      {
        kind: "official",
        label: "国土交通省 賃貸住宅の契約ガイド",
        url: "https://www.mlit.go.jp/",
        note: "公式・無料",
      },
      {
        kind: "affiliate",
        label: "ビレッジハウス（敷金・礼金・仲介手数料ゼロの賃貸）で探す",
        url: "https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3766669&pid=892665096",
        advertiser: "village-house",
      },
    ],
  },
  {
    id: "utilities",
    heading: "電気・ガスを見直す",
    links: [
      {
        kind: "official",
        label: "国民生活センター（電力・ガス切り替えの勧誘トラブル）",
        url: "https://www.kokusen.go.jp/",
        note: "公式・無料",
      },
      {
        kind: "affiliate",
        label: "エネチェンジで電気・ガスのプランを比較する",
        url: "https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3766669&pid=892665095",
        advertiser: "enechange",
      },
    ],
  },
  {
    id: "furniture-appliances",
    heading: "家電・家具をそろえる",
    links: [
      {
        kind: "official",
        label: "消費者庁（ネット通販のトラブル・製品安全）",
        url: "https://www.caa.go.jp/",
        note: "公式・無料",
      },
      {
        kind: "affiliate",
        label: "Yahoo!ショッピングで一人暮らしの家電・家具を探す",
        url: "https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3766669&pid=892664926",
        advertiser: "yahoo-shopping",
      },
    ],
  },
];

export const MONEY_RESOURCES: ResourceGroupData[] = [
  {
    id: "scholarship",
    heading: "奨学金を調べる",
    links: [
      {
        kind: "official",
        label: "日本学生支援機構（JASSO）奨学金",
        url: "https://www.jasso.go.jp/",
        note: "公式・無料",
      },
    ],
  },
  {
    id: "money-basics",
    heading: "お金の基礎知識",
    links: [
      {
        kind: "official",
        label: "金融庁 基礎から学べる金融ガイド",
        url: "https://www.fsa.go.jp/",
        note: "公式・無料",
      },
    ],
  },
];
