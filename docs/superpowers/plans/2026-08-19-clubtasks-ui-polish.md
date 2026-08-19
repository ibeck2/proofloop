# /clubtasks UI微調整 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/clubtasks`のビュー切替ボタン・タスク編集モーダルの入力欄・カンバンカードの見た目の不揃いを解消し、種別（category）に色分けを追加して視覚的な訴求力を上げる。

**Architecture:** ロジックは`lib/tasks/taskCategoryColor.ts`の純粋関数1本に集約し、4つのビュー（カンバン・表・カレンダー・ガント）とタスク編集モーダルはこの関数の戻り値を使って見た目だけを変える。DBスキーマ変更・共通コンポーネント（`components/ui/Input.tsx`等）の変更は無い。

**Tech Stack:** Next.js 15 App Router / React / TypeScript / Tailwind CSS / lucide-react / vitest

## Global Constraints

- ロジックは`lib/`の純粋関数に切り出し、テストを書く（UIコンポーネントに計算を埋め込まない）。CLAUDE.md §5
- `components/ui/Input.tsx` / `Textarea.tsx`本体は変更しない（別スコープ。`docs/task-board.md`に記録済み）
- `lib/design/tokens.ts`の6色トークンには手を入れない。種別カラーは`lib/tasks/taskCategoryColor.ts`に独立したパレットとして定義する
- 各タスク実装後、`npm test`を通す
- 設計は`docs/superpowers/specs/2026-08-19-clubtasks-ui-polish-design.md`

---

### Task 1: 種別→色の決定的マッピング関数

**Files:**
- Create: `lib/tasks/taskCategoryColor.ts`
- Test: `lib/tasks/taskCategoryColor.test.ts`

**Interfaces:**
- Produces: `categoryColor(category: string | null | undefined): CategoryColor | null`、`type CategoryColor = { hex: string; dot: string; border: string; tint: string }`。後続タスクはこの関数と型をimportして使う。

- [ ] **Step 1: 失敗するテストを書く**

`lib/tasks/taskCategoryColor.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { categoryColor, CATEGORY_PALETTE } from "./taskCategoryColor";

describe("categoryColor", () => {
  it("returns null for empty, whitespace-only, null, or undefined category", () => {
    expect(categoryColor(null)).toBeNull();
    expect(categoryColor(undefined)).toBeNull();
    expect(categoryColor("")).toBeNull();
    expect(categoryColor("   ")).toBeNull();
  });

  it("is deterministic: the same category always returns the same color", () => {
    const a = categoryColor("デザイン");
    const b = categoryColor("デザイン");
    expect(a).not.toBeNull();
    expect(a).toEqual(b);
  });

  it("trims whitespace before hashing, so padded and unpadded forms match", () => {
    expect(categoryColor("広報")).toEqual(categoryColor("  広報  "));
  });

  it("returns a hex that is one of the palette entries", () => {
    const result = categoryColor("物品準備");
    expect(result).not.toBeNull();
    expect(CATEGORY_PALETTE).toContain(result!.hex);
    expect(result!.dot).toBe(result!.hex);
  });

  it("returns a border and tint derived from the same hex (alpha-suffixed)", () => {
    const result = categoryColor("会計");
    expect(result).not.toBeNull();
    expect(result!.border.startsWith(result!.hex)).toBe(true);
    expect(result!.tint.startsWith(result!.hex)).toBe(true);
    expect(result!.border).not.toBe(result!.hex);
    expect(result!.tint).not.toBe(result!.hex);
  });

  it("distributes a set of distinct category names across more than one color", () => {
    const names = [
      "デザイン",
      "広報",
      "物品準備",
      "会計",
      "新歓",
      "渉外",
      "イベント運営",
      "備品管理",
      "SNS運用",
      "経理",
    ];
    const colors = new Set(names.map((n) => categoryColor(n)!.hex));
    expect(colors.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: テストを実行して失敗することを確認**

Run: `npx vitest run lib/tasks/taskCategoryColor.test.ts`
Expected: FAIL（`./taskCategoryColor`が存在しない）

- [ ] **Step 3: 実装を書く**

`lib/tasks/taskCategoryColor.ts`:

```ts
/**
 * タスクの種別（category）は自由入力のためDB上に色の定義を持たない。
 * 文字列から決定的に色を算出し、同じ種別は常に同じ色になるようにする。
 *
 * パレットは dataviz スキルの検証済みカテゴリカルパレット（8色・中間彩度、
 * ProofLoopの白地 #FFFFFF に対して validate_palette.js で再検証済み）をそのまま採用。
 * lib/design/tokens.ts の6色（ブランドの「印」としての意味を持つ）とは独立した、
 * 種別タグ専用のセット。ink・seal等の既存トークンの意味は変更しない。
 */
