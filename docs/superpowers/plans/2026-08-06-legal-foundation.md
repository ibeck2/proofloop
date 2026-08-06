# 法務基盤の整備 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ProofLoop に利用規約・プライバシーポリシー・運営者情報・掲載ポリシーの4文書と導線を追加し、リスク台帳を整備する。

**Architecture:** 法務文書の本文は `lib/legal/` に純粋なデータとして置き、ページはレンダリングに徹する（`lib/guide/resources.ts` と同じ思想）。事業者情報と問い合わせ窓口は定数1箇所で定義し、4文書に散らばらせない。書き漏れは vitest で機械的に止める。

**Tech Stack:** Next.js 15 App Router / TypeScript / Tailwind（6色トークン）/ vitest

## Global Constraints

- 設計書は `docs/superpowers/specs/2026-08-06-legal-foundation-design.md`。判断の根拠はすべてここにある。
- 色は `lib/design/tokens.ts` の6色のみ（ink `#002B5C` / seal `#8B0000` / paper `#FFFFFF` / mist `#F2F4F7` / rule `#C9D2DC` / graphite `#1F2A36`）。**深紅 seal は静止状態で1画面2箇所まで。法務ページでは使わない。**
- 書体ロールは `mincho`（h1と主要セクション見出しのみ）/ `body`（本文・UI）/ `numeric`（数値）。
- 絶対URLは必ず `SITE_URL`（`lib/site-url.ts`）を経由する。ハードコード禁止。
- **ヘッダーのナビゲーションには追加しない。**導線はフッターのみ（CLAUDE.md §5）。
- 事業者情報の確定値：`株式会社iBECK` / 代表者 `竹中　淳人` / `〒113-0033 東京都文京区本郷2-27-17 ICNビル4階B` / `contact@proofloop.jp`
- 制定日はすべて `2026-08-06`。
- 各タスクの最後に `npm test` が通ること。**`npm run dev` 稼働中に `npm run build` を叩かない。**

---

### Task 1: リスク台帳を作る

**Files:**
- Create: `docs/risk-register.md`

**Interfaces:**
- Consumes: なし
- Produces: なし（ドキュメントのみ。以降のタスクは参照しない）

- [ ] **Step 1: 台帳を作成する**

`docs/risk-register.md` を新規作成し、設計書 `docs/superpowers/specs/2026-08-06-legal-foundation-design.md` の §3.2 / §3.3 / §3.4 / §3.5 の表を転記する。以下のヘッダーを先頭に付ける。

```markdown
# ProofLoop リスク台帳

> 法務・セキュリティ・レピュテーションのリスクを一覧し、誰が判断するかを明示する。
> 設計の背景は `docs/superpowers/specs/2026-08-06-legal-foundation-design.md`。
>
> **運用ルール**
> - 状態は `未対応` / `対応中` / `✅対応済み` / `該当なし` のいずれか
> - 「判断者」が `オーナー` `専門家` のものは Claude が勝手に進めない
> - 新しいリスクに気づいたら、根拠（ファイル名と行番号、または実測値）を添えて追記する

**最終更新：2026-08-06**
```

転記時、設計書で `Claude実装` としている L1 / L2 / L3 / L8 / L10 / R2 の状態を `対応中` にする。それ以外は `未対応`、`✅` 付きのものは `✅対応済み`、§3.5 の資金決済法・特定商取引法は `該当なし` にする。

- [ ] **Step 2: 内容を目視で確認する**

Run: `grep -c "^|" docs/risk-register.md`
Expected: 25以上（法務10＋セキュリティ5＋レピュテーション6＋ヘッダー行）

- [ ] **Step 3: Commit**

```bash
git add docs/risk-register.md
git commit -m "docs: 法務・セキュリティ・レピュテーションのリスク台帳を作成"
```

---

### Task 2: 事業者情報と外部委託先の定数を作る

**Files:**
- Create: `lib/legal/company.ts`
- Create: `lib/legal/processors.ts`
- Test: `lib/legal/company.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `COMPANY: { serviceName: string; legalName: string; representative: string; postalCode: string; address: string; contactEmail: string }`
  - `Processor = { name: string; role: string; country: string; note?: string }`
  - `PROCESSORS: Processor[]`

- [ ] **Step 1: 失敗するテストを書く**

`lib/legal/company.test.ts`:

```typescript
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
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run lib/legal/company.test.ts`
Expected: FAIL（`Failed to resolve import "./company"`）

- [ ] **Step 3: 定数を実装する**

`lib/legal/company.ts`:

```typescript
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
```

`lib/legal/processors.ts`:

```typescript
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
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run lib/legal/company.test.ts`
Expected: PASS（4テスト）

- [ ] **Step 5: Commit**

```bash
git add lib/legal/company.ts lib/legal/processors.ts lib/legal/company.test.ts
git commit -m "feat(legal): 事業者情報と外部委託先の定数を追加"
```

---

### Task 3: 4文書の本文データを作る

**Files:**
- Create: `lib/legal/documents.ts`
- Test: `lib/legal/documents.test.ts`

**Interfaces:**
- Consumes: `COMPANY`（Task 2）
- Produces:
  - `Clause = { heading: string; paragraphs?: string[]; list?: string[] }`
  - `LegalDocument = { id: string; title: string; description: string; intro: string[]; clauses: Clause[]; revisedAt: string; showsProcessors?: boolean }`
  - `PRIVACY: LegalDocument` / `TERMS: LegalDocument` / `LISTING_POLICY: LegalDocument` / `ABOUT: LegalDocument`
  - `LEGAL_DOCUMENTS: LegalDocument[]`（上記4件）

- [ ] **Step 1: 失敗するテストを書く**

`lib/legal/documents.test.ts`:

```typescript
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
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run lib/legal/documents.test.ts`
Expected: FAIL（`Failed to resolve import "./documents"`）

- [ ] **Step 3: 文書データを実装する**

`lib/legal/documents.ts`:

```typescript
import { COMPANY } from "./company";

