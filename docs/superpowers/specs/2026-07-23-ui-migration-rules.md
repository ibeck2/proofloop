# UI移行ルール（第二周・全ページ共通）

第一周で `lib/design/tokens.ts` に定めたトークンへ、残りのページを移行するための置換ルール。
**判断のブレを無くすための文書なので、ここに書いていない色・アイコンを勝手に導入しないこと。**

関連：`docs/superpowers/specs/2026-07-23-ui-identity-design.md`（第一周の設計）

---

## 1. 使ってよい色は6つだけ

| トークン | 値 | 用途 |
| --- | --- | --- |
| `ink` | `#002B5C` | 紺。見出し・面・強調 |
| `seal` | `#8B0000` | 深紅。**注意喚起と主要CTAのみ。静止状態で1画面2箇所まで** |
| `paper` | `#FFFFFF` | 地 |
| `mist` | `#F2F4F7` | 面の切り替え・補足ブロックの地 |
| `rule` | `#C9D2DC` | 罫線 |
| `graphite` | `#1F2A36` | 本文 |

不透明度の調整（`text-graphite/70` など）は可。**新しい色相を足すのは不可。**

---

## 2. 色の置換表

### 2.1 装飾の色（意味を持たない）→ 潰す

リスト項目ごとに色相を変えているだけのものは、すべて同じ扱いにする。

| 置換前 | 置換後 |
| --- | --- |
| `bg-{blue,emerald,sky,amber,violet,rose,indigo,teal,orange,green,purple,pink,cyan,lime}-50` | `bg-mist` |
| `text-{同上}-600` / `-700` / `-800` / `-900` | `text-ink` |
| `border-{同上}-200` | `border-rule` |
| データ配列の `color` / `bg` フィールド（項目ごとに色を変えているもの） | **フィールドごと削除**し、JSX側も固定クラスにする |

### 2.2 意味のある色（注意・補足）→ 構造で区別する

色相ではなく**左の帯の色**で意味を表す。第一周の `components/home/ForClubsCallout.tsx` と同じ形。

| 意味 | 置換前の例 | 置換後 |
| --- | --- | --- |
| **注意・警告** | `border border-amber-200 bg-amber-50` / rose 系 | `border border-rule border-l-4 border-l-seal bg-mist` |
| **補足・ポイント** | `border border-emerald-200 bg-emerald-50` / sky・blue 系 | `border border-rule border-l-4 border-l-ink bg-mist` |

⚠️ **どちらか迷ったら「補足」（紺）にする。** 深紅を増やさない方向に倒す。

### 2.3 旧エイリアス → 新トークン

| 置換前 | 置換後 |
| --- | --- |
| `text-primary` / `text-navy` / `text-navy-custom` / `text-text-main` | `text-ink` |
| `bg-primary` | `bg-ink` |
| `bg-primary/5` / `bg-primary/10` | `bg-mist` |
| `text-accent` / `text-accent-red` / `text-secondary` | `text-seal`（§1の2箇所制限を守れる場合のみ。超えるなら `text-ink`） |
| `bg-accent` | `bg-seal`（同上） |
| `border-accent` | `border-seal`（同上） |
| `text-text-grey` / `text-grey-custom` / `text-secondary-grey` / `text-neutral-grey` / `text-text-sub` | `text-graphite` |
| `border-[#f0f2f5]` / `border-slate-200` / `border-slate-100` / `border-border-grey` | `border-rule` |
| `bg-white` | `bg-paper` |
| `bg-[#f0f2f5]` / `bg-neutral-light` / `bg-filter-bg` / `bg-slate-50` | `bg-mist` |
| `text-slate-400` / `text-slate-500` | `text-graphite/70` |

---

## 3. アイコン

**`material-symbols-outlined` を lucide-react に置き換える。** よく出るものの対応：

| Material Symbols | lucide |
| --- | --- |
| `home` | `Home` |
| `search` | `Search` |
| `dynamic_feed` | `Newspaper` |
| `calendar_month` / `calendar_today` / `event` | `CalendarDays` |
| `work` / `business_center` | `Briefcase` |
| `mail` | `Mail` |
| `person` / `account_circle` | `User` |
| `group` / `groups` | `Users` |
| `school` | `GraduationCap` |
| `savings` / `payments` / `account_balance` | `PiggyBank` / `Wallet` / `Landmark` |
| `flight` | `Plane` |
| `arrow_forward` | `ArrowRight` |
| `chevron_right` | `ChevronRight` |
| `check` / `check_circle` | `Check` / `CheckCircle2` |
| `warning` / `error` | `AlertTriangle` / `AlertCircle` |
| `info` | `Info` |
| `lightbulb` | `Lightbulb` |
| `location_on` | `MapPin` |
| `videocam` | `Video` |
| `menu` / `close` | `Menu` / `X` |
| `open_in_new` | `ExternalLink` |
| `expand_more` / `expand_less` | `ChevronDown` / `ChevronUp` |
| `star` | `Star` |
| `edit` | `Pencil` |
| `delete` | `Trash2` |
| `add` | `Plus` |
| `filter_alt` | `Filter` |
| `sort` | `ArrowUpDown` |

上の表に無いものは、lucide の中から**意味が最も近いもの**を選び、報告で「どの記号をどれに替えたか」を必ず書くこと。

**書き方のルール**
- サイズはクラスで指定する：`text-[16px]`→`w-4 h-4`、`text-[18px]`→`w-[18px] h-[18px]`、`text-[20px]`/`text-xl`→`w-5 h-5`、`text-2xl`→`w-6 h-6`、`text-4xl`→`w-9 h-9`、`text-5xl`→`w-12 h-12`
- 隣にテキストがある装飾アイコンには **`aria-hidden="true"`** を付ける
- アイコン単独のボタン・リンクには **`aria-label`** を付ける
- **未使用の import を残さない**（このリポジトリでは ESLint エラーになる）

---

## 4. 書体

| 用途 | クラス |
| --- | --- |
| ページの `<h1>`・主要セクションの見出し | `font-mincho` |
| 本文・UI | `font-body` |
| 数値・英数字ラベル | `font-numeric`（数字を揃えるときは `tabular-nums` も） |

`font-display` は旧エイリアス。**触ったファイルでは `font-numeric` か `font-body` に置き換える。**

---

## 5. やらないこと

- **レイアウトの作り替え**（グリッド構成、セクションの順序、文言）。今回は色・アイコン・書体の統一だけ
- 角丸クラス（`rounded-lg` 等）の変更。設定側で全て `0px` に潰しているので見た目は変わらない
- 機能・ロジックの変更
- 新しい依存の追加
- **`git commit` / `git push`**（まとめて行うため、各自はコミットしない）

---

## 6. 終わったら確認すること

担当ファイルについて、次を実際に実行して結果を報告する。

```bash
grep -n "material-symbols" <担当ファイル>          # 出力なしになること
grep -nE "(bg|text|border)-(blue|emerald|sky|amber|violet|rose|indigo|teal|orange|green|red|yellow|purple|pink|cyan|lime)-[0-9]{2,3}" <担当ファイル>   # 出力なしになること
grep -nE "text-primary|bg-primary|text-text-grey|text-accent|bg-accent|border-accent|font-display|border-\[#f0f2f5\]" <担当ファイル>   # 出力なしになること
grep -c "text-seal\|bg-seal\|border-l-seal" <担当ファイル>   # 深紅の使用箇所を数え、報告に書く
```

`npm run build` と `npm run dev` は**実行しないこと**（他の作業と衝突するため）。型チェックとビルドはまとめて行う。