export const CATEGORY_PALETTE = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
] as const;

export type CategoryColor = {
  /** ドット・ボーダー原色として使う6桁hex */
  hex: string;
  /** ドット塗りつぶし色（hexと同じ） */
  dot: string;
  /** バッジの枠線色（hex + 約40%アルファ） */
  border: string;
  /** バッジの背景の淡い色（hex + 約8%アルファ） */
  tint: string;
};

/**
 * 文字列を32bit符号なし整数にハッシュする（FNV系の単純な乗算ハッシュ）。
 * 日本語を含む任意のJS文字列に対して決定的に動作する。
 */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function categoryColor(
  category: string | null | undefined
): CategoryColor | null {
  const trimmed = category?.trim();
  if (!trimmed) return null;

  const index = hashString(trimmed) % CATEGORY_PALETTE.length;
  const hex = CATEGORY_PALETTE[index];

  return {
    hex,
    dot: hex,
    border: `${hex}66`,
    tint: `${hex}14`,
  };
}
```

- [ ] **Step 4: テストを実行して通ることを確認**

Run: `npx vitest run lib/tasks/taskCategoryColor.test.ts`
Expected: PASS（7 tests）

- [ ] **Step 5: コミット**

```bash
git add lib/tasks/taskCategoryColor.ts lib/tasks/taskCategoryColor.test.ts
git commit -m "$(cat <<'EOF'
feat(clubtasks): 種別→色の決定的マッピング関数を追加

自由入力の種別(category)から、dataviz検証済みの8色カテゴリカル
パレットを使って決定的に色を割り当てる純粋関数。後続タスクで
カンバン・表・カレンダー・ガントの種別表示に使う。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 2: ビュー切替ボタンの並び替え・均等幅化・アイコン追加

**Files:**
- Modify: `app/(club)/clubtasks/page.tsx:9`（import追加）
- Modify: `app/(club)/clubtasks/page.tsx:145-147`（デフォルトビュー変更）
- Modify: `app/(club)/clubtasks/page.tsx:1025-1049`（切替ボタン本体）

**Interfaces:**
- Consumes: なし（既存の`view` state・`setView`のみ）

- [ ] **Step 1: lucide-reactのアイコンをimportに追加**

`app/(club)/clubtasks/page.tsx:9`を次のように変更する：

変更前：
```ts
import { Plus, CheckCircle2, X, Archive, Lock, Undo2 } from "lucide-react";
```

変更後：
```ts
import {
  Plus,
  CheckCircle2,
  X,
  Archive,
  Lock,
  Undo2,
  Table,
  Kanban,
  Calendar,
  ChartGantt,
} from "lucide-react";
```

- [ ] **Step 2: デフォルトビューを`table`に変更**

`app/(club)/clubtasks/page.tsx:145-147`を次のように変更する：

変更前：
```ts
  const [view, setView] = useState<"kanban" | "gantt" | "table" | "calendar">(
    "kanban"
  );
```

変更後：
```ts
  const [view, setView] = useState<"kanban" | "gantt" | "table" | "calendar">(
    "table"
  );
```

- [ ] **Step 3: 切替ボタンを並び替え・均等幅化・アイコン付きにする**

`app/(club)/clubtasks/page.tsx:1025-1049`（現状のボタン群全体）を次のように置き換える：

