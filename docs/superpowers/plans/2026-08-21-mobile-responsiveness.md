# スマホ対応：既知バグ修正＋網羅監査 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 団体管理画面のモバイルメニュー未実装バグと`/for-clubs`のモック要素はみ出しバグを修正し、B2C＋B2B団体管理ページを375px幅で網羅的に監査して不具合一覧を確定させる。

**Architecture:** 既知バグ2件は、既存の`AppShell.tsx`が持つドロワーパターン（`固定`要素なのでDOM上の位置に依存しない）を`ClubSidebar`にも適用する形で直す。網羅監査はコード検索（Phase 1）→ブラウザ実機確認（Phase 2）の2段階で行い、結果を`docs/superpowers/specs/2026-08-21-mobile-audit-findings.md`にまとめる。監査で見つかった不具合の**実際の修正は本計画の対象外**（別途プランを立てる）。

**Tech Stack:** Next.js 15 App Router / TypeScript / Tailwind CSS（`lib/design/tokens.ts`の6色トークン） / `claude-in-chrome`（ブラウザ実機確認）

## Global Constraints

- 設計書：`docs/superpowers/specs/2026-08-21-mobile-responsiveness-design.md`
- 監査対象：B2C（メディア・ガイド系）＋B2B団体管理画面のみ。`/admin`配下・企業側（`/companydashboard`等）は対象外
- 監査の基準ビューポート幅：375px（プロジェクト既存の基準）
- ダークモード導入は対象外（別スペック）
- 新しい色をデザイントークンに追加しない（CLAUDE.md §3）。`lib/design/tokens.ts`の6色のみ使う
- `borderRadius`は全キー`0px`固定（既存の意図的な設計）。角丸を追加しない
- 既存のRTL（Reactコンポーネントテスト基盤）は未導入のため、UIの検証は`tsc --noEmit`・`npm run build`・ブラウザ実機確認で行う
- 修正のたびに375px幅で再確認する

---

### Task 1: `ClubSidebar`のモバイルドロワー実装

**Files:**
- Modify: `components/ClubSidebar.tsx`
- Modify: `app/(club)/layout.tsx`

**Interfaces:**
- Consumes: `useClubOrganization()`（`@/contexts/ClubOrganizationContext`）が提供する`withOrgQuery(path: string): string`
- Produces: `components/ClubSidebar.tsx`から`export default function ClubSidebar()`（デスクトップ用、既存と同じ見た目）と`export function ClubMobileDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }): JSX.Element`（モバイル用オーバーレイ＋ドロワー）の2つをエクスポートする。`app/(club)/layout.tsx`はこの両方をimportして使う。

**背景（設計書§2.1より）**：現状`app/(club)/layout.tsx`のハンバーガーボタンに`onClick`が無い。`ClubSidebar`は`hidden lg:flex`でモバイル幅では非表示になり、代替のドロワーが存在しない。`ClubOrganizationProvider`でラップされた`flex-row`の親コンテナ内に`ClubSidebar`と`<main>`が横並びで置かれているため、モバイル用の「固定位置ヘッダーバー（ボタン）」は`<main>`のflex-col内に留める必要がある（`flex-row`の兄弟にすると横並びになってしまい、ボタンが全幅バーにならない）。一方、ドロワー本体とオーバーレイは`fixed`配置なのでDOM上どこに置いても表示は変わらない。そのため「ボタン付きヘッダーバー」は`layout.tsx`側に残し、「ドロワー本体」だけ`ClubSidebar.tsx`から`ClubMobileDrawer`としてexportする設計にする。

- [ ] **Step 1: `components/ClubSidebar.tsx`を書き換える**

以下の内容で全体を置き換える：

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Pencil,
  Users,
  ClipboardList,
  Mail,
  Kanban,
  Megaphone,
  CalendarDays,
  CalendarClock,
  Images,
  Star,
  Wallet,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";

