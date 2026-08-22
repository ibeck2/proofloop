# ダークモード導入 — 設計

**作成：2026-08-22**

---

## 1. 背景・狙い

ProofLoopには過去に「ダークモードは意図的に導入しない」という決定があった。`app/globals.css`に以下の明示コメントが残っている：

> このサイトはライトテーマのみ。ページは常に白い面を描くので、body の背景も白で固定する。OSのダークモード設定に連動したダーク上書きを残すと、フッター上の余白などに黒い帯が出る。

`tailwind.config.ts`の`darkMode: "class"`設定は残っているが、`dark:`クラスはコード上ゼロで、実体は無い状態だった。

今回オーナーの指示により、この決定を覆してダークモードを正式導入する。**過去の「黒い帯」問題は、OS設定に自動追従する方式（`prefers-color-scheme`のみ）を採っていたために起きた可能性が高いと推測されるが、確証は無い。** 今回は手動トグル方式（後述）を採用するため、同じ形での再発は避けられる設計にする。

---

## 2. 決定事項

### 2.1 切り替え方式：手動トグルのみ
OSの`prefers-color-scheme`には自動追従しない。ユーザーがトグルボタンで明示的に選択し、選択は`localStorage`に保存して次回訪問時も保持する。未設定時の初期値はライト。

### 2.2 適用範囲：全ページ一括
B2C（ガイド・診断等）・B2B団体管理・運営（`/admin`）・企業側を含む全ページを対象とする。段階導入はしない。

これに伴い、**既存の6色トークン（`lib/design/tokens.ts`）を使っていないハードコード色・旧エイリアス色を、ダークモード導入と合わせて6色トークンに統一する。** 対象は以下の通り（調査済み）：
- `bg-white` / `bg-black` / `text-slate-*` / `border-slate-*` / `bg-gray-*` / `text-gray-*` / `border-gray-*` を使う10ファイル
- `tailwind.config.ts`に残る22個の旧エイリアス（`primary` `accent` `text-grey` `navy` 等）を使う32ファイル

これらを直さない限りダークモードで反転しない要素が残るため、今回のスコープに含めるのは必須（オーナー承認済み）。

### 2.3 ダークパレット（ブラウザモックアップで承認済み）

単純な白黒反転ではなく、**背景をinkの色相（紺）から派生させる**（一般的な「黒背景＋ビビッドな差し色」という量産型ダークモードのクリシェを避けるため）。

| 役割 | ライト（既存） | ダーク（新規） | 意図 |
| --- | --- | --- | --- |
| paper（背景） | `#FFFFFF` | `#0A1420` | 純黒ではなくinkの色相から派生させた紺黒 |
| mist（面） | `#F2F4F7` | `#111E2E` | 背景よりわずかに明るい面 |
| ink（見出し） | `#002B5C` | `#EDF1F7` | 暗い背景で読めるよう、寒色寄りのほぼ白に反転 |
| graphite（本文） | `#1F2A36` | `#B8C2CE` | 純白だと眩しいので落ち着いたグレー |
| rule（罫線） | `#C9D2DC` | `#28364A` | 背景よりわずかに明るい罫線 |
| seal（印・深紅） | `#8B0000` | `#C4362B` | 暗い背景では沈んで見えるため少し明るく持ち上げた |

深紅（seal）の「静止状態で1画面2箇所まで」というCLAUDE.mdの規律は、ダークモードでも変わらず適用する（色が変わるだけで使用制約は同じ）。

### 2.4 実装方式：CSS変数＋`.dark`クラス（`dark:`個別付与はしない）

`lib/design/tokens.ts`の6色はすでに一元管理されている。これをCSS変数化し、`<html>`要素に`.dark`クラスが付くかどうかで変数の値を切り替える。

```css
:root {
  --color-ink: #002B5C;
  --color-seal: #8B0000;
  --color-paper: #FFFFFF;
  --color-mist: #F2F4F7;
  --color-rule: #C9D2DC;
  --color-graphite: #1F2A36;
  color-scheme: light;
}
:root.dark {
  --color-ink: #EDF1F7;
  --color-seal: #C4362B;
  --color-paper: #0A1420;
  --color-mist: #111E2E;
  --color-rule: #28364A;
  --color-graphite: #B8C2CE;
  color-scheme: dark;
}
```