変更前：
```tsx
        <div className="inline-flex rounded-lg border border-rule overflow-hidden shrink-0 w-fit flex-wrap">
          {(
            [
              { id: "kanban", label: "カンバン" },
              { id: "table", label: "表" },
              { id: "calendar", label: "カレンダー" },
              { id: "gantt", label: "ガントチャート" },
            ] as const
          ).map((v, i) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={`px-3 py-1.5 text-sm font-medium ${
                i > 0 ? "border-l border-rule" : ""
              } ${
                view === v.id
                  ? "bg-ink text-paper"
                  : "bg-paper text-graphite hover:bg-mist"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
```

変更後：
```tsx
        <div className="overflow-x-auto shrink-0">
          <div className="inline-flex rounded-lg border border-rule overflow-hidden">
            {(
              [
                { id: "table", label: "表", icon: Table },
                { id: "kanban", label: "カンバン", icon: Kanban },
                { id: "calendar", label: "カレンダー", icon: Calendar },
                { id: "gantt", label: "ガントチャート", icon: ChartGantt },
              ] as const
            ).map((v, i) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  className={`flex items-center justify-center gap-1.5 w-[104px] shrink-0 px-2 py-1.5 text-sm font-medium whitespace-nowrap ${
                    i > 0 ? "border-l border-rule" : ""
                  } ${
                    view === v.id
                      ? "bg-ink text-paper"
                      : "bg-paper text-graphite hover:bg-mist"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
```

- [ ] **Step 4: 型チェックとテストを実行**

Run: `npx tsc --noEmit`
Expected: エラーなし

Run: `npm test`
Expected: 既存テストすべてPASS（このタスクはUIのみでロジック変更が無いため、新規テストは無い）

- [ ] **Step 5: コミット**

```bash
git add "app/(club)/clubtasks/page.tsx"
git commit -m "$(cat <<'EOF'
feat(clubtasks): ビュー切替ボタンを表を先頭に並び替え・均等幅化

表→カンバン→カレンダー→ガントの順に変更し、デフォルト表示も
表に変更。ラベルの文字数でボタン幅がバラついていた問題を、
固定幅+アイコン付きのセグメントコントロールで解消。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 3: タスク編集モーダルの入力欄パディング修正

**Files:**
- Modify: `app/(club)/clubtasks/page.tsx:1220-1228`（タイトル入力）
- Modify: `app/(club)/clubtasks/page.tsx:1329-1338`（種別入力）
- Modify: `app/(club)/clubtasks/page.tsx:1463-1470`（アーカイブ名入力）

**Interfaces:**
- Consumes: なし

- [ ] **Step 1: タイトル入力欄にパディングを追加**

変更前：
```tsx
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="タスクのタイトル"
                  required
                  disabled={saving || isViewingArchiveHistory}
                />
```

変更後：
```tsx
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="タスクのタイトル"
                  required
                  disabled={saving || isViewingArchiveHistory}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
                />
```

- [ ] **Step 2: 種別入力欄のclassNameを他の入力欄と揃える**

変更前：
```tsx
                  <Input
                    list="task-category-suggestions"
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                    placeholder="例：デザイン、広報、物品準備"
                    disabled={saving || isViewingArchiveHistory}
                    className="w-full"
                  />
```

変更後：
```tsx
                  <Input
                    list="task-category-suggestions"
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                    placeholder="例：デザイン、広報、物品準備"
                    disabled={saving || isViewingArchiveHistory}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
                  />
```

- [ ] **Step 3: アーカイブ名入力欄のclassNameを揃える**

変更前：
```tsx
                <Input
                  value={archiveLabelInput}
                  onChange={(e) => setArchiveLabelInput(e.target.value)}
                  placeholder="例：2026年度"
                  disabled={archiving}
                  maxLength={100}
                  className="w-full"
                />
```

変更後：
```tsx
                <Input
                  value={archiveLabelInput}
                  onChange={(e) => setArchiveLabelInput(e.target.value)}
                  placeholder="例：2026年度"
                  disabled={archiving}
                  maxLength={100}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
                />
```

- [ ] **Step 4: 型チェックを実行**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add "app/(club)/clubtasks/page.tsx"
git commit -m "$(cat <<'EOF'
fix(clubtasks): タイトル・種別・アーカイブ名の入力欄パディングを修正

Inputコンポーネント自体にデフォルトパディングが無いため、
classNameでの指定を忘れていたタイトル・種別・アーカイブ名の
3つの入力欄だけ文字の書き出し位置の余白がほぼゼロになっていた。
隣接するselectと同じpx-3 py-2 rounded-lgに揃える。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 4: カンバンカードのメタ情報を横並びチップ化＋種別バッジの色付け

**Files:**
- Modify: `app/(club)/clubtasks/TaskCardBody.tsx`（全体書き換え）

**Interfaces:**
- Consumes: `categoryColor`（Task 1で定義、`lib/tasks/taskCategoryColor.ts`からimport）

- [ ] **Step 1: `TaskCardBody.tsx`を全体書き換え**

`app/(club)/clubtasks/TaskCardBody.tsx`の全体を次の内容に置き換える：

```tsx
"use client";

import { CalendarDays, Eye, ListChecks, Repeat, User, type LucideIcon } from "lucide-react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import {
  checklistProgressLabel,
  formatDue,
  priorityBadgeClass,
  priorityLabel,
  recurrenceLabel,
} from "@/lib/tasks/taskFormatting";
import { categoryColor } from "@/lib/tasks/taskCategoryColor";

type Props = {
  task: TaskRow;
  status: TaskStatus;
  memberNameById: Record<string, string>;
  checklistCountByTaskId: Record<string, { done: number; total: number }>;
  onOpen: (task: TaskRow) => void;
};

type Chip = { key: string; icon: LucideIcon; label: string };

export default function TaskCardBody({
  task,
  status,
  memberNameById,
  checklistCountByTaskId,
  onOpen,
}: Props) {
  const checklistProgress = checklistCountByTaskId[task.id];
  const checklistLabel = checklistProgress
    ? checklistProgressLabel(checklistProgress.done, checklistProgress.total)
    : null;
  const recurrence = recurrenceLabel(task.recurrence_rule);
  const catColor = categoryColor(task.category);

  /**
   * 担当者・レビュー者・チェックリスト進捗・繰り返しは、タスクによって
   * 有無がバラつく「付随情報」。以前は各項目を縦に1行ずつ積んでいたため、
   * 情報量が多いタスクほどカードが縦に伸び、同じレーン内で高さが不揃いに
   * なっていた。横並びのチップにしてflex-wrapで折り返すことで、
   * 情報0件のタスクは何も描画されず、情報4件のタスクでも高さの増分を
   * 最小限に抑える。
   */
  const chips: Chip[] = [];
  if (task.assignee_id && memberNameById[task.assignee_id]) {
    chips.push({
      key: "assignee",
      icon: User,
      label: memberNameById[task.assignee_id],
    });
  }
  if (
    status === "in_review" &&
    task.reviewer_id &&
    memberNameById[task.reviewer_id]
  ) {
    chips.push({
      key: "reviewer",
      icon: Eye,
      label: memberNameById[task.reviewer_id],
    });
  }
  if (checklistLabel) {
    chips.push({ key: "checklist", icon: ListChecks, label: checklistLabel });
  }
  if (recurrence) {
    chips.push({ key: "recurrence", icon: Repeat, label: recurrence });
  }

  return (
    <button
      type="button"
      className="flex-1 min-w-0 p-3 text-left"
      onClick={() => onOpen(task)}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-medium text-ink text-sm leading-snug line-clamp-2">
          {task.title}
        </p>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded ${priorityBadgeClass(task.priority)}`}
        >
          {priorityLabel(task.priority)}
        </span>
      </div>
      {task.category && catColor && (
        <span
          className="inline-flex items-center gap-1 mb-1 text-[10px] font-medium px-1.5 py-0.5 rounded border text-graphite"
          style={{
            backgroundColor: catColor.tint,
            borderColor: catColor.border,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: catColor.dot }}
            aria-hidden="true"
          />
          {task.category}
        </span>
      )}
      <p className="text-xs text-graphite/70 flex items-center gap-1">
        <CalendarDays className="w-[14px] h-[14px]" aria-hidden="true" />
        {formatDue(task.due_date)}
      </p>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
          {chips.map((chip) => {
            const Icon = chip.icon;
            return (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 text-[10px] text-graphite/70"
              >
                <Icon className="w-[12px] h-[12px]" aria-hidden="true" />
                {chip.label}
              </span>
            );
          })}
        </div>
      )}
    </button>
  );
}
```

- [ ] **Step 2: 型チェックとテストを実行**

Run: `npx tsc --noEmit`
Expected: エラーなし

Run: `npm test`
Expected: 全テストPASS

- [ ] **Step 3: コミット**

```bash
git add "app/(club)/clubtasks/TaskCardBody.tsx"
git commit -m "$(cat <<'EOF'
feat(clubtasks): カンバンカードのメタ情報を横並びチップ化、種別バッジに色を付与

担当者・レビュー者・チェックリスト進捗・繰り返しを縦積みから
flex-wrapの横並びチップに変更し、情報量によるカード高さの
不揃いを緩和。種別バッジはcategoryColor()による色付きドット+
淡色背景に変更。冗長だったp-3 pr-4 pt-3もp-3に整理。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 5: カンバン「種別ごと」スイムレーン見出しの色付け

**Files:**
- Modify: `app/(club)/clubtasks/SwimlaneBoard.tsx`

**Interfaces:**
- Consumes: `categoryColor`（Task 1）

- [ ] **Step 1: importを追加**

`app/(club)/clubtasks/SwimlaneBoard.tsx`の先頭のimport群に追加する：

変更前：
```tsx
import {
  encodeSwimlaneDroppableId,
  groupTasksIntoSwimlanes,
  UNASSIGNED_SWIMLANE_KEY,
  type SwimlaneAxis,
} from "@/lib/tasks/taskSwimlanes";
import DraggableTaskCard from "./DraggableTaskCard";
```

変更後：
```tsx
import {
  encodeSwimlaneDroppableId,
  groupTasksIntoSwimlanes,
  UNASSIGNED_SWIMLANE_KEY,
  type SwimlaneAxis,
} from "@/lib/tasks/taskSwimlanes";
import { categoryColor } from "@/lib/tasks/taskCategoryColor";
import DraggableTaskCard from "./DraggableTaskCard";
```

- [ ] **Step 2: 行ヘッダーに色付きドット＋左ボーダーを追加**

`rows.map((row) => ( ... ))`の該当ブロックを次のように置き換える。

変更前：
```tsx
      {rows.map((row) => (
        <div
          key={row.key}
          className="rounded-xl border border-rule overflow-hidden"
        >
          <div className="px-4 py-2 bg-mist border-b border-rule">
            <h3 className="text-sm font-bold text-ink">
              {rowLabel(row.key, axis, memberNameById)}
            </h3>
          </div>
```

変更後：
```tsx
      {rows.map((row) => {
        const catColor =
          axis === "category" && row.key !== UNASSIGNED_SWIMLANE_KEY
            ? categoryColor(row.key)
            : null;
        return (
        <div
          key={row.key}
          className="rounded-xl border border-rule overflow-hidden"
        >
          <div
            className={`px-4 py-2 bg-mist border-b border-rule ${
              catColor ? "border-l-4" : ""
            }`}
            style={catColor ? { borderLeftColor: catColor.hex } : undefined}
          >
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              {catColor && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: catColor.hex }}
                  aria-hidden="true"
                />
              )}
              {rowLabel(row.key, axis, memberNameById)}
            </h3>
          </div>
```

- [ ] **Step 3: `.map`の閉じ括弧を`return`に対応させる**

同じブロックの最後、既存の閉じタグ

```tsx
          </div>
        </div>
      ))}
    </div>
  );
}
```

を次のように変更する（`return (`に対応する`);`と`})`を追加）：

```tsx
          </div>
        </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: 型チェックとテストを実行**

Run: `npx tsc --noEmit`
Expected: エラーなし（JSX内で`{`が正しく閉じているか特に注意して確認する）

Run: `npm test`
Expected: 全テストPASS

- [ ] **Step 5: コミット**

```bash
git add "app/(club)/clubtasks/SwimlaneBoard.tsx"
git commit -m "$(cat <<'EOF'
feat(clubtasks): 種別ごとスイムレーンの見出しに色付きドットを追加

「グルーピング：種別ごと」表示時、行見出しにcategoryColor()の
色でドット+左ボーダーを付与し、カンバンカードの種別バッジと
同じ色で視覚的に対応付ける。担当者ごと表示・種別未設定行は
対象外。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 6: 表(Table)ビューの種別列に色ドットを追加

**Files:**
- Modify: `app/(club)/clubtasks/TableView.tsx`

**Interfaces:**
- Consumes: `categoryColor`（Task 1）

- [ ] **Step 1: importを追加**

`app/(club)/clubtasks/TableView.tsx`の先頭に追加する：

変更前：
```tsx
import {
  formatDue,
  priorityBadgeClass,
  priorityLabel,
} from "@/lib/tasks/taskFormatting";
```

変更後：
```tsx
import {
  formatDue,
  priorityBadgeClass,
  priorityLabel,
} from "@/lib/tasks/taskFormatting";
import { categoryColor } from "@/lib/tasks/taskCategoryColor";
```

- [ ] **Step 2: 行のレンダリングを書き換え、種別セルにドットを追加**

`{sorted.map((task) => ( ... ))}`のブロック全体を次のように置き換える：

変更前：
```tsx
          {sorted.map((task) => (
            <tr
              key={task.id}
              className="border-b border-rule last:border-b-0 hover:bg-mist cursor-pointer"
              onClick={() => onOpen(task)}
            >
              <td className="px-3 py-2 text-ink font-medium">{task.title}</td>
              <td className="px-3 py-2 text-graphite">
                {laneTitleById[normalizeStatus(task.status)]}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${priorityBadgeClass(task.priority)}`}
                >
                  {priorityLabel(task.priority)}
                </span>
              </td>
              <td className="px-3 py-2 text-graphite">
                {task.assignee_id
                  ? memberNameById[task.assignee_id] ?? "（元メンバー）"
                  : "未定"}
              </td>
              <td className="px-3 py-2 text-graphite">{task.category || "—"}</td>
              <td className="px-3 py-2 text-graphite whitespace-nowrap">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="w-[14px] h-[14px]" aria-hidden="true" />
                  {formatDue(task.due_date)}
                </span>
              </td>
            </tr>
          ))}
```

変更後：
```tsx
          {sorted.map((task) => {
            const catColor = categoryColor(task.category);
            return (
              <tr
                key={task.id}
                className="border-b border-rule last:border-b-0 hover:bg-mist cursor-pointer"
                onClick={() => onOpen(task)}
              >
                <td className="px-3 py-2 text-ink font-medium">{task.title}</td>
                <td className="px-3 py-2 text-graphite">
                  {laneTitleById[normalizeStatus(task.status)]}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${priorityBadgeClass(task.priority)}`}
                  >
                    {priorityLabel(task.priority)}
                  </span>
                </td>
                <td className="px-3 py-2 text-graphite">
                  {task.assignee_id
                    ? memberNameById[task.assignee_id] ?? "（元メンバー）"
                    : "未定"}
                </td>
                <td className="px-3 py-2 text-graphite">
                  {task.category ? (
                    <span className="inline-flex items-center gap-1.5">
                      {catColor && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: catColor.hex }}
                          aria-hidden="true"
                        />
                      )}
                      {task.category}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-graphite whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="w-[14px] h-[14px]" aria-hidden="true" />
                    {formatDue(task.due_date)}
                  </span>
                </td>
              </tr>
            );
          })}
