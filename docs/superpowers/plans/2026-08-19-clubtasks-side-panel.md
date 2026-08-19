# `/clubtasks` タスク詳細・編集モーダルの右サイドパネル化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/clubtasks`のタスク編集・新規作成モーダルを、画面中央固定の表示から画面右からスライドインするサイドパネル（ドロワー）表示に変更する。

**Architecture:** 既存の`app/(club)/clubtasks/page.tsx`内、`modalOpen`で制御される単一のJSXブロックのコンテナ要素（外側のバックドロップ div・内側のパネル div）のクラス名とアニメーション制御stateのみを変更する。フォーム・チェックリスト・添付・コメントの中身のJSXは一切変更しない。新規ライブラリは追加せず、Tailwindのtransitionユーティリティのみで実装する。

**Tech Stack:** Next.js 15 (App Router) / React / TypeScript / Tailwind CSS。既存依存のみ使用（新規追加なし）。

## Global Constraints

- 設計書は `docs/superpowers/specs/2026-08-19-clubtasks-side-panel-design.md`。矛盾があれば設計書を優先する。
- 対象は`app/(club)/clubtasks/page.tsx`の`modalOpen`ブロック（タスク編集・新規作成）のみ。`archiveModalOpen`・`unarchiveModalOpen`の2モーダルは変更しない。
- 新規npm依存パッケージは追加しない。
- アニメーション時間は`200ms`（`duration-200`。Tailwindの標準スケールに存在する値。`duration-250`のような架空のクラス名は使わない）。
- このリポジトリにコンポーネントテスト基盤（RTL）は無い。検証は`npx tsc --noEmit`・`npm test`（回帰確認）＋ブラウザでの実機確認（`claude-in-chrome`）で行う。
- CLAUDE.mdの既存ルール通り、開発サーバー（`npm run dev`）稼働中に`npm run build`を同時に叩かない。

---

## ファイル構成

| ファイル | 変更内容 |
|---|---|
| `app/(club)/clubtasks/page.tsx` | Task 1で全変更を行う。新規ファイルは作成しない |

## Task 1: 開閉アニメーションの実装（state・ロジック・JSX）

**Files:**
- Modify: `app/(club)/clubtasks/page.tsx`

**Interfaces:**
- Consumes: なし（既存の`modalOpen` / `editingTask` / `form` state、既存の`openNewModal` / `openEditModal` / `closeModal`関数をそのまま使う）
- Produces: なし（このページ内で完結する変更。他ファイルから参照される新しいexportは無い）

- [ ] **Step 1: `useRef`をimportに追加する**

`app/(club)/clubtasks/page.tsx` の3行目を変更する。

変更前：
```tsx
import { useState, useEffect, useCallback, useMemo } from "react";
```

変更後：
```tsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
```

- [ ] **Step 2: パネルの表示アニメーション用stateとタイマー用refを追加する**

153行目付近、`const [modalOpen, setModalOpen] = useState(false);` の直後に追加する。

変更前：
```tsx
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
```

変更後：
```tsx
  const [modalOpen, setModalOpen] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
```

- [ ] **Step 3: `closeModal`を2段階クローズに変更し、開閉アニメーション用のuseEffectを3つ追加する**

`closeModal`（585行目付近）を変更する。

変更前：
```tsx
  const closeModal = () => {
    setModalOpen(false);
    setEditingTask(null);
    setForm(emptyForm);
  };
```

変更後：
```tsx
  const closeModal = () => {
    setPanelVisible(false);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setModalOpen(false);
      setEditingTask(null);
      setForm(emptyForm);
      closeTimeoutRef.current = null;
    }, 200);
  };

  useEffect(() => {
    if (!modalOpen) return;
    const raf = requestAnimationFrame(() => setPanelVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);
```

補足：
- 1つ目のuseEffectが「開く」アニメーション（マウント直後の次フレームで`translate-x-full → translate-x-0`へ遷移させる）を担当する。
- 2つ目のuseEffectがEscapeキーでの閉じる挙動を追加する（新規機能）。`closeModal`はこのuseEffectより前で定義済みのため、コールバック内から問題なく参照できる。
- 3つ目のuseEffectはコンポーネントのアンマウント時（ページ離脱等）に、閉じるアニメーション用の`setTimeout`が残っていたら掃除するためのもの（React `act` 警告・メモリリークの防止）。
- タスクカードは`modalOpen`中はバックドロップ（`fixed inset-0`）に覆われクリックできないため、「閉じるアニメーション中に別タスクを開く」という競合は通常操作では発生しない。想定すべき競合は「閉じる操作を連打する」ケースのみで、`clearTimeout`してから積み直す上記の実装で対応済み。

- [ ] **Step 4: バックドロップとパネル本体のJSXを右サイドパネル用のクラスに変更する**

`modalOpen`ブロックの冒頭（1237行目付近）を変更する。

変更前：
```tsx
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-paper border border-rule shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
```