`tailwind.config.ts`の`colors`は`ink: "var(--color-ink)"`のようにCSS変数参照へ変更する。**これにより、`bg-ink` `text-graphite` `border-rule`等の既存クラスを使っているコードは一切変更不要になる**——ダークモードは変数の値が切り替わるだけで自動的に効く。`dark:`バリアントを個々のJSXに追加して回る必要は無い。

変更が必要なのは以下の4点に限定される：
1. `app/globals.css`：CSS変数定義（上記）
2. `tailwind.config.ts`：`COLORS`の参照方式をCSS変数経由に変更
3. §2.2で挙げたハードコード色・旧エイリアスを使う約40ファイルの色統一（6色トークンのクラス名に置き換え）
4. トグルボタンの新規実装＋初期化スクリプト

### 2.5 初期化（FOUCの防止）

React hydrationより前に`localStorage`を読んで`<html>`へ`.dark`を付与しないと、ページ読み込み時に一瞬ライトテーマが見えてから切り替わる「フラッシュ」が起きる。`app/layout.tsx`に`next/script`（`strategy="beforeInteractive"`）でインラインスクリプトを追加し、`document.documentElement.classList`を最速で設定する（Next.jsアプリでの標準的な対処法）。

### 2.6 トグルボタンの配置：`AppShell`ヘッダーのロゴ行

デスクトップはログイン/ログアウトボタンの隣、モバイルはドロワー内（ハンバーガーメニューを開いた中）に配置する。`AppShell`は全ページ共通ヘッダーなので、ここに1箇所実装すれば全ページに反映される。

### 2.7 旧エイリアス色の対応表（判断が必要なもの）

`tailwind.config.ts`に残る22個の旧エイリアスのほとんどは6色のいずれかに1:1で対応するが、以下は**新しい判断が必要**：

- `text-grey` / `grey-custom` / `secondary-grey` / `neutral-grey` / `neutral-gray` / `text-sub`（いずれも`#707070`）：6色のどれにも一致しない中間グレー。**`graphite`を70%不透明度で使う（`text-graphite/70`）**に統一する。プロジェクト内で既に「本文より薄い注記」に`text-graphite/70`が使われている慣習（例：モバイル監査ドキュメントの解説文）と揃える。
- `border-grey`（`#e5e7eb`）→`rule`に統一
- `neutral-light`（`#f0f0f5`）・`filter-bg`（`#F5F5F5`）→`mist`に統一
- `background-light`（`#ffffff`）→`paper`に統一
- `background-message`（`#f8f5f5`）→`mist`に統一
- `primary-hover`（`#001f42`、inkのホバー濃色）：`hover:bg-[#001f45]`のような直書きが7ファイル（`components/AppShell.tsx` `components/ui/Button.tsx` `app/for-clubs/page.tsx` `app/not-found.tsx` `app/invite/[token]/page.tsx` `app/guide/living-alone/page.tsx` `app/guide/study-abroad/page.tsx`）にある。**これは見た目の些末事ではなく実害がある**：`bg-ink`はCSS変数化でダークモード時ほぼ白になるが、ホバー時の`hover:bg-[#001f45]`は固定の濃紺のままなので、`text-paper`（ダークモードでは背景色＝ほぼ黒）と組み合わさり、**ホバー時に文字が読めなくなる**。固定色でのホバー上書きはすべて`hover:opacity-90`（同じ色のまま少し薄くする、テーマに依存しない）に置き換える。これにより新しい色・新しいCSS変数を増やさずに済み、ライト・ダーク両方で自動的に正しく機能する。
- `background` / `foreground`（Next.jsテンプレート由来の`--background` `--foreground`変数）：`app/globals.css`の`:root`にある古い定義。今回導入するCSS変数体系と役割が重複するため、置き換えて削除する。
- `background-dark`（`#0f1823`）：使用箇所を確認し、実質未使用なら`tailwind.config.ts`から削除する。

---

## 3. 対象外

- OS設定への自動追従（`prefers-color-scheme`のみでの切り替え）は行わない（§2.1）。
- 新しい色を追加すること（6色トークンの枠内で完結させる）。
- `borderRadius`（全キー`0px`）・書体（mincho/body/numeric）はダークモードで変更しない（色のみの切り替え）。

---

## 4. 未決事項

- なし（すべてこのドキュメントで確定済み）。実装計画（`writing-plans`）で、約40ファイルの色統一をどう分割してタスク化するかを決める。