```

- [ ] **Step 3: 型チェックとテストを実行**

Run: `npx tsc --noEmit`
Expected: エラーなし

Run: `npm test`
Expected: 全テストPASS

- [ ] **Step 4: コミット**

```bash
git add "app/(club)/clubtasks/TableView.tsx"
git commit -m "$(cat <<'EOF'
feat(clubtasks): 表ビューの種別列に色ドットを追加

categoryColor()を使い、種別名の前に色付きドットを表示。
カンバンの種別バッジ・スイムレーン見出しと同じ色で対応付く。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 7: ガントチャートの行ラベルに色ドットを追加

**Files:**
- Modify: `app/(club)/clubtasks/GanttView.tsx`

**Interfaces:**
- Consumes: `categoryColor`（Task 1）

- [ ] **Step 1: importを追加**

`app/(club)/clubtasks/GanttView.tsx`の先頭に追加する：

変更前：
```tsx
import { useMemo } from "react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
```

変更後：
```tsx
import { useMemo } from "react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import { categoryColor } from "@/lib/tasks/taskCategoryColor";
```

- [ ] **Step 2: 行ラベルの種別表記にドットを追加**

`rows.map(({ task, start, due }) => { ... })`ブロック内を次のように変更する。

変更前：
```tsx
          {rows.map(({ task, start, due }) => {
            const status = normalizeStatus(task.status);
            const tint = laneTintById[status] ?? "#002B5C";
            const offset = diffDays(rangeStart, start);
            const span = Math.max(diffDays(start, due) + 1, 1);
            return (
              <div key={task.id} className="flex border-b border-rule last:border-b-0">
                <div
                  className="shrink-0 px-3 py-2 text-xs text-ink truncate"
                  style={{ width: LABEL_COL_WIDTH }}
                  title={task.title}
                >
                  {task.title}
                  {task.category && (
                    <span className="ml-1 text-[10px] text-graphite/60">
                      （{task.category}）
                    </span>
                  )}
                </div>
```