const NAV_LINKS: Array<{ href: string; label: string; Icon: LucideIcon; exact?: boolean }> = [
  { href: "/clubdashboard", label: "ダッシュボードホーム", Icon: LayoutDashboard, exact: true },
  { href: "/clubprofile", label: "プロフィール編集", Icon: Pencil, exact: true },
  { href: "/clubsettings/members", label: "メンバー管理", Icon: Users, exact: true },
  { href: "/clubats", label: "入会応募者管理", Icon: ClipboardList, exact: true },
  { href: "/clubmessages", label: "メッセージ", Icon: Mail, exact: true },
  { href: "/clubtasks", label: "タスク管理", Icon: Kanban, exact: true },
  { href: "/clubschedule", label: "日程調整", Icon: CalendarClock, exact: false },
  { href: "/clubfinance", label: "会計・財務", Icon: Wallet, exact: true },
  { href: "/clubposts", label: "タイムライン投稿", Icon: Megaphone, exact: true },
  { href: "/clubevents", label: "イベント管理", Icon: CalendarDays, exact: true },
  { href: "/clubphotos", label: "フォトギャラリー管理", Icon: Images, exact: true },
  { href: "/clubdashboard/reviews", label: "口コミ・レビュー管理", Icon: Star, exact: true },
];

function linkClassFor(pathname: string | null, path: string, exact?: boolean): string {
  const pathOnly = path.split("?")[0];
  const active = exact
    ? pathname === pathOnly
    : pathname === pathOnly || (pathname?.startsWith(pathOnly + "/") ?? false);
  return active
    ? "flex items-center gap-3 px-4 py-3 rounded bg-mist text-ink"
    : "flex items-center gap-3 px-4 py-3 rounded text-graphite hover:text-ink hover:bg-mist transition-colors";
}

function ClubNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { withOrgQuery } = useClubOrganization();
  return (
    <nav className="flex flex-col gap-2">
      {NAV_LINKS.map(({ href, label, Icon, exact }) => (
        <Link
          key={href}
          className={linkClassFor(pathname, href, exact)}
          href={withOrgQuery(href)}
          onClick={onNavigate}
        >
          <Icon className="w-6 h-6" aria-hidden="true" />
          <span className="text-sm font-medium">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function ClubSidebar() {
  return (
    <aside className="hidden w-64 flex-col bg-paper border-r border-rule lg:flex shrink-0">
      <div className="flex h-full flex-col justify-between p-6">
        <div className="flex flex-col gap-8">
          <p className="text-graphite text-xs">管理者用</p>
          <ClubNavLinks />
        </div>
        <div className="pt-6 border-t border-rule">
          <Link
            className="flex items-center gap-3 px-4 py-2 text-graphite hover:text-ink transition-colors"
            href="/"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            <span className="text-sm font-medium">ログアウト</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}

export function ClubMobileDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <div
        role="presentation"
        aria-hidden={!isOpen}
        className={`lg:hidden fixed inset-0 z-[110] bg-black/40 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <aside
        aria-label="管理者用メニュー"
        aria-hidden={!isOpen}
        className={`lg:hidden fixed top-0 right-0 z-[120] h-full w-[min(280px,85vw)] max-w-[280px] bg-paper shadow-xl transition-transform duration-200 ease-out flex flex-col justify-between p-6 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-8">
          <p className="text-graphite text-xs">管理者用</p>
          <ClubNavLinks onNavigate={onClose} />
        </div>
        <div className="pt-6 border-t border-rule">
          <Link
            className="flex items-center gap-3 px-4 py-2 text-graphite hover:text-ink transition-colors"
            href="/"
            onClick={onClose}
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            <span className="text-sm font-medium">ログアウト</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 2: `app/(club)/layout.tsx`を書き換える**

以下の内容で全体を置き換える（`"use client"`を追加し、ボタンに状態とonClickを配線、`ClubMobileDrawer`を追加）：

```tsx
"use client";

import { Suspense, useState } from "react";
import { Menu, X } from "lucide-react";
import ClubSidebar, { ClubMobileDrawer } from "@/components/ClubSidebar";
import { ClubOrganizationProvider } from "@/contexts/ClubOrganizationContext";

function ClubShell({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <ClubOrganizationProvider>
      <div className="relative flex min-h-screen w-full flex-row overflow-x-hidden">
        <ClubSidebar />
        <main className="flex-1 flex flex-col min-w-0 bg-mist">
          <div className="lg:hidden flex items-center justify-end p-4 bg-paper border-b border-rule sticky top-0 z-20">
            <button
              type="button"
              aria-label={isDrawerOpen ? "メニューを閉じる" : "メニューを開く"}
              aria-expanded={isDrawerOpen}
              className="text-graphite hover:text-ink transition-colors"
              onClick={() => setIsDrawerOpen((prev) => !prev)}
            >
              {isDrawerOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </main>
        <ClubMobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      </div>
    </ClubOrganizationProvider>
  );
}

export default function ClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-mist text-graphite font-body antialiased min-h-screen">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center p-8 text-graphite/70">
            読み込み中...
          </div>
        }
      >
        <ClubShell>{children}</ClubShell>
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 3: 型チェックを通す**

Run: `npx tsc --noEmit`
Expected: エラーなし（既存のエラーが残っている場合は、このタスクの変更が新規エラーを増やしていないことだけ確認する）

- [ ] **Step 4: ビルドを確認する**

Run: `npm run build`
Expected: ビルド成功。`npm run dev`を同時に起動していないことを確認してから実行する（CLAUDE.md記載の既知の踏み抜きポイント）。

- [ ] **Step 5: ブラウザで動作確認する（可能な場合）**

団体管理画面はログインが必要。ログイン済みの団体アカウントでアクセスできる場合は、`claude-in-chrome`をビューポート375px幅に設定し `/clubdashboard` を開き、ハンバーガーボタンをタップしてドロワーが開閉すること、ドロワー内のリンクで他の管理画面（例：`/clubtasks`）に遷移できることを確認する。
ログイン済みアカウントが用意できない場合は、このステップは実施せず、Step 3・4の結果と実装内容のコードレビューのみで完了とし、次回オーナーが実機でログインして確認する旨をタスク完了報告に明記する。

- [ ] **Step 6: コミット**

```bash
git add components/ClubSidebar.tsx "app/(club)/layout.tsx"
git commit -m "$(cat <<'EOF'
fix(club): モバイル幅で団体管理メニューが開けない不具合を修正

ハンバーガーボタンにonClickが実装されておらず、モバイル幅では
ClubSidebarが非表示になる代わりのドロワーも存在しなかった。
AppShellと同じ固定オーバーレイ+スライドインのドロワーパターンを
ClubMobileDrawerとして追加し、ボタンに開閉状態を配線した。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 2: `/for-clubs`の`MockInboxKanban`はみ出し修正

**Files:**
- Modify: `app/for-clubs/page.tsx:64-108`（`MockInboxKanban`関数、および周辺の`<p>`タグ2箇所）

**Interfaces:**
- Consumes: なし（このコンポーネントは自己完結、外部依存無し）
- Produces: `MockInboxKanban()`の返り値の見た目のみ変更。他タスクとの依存関係なし。

**背景（設計書§2.2より）**：Flexboxの子要素は既定で`min-width: auto`となり、明示的に`min-w-0`を指定しない限り、中身の最小コンテンツ幅より縮まない。`MockInboxKanban`内の`w-[38%]`列・`flex-1`列（「応募ボード」）・その中の3つのステージ列（新規/面談中/内定）のいずれにも`min-w-0`が無いため、モバイル幅でこのカード全体が親のグリッド列を押し広げ、ページからはみ出す。

- [ ] **Step 1: `MockInboxKanban`関数を書き換える**

`app/for-clubs/page.tsx`の64〜108行目（`function MockInboxKanban() {` から対応する `}` まで）を、以下に置き換える：

```tsx
function MockInboxKanban() {
  return (
    <div className="flex flex-col overflow-hidden border border-rule bg-mist">
      <MockChrome path="/clubats" />
      <div className="flex min-h-0 flex-1 gap-3 p-4">
        <div className="flex w-[38%] min-w-0 flex-col gap-2 border border-rule bg-paper p-3">
          <div className="flex items-center gap-2 text-ink">
            <Inbox className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="text-[11px] font-bold">
              応募 <span className="font-numeric tabular-nums">4</span>件
            </span>
          </div>
          {DEMO_APPLICANTS.map((a) => (
            <div key={a.name} className="min-w-0 border border-rule bg-mist p-2">
              <p className="truncate text-[11px] font-bold text-ink">{a.name}</p>
              <p className="truncate text-[10px] text-graphite">{a.faculty}</p>
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 border border-rule bg-paper p-3">
          <div className="flex items-center gap-2 text-ink">
            <Kanban className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="text-[11px] font-bold">応募ボード</span>
          </div>
          <div className="flex min-h-0 flex-1 gap-2">
            {["新規", "面談中", "内定"].map((stage) => (
              <div key={stage} className="min-w-0 flex-1 border border-dashed border-rule bg-mist p-2">
                <span className="text-[9px] font-bold tracking-wider text-graphite/70">
                  {stage}
                </span>
                <div className="mt-2 flex flex-col gap-1.5">
                  {DEMO_APPLICANTS.filter((a) => a.stage === stage).map((a) => (
                    <div key={a.name} className="border border-rule bg-paper px-2 py-1.5">
                      <p className="truncate text-[10px] font-bold text-ink">{a.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

変更点：`w-[38%]`の列と`flex-1`の「応募ボード」列、およびその中の3つのステージ列すべてに`min-w-0`を追加。左列の応募者カード内2つの`<p>`（氏名・学部学年）にも`truncate`を追加（他のMockコンポーネント内の同種カードと同じ扱いに揃える）。

- [ ] **Step 2: 型チェックを通す**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: ブラウザで375px幅の表示を確認する**

`claude-in-chrome`のツールをロードする（未ロードの場合）：
```
ToolSearch query: "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__resize_window"
```
新規タブで `http://localhost:3000/for-clubs`（`npm run dev`起動済みの前提。稼働していなければ起動する）を開き、ウィンドウ幅を375pxに設定して`#features`セクション（02／入会応募者管理のあたり）までスクロールし、「Inboxと応募者管理カンバンボード」の枠がページ幅からはみ出していないことをスクリーンショットで確認する。修正前・修正後で見比べる。

- [ ] **Step 4: コミット**

```bash
git add app/for-clubs/page.tsx
git commit -m "$(cat <<'EOF'
fix(for-clubs): モバイル幅でMockInboxKanbanがはみ出す不具合を修正

Flexboxの子要素は既定でmin-width: autoのため、w-[38%]列と
flex-1の応募ボード列・ステージ列3つのいずれもmin-w-0が無く、
モバイル幅でカード全体が親のグリッド列を押し広げていた。
各列にmin-w-0を追加し、左列のカード内テキストにtruncateを追加した。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 3: 網羅監査 Phase 1（コード検索による当たりつけ）

**Files:**
- Create: `docs/superpowers/specs/2026-08-21-mobile-audit-findings.md`（このタスクではPhase 1の結果セクションのみ作成。Task 4・5で追記していく）

**Interfaces:**
- Consumes: なし
- Produces: `docs/superpowers/specs/2026-08-21-mobile-audit-findings.md`の「## Phase 1：コード検索の結果」セクション。Task 4・5がこのリストを参照して優先確認ページを決める。

- [ ] **Step 1: 固定幅パターンを検索する**

Run:
```bash
grep -rn 'w-\[' app/ components/ --include='*.tsx' | grep -v '/admin/' | grep -v 'companydashboard\|companysearch\|companymessage'
```
（`Grep`ツールを使う場合は `pattern: "w-\\["`, `path: "app"`, `glob: "*.tsx"` で実行し、結果から`/admin/`・企業側ファイルを除外して読む）

結果を「固定幅で崩れる可能性がある箇所」の候補として記録する。

- [ ] **Step 2: レスポンシブ対応の無いgrid-colsを検索する**

Run: `Grep` で `pattern: "grid-cols-[2-9]"`, `path: "app"`, `glob: "*.tsx"`, `output_mode: "content"`

各ヒット行を確認し、同じ`className`文字列内に`sm:`・`md:`・`lg:`のいずれのブレークポイントプレフィックスも無い（＝全画面幅で固定列数のまま）ものだけを候補として抜き出す。

- [ ] **Step 3: 横スクロール対応の無いテーブル・横並び要素を検索する**

Run: `Grep` で `pattern: "<table"`, `path: "app"`, `glob: "*.tsx"`, `output_mode: "content"`, `-C: 5`

各`<table`の周辺5行を見て、`overflow-x-auto`を持つ親要素で囲まれているか確認する。囲まれていないものを候補として記録する。

- [ ] **Step 4: 結果を`docs/superpowers/specs/2026-08-21-mobile-audit-findings.md`に書き出す**

以下の構成で新規作成する：

```markdown
# モバイル網羅監査 結果

**作成：2026-08-21**（Phase 1）

> 設計：`docs/superpowers/specs/2026-08-21-mobile-responsiveness-design.md`
> 計画：`docs/superpowers/plans/2026-08-21-mobile-responsiveness.md`

## Phase 1：コード検索の結果（当たりつけ）

### 固定幅パターン（`w-[...]`）
[Step1の結果を、ファイルパス・行番号・該当コード・所感（怪しい/問題なさそう）の表または箇条書きで記載]

### レスポンシブ対応の無いgrid-cols
[Step2の結果を同様に記載]

### 横スクロール対応の無いテーブル
[Step3の結果を同様に記載]

## Phase 2：実機確認の結果

（Task 4・5で追記）
```

- [ ] **Step 5: コミット**

```bash
git add docs/superpowers/specs/2026-08-21-mobile-audit-findings.md
git commit -m "$(cat <<'EOF'
docs: モバイル監査Phase1（コード検索）の結果を記録

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 4: 網羅監査 Phase 2（B2Cページの実機確認）

**Files:**
- Modify: `docs/superpowers/specs/2026-08-21-mobile-audit-findings.md`（「Phase 2」セクションにB2C分を追記）

**Interfaces:**
- Consumes: Task 3が作成した`docs/superpowers/specs/2026-08-21-mobile-audit-findings.md`のPhase 1セクション（優先確認箇所の参考にする）
- Produces: 同ファイルのPhase 2セクションに「B2C」の調査結果を追記。Task 6が全体をとりまとめる際に参照する。

**対象ページ（ログイン不要）**：
`/`、`/baito`、`/baito/simulator`、`/guide`、`/guide/circle`、`/guide/study-abroad`、`/guide/study-abroad/recommend`、`/guide/credits`、`/guide/money`、`/guide/living-alone`、`/gpa`、`/search`、`/organizations/[id]`（実在団体1件で代表確認）、`/classinfo`、`/login`、`/signup`、`/for-clubs`、`/manual`

**対象ページ（ログイン必要・可能なら確認、不可なら「未確認」と明記）**：
`/schedule`、`/timeline`、`/mypage`、`/mypage/messages`、`/mypage/notifications`

- [ ] **Step 1: ツールを準備する**

`claude-in-chrome`のツールをロードする（未ロードの場合）：
```
ToolSearch query: "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__resize_window,mcp__claude-in-chrome__find"
```
`npm run dev`が稼働していなければ起動する（`npm run build`と同時に走らせない）。新規タブを作成し、ウィンドウ幅を375pxに設定する。

- [ ] **Step 2: 各ページを開いて確認する**

対象ページ一覧を1つずつ開き、それぞれについて以下を確認する：
1. スクリーンショットを撮り、要素のはみ出し・重なり・読みにくいほど詰まったレイアウトが無いか目視する
2. ページ内にボタン・タブ・アコーディオン・モーダルを開く操作がある場合は、実際にタップ（クリック）して反応するか確認する（ClubSidebarの件のように見た目だけでは分からない不具合があるため）
3. `/guide/study-abroad/recommend`・`/baito/simulator`のような診断系は、実際に1回最後まで進めて結果画面まで崩れないか確認する

不具合を見つけたら、その場でページ名・症状・再現手順・推定原因（コードを見て分かる範囲で）・重大度（機能不可／崩れて見苦しい／軽微）をメモする。

- [ ] **Step 3: 結果を`docs/superpowers/specs/2026-08-21-mobile-audit-findings.md`に追記する**

「## Phase 2：実機確認の結果」の下に「### B2C」小見出しを追加し、ページごとに以下の形式で記載する：

```markdown
### B2C

#### `/対象ページのパス`
- 状態：問題なし／要修正
- （要修正の場合）症状：...
- （要修正の場合）再現手順：...
- （要修正の場合）推定原因：...
- （要修正の場合）重大度：機能不可／崩れて見苦しい／軽微
```

ログイン必要ページで確認できなかったものは「状態：未確認（ログイン環境なし）」と明記する。

- [ ] **Step 4: コミット**

```bash
git add docs/superpowers/specs/2026-08-21-mobile-audit-findings.md
git commit -m "$(cat <<'EOF'
docs: モバイル監査Phase2（B2C実機確認）の結果を記録

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 5: 網羅監査 Phase 2（B2B団体管理ページの実機確認）

**Files:**
- Modify: `docs/superpowers/specs/2026-08-21-mobile-audit-findings.md`（「Phase 2」セクションにB2B分を追記）

**Interfaces:**
- Consumes: Task 3のPhase 1結果、Task 1で修正済みのClubSidebar（このタスクの時点でハンバーガーメニューは動作している前提）
- Produces: 同ファイルのPhase 2セクションに「B2B団体管理」の調査結果を追記。Task 6が参照する。

**対象ページ（すべてログイン必要）**：
`/clubdashboard`、`/clubdashboard/reviews`、`/clubtasks`、`/clubevents`、`/clubats`、`/clubposts`、`/clubmessages`、`/clubphotos`、`/clubprofile`、`/clubsettings/members`、`/clubfinance`、`/clubschedule`（一覧＋詳細画面1件）

**注意**：全ページログインが前提。ログイン済みの団体管理者アカウントが用意できない場合、このタスクは実施できない。その場合はTask 6で「B2Bは未実施」と明記し、次回オーナーがログイン済みの状態でセッションを再開したときに改めて実施する。

- [ ] **Step 1: ツールを準備し、ログインする**

Task 4と同じ`ToolSearch`でツールをロード（未ロードの場合）。ログイン済みの団体管理者アカウントで`/login`からログインし、いずれかの団体の管理者としてアクセスできる状態にする。ウィンドウ幅375pxに設定する。

- [ ] **Step 2: 各ページを開いて確認する**

対象ページを1つずつ開き、Task 4のStep 2と同じ観点（見た目の崩れ／操作した時の反応／モーダル・ドロワー・カンバンD&Dの動作）で確認する。特に以下は「操作した時の反応」を重点的に見る（過去にJSXの`style`後勝ちでD&Dが機能しなかった前例があるため）：
- `/clubtasks`のカンバン列でのカードドラッグ
- `/clubats`のカンバン列でのカードドラッグ
- `/clubschedule`の詳細画面での回答操作
- `/clubfinance`の記録フォーム入力

- [ ] **Step 3: 結果を`docs/superpowers/specs/2026-08-21-mobile-audit-findings.md`に追記する**

Task 4のStep 3と同じ形式で「### B2B団体管理」小見出しの下に追記する。

- [ ] **Step 4: コミット**

```bash
git add docs/superpowers/specs/2026-08-21-mobile-audit-findings.md
git commit -m "$(cat <<'EOF'
docs: モバイル監査Phase2（B2B団体管理実機確認）の結果を記録

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 6: 監査結果のとりまとめ・優先順位付け

**Files:**
- Modify: `docs/superpowers/specs/2026-08-21-mobile-audit-findings.md`（末尾に「## まとめ」セクションを追加）
- Modify: `docs/task-board.md`（新タスク行を追加）

**Interfaces:**
- Consumes: Task 3・4・5が`docs/superpowers/specs/2026-08-21-mobile-audit-findings.md`に書き込んだ全結果
- Produces: 優先順位付き不具合リスト。次の修正フェーズ（本計画の対象外・別プランで実施）がこれを入力として使う。

- [ ] **Step 1: 全不具合を重大度別に並び替える**

`docs/superpowers/specs/2026-08-21-mobile-audit-findings.md`のPhase 2で記録した「要修正」項目をすべて拾い上げ、「## まとめ」セクションを末尾に追加して以下の形式で記載する：

```markdown
## まとめ

**総件数：N件**（機能不可 X件／崩れて見苦しい Y件／軽微 Z件）

### 機能不可（最優先）
1. `/パス` — 症状の要約（詳細はPhase 2の該当項目を参照）
...

### 崩れて見苦しい
1. ...

### 軽微
1. ...

### 共通コンポーネント起因の疑いがあるもの
[複数ページで同じ症状が出ている場合、原因コンポーネントを推定して記載。Input/Textareaパディング修正の前例のように、1箇所の修正で複数ページが直る可能性があるものをここにまとめる]
```

- [ ] **Step 2: `docs/task-board.md`に追記する**

「## 0. いまの全体像」の表に、次の行を追加する（既存の行末の`|`区切り形式に合わせる）：

```
| AG | **スマホ対応の網羅監査・既知バグ修正**（`/clubschedule`ハンバーガー未実装・`/for-clubs`はみ出し修正済み） | 🟡 監査完了・修正待ち | 監査結果は`docs/superpowers/specs/2026-08-21-mobile-audit-findings.md`。次は結果に基づく修正プランを別途立てる |
```

（既存の最新行番号がAG以降になっている場合は、その次の英字に読み替える）

- [ ] **Step 3: コミット**

```bash
git add docs/superpowers/specs/2026-08-21-mobile-audit-findings.md docs/task-board.md
git commit -m "$(cat <<'EOF'
docs: モバイル監査結果をとりまとめ、task-boardに反映

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

## このプランの後に必要なこと（対象外・別プラン）

Task 6で確定した不具合一覧に基づき、実際の修正を行う実装計画を別途作成する（`docs/superpowers/plans/`に新規ファイル）。件数・内容が監査してみないと分からないため、本プランには含めていない。