変更後：
```tsx
      {modalOpen && (
        <div
          className={`fixed inset-0 z-50 flex justify-end bg-black/50 transition-opacity duration-200 ${
            panelVisible ? "opacity-100" : "opacity-0"
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className={`w-full sm:max-w-xl h-full rounded-l-xl bg-paper border border-rule shadow-xl overflow-y-auto transition-transform duration-200 ease-out ${
              panelVisible ? "translate-x-0" : "translate-x-full"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
```

このブロックの残り（ヘッダー・フォーム・チェックリスト/添付/コメントの3セクション・フッターのボタン、〜1509行目まで）は変更しない。

変更点の意図：
- `items-center justify-center p-4` → `justify-end`：中央寄せをやめ右端に寄せる。周囲の余白`p-4`も外し、パネルを画面端に張り付かせる
- `max-w-lg` → `sm:max-w-xl`：PC幅で約640pxに広げる（スマホ幅では`w-full`のまま画面幅いっぱい）
- `rounded-xl` → `rounded-l-xl`：右端に張り付くパネルなので左側だけ角丸にする
- `max-h-[90vh]` → `h-full`：画面縦いっぱいの高さにする
- `transition-opacity` / `transition-transform`：`panelVisible`の真偽でバックドロップのフェード・パネルのスライドをそれぞれ制御する

- [ ] **Step 5: 型チェックを実行する**

Run: `npx tsc --noEmit`
Expected: エラー無し（既存のエラーが無い状態からの差分無し）

- [ ] **Step 6: 既存テストスイートを実行し回帰が無いことを確認する**

Run: `npm test`
Expected: 全テストPASS（このタスクはロジックを持つ純粋関数を変更していないため、既存531テストの結果に変化は無いはず）

- [ ] **Step 7: コミットする**

```bash
git add "app/(club)/clubtasks/page.tsx"
git commit -m "$(cat <<'EOF'
feat(clubtasks): タスク編集・新規作成モーダルを右サイドパネル化

画面中央の固定モーダルから、右からスライドインするパネル表示に変更。
Escapeキーでの閉じる操作も新規追加。設計は
docs/superpowers/specs/2026-08-19-clubtasks-side-panel-design.md。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

## Task 2: ブラウザでの実機確認

**Files:**
- なし（コード変更を伴わない検証タスク）

**Interfaces:**
- Consumes: Task 1で実装された`/clubtasks`ページ
- Produces: なし（QA完了の確認のみ）

- [ ] **Step 1: 開発サーバーを起動する**

Run: `npm run dev`

CLAUDE.mdのルール通り、このサーバーが稼働している間は`npm run build`を同時に実行しないこと。ポート3000に旧プロセスが残っていないか確認してから起動する。

- [ ] **Step 2: `claude-in-chrome`で`/clubtasks`を開く**

ログイン済みのセッションが必要（団体データが無いと動作確認ができない）。ログイン済みタブが無ければ、ユーザーに一言確認してから進める。

- [ ] **Step 3: 新規タスク作成での開閉を確認する**

「新規タスク追加」ボタンをクリックし、以下を確認する。
- パネルが画面右から左へスライドインして表示される（瞬間表示ではなくアニメーションが見える）
- 「キャンセル」ボタンをクリック → パネルが右へスライドアウトしてから消える
- 期待結果：中央ではなく右端にパネルが表示され、開閉ともにアニメーションが見えること

- [ ] **Step 4: 既存タスクの詳細表示での開閉を確認する**

カンバンまたは表ビューで既存タスクをクリックし、以下を確認する。
- パネルが右からスライドインし、タスクの内容（タイトル・詳細・チェックリスト・添付・コメント）が正しく表示される
- 「×」ボタンで閉じる → スライドアウトを確認
- 再度開き、バックドロップ（パネル外の暗い部分）をクリックして閉じる → スライドアウトを確認
- 再度開き、Escapeキーを押して閉じる → スライドアウトを確認（新規追加の挙動）
- 期待結果：4通りの閉じ方すべてでスライドアウトしてから消えること

- [ ] **Step 5: 保存フローでの挙動を確認する**

既存タスクを開き、タイトルを少し変えて「保存」をクリックする。
- 期待結果：保存成功のトースト表示後、パネルが閉じる（アニメーション込み）。保存前の`closeModal()`呼び出し経路がTask 1の変更後も問題なく動作すること

- [ ] **Step 6: アーカイブ履歴閲覧（読み取り専用）での表示崩れが無いことを確認する**

「表示」フィルタで過去のアーカイブラベルを選び、アーカイブ済みタスクをクリックして開く。
- 期待結果：読み取り専用の案内文・無効化されたフォームがサイドパネル内でも崩れず表示されること

- [ ] **Step 7: デスクトップ幅とスマホ幅の両方を確認する**

ブラウザウィンドウ（またはデバイスツールバー）でおおよそ375px幅にリサイズし、Step 3〜4を再度ざっと確認する。
- 期待結果：デスクトップではパネル幅が画面右側の一部（約640px）に収まり、スマホ幅では画面いっぱいに広がること

- [ ] **Step 8: 対象外の2モーダルに回帰が無いことを確認する**

「年度アーカイブ」ボタン、および（アーカイブ履歴閲覧中の）「このアーカイブを取り消す」ボタンをクリックする。
- 期待結果：この2つの確認モーダルは従来通り画面中央に表示されること（サイドパネル化の影響を受けていないこと）

- [ ] **Step 9: 確認結果を記録する**

上記Step 3〜8の結果を`docs/task-board.md`の該当セクションに追記する（追記内容はこのタスク実行時の実際の確認結果に基づいて書くこと。うまくいかない項目があれば、その場でTask 1に戻って修正する）。