変更後：
```tsx
          {rows.map(({ task, start, due }) => {
            const status = normalizeStatus(task.status);
            const tint = laneTintById[status] ?? "#002B5C";
            const offset = diffDays(rangeStart, start);
            const span = Math.max(diffDays(start, due) + 1, 1);
            const catColor = categoryColor(task.category);
            return (
              <div key={task.id} className="flex border-b border-rule last:border-b-0">
                <div
                  className="shrink-0 px-3 py-2 text-xs text-ink truncate"
                  style={{ width: LABEL_COL_WIDTH }}
                  title={task.title}
                >
                  {task.title}
                  {task.category && (
                    <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-graphite/60">
                      {catColor && (
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: catColor.hex }}
                          aria-hidden="true"
                        />
                      )}
                      （{task.category}）
                    </span>
                  )}
                </div>
```

- [ ] **Step 3: 型チェックとテストを実行**

Run: `npx tsc --noEmit`
Expected: エラーなし

Run: `npm test`
Expected: 全テストPASS

- [ ] **Step 4: コミット**

```bash
git add "app/(club)/clubtasks/GanttView.tsx"
git commit -m "$(cat <<'EOF'
feat(clubtasks): ガントチャートの行ラベルに種別の色ドットを追加

他の3ビュー（カンバン・スイムレーン見出し・表）と同じ
categoryColor()を使い、行ラベルの種別表記にドットを追加して
一貫性を揃える。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LYeW7EgkCkVuPbY4ieWqKD
EOF
)"
```