export type Clause = {
  heading: string;
  paragraphs?: string[];
  list?: string[];
};

export type LegalDocument = {
  id: "privacy" | "terms" | "listing-policy" | "about";
  /** ページのh1および metadata.title に使う */
  title: string;
  /** metadata.description に使う */
  description: string;
  /** 本文の前に置く導入 */
  intro: string[];
  clauses: Clause[];
  /** 最終改定日。YYYY-MM-DD */
  revisedAt: string;
  /** 外部委託先の表をレンダリングするか */
  showsProcessors?: boolean;
};

const REVISED_AT = "2026-08-06";

export const PRIVACY: LegalDocument = {
  id: "privacy",
  title: "プライバシーポリシー",
  description:
    "ProofLoop における個人情報の取扱いについて。取得する情報、利用目的、第三者提供、外部委託先と所在国、開示請求の手続きを定めています。",
  revisedAt: REVISED_AT,
  showsProcessors: true,
  intro: [
    `${COMPANY.legalName}（以下「当社」）は、当社が提供する ${COMPANY.serviceName}（以下「本サービス」）における利用者の個人情報の取扱いについて、以下のとおり定めます。`,
  ],
  clauses: [
    {
      heading: "1. 事業者情報",
      list: [
        `事業者名：${COMPANY.legalName}`,
        `所在地：〒${COMPANY.postalCode} ${COMPANY.address}`,
        `代表者：${COMPANY.representative}`,
        `個人情報の取扱いに関する問い合わせ窓口：${COMPANY.contactEmail}`,
      ],
    },
    {
      heading: "2. 取得する情報",
      paragraphs: ["本サービスでは、以下の情報を取得します。"],
      list: [
        "氏名",
        "在籍する大学が発行するメールアドレス（.ac.jp）",
        "連絡先メールアドレス",
        "大学名および学部",
        "入学年および卒業予定年",
        "所属する学生団体・サークルと、その団体内での権限",
        "本サービス上で作成・送信した投稿、メッセージ、タスク、イベント、会計記録および画像",
        "企業として登録される場合は、法人のメールアドレスおよび担当者に関する情報",
        "閲覧履歴、端末情報、Cookie 等の識別子",
      ],
    },
    {
      heading: "3. 利用目的",
      list: [
        "本人確認および在学の確認",
        "本サービスの機能（団体の運営、メンバー管理、タスク、イベント、会計等）の提供",
        "学生・学生団体・企業の間の連絡およびマッチングの仲介",
        "問い合わせへの対応",
        "利用状況の分析によるサービスの改善",
        "本サービスに関する重要なお知らせの通知",
      ],
    },
    {
      heading: "4. 第三者への提供",
      paragraphs: [
        "当社は、法令に基づく場合を除き、あらかじめ本人の同意を得ることなく個人情報を第三者に提供しません。",
        "特に、以下の2点を明示します。",
      ],
      list: [
        "当社が営む就職支援に関連する事業に対して、本サービスで取得した利用者の情報を、本人の同意なく提供することはありません。",
        "企業に対して利用者の情報が開示されるのは、利用者本人が当該企業とのやりとりまたは選考に応じた場合に限られます。",
      ],
    },
    {
      heading: "5. 外部委託および外国にある第三者への提供",
      paragraphs: [
        "当社は、本サービスの運営のため以下の外部サービスを利用し、その範囲で個人情報の取扱いを委託しています。いずれも日本国外に所在する事業者です。",
      ],
    },
    {
      heading: "6. Cookie およびアクセス解析",
      paragraphs: [
        "本サービスは、利用状況の把握のため Google アナリティクスを利用しています。Google アナリティクスは Cookie を用いて情報を収集しますが、氏名等の個人を直接特定する情報は含まれません。",
        "収集を望まれない場合は、Google が提供するオプトアウトアドオン（https://tools.google.com/dlpage/gaoptout）またはご利用のブラウザの設定により無効化できます。",
      ],
    },
    {
      heading: "7. 個人情報の保有期間",
      paragraphs: [
        "利用目的の達成に必要な期間、および法令で定められた期間、個人情報を保有します。アカウントの削除をご希望の場合は、下記の窓口までご連絡ください。",
        `窓口：${COMPANY.contactEmail}`,
      ],
    },
    {
      heading: "8. 開示・訂正・利用停止等の請求",
      paragraphs: [
        "利用者は、当社が保有するご自身の個人情報について、開示、訂正、追加、削除、利用停止、第三者提供の停止を請求できます。",
        `${COMPANY.contactEmail} まで、ご本人であることを確認できる情報を添えてご連絡ください。`,
      ],
    },
    {
      heading: "9. 安全管理措置",
      paragraphs: [
        "当社は、個人情報への不正アクセス、紛失、破壊、改ざんおよび漏えいを防止するため、アクセス権限の管理、通信の暗号化、データベースにおける行単位のアクセス制御等の措置を講じています。",
      ],
    },
    {
      heading: "10. 本ポリシーの改定",
      paragraphs: [
        "当社は、法令の変更やサービス内容の変更に応じて本ポリシーを改定することがあります。重要な変更を行う場合は、本サービス上で告知します。",
      ],
    },
  ],
};