---

### Task 8: 最終確認（ブラウザ実機・全体テスト）

**Files:** なし（確認のみ）

- [ ] **Step 1: 全テストとビルドを実行**

Run: `npm test`
Expected: 全テストPASS

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 2: 開発サーバーを起動し、`claude-in-chrome`または`playwright`で`/clubtasks`を実機確認する**

確認項目：
- ページを開いた瞬間に表ビューが表示されるか
- 4つの切替ボタンが均等幅でアイコン付きになっているか（375px幅でも横スクロールがページ全体に波及しないか）
- タスク編集モーダルのタイトル・種別・アーカイブ名の入力欄に、他の欄と同じ余白があるか
- カンバンで、担当者・チェックリスト・繰り返しの有無が異なる複数タスクのカード高さの差が縮まっているか
- 種別を設定したタスクが、カンバンのバッジ・「種別ごと」スイムレーン見出し・表のドット・ガントの行ラベルで**同じ色**になっているか
- 同じ種別名（例：「デザイン」）が複数箇所で常に同じ色で表示されるか

- [ ] **Step 3: 気づいた不具合があれば個別に修正しコミットする**

このタスク自体はコミット不要（確認のみ）。修正が発生した場合は、修正内容に応じたメッセージで別コミットにする。

---

## 実装後にやること（このプランのスコープ外・記録のみ）

- `components/ui/Input.tsx` / `Textarea.tsx`本体のパディング欠如を、`clubats`含む他18ファイルへどう波及させるか。`docs/task-board.md`に別タスクとして記録する
- 種別カラーパレットという6色トークンへの意図的な例外を、`docs/superpowers/specs/2026-07-23-ui-identity-design.md`または`CLAUDE.md`に追記する