export const TERMS: LegalDocument = {
  id: "terms",
  title: "利用規約",
  description:
    "ProofLoop の利用条件。アカウント登録、団体アカウントの権限、禁止事項、投稿内容の取扱い、免責事項などを定めています。",
  revisedAt: REVISED_AT,
  intro: [
    `本利用規約（以下「本規約」）は、${COMPANY.legalName}（以下「当社」）が提供する ${COMPANY.serviceName}（以下「本サービス」）の利用条件を定めるものです。`,
  ],
  clauses: [
    {
      heading: "1. 適用範囲",
      paragraphs: [
        "本規約は、本サービスを利用するすべての方（学生の方、学生団体・サークル、企業）に適用されます。",
      ],
    },
    {
      heading: "2. 定義",
      list: [
        "「学生利用者」とは、本サービスに学生として登録した個人をいいます。",
        "「団体」とは、本サービスに登録した学生団体・サークル等をいいます。",
        "「企業利用者」とは、本サービスに企業として登録した法人およびその担当者をいいます。",
      ],
    },
    {
      heading: "3. アカウント登録",
      list: [
        "学生利用者は、在籍する大学が発行するメールアドレス（.ac.jp）で登録するものとします。",
        "登録情報は、正確かつ最新の内容を登録するものとします。",
        "他人になりすまして登録する行為を禁じます。",
        "アカウントおよびパスワードの管理は、利用者の責任において行うものとします。",
      ],
    },
    {
      heading: "4. 団体アカウントと権限",
      list: [
        "団体のアカウントは、当該団体に所属し、団体を代表する権限を有する方が管理するものとします。",
        "団体の管理者は、メンバーの招待および権限（会計・財務の管理権限を含む）の付与を行えます。",
        "団体が本サービスに掲載する情報の正確性については、当該団体が責任を負うものとします。",
      ],
    },
    {
      heading: "5. 禁止事項",
      paragraphs: ["本サービスの利用にあたり、以下の行為を禁じます。"],
      list: [
        "法令または公序良俗に違反する行為",
        "虚偽の情報を登録または掲載する行為",
        "他の利用者または第三者の権利（著作権、肖像権、プライバシー等）を侵害する行為",
        "本サービスの情報を自動的な手段により収集する行為",
        "当社の許諾なく、本サービスを営業または勧誘の目的で利用する行為",
        "本サービスの運営を妨害する行為",
      ],
    },
    {
      heading: "6. 投稿内容の取扱い",
      paragraphs: [
        "利用者が本サービスに投稿した文章、画像等の権利は、当該利用者に帰属します。当社は、本サービスの提供および紹介に必要な範囲において、これらを利用できるものとします。",
      ],
    },
    {
      heading: "7. 企業とのやりとり",
      paragraphs: [
        "本サービスは、学生・団体と企業が連絡を取るための場を提供します。当事者間で成立した合意の内容およびその履行について、当社は当事者となりません。",
      ],
    },
    {
      heading: "8. 広告およびアフィリエイトリンク",
      paragraphs: [
        "本サービスの一部のリンクは広告であり、当社が紹介料を受け取る場合があります。該当するリンクには、広告である旨を表示します。",
      ],
    },
    {
      heading: "9. 免責事項",
      list: [
        "本サービスは現状有姿で提供され、当社は、本サービスが利用者の特定の目的に適合すること、期待する機能・正確性・有用性を有することを保証しません。",
        "本サービスに掲載する情報は正確性に努めますが、その完全性を保証するものではありません。制度・条件等については、必ず一次情報をご確認ください。",
      ],
    },
    {
      heading: "10. サービスの変更・中断・終了",
      paragraphs: [
        "当社は、本サービスの内容を変更し、またはその提供を中断もしくは終了することがあります。重要な変更を行う場合は、本サービス上で告知します。",
      ],
    },
    {
      heading: "11. 未成年の方の利用",
      paragraphs: [
        "未成年の方が本サービスを利用される場合は、親権者等の法定代理人の同意を得たうえでご利用ください。",
      ],
    },
    {
      heading: "12. 準拠法および裁判管轄",
      paragraphs: [
        "本規約は日本法に準拠します。本サービスに関して紛争が生じた場合、東京地方裁判所を第一審の専属的合意管轄裁判所とします。",
      ],
    },
    {
      heading: "13. 本規約の変更",
      paragraphs: [
        "当社は、必要に応じて本規約を変更することがあります。重要な変更を行う場合は、本サービス上で告知します。",
        `本規約に関するお問い合わせは ${COMPANY.contactEmail} までお願いします。`,
      ],
    },
  ],
};

export const LISTING_POLICY: LegalDocument = {
  id: "listing-policy",
  title: "掲載ポリシー",
  description:
    "ProofLoop が学生団体・サークルの情報を掲載する考え方と、掲載の停止・訂正をご希望の場合の手続きを定めています。",
  revisedAt: REVISED_AT,
  intro: [
    `${COMPANY.serviceName} は、大学生が学生団体・サークルを見つけられるようにするため、各団体の情報を掲載しています。掲載の考え方と、掲載の停止・訂正をご希望の場合の手続きを以下に定めます。`,
  ],
  clauses: [
    {
      heading: "1. 掲載の目的",
      paragraphs: [
        "新入生をはじめとする大学生が、自分に合う学生団体・サークルを探せるようにするためです。",
      ],
    },
    {
      heading: "2. 掲載している情報",
      paragraphs: ["公表されている事実情報に限って掲載しています。"],
      list: [
        "団体名",
        "大学名",
        "活動分野のカテゴリ",
        "公表されている構成人数",
        "活動場所・活動日",
        "公式ウェブサイトおよびSNSのURL",
      ],
    },
    {
      heading: "3. 掲載していない情報",
      paragraphs: [
        "個人名、個人の連絡先その他の個人情報は掲載していません。団体としてアカウントを登録され、ご自身で掲載された情報はこの限りではありません。",
      ],
    },
    {
      heading: "4. 情報の出所",
      paragraphs: [
        "各団体または各大学が一般に公開している情報をもとにしています。",
      ],
    },
    {
      heading: "5. 掲載内容の訂正",
      paragraphs: [
        `記載に誤りがある場合は、${COMPANY.contactEmail} まで団体名と訂正箇所をお知らせください。確認のうえ、速やかに修正します。`,
      ],
    },
    {
      heading: "6. 掲載の停止",
      paragraphs: [
        `掲載を希望されない場合は、${COMPANY.contactEmail} まで団体名とご連絡先を添えてご連絡ください。当該団体の関係者の方であることを確認のうえ、速やかに掲載を停止します。`,
        "理由をご説明いただく必要はありません。",
      ],
    },
    {
      heading: "7. 団体ご自身での編集",
      paragraphs: [
        "団体としてアカウントを登録いただくと、掲載内容をご自身で編集できます。活動内容の紹介、写真、イベント告知の掲載も可能です。",
        "掲載を止めるのではなく、正しい情報に整えたいという場合は、こちらをご利用ください。",
      ],
    },
    {
      heading: "8. 本ポリシーの改定",
      paragraphs: [
        "必要に応じて改定します。重要な変更を行う場合は、本サービス上で告知します。",
      ],
    },
  ],
};

export const ABOUT: LegalDocument = {
  id: "about",
  title: "運営者情報",
  description:
    "ProofLoop を運営する株式会社iBECK の会社情報と、サービスの背景をご紹介します。",
  revisedAt: REVISED_AT,
  intro: [
    `${COMPANY.serviceName} は、${COMPANY.legalName} が運営しています。`,
  ],
  clauses: [
    {
      heading: "ProofLoop について",
      paragraphs: [
        "ProofLoop は「学生団体の潜在能力を顕在化し、持続可能な成長インフラを創る」ことを目指すサービスです。",
        "学生団体・サークルの運営を支える管理機能と、大学生活の意思決定に役立つ情報を提供しています。",
      ],
    },
    {
      heading: "事業内容",
      list: [
        "学生団体・サークル向けの運営支援サービスの開発・提供",
        "大学生向け情報メディアの運営",
        "学生団体と企業のマッチング支援",
      ],
    },
    {
      heading: "全国学生団体連盟",
      paragraphs: [
        `当社代表の${COMPANY.representative}は、学生時代に全国学生団体連盟を設立し、学生団体の運営とネットワークづくりに携わってきました。`,
        "ProofLoop は、その現場で見えた課題を出発点としています。",
      ],
    },
    {
      heading: "お問い合わせ",
      paragraphs: [
        `本サービスに関するお問い合わせ、掲載内容のご相談、個人情報の開示請求は ${COMPANY.contactEmail} までご連絡ください。`,
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: LegalDocument[] = [PRIVACY, TERMS, LISTING_POLICY, ABOUT];
```

> ⚠️ **「全国学生団体連盟」の記述について**：CLAUDE.md §6 に記載のある事実（CEOが学生時代に設立した団体）のみを書いている。設立年・活動内容などの詳細は未確認のため書いていない。**公開前にオーナーへ内容の正確性を確認すること。**

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run lib/legal/documents.test.ts`
Expected: PASS（6テスト）

- [ ] **Step 5: Commit**

```bash
git add lib/legal/documents.ts lib/legal/documents.test.ts
git commit -m "feat(legal): 利用規約・プライバシーポリシー・掲載ポリシー・運営者情報の本文データ"
```

---

### Task 4: 共通レンダラと3ページ（privacy / terms / listing-policy）

**Files:**
- Create: `components/legal/LegalDocumentView.tsx`
- Create: `app/privacy/page.tsx`
- Create: `app/terms/page.tsx`
- Create: `app/listing-policy/page.tsx`

**Interfaces:**
- Consumes: `LegalDocument`・`PRIVACY`・`TERMS`・`LISTING_POLICY`（Task 3）、`COMPANY`・`PROCESSORS`（Task 2）、`SITE_URL`（既存 `lib/site-url.ts`）
- Produces: `LegalDocumentView({ doc }: { doc: LegalDocument })` — Server Component

- [ ] **Step 1: 共通レンダラを実装する**

`components/legal/LegalDocumentView.tsx`:

```tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LegalDocument } from "@/lib/legal/documents";
import { COMPANY } from "@/lib/legal/company";
import { PROCESSORS } from "@/lib/legal/processors";

/** 2026-08-06 → 2026年8月6日 */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

export default function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <div className="bg-paper text-ink min-h-screen font-body pb-20 md:pb-0">
      <main className="w-full max-w-[820px] mx-auto px-6 py-12 md:py-20 flex flex-col gap-12">
        <nav className="flex items-center gap-2 text-xs text-graphite -mb-6">
          <Link href="/" className="hover:text-ink transition-colors">
            ホーム
          </Link>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
          <span className="text-ink font-bold">{doc.title}</span>
        </nav>

        <header className="flex flex-col gap-4">
          <h1 className="text-ink text-2xl md:text-4xl font-black leading-tight tracking-tight font-mincho">
            {doc.title}
          </h1>
          {doc.intro.map((text, i) => (
            <p key={i} className="text-graphite text-sm md:text-base leading-relaxed">
              {text}
            </p>
          ))}
        </header>

        <div className="flex flex-col gap-10">
          {doc.clauses.map((clause) => (
            <section key={clause.heading} className="flex flex-col gap-3">
              <h2 className="text-ink text-lg font-black font-mincho">{clause.heading}</h2>
              {clause.paragraphs?.map((text, i) => (
                <p key={i} className="text-graphite text-sm leading-relaxed">
                  {text}
                </p>
              ))}
              {clause.list && (
                <ul className="flex flex-col gap-2 list-disc pl-5">
                  {clause.list.map((item, i) => (
                    <li key={i} className="text-graphite text-sm leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {/* 外部委託先の表は、それを出すと宣言した文書の該当条項の直後に置く */}
              {doc.showsProcessors && clause.heading.startsWith("5.") && (
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-sm border border-rule">
                    <thead className="bg-mist">
                      <tr>
                        <th className="px-4 py-2 text-left font-bold text-ink">サービス</th>
                        <th className="px-4 py-2 text-left font-bold text-ink">利用目的</th>
                        <th className="px-4 py-2 text-left font-bold text-ink whitespace-nowrap">所在国</th>
                      </tr>
                    </thead>
                    <tbody className="text-graphite">
                      {PROCESSORS.map((p) => (
                        <tr key={p.name} className="border-t border-rule">
                          <td className="px-4 py-2 leading-snug">{p.name}</td>
                          <td className="px-4 py-2 leading-snug">
                            {p.role}
                            {p.note && <span className="block text-xs mt-1">※{p.note}</span>}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">{p.country}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>

        <footer className="border-t border-rule pt-6 flex flex-col gap-1">
          <p className="text-xs text-graphite">最終改定日：{formatDate(doc.revisedAt)}</p>
          <p className="text-xs text-graphite">{COMPANY.legalName}</p>
        </footer>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: 3ページを実装する**

`app/privacy/page.tsx`:

```tsx
import type { Metadata } from "next";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import { PRIVACY } from "@/lib/legal/documents";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: PRIVACY.title,
  description: PRIVACY.description,
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: {
    title: PRIVACY.title,
    description: PRIVACY.description,
    url: `${SITE_URL}/privacy`,
  },
};

export default function PrivacyPage() {
  return <LegalDocumentView doc={PRIVACY} />;
}
```

`app/terms/page.tsx`:

```tsx
import type { Metadata } from "next";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import { TERMS } from "@/lib/legal/documents";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: TERMS.title,
  description: TERMS.description,
  alternates: { canonical: `${SITE_URL}/terms` },
  openGraph: {
    title: TERMS.title,
    description: TERMS.description,
    url: `${SITE_URL}/terms`,
  },
};

export default function TermsPage() {
  return <LegalDocumentView doc={TERMS} />;
}
```

`app/listing-policy/page.tsx`:

```tsx
import type { Metadata } from "next";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import { LISTING_POLICY } from "@/lib/legal/documents";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: LISTING_POLICY.title,
  description: LISTING_POLICY.description,
  alternates: { canonical: `${SITE_URL}/listing-policy` },
  openGraph: {
    title: LISTING_POLICY.title,
    description: LISTING_POLICY.description,
    url: `${SITE_URL}/listing-policy`,
  },
};

export default function ListingPolicyPage() {
  return <LegalDocumentView doc={LISTING_POLICY} />;
}
```

> `metadata.title` に接尾辞を手書きしないこと。root の `title.template = "%s | ProofLoop"` が付けるため、書くと二重になる（過去に6ページで発生した既知の事故）。

- [ ] **Step 3: ビルドが通り、3ページが生成されることを確認する**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: テスト全件PASS、型エラーなし、ビルド成功。出力に `/privacy` `/terms` `/listing-policy` が並ぶ

⚠️ `npm run dev` が動いていないことを先に確認する：`Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue`

- [ ] **Step 4: 生成HTMLに事業者名と窓口が入っていることを確認する**

Run: `grep -o "株式会社iBECK\|contact@proofloop.jp\|アメリカ合衆国" .next/server/app/privacy.html | sort | uniq -c`
Expected: 3種すべてが1件以上

- [ ] **Step 5: Commit**

```bash
git add components/legal/LegalDocumentView.tsx app/privacy app/terms app/listing-policy
git commit -m "feat(legal): プライバシーポリシー・利用規約・掲載ポリシーのページを追加"
```

---

### Task 5: 運営者情報ページ（/about）

**Files:**
- Create: `app/about/page.tsx`

**Interfaces:**
- Consumes: `ABOUT`（Task 3）、`COMPANY`（Task 2）、`SITE_URL`（既存）
- Produces: なし
- **`LegalDocumentView` は使わない。** 会社情報の表を条項の前に置く必要があり、構造が異なるため

- [ ] **Step 1: 会社情報の表を持つページを実装する**

`/about` は条項に加えて会社情報の表を出すため、`LegalDocumentView` をそのまま使わず、表を先に置いてから同じ体裁で条項を並べる。

`app/about/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ABOUT } from "@/lib/legal/documents";
import { COMPANY } from "@/lib/legal/company";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: ABOUT.title,
  description: ABOUT.description,
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: ABOUT.title,
    description: ABOUT.description,
    url: `${SITE_URL}/about`,
  },
};

const COMPANY_ROWS = [
  { label: "サービス名", value: COMPANY.serviceName },
  { label: "運営会社", value: COMPANY.legalName },
  { label: "代表者", value: COMPANY.representative },
  { label: "所在地", value: `〒${COMPANY.postalCode} ${COMPANY.address}` },
  { label: "お問い合わせ", value: COMPANY.contactEmail },
];

export default function AboutPage() {
  return (
    <div className="bg-paper text-ink min-h-screen font-body pb-20 md:pb-0">
      <main className="w-full max-w-[820px] mx-auto px-6 py-12 md:py-20 flex flex-col gap-12">
        <nav className="flex items-center gap-2 text-xs text-graphite -mb-6">
          <Link href="/" className="hover:text-ink transition-colors">
            ホーム
          </Link>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
          <span className="text-ink font-bold">{ABOUT.title}</span>
        </nav>

        <header className="flex flex-col gap-4">
          <h1 className="text-ink text-2xl md:text-4xl font-black leading-tight tracking-tight font-mincho">
            {ABOUT.title}
          </h1>
          {ABOUT.intro.map((text, i) => (
            <p key={i} className="text-graphite text-sm md:text-base leading-relaxed">
              {text}
            </p>
          ))}
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-rule">
            <tbody className="text-graphite">
              {COMPANY_ROWS.map((row) => (
                <tr key={row.label} className="border-t border-rule first:border-t-0">
                  <th className="px-4 py-3 text-left font-bold text-ink bg-mist whitespace-nowrap align-top w-40">
                    {row.label}
                  </th>
                  <td className="px-4 py-3 leading-relaxed">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-10">
          {ABOUT.clauses.map((clause) => (
            <section key={clause.heading} className="flex flex-col gap-3">
              <h2 className="text-ink text-lg font-black font-mincho">{clause.heading}</h2>
              {clause.paragraphs?.map((text, i) => (
                <p key={i} className="text-graphite text-sm leading-relaxed">
                  {text}
                </p>
              ))}
              {clause.list && (
                <ul className="flex flex-col gap-2 list-disc pl-5">
                  {clause.list.map((item, i) => (
                    <li key={i} className="text-graphite text-sm leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: ビルドを確認する**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: すべて成功。出力に `/about` が現れる

- [ ] **Step 3: Commit**

```bash
git add app/about
git commit -m "feat(legal): 運営者情報ページを追加（全国学生団体連盟の記載を含む）"
```

---

### Task 6: フッターの導線と sitemap

**Files:**
- Modify: `components/Footer.tsx:14-20`（`ABOUT_LINKS` と `CONTACT_URL`）、お問い合わせ列（変更前は72-83行）
- Modify: `app/sitemap.ts`（静的ページ配列に4件追加）

> ⚠️ Step 1 で `ABOUT_LINKS` に4件追加すると**以降の行番号が下にずれる**。Step 2 は行番号ではなく `<h2 ...>お問い合わせ</h2>` を含む `<div>` を検索して位置を特定すること。

**Interfaces:**
- Consumes: `COMPANY`（Task 2）
- Produces: なし

- [ ] **Step 1: フッターのリンクを差し替える**

`components/Footer.tsx` の 14-20行目を以下に置き換える。

```tsx
// /for-students リンクは該当ページが存在しないため削除（404）。ページ実装時にここで復活させる。
const ABOUT_LINKS = [
  { href: "/about", label: "運営者情報" },
  { href: "/for-clubs", label: "学生団体の方へ" },
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/listing-policy", label: "掲載ポリシー" },
];
```

`CONTACT_URL` の定数（19-20行目）を削除する。**現在の問い合わせ導線は団体ページへの外部リンクで、メールアドレスがどこにも書かれていない。** これを窓口アドレスに置き換える。

あわせて先頭の import から `ExternalLink` を外し、`COMPANY` を追加する。

```tsx
import Link from "next/link";
import { COMPANY } from "@/lib/legal/company";
```

- [ ] **Step 2: お問い合わせ列を書き換える**

`components/Footer.tsx` の 72-83行目（お問い合わせの `<div>`）を以下に置き換える。

```tsx
          <div>
            <h2 className="font-body font-bold text-sm mb-4 text-paper">お問い合わせ</h2>
            <a
              href={`mailto:${COMPANY.contactEmail}`}
              className="text-paper/70 hover:text-paper transition-colors text-sm font-body break-all"
            >
              {COMPANY.contactEmail}
            </a>
            <p className="text-paper/50 text-xs mt-3 leading-relaxed font-body">
              掲載の停止・訂正のご依頼も、こちらで承ります。
            </p>
          </div>
```

- [ ] **Step 3: sitemap に4ページを追加する**

`app/sitemap.ts` の `staticPages` 配列、`/manual` のエントリの直後に以下を挿入する。

```typescript
    // ── 運営情報（法務文書）
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/listing-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
```

- [ ] **Step 4: ビルドとフッターの出力を確認する**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: すべて成功

Run: `grep -o "/listing-policy\|mailto:contact@proofloop.jp" .next/server/app/index.html | sort | uniq -c`
Expected: 両方とも1件以上（トップページのフッターに出ている）

- [ ] **Step 5: Commit**

```bash
git add components/Footer.tsx app/sitemap.ts
git commit -m "feat(legal): フッターに運営情報の導線を追加・問い合わせ先をメールアドレスに変更"
```

---

### Task 7: /signup に同意文言を置く

**Files:**
- Modify: `app/signup/page.tsx`（学生タブの送信ボタン直前、および企業タブの送信ボタン直前）

**Interfaces:**
- Consumes: なし（リンクのみ）
- Produces: なし

- [ ] **Step 1: 同意文言のブロックを2箇所に挿入する**

学生タブの `<Button type="submit" variant="primary" className="w-full" disabled={isLoading}>`（変更前は442行目付近）の**直前**、および企業タブの同じ `<Button type="submit">`（変更前は483行目付近）の**直前**に、以下を挿入する。

> ⚠️ 1箇所目を挿入すると2箇所目の行番号がずれる。**行番号ではなく `<Button type="submit"` を検索して2箇所を特定すること。** 該当は2箇所のみ（学生タブと企業タブ）。

```tsx
              <p className="text-xs text-graphite leading-relaxed">
                登録することで、
                <Link href="/terms" className="text-ink underline">
                  利用規約
                </Link>
                および
                <Link href="/privacy" className="text-ink underline">
                  プライバシーポリシー
                </Link>
                に同意したものとみなします。
              </p>
```

`Link` が未 import の場合は `import Link from "next/link";` を追加する（既に import 済みなら不要）。

> チェックボックスは置かない。みなし同意の明示とリンクで足りるという判断（設計書 §2 決定6）。

- [ ] **Step 2: 両タブに出ていることを確認する**

Run: `grep -c "同意したものとみなします" app/signup/page.tsx`
Expected: `2`

- [ ] **Step 3: ビルドを確認する**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: すべて成功

- [ ] **Step 4: Commit**

```bash
git add app/signup/page.tsx
git commit -m "feat(legal): 新規登録画面に利用規約・プライバシーポリシーへの同意文言を追加"
```

---

### Task 8: 団体ページから掲載ポリシーへの導線

**Files:**
- Create: `components/legal/ListingNotice.tsx`
- Modify: `app/organizations/[id]/page.tsx`（末尾の `return`）

**Interfaces:**
- Consumes: `COMPANY`（Task 2）
- Produces: `ListingNotice()` — Server Component、引数なし

`OrganizationDetailClient.tsx` は1,020行の Client Component なので触らない。Server Component 側で後ろに足す。

- [ ] **Step 1: 告知コンポーネントを実装する**

`components/legal/ListingNotice.tsx`:

```tsx
import Link from "next/link";
import { COMPANY } from "@/lib/legal/company";

/**
 * 団体ページの末尾に置く、掲載についての告知。
 *
 * 掲載は公表情報にもとづくオプトアウト方式のため、停止の手段を必ず示す。
 * あわせて「自分で編集できる」導線を並べ、苦情の入口を団体登録の入口にする。
 */
export default function ListingNotice() {
  return (
    <aside className="bg-mist border-t border-rule">
      <div className="max-w-[1100px] mx-auto px-6 py-8 flex flex-col gap-2">
        <h2 className="text-ink font-bold text-sm">この掲載について</h2>
        <p className="text-graphite text-xs leading-relaxed">
          このページは、団体または大学が公開している情報をもとに {COMPANY.serviceName} が作成しています。
          掲載の停止や内容の訂正をご希望の場合は{" "}
          <a href={`mailto:${COMPANY.contactEmail}`} className="text-ink underline">
            {COMPANY.contactEmail}
          </a>{" "}
          までご連絡ください。理由の説明は不要です。
        </p>
        <p className="text-graphite text-xs leading-relaxed">
          団体としてアカウントを登録いただくと、掲載内容をご自身で編集できます。詳しくは{" "}
          <Link href="/listing-policy" className="text-ink underline">
            掲載ポリシー
          </Link>
          をご覧ください。
        </p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: 団体ページに差し込む**

`app/organizations/[id]/page.tsx` の末尾の `return` を以下に置き換える。

```tsx
  return (
    <>
      <OrganizationDetailClient
        org={org}
        events={(events as EventRow[]) ?? []}
        photos={(photos as OrganizationPhotoRow[]) ?? []}
        approvedReviews={(reviews as ReviewRow[]) ?? []}
      />
      <ListingNotice />
    </>
  );
```

ファイル先頭に import を追加する。

```tsx
import ListingNotice from "@/components/legal/ListingNotice";
```

- [ ] **Step 3: ビルドを確認する**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: すべて成功。`/organizations/[id]` は動的（ƒ）のまま

- [ ] **Step 4: Commit**

```bash
git add components/legal/ListingNotice.tsx "app/organizations/[id]/page.tsx"
git commit -m "feat(legal): 団体ページに掲載についての告知と削除依頼窓口を追加"
```

---

### Task 9: /login の死にボタンを削除する

**Files:**
- Modify: `app/login/page.tsx:7`（import）、`:167-181`（LINEボタンと区切り線）

**Interfaces:**
- Consumes: なし
- Produces: なし

- [ ] **Step 1: 削除対象が想定どおりか確認する**

Run: `sed -n '167,181p' app/login/page.tsx`
Expected: `<button type="button" ...>` から `LINEでログイン`、続く「または」の区切り線 `<div className="relative">` までが表示される

- [ ] **Step 2: ボタンと区切り線を削除する**

`app/login/page.tsx` の167行目から181行目（LINEボタンの `<button>` 開始タグから、区切り線の `</div>` まで）を丸ごと削除する。削除後、`<form className="space-y-6" onSubmit={handleStudentSubmit}>` の直後が `<div className="space-y-5">` になる。

このボタンは `onClick` を持たず、押しても何も起きなかった（LINEログインは未実装）。

- [ ] **Step 3: 未使用になった import を外す**

7行目を以下に変更する。`Repeat` は134行目で使っているため残す。

```tsx
import { Repeat } from "lucide-react";
```

- [ ] **Step 4: 痕跡が消えたことを確認する**

Run: `grep -n "LINE\|MessageSquare" app/login/page.tsx`
Expected: 出力なし（exit code 1）

- [ ] **Step 5: ビルドを確認する**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: すべて成功

- [ ] **Step 6: Commit**

```bash
git add app/login/page.tsx
git commit -m "fix(login): 動作しない「LINEでログイン」ボタンを削除"
```

---

### Task 10: 台帳の状態を更新して仕上げる

**Files:**
- Modify: `docs/risk-register.md`
- Modify: `docs/owner-todo.md`

**Interfaces:**
- Consumes: なし
- Produces: なし

- [ ] **Step 1: 台帳の状態を更新する**

`docs/risk-register.md` で、L1・L2・L3・L8・L10・R2 の状態を `対応中` から `✅対応済み（2026-08-06）` に変更する。

L1〜L3 には「**文面のオーナー承認は未了**」を注記する。公開はされているが最終確認は残っているため。

- [ ] **Step 2: オーナー対応事項を追記する**

`docs/owner-todo.md` の「🟢 判断が必要」セクションに以下を追記する。

```markdown
- [ ] **公開した法務4文書の文面を確認する**
  - `/terms`・`/privacy`・`/about`・`/listing-policy` を公開しました。文面は実装と実態から起こした草案です。
  - 特に確認いただきたい2点：
    - `/about` の**全国学生団体連盟に関する記述**（設立経緯・CEOとの関係が正確か）
    - `/privacy` の**第三者提供の記述**（「就活事業へ本人同意なく提供しない」で実態と合っているか）
  - 修正したい箇所があれば Claude に伝えてください。`lib/legal/documents.ts` を直します。

- [ ] **職業安定法上の位置づけを専門家に確認する（リスク台帳 L5）**
  - `/clubats`（採用管理）・`/companysearch`（企業が学生を探す）・`job_listings`（求人掲載）が「職業紹介」または「募集情報等提供事業」に当たるかどうか。
  - 当たる場合は許可または届出が必要です。**株式会社iBECKが既に有料職業紹介事業の許可を持っている場合は前提が変わります。**
  - 企業向けアウトリーチを始める前に確定させてください。
```

- [ ] **Step 3: 全体を最終確認する**

Run: `npm test && npx tsc --noEmit`
Expected: 全テストPASS、型エラーなし

- [ ] **Step 4: Commit**

```bash
git add docs/risk-register.md docs/owner-todo.md
git commit -m "docs: 法務基盤の対応状況を台帳とオーナーTODOに反映"
```

---

## 完了条件

- `/terms`・`/privacy`・`/about`・`/listing-policy` が本番ビルドで静的生成される
- フッターの「ProofLoopについて」列から4本すべてに到達でき、問い合わせ先がメールアドレスとして表示される
- `/signup` の両タブに同意文言がある
- 団体ページの末尾に掲載告知と削除依頼窓口がある
- `/login` に「LINEでログイン」が存在しない
- `docs/risk-register.md` が存在し、判断者ごとに整理されている
- `npm test` が全件通る（Task 2 で4件、Task 3 で6件、計10件が新規）
