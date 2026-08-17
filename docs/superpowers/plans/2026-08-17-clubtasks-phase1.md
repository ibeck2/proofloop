# /clubtasks Phase 1（表・カレンダー・スイムレーン化）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/clubtasks`（`app/(club)/clubtasks/page.tsx`）に表型ビュー・カレンダービュー・カンバンのスイムレーン化（種別/担当者で行グルーピング）を追加する。スキーマ変更は行わない。

**Architecture:** 既存の`tasks`データはそのまま流用し、`view`ステートを`"kanban" | "gantt" | "table" | "calendar"`に拡張、`swimlaneAxis`ステート（`"flat" | "category" | "assignee"`）を新設する。カンバンカードの見た目（`TaskCardBody`）とドラッグ可能ラッパー（`DraggableTaskCard`）を共通コンポーネントに切り出し、既存の1列かんばんと新設のスイムレーングリッド（`SwimlaneBoard`）の両方から再利用する。グルーピング・ドロップ先ID変換・優先度表示等のロジックは`lib/tasks/`に純粋関数として切り出しテストする。

**Tech Stack:** Next.js 15（App Router）+ TypeScript + `@hello-pangea/dnd` + Supabase + Vitest

## Global Constraints

- スキーマ変更なし。既存`tasks`テーブルの列のみ使用（`category`・`assignee_id`・`status`・`due_date`等）。
- ロジックは`lib/`に純粋関数として切り出しテストする（CLAUDE.md §5）。UIコンポーネントに計算を埋め込まない。
- 既存の通知発火ロジック（`shouldNotifyReviewAssigned`・`shouldNotifyAssigneeChanged`）の呼び出し箇所・条件は変更しない。
- デザインは`lib/design/tokens.ts`の6色トークンのみ使用（ink/seal/paper/mist/rule/graphite）。新しい色を足さない。
- 開発サーバー（`npm run dev`）稼働中は`npm run build`を実行しない。型チェックは`npx tsc --noEmit`を使う。
- 各タスクの最後で`npm test`を実行し、既存201テスト＋新規テストがすべて通ることを確認してからコミットする。

---

## File Structure

**新規作成：**
- `lib/tasks/taskFormatting.ts` — 優先度ラベル/バッジクラス・期限表示のフォーマット（純粋関数）
- `lib/tasks/taskFormatting.test.ts`
- `lib/tasks/taskSwimlanes.ts` — スイムレーンのグルーピング・Droppable ID変換・行またぎ更新の解決（純粋関数）
- `lib/tasks/taskSwimlanes.test.ts`
- `app/(club)/clubtasks/TaskCardBody.tsx` — カード本体の表示（タイトル・優先度・種別・期限・担当者・レビュー者）
- `app/(club)/clubtasks/DraggableTaskCard.tsx` — ドラッグ可能なカードラッパー（枠線・ドラッグハンドル＋`TaskCardBody`）
- `app/(club)/clubtasks/TableView.tsx` — 表型ビュー
- `app/(club)/clubtasks/CalendarView.tsx` — カレンダービュー（月表示）
- `app/(club)/clubtasks/SwimlaneBoard.tsx` — スイムレーン化されたカンバン（行×既存5ステータス列のグリッド）

**変更：**
- `app/(club)/clubtasks/page.tsx` — フォーマット関数をlib importに置き換え、フラットかんばんを`DraggableTaskCard`使用に置き換え、`view`/`swimlaneAxis`ステート拡張、表示切替UI追加、`handleDragEnd`をスイムレーン対応に拡張

---

### Task 1: 優先度・期限フォーマットを`lib/tasks/taskFormatting.ts`に切り出す

**Files:**
- Create: `lib/tasks/taskFormatting.ts`
- Test: `lib/tasks/taskFormatting.test.ts`
- Modify: `app/(club)/clubtasks/page.tsx:42-72`（`PRIORITY_LABEL`・`PRIORITY_BADGE_CLASS`・`DEFAULT_PRIORITY_BADGE_CLASS`・`priorityBadgeClass`・`priorityLabel`の削除）、`app/(club)/clubtasks/page.tsx:518-527`（`formatDue`の削除）

**Interfaces:**
- Produces: `priorityLabel(priority: string | null | undefined): string`、`priorityBadgeClass(priority: string | null | undefined): string`、`formatDue(iso: string | null | undefined): string`（すべて`lib/tasks/taskFormatting.ts`からexport。Task 3以降の`TaskCardBody`・`TableView`・`CalendarView`が使用する）

- [ ] **Step 1: `lib/tasks/taskFormatting.ts`を作成**

```ts
/**
 * タスクの優先度表示・期限表示のフォーマット関数。
 * 優先度は装飾ではなく意味なので、色相ではなく紺の濃淡で表す
 * （全部同じ見た目にすると、かんばん上で高優先のタスクを一目で拾えなくなる）。
 */

const PRIORITY_LABEL: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const PRIORITY_BADGE_CLASS: Record<string, string> = {
  high: "border border-ink bg-ink text-paper",
  medium: "border border-rule bg-mist text-ink",
  low: "border border-rule bg-paper text-graphite",
};
const DEFAULT_PRIORITY_BADGE_CLASS = "border border-rule bg-paper text-graphite";

export function priorityBadgeClass(priority: string | null | undefined): string {
  return PRIORITY_BADGE_CLASS[priority ?? ""] ?? DEFAULT_PRIORITY_BADGE_CLASS;
}

export function priorityLabel(priority: string | null | undefined): string {
  return (priority && PRIORITY_LABEL[priority]) || "—";
}

export function formatDue(iso: string | null | undefined): string {
  if (!iso) return "期限なし";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
```

- [ ] **Step 2: `lib/tasks/taskFormatting.test.ts`を作成**

```ts
import { describe, expect, it } from "vitest";
import { formatDue, priorityBadgeClass, priorityLabel } from "./taskFormatting";

describe("priorityLabel", () => {
  it("labels known priorities in Japanese", () => {
    expect(priorityLabel("high")).toBe("高");
    expect(priorityLabel("medium")).toBe("中");
    expect(priorityLabel("low")).toBe("低");
  });

  it("falls back to an em dash for unknown or missing priority", () => {
    expect(priorityLabel(null)).toBe("—");
    expect(priorityLabel(undefined)).toBe("—");
    expect(priorityLabel("urgent")).toBe("—");
  });
});

describe("priorityBadgeClass", () => {
  it("returns a distinct class per known priority", () => {
    expect(priorityBadgeClass("high")).toContain("bg-ink");
    expect(priorityBadgeClass("medium")).toContain("bg-mist");
    expect(priorityBadgeClass("low")).toContain("bg-paper");
  });

  it("falls back to the default class for unknown priority", () => {
    expect(priorityBadgeClass("urgent")).toBe(
      "border border-rule bg-paper text-graphite"
    );
  });
});

describe("formatDue", () => {
  it("returns 期限なし for a missing date", () => {
    expect(formatDue(null)).toBe("期限なし");
    expect(formatDue(undefined)).toBe("期限なし");
  });

  it("returns an em dash for an unparseable date", () => {
    expect(formatDue("not-a-date")).toBe("—");
  });

  it("formats a valid ISO date in ja-JP long form", () => {
    expect(formatDue("2026-09-01")).toBe(
      new Date("2026-09-01").toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    );
  });
});
```

- [ ] **Step 3: テストを実行し、通ることを確認**

Run: `npm test -- taskFormatting`
Expected: PASS（新規9テストすべて成功）

- [ ] **Step 4: `page.tsx`から重複定義を削除**

`app/(club)/clubtasks/page.tsx`の以下を削除する（この時点ではまだTask 1以外の編集が入っていないため、行番号は元のファイルのままで正確）：
- 42〜72行目：`PRIORITY_LABEL`・`PRIORITY_BADGE_CLASS`・`DEFAULT_PRIORITY_BADGE_CLASS`定数、`priorityBadgeClass`関数、`priorityLabel`関数（`const PRIORITY_LABEL: Record<string, string> = {`から`priorityLabel`関数の閉じ`}`まで一式。`PRIORITY_OPTIONS`定数は削除しない。編集モーダルの`<select>`用に残す）
- 518〜527行目：`const formatDue = (iso: string | null | undefined) => { ... };`関数一式

この時点では`page.tsx`内にこれらを使っている箇所（かんばんカードのJSX）がまだ残っているため、一時的に型エラーが出る。Task 3・4でカードJSXを`TaskCardBody`/`DraggableTaskCard`に置き換えるまでは中間状態として許容する。

- [ ] **Step 5: コミット**

```bash
git add lib/tasks/taskFormatting.ts lib/tasks/taskFormatting.test.ts app/\(club\)/clubtasks/page.tsx
git commit -m "$(cat <<'EOF'
refactor(clubtasks): 優先度・期限のフォーマットをlib/tasks/taskFormatting.tsに切り出し

Phase 1（表/カレンダー/スイムレーン化）の下準備。TaskCardBody・TableView・
CalendarViewから共通で使うため、page.tsxのモジュール内関数をlibへ移動。
EOF
)"
```

---

### Task 2: スイムレーン用のグルーピングロジックを`lib/tasks/taskSwimlanes.ts`に実装

**Files:**
- Create: `lib/tasks/taskSwimlanes.ts`
- Test: `lib/tasks/taskSwimlanes.test.ts`

**Interfaces:**
- Consumes: `TaskRow`・`TaskStatus`（`@/lib/types/task`）
- Produces: `SwimlaneAxis`型、`UNASSIGNED_SWIMLANE_KEY`定数、`SwimlaneRow`型、`swimlaneRowKeyForTask(task, axis): string`、`groupTasksIntoSwimlanes(tasks, axis, statuses, normalizeStatus, sortTasks): SwimlaneRow[]`、`encodeSwimlaneDroppableId(rowKey, status): string`、`decodeSwimlaneDroppableId(id): { rowKey: string; status: TaskStatus } | null`、`resolveSwimlaneRowChange(axis, rowKey): Partial<Pick<TaskRow, "category" | "assignee_id">>`（Task 7で`page.tsx`の`handleDragEnd`と`SwimlaneBoard`が使用）

- [ ] **Step 1: 失敗するテストを書く（`lib/tasks/taskSwimlanes.test.ts`）**

```ts
import { describe, expect, it } from "vitest";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import {
  UNASSIGNED_SWIMLANE_KEY,
  decodeSwimlaneDroppableId,
  encodeSwimlaneDroppableId,
  groupTasksIntoSwimlanes,
  resolveSwimlaneRowChange,
  swimlaneRowKeyForTask,
} from "./taskSwimlanes";

const STATUSES: TaskStatus[] = [
  "todo",
  "in_progress",
  "in_review",
  "on_hold",
  "done",
];

function normalizeStatus(s: string | null | undefined): TaskStatus {
  return (s as TaskStatus) || "todo";
}

function sortByTitle(a: TaskRow, b: TaskRow): number {
  return a.title.localeCompare(b.title);
}

function makeTask(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: "task-1",
    organization_id: "org-1",
    title: "task",
    description: null,
    status: "todo",
    priority: null,
    assignee_id: null,
    reviewer_id: null,
    created_by: null,
    category: null,
    due_date: null,
    ...overrides,
  };
}

describe("swimlaneRowKeyForTask", () => {
  it("uses the trimmed category for the category axis", () => {
    expect(
      swimlaneRowKeyForTask(makeTask({ category: " 広報 " }), "category")
    ).toBe("広報");
  });

  it("falls back to the unassigned key when category is empty", () => {
    expect(
      swimlaneRowKeyForTask(makeTask({ category: null }), "category")
    ).toBe(UNASSIGNED_SWIMLANE_KEY);
    expect(
      swimlaneRowKeyForTask(makeTask({ category: "  " }), "category")
    ).toBe(UNASSIGNED_SWIMLANE_KEY);
  });

  it("uses assignee_id for the assignee axis", () => {
    expect(
      swimlaneRowKeyForTask(makeTask({ assignee_id: "user-a" }), "assignee")
    ).toBe("user-a");
  });

  it("falls back to the unassigned key when assignee_id is null", () => {
    expect(
      swimlaneRowKeyForTask(makeTask({ assignee_id: null }), "assignee")
    ).toBe(UNASSIGNED_SWIMLANE_KEY);
  });
});

describe("groupTasksIntoSwimlanes", () => {
  it("groups tasks by category into rows, one column per status", () => {
    const tasks = [
      makeTask({ id: "1", title: "A", category: "広報", status: "todo" }),
      makeTask({ id: "2", title: "B", category: "広報", status: "done" }),
      makeTask({ id: "3", title: "C", category: "会計", status: "todo" }),
    ];
    const rows = groupTasksIntoSwimlanes(
      tasks,
      "category",
      STATUSES,
      normalizeStatus,
      sortByTitle
    );
    expect(rows.map((r) => r.key)).toEqual(["会計", "広報"]);
    expect(rows[1].tasksByStatus.todo.map((t) => t.id)).toEqual(["1"]);
    expect(rows[1].tasksByStatus.done.map((t) => t.id)).toEqual(["2"]);
    expect(rows[1].tasksByStatus.in_progress).toEqual([]);
  });

  it("puts tasks without a category into the unassigned row, sorted last", () => {
    const tasks = [
      makeTask({ id: "1", title: "A", category: null }),
      makeTask({ id: "2", title: "B", category: "会計" }),
    ];
    const rows = groupTasksIntoSwimlanes(
      tasks,
      "category",
      STATUSES,
      normalizeStatus,
      sortByTitle
    );
    expect(rows.map((r) => r.key)).toEqual(["会計", UNASSIGNED_SWIMLANE_KEY]);
  });

  it("groups tasks by assignee_id", () => {
    const tasks = [
      makeTask({ id: "1", title: "A", assignee_id: "user-b" }),
      makeTask({ id: "2", title: "B", assignee_id: "user-a" }),
      makeTask({ id: "3", title: "C", assignee_id: null }),
    ];
    const rows = groupTasksIntoSwimlanes(
      tasks,
      "assignee",
      STATUSES,
      normalizeStatus,
      sortByTitle
    );
    expect(rows.map((r) => r.key)).toEqual([
      "user-a",
      "user-b",
      UNASSIGNED_SWIMLANE_KEY,
    ]);
  });

  it("sorts tasks within each cell using the given comparator", () => {
    const tasks = [
      makeTask({ id: "1", title: "Z", category: "会計", status: "todo" }),
      makeTask({ id: "2", title: "A", category: "会計", status: "todo" }),
    ];
    const rows = groupTasksIntoSwimlanes(
      tasks,
      "category",
      STATUSES,
      normalizeStatus,
      sortByTitle
    );
    expect(rows[0].tasksByStatus.todo.map((t) => t.id)).toEqual(["2", "1"]);
  });
});

describe("encodeSwimlaneDroppableId / decodeSwimlaneDroppableId", () => {
  it("round-trips a simple row key", () => {
    const id = encodeSwimlaneDroppableId("会計", "in_progress");
    expect(decodeSwimlaneDroppableId(id)).toEqual({
      rowKey: "会計",
      status: "in_progress",
    });
  });

  it("round-trips a row key that itself contains '::'", () => {
    const id = encodeSwimlaneDroppableId("A::B", "done");
    expect(decodeSwimlaneDroppableId(id)).toEqual({
      rowKey: "A::B",
      status: "done",
    });
  });

  it("returns null for a flat-view droppable id (no swimlane prefix)", () => {
    expect(decodeSwimlaneDroppableId("todo")).toBeNull();
  });
});

describe("resolveSwimlaneRowChange", () => {
  it("maps a category row key to a category update", () => {
    expect(resolveSwimlaneRowChange("category", "広報")).toEqual({
      category: "広報",
    });
  });

  it("maps the unassigned row to null for category", () => {
    expect(
      resolveSwimlaneRowChange("category", UNASSIGNED_SWIMLANE_KEY)
    ).toEqual({ category: null });
  });

  it("maps an assignee row key to an assignee_id update", () => {
    expect(resolveSwimlaneRowChange("assignee", "user-a")).toEqual({
      assignee_id: "user-a",
    });
  });

  it("maps the unassigned row to null for assignee_id", () => {
    expect(
      resolveSwimlaneRowChange("assignee", UNASSIGNED_SWIMLANE_KEY)
    ).toEqual({ assignee_id: null });
  });
});
```

- [ ] **Step 2: テストを実行し、失敗することを確認**

Run: `npm test -- taskSwimlanes`
Expected: FAIL（`./taskSwimlanes`が存在しない）

- [ ] **Step 3: `lib/tasks/taskSwimlanes.ts`を実装**

```ts
import type { TaskRow, TaskStatus } from "@/lib/types/task";

/**
 * かんばんを行方向にグルーピングする軸。"flat"（従来の単一行表示）は
 * 呼び出し側で分岐するため、この型には含めない。
 */
export type SwimlaneAxis = "category" | "assignee";

/** グルーピングキーが空（種別未設定・担当者未定）のタスクをまとめる行のキー */
export const UNASSIGNED_SWIMLANE_KEY = "__unassigned__";

export interface SwimlaneRow {
  key: string;
  tasksByStatus: Record<TaskStatus, TaskRow[]>;
}

export function swimlaneRowKeyForTask(
  task: TaskRow,
  axis: SwimlaneAxis
): string {
  if (axis === "category") {
    const v = task.category?.trim();
    return v || UNASSIGNED_SWIMLANE_KEY;
  }
  return task.assignee_id || UNASSIGNED_SWIMLANE_KEY;
}

/**
 * タスク配列を行(種別/担当者)×列(既存ステータス)のグリッド構造に変換する。
 * 行の並び順はキーの文字列昇順（ja ロケール）。未分類/未定の行は常に最後に固定する
 * （アンダースコアの位置がロケール依存でぶれるのを避けるため、比較の前に判定する）。
 */
export function groupTasksIntoSwimlanes(
  tasks: TaskRow[],
  axis: SwimlaneAxis,
  statuses: TaskStatus[],
  normalizeStatus: (s: string | null | undefined) => TaskStatus,
  sortTasks: (a: TaskRow, b: TaskRow) => number
): SwimlaneRow[] {
  const byKey = new Map<string, TaskRow[]>();
  for (const task of tasks) {
    const key = swimlaneRowKeyForTask(task, axis);
    const list = byKey.get(key);
    if (list) {
      list.push(task);
    } else {
      byKey.set(key, [task]);
    }
  }

  const keys = Array.from(byKey.keys()).sort((a, b) => {
    if (a === UNASSIGNED_SWIMLANE_KEY) return 1;
    if (b === UNASSIGNED_SWIMLANE_KEY) return -1;
    return a.localeCompare(b, "ja");
  });

  return keys.map((key) => {
    const rowTasks = byKey.get(key)!;
    const tasksByStatus = {} as Record<TaskStatus, TaskRow[]>;
    for (const status of statuses) {
      tasksByStatus[status] = rowTasks
        .filter((t) => normalizeStatus(t.status) === status)
        .sort(sortTasks);
    }
    return { key, tasksByStatus };
  });
}

/** スイムレーン内の各セルを一意に識別するDroppable ID */
export function encodeSwimlaneDroppableId(
  rowKey: string,
  status: TaskStatus
): string {
  return `swimlane::${rowKey}::${status}`;
}

export interface DecodedSwimlaneDroppableId {
  rowKey: string;
  status: TaskStatus;
}

/**
 * encodeSwimlaneDroppableId の逆変換。フラット表示のDroppable ID
 * （ステータスそのものの文字列）が来た場合は null を返す。
 * status は列挙値（"::"を含まない）なので末尾から分割すれば
 * rowKey 自体に "::" が含まれていても正しく復元できる。
 */
export function decodeSwimlaneDroppableId(
  id: string
): DecodedSwimlaneDroppableId | null {
  if (!id.startsWith("swimlane::")) return null;
  const rest = id.slice("swimlane::".length);
  const sepIndex = rest.lastIndexOf("::");
  if (sepIndex === -1) return null;
  return {
    rowKey: rest.slice(0, sepIndex),
    status: rest.slice(sepIndex + 2) as TaskStatus,
  };
}

/**
 * カードを別の行にドラッグした時、グルーピング軸のフィールドをどう更新するかを決める。
 * UNASSIGNED_SWIMLANE_KEY への移動は「種別を空にする」「担当者を未定にする」を意味する。
 */
export function resolveSwimlaneRowChange(
  axis: SwimlaneAxis,
  rowKey: string
): Partial<Pick<TaskRow, "category" | "assignee_id">> {
  const value = rowKey === UNASSIGNED_SWIMLANE_KEY ? null : rowKey;
  return axis === "category" ? { category: value } : { assignee_id: value };
}
```

- [ ] **Step 4: テストを実行し、通ることを確認**

Run: `npm test -- taskSwimlanes`
Expected: PASS（新規17テストすべて成功）

- [ ] **Step 5: 全テストを実行**

Run: `npm test`
Expected: PASS（既存201テスト＋今回追加分すべて成功）

- [ ] **Step 6: コミット**

```bash
git add lib/tasks/taskSwimlanes.ts lib/tasks/taskSwimlanes.test.ts
git commit -m "$(cat <<'EOF'
feat(clubtasks): スイムレーン用のグルーピング・ID変換ロジックを追加

種別/担当者で行グルーピングする際の、タスク配列→行×列グリッド変換、
Droppable ID のエンコード/デコード、行またぎドラッグ時のフィールド
更新先決定を純粋関数として実装。UIへの配線はTask 7で行う。
EOF
)"
```

---

### Task 3: `TaskCardBody`（カード本体）を切り出す

**Files:**
- Create: `app/(club)/clubtasks/TaskCardBody.tsx`

**Interfaces:**
- Consumes: `priorityLabel`・`priorityBadgeClass`・`formatDue`（Task 1で作成した`@/lib/tasks/taskFormatting`）
- Produces: `TaskCardBody`（デフォルトexport）。Props：`{ task: TaskRow; status: TaskStatus; memberNameById: Record<string, string>; onOpen: (task: TaskRow) => void }`（Task 4の`DraggableTaskCard`が使用）

- [ ] **Step 1: `app/(club)/clubtasks/TaskCardBody.tsx`を作成**

```tsx
"use client";

import { CalendarDays, Eye, User } from "lucide-react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import {
  formatDue,
  priorityBadgeClass,
  priorityLabel,
} from "@/lib/tasks/taskFormatting";

type Props = {
  task: TaskRow;
  status: TaskStatus;
  memberNameById: Record<string, string>;
  onOpen: (task: TaskRow) => void;
};

export default function TaskCardBody({
  task,
  status,
  memberNameById,
  onOpen,
}: Props) {
  return (
    <button
      type="button"
      className="flex-1 min-w-0 p-3 pr-4 pt-3 text-left"
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
      {task.category && (
        <span className="inline-block mb-1 text-[10px] font-medium px-1.5 py-0.5 rounded border border-rule text-graphite/70">
          {task.category}
        </span>
      )}
      <p className="text-xs text-graphite/70 flex items-center gap-1">
        <CalendarDays className="w-[14px] h-[14px]" aria-hidden="true" />
        {formatDue(task.due_date)}
      </p>
      {task.assignee_id && memberNameById[task.assignee_id] && (
        <p className="text-xs text-graphite/70 flex items-center gap-1 mt-0.5">
          <User className="w-[14px] h-[14px]" aria-hidden="true" />
          {memberNameById[task.assignee_id]}
        </p>
      )}
      {status === "in_review" &&
        task.reviewer_id &&
        memberNameById[task.reviewer_id] && (
          <p className="text-xs text-graphite/70 flex items-center gap-1 mt-0.5">
            <Eye className="w-[14px] h-[14px]" aria-hidden="true" />
            {memberNameById[task.reviewer_id]}
          </p>
        )}
    </button>
  );
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: `TaskCardBody.tsx`自体にエラーが出ない（`page.tsx`側は Task 1 で作った中間状態のため、この時点ではまだ既存のエラーが残っていてよい。Task 4で解消する）

- [ ] **Step 3: コミット**

```bash
git add app/\(club\)/clubtasks/TaskCardBody.tsx
git commit -m "$(cat <<'EOF'
feat(clubtasks): カード本体表示をTaskCardBodyコンポーネントに切り出し

page.tsxのかんばんカードJSXから抽出。Task 4でフラットかんばんに配線し、
Phase 1で新設するSwimlaneBoardからも再利用する。
EOF
)"
```

---

### Task 4: `DraggableTaskCard`を作成し、フラットかんばんを置き換える

**Files:**
- Create: `app/(club)/clubtasks/DraggableTaskCard.tsx`
- Modify: `app/(club)/clubtasks/page.tsx:667-735`（かんばんカードのDraggable JSXを`DraggableTaskCard`呼び出しに置き換え）

**Interfaces:**
- Consumes: `TaskCardBody`（Task 3）
- Produces: `DraggableTaskCard`（デフォルトexport）。Props：`{ task: TaskRow; index: number; status: TaskStatus; isDone: boolean; tint: string | null; memberNameById: Record<string, string>; onOpen: (task: TaskRow) => void }`（page.tsxのフラットかんばんとTask 7の`SwimlaneBoard`が使用）

- [ ] **Step 1: `app/(club)/clubtasks/DraggableTaskCard.tsx`を作成**

```tsx
"use client";

import { Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import TaskCardBody from "./TaskCardBody";

type Props = {
  task: TaskRow;
  index: number;
  status: TaskStatus;
  isDone: boolean;
  tint: string | null;
  memberNameById: Record<string, string>;
  onOpen: (task: TaskRow) => void;
};

export default function DraggableTaskCard({
  task,
  index,
  status,
  isDone,
  tint,
  memberNameById,
  onOpen,
}: Props) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(draggableProvided, snapshot) => (
        <div
          ref={draggableProvided.innerRef}
          {...draggableProvided.draggableProps}
          className={`rounded-lg border border-rule border-l-4 bg-paper transition-shadow flex ${
            isDone ? "border-l-ink" : ""
          } ${
            snapshot.isDragging
              ? "shadow-xl opacity-95 scale-[1.02] ring-2 ring-ink/30 z-50"
              : "shadow-sm hover:shadow-md"
          }`}
          style={!isDone && tint ? { borderLeftColor: tint } : undefined}
        >
          <div
            {...draggableProvided.dragHandleProps}
            className="flex-shrink-0 p-2 self-start cursor-grab active:cursor-grabbing text-graphite/70 hover:text-graphite touch-none"
            onClick={(e) => e.stopPropagation()}
            aria-label="ドラッグして移動"
          >
            <GripVertical className="w-5 h-5" aria-hidden="true" />
          </div>
          <TaskCardBody
            task={task}
            status={status}
            memberNameById={memberNameById}
            onOpen={onOpen}
          />
        </div>
      )}
    </Draggable>
  );
}
```

- [ ] **Step 2: `page.tsx`のフラットかんばんカードJSXを置き換え**

`app/(club)/clubtasks/page.tsx`内で、フラットかんばんのレーン描画にある次のブロック（`{items.map((task, index) => (`から、対応する`</Draggable>\n                        ))}\n                        {provided.placeholder}`まで。Task 1時点では元のファイルの667〜735行目付近だが、Task 1の削除で行番号がずれているため、行番号ではなくこのブロックの内容自体（`<Draggable`〜`</Draggable>`の一式）を目印に探すこと）を、次のコードで置き換える：

```tsx
                        {items.map((task, index) => (
                          <DraggableTaskCard
                            key={task.id}
                            task={task}
                            index={index}
                            status={lane.id}
                            isDone={isDone}
                            tint={tint}
                            memberNameById={memberNameById}
                            onOpen={openEditModal}
                          />
                        ))}
                        {provided.placeholder}
```

ファイル冒頭のimportに以下を追加する（`import GanttView from "./GanttView";`の直後）：

```tsx
import DraggableTaskCard from "./DraggableTaskCard";
```

`GripVertical`は`DraggableTaskCard`内に移動したため、`page.tsx`冒頭のlucide-reactインポートから`GripVertical`・`CalendarDays`・`User`・`Eye`を削除してよいか確認する：`CalendarDays`はガントの凡例等では使っていないため削除可能、`User`・`Eye`も同様。`Plus`・`CheckCircle2`・`X`はモーダルやレーン見出しでまだ使うため残す。最終的なimport文：

```tsx
import { Plus, CheckCircle2, X } from "lucide-react";
```

- [ ] **Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし（Task 1で発生していた中間状態のエラーがここで解消する）

- [ ] **Step 4: 全テスト実行**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: ブラウザで手動確認**

`npm run dev`を起動し、`/clubtasks`を開く。以下を確認する：
- カンバンの見た目・カード内容（タイトル・優先度バッジ・種別・期限・担当者・レビュー者アイコン）がリファクタ前と変わっていない
- カードのドラッグ&ドロップでステータス変更・レーン内並び替えが従来通り動く
- カードクリックで編集モーダルが開く

確認後、開発サーバーを停止する（Ctrl+C）。

- [ ] **Step 6: コミット**

```bash
git add app/\(club\)/clubtasks/DraggableTaskCard.tsx app/\(club\)/clubtasks/page.tsx
git commit -m "$(cat <<'EOF'
refactor(clubtasks): フラットかんばんのカードをDraggableTaskCardに置き換え

TaskCardBody + ドラッグラッパーを共通コンポーネント化。Task 7で追加する
SwimlaneBoardからも同じコンポーネントを再利用し、カードJSXの重複を避ける。
EOF
)"
```

---

### Task 5: 表型ビュー（`TableView`）を追加

**Files:**
- Create: `app/(club)/clubtasks/TableView.tsx`
- Modify: `app/(club)/clubtasks/page.tsx`（`view`型の拡張、ビュー切替ボタン追加、`TableView`の描画配線）

**Interfaces:**
- Consumes: `priorityLabel`・`priorityBadgeClass`・`formatDue`（`@/lib/tasks/taskFormatting`）
- Produces: `TableView`（デフォルトexport）。Props：`{ tasks: TaskRow[]; laneTitleById: Record<TaskStatus, string>; memberNameById: Record<string, string>; normalizeStatus: (s: string | null | undefined) => TaskStatus; onOpen: (task: TaskRow) => void }`

- [ ] **Step 1: `app/(club)/clubtasks/TableView.tsx`を作成**

```tsx
"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import {
  formatDue,
  priorityBadgeClass,
  priorityLabel,
} from "@/lib/tasks/taskFormatting";

type SortKey =
  | "title"
  | "status"
  | "priority"
  | "assignee"
  | "category"
  | "due_date";

type Props = {
  tasks: TaskRow[];
  laneTitleById: Record<TaskStatus, string>;
  memberNameById: Record<string, string>;
  normalizeStatus: (s: string | null | undefined) => TaskStatus;
  onOpen: (task: TaskRow) => void;
};

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "title", label: "タイトル" },
  { key: "status", label: "ステータス" },
  { key: "priority", label: "優先度" },
  { key: "assignee", label: "担当者" },
  { key: "category", label: "種別" },
  { key: "due_date", label: "期限" },
];

function compareBy(
  key: SortKey,
  laneTitleById: Record<TaskStatus, string>,
  memberNameById: Record<string, string>,
  normalizeStatus: (s: string | null | undefined) => TaskStatus
) {
  return (a: TaskRow, b: TaskRow): number => {
    switch (key) {
      case "title":
        return a.title.localeCompare(b.title, "ja");
      case "status":
        return laneTitleById[normalizeStatus(a.status)].localeCompare(
          laneTitleById[normalizeStatus(b.status)],
          "ja"
        );
      case "priority": {
        const ra = PRIORITY_RANK[a.priority ?? ""] ?? 99;
        const rb = PRIORITY_RANK[b.priority ?? ""] ?? 99;
        return ra - rb;
      }
      case "assignee": {
        const na = (a.assignee_id && memberNameById[a.assignee_id]) || "";
        const nb = (b.assignee_id && memberNameById[b.assignee_id]) || "";
        return na.localeCompare(nb, "ja");
      }
      case "category":
        return (a.category ?? "").localeCompare(b.category ?? "", "ja");
      case "due_date": {
        const da = a.due_date
          ? new Date(a.due_date).getTime()
          : Number.POSITIVE_INFINITY;
        const db = b.due_date
          ? new Date(b.due_date).getTime()
          : Number.POSITIVE_INFINITY;
        return da - db;
      }
    }
  };
}

export default function TableView({
  tasks,
  laneTitleById,
  memberNameById,
  normalizeStatus,
  onOpen,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const sorted = useMemo(() => {
    const cmp = compareBy(sortKey, laneTitleById, memberNameById, normalizeStatus);
    return [...tasks].sort((a, b) => sortDir * cmp(a, b));
  }, [tasks, sortKey, sortDir, laneTitleById, memberNameById, normalizeStatus]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-rule bg-mist p-6 text-center text-sm text-graphite/70">
        表示できるタスクがありません。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-rule bg-paper">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-mist border-b border-rule">
            {COLUMNS.map((col) => (
              <th key={col.key} className="text-left px-3 py-2 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort(col.key)}
                  className="font-bold text-ink hover:underline"
                >
                  {col.label}
                  {sortKey === col.key ? (sortDir === 1 ? " ▲" : " ▼") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
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
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: `page.tsx`の`view`型を拡張し、ビュー切替ボタンを追加**

`app/(club)/clubtasks/page.tsx`内の`const [view, setView] = useState<"kanban" | "gantt">("kanban");`という行（この文字列で一意に検索できる）を次に置き換える：

```tsx
  const [view, setView] = useState<"kanban" | "gantt" | "table" | "calendar">(
    "kanban"
  );
```

ファイル冒頭のimportに追加：

```tsx
import TableView from "./TableView";
```

ビュー切替ボタン群（「カンバン」「ガントチャート」の2ボタンが入っている`<div className="inline-flex rounded-lg border border-rule overflow-hidden shrink-0 w-fit">`のブロック。元のファイルの597〜616行目付近だが、Task 1・4の編集で行番号がずれているため、このclassName文字列を目印に探すこと）を次に置き換える：

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

- [ ] **Step 3: `TableView`の描画を配線**

`app/(club)/clubtasks/page.tsx`内の`{view === "gantt" ? (`という行（この文字列で一意に検索できる。`<GanttView`呼び出しの直前にある分岐の開始行）を次に置き換える（`view === "table"`の分岐を追加）：

```tsx
      {view === "gantt" ? (
        <GanttView
          tasks={visibleTasks}
          laneTitleById={LANE_TITLE_BY_ID}
          laneTintById={STATUS_TINT}
          normalizeStatus={normalizeStatus}
        />
      ) : view === "table" ? (
        <TableView
          tasks={visibleTasks}
          laneTitleById={LANE_TITLE_BY_ID}
          memberNameById={memberNameById}
          normalizeStatus={normalizeStatus}
          onOpen={openEditModal}
        />
      ) : (
```

（元の`) : (`はそのまま残し、既存のカンバン分岐に繋げる。calendar分岐はTask 6で追加する）

- [ ] **Step 4: 型チェック・全テスト実行**

Run: `npx tsc --noEmit && npm test`
Expected: 両方PASS

- [ ] **Step 5: ブラウザで手動確認**

`npm run dev`で`/clubtasks`を開き、「表」ボタンをクリック。列ヘッダクリックでソート順・矢印表示が切り替わること、行クリックで編集モーダルが開くことを確認。確認後サーバーを停止。

- [ ] **Step 6: コミット**

```bash
git add app/\(club\)/clubtasks/TableView.tsx app/\(club\)/clubtasks/page.tsx
git commit -m "feat(clubtasks): 表型ビューを追加"
```

---

### Task 6: カレンダービュー（`CalendarView`）を追加

**Files:**
- Create: `app/(club)/clubtasks/CalendarView.tsx`
- Modify: `app/(club)/clubtasks/page.tsx`（`view === "calendar"`分岐の追加）

**Interfaces:**
- Consumes: `priorityBadgeClass`（`@/lib/tasks/taskFormatting`）
- Produces: `CalendarView`（デフォルトexport）。Props：`{ tasks: TaskRow[]; onOpen: (task: TaskRow) => void }`

- [ ] **Step 1: `app/(club)/clubtasks/CalendarView.tsx`を作成**

```tsx
"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TaskRow } from "@/lib/types/task";
import { priorityBadgeClass } from "@/lib/tasks/taskFormatting";

type Props = {
  tasks: TaskRow[];
  onOpen: (task: TaskRow) => void;
};

function toDateOnly(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export default function CalendarView({ tasks, onOpen }: Props) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const key = dateKey(toDateOnly(t.due_date));
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    return map;
  }, [tasks]);

  const hiddenCount = tasks.filter((t) => !t.due_date).length;

  const weeks = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const gridStart = new Date(year, month, 1 - startOffset);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(
        new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
      );
    }
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });
  const todayKey = dateKey(toDateOnly(new Date().toISOString()));

  return (
    <div className="rounded-xl border border-rule bg-paper overflow-hidden">
      {hiddenCount > 0 && (
        <p className="px-4 py-2 text-xs text-graphite/70 border-b border-rule bg-mist">
          期限未設定のタスク{hiddenCount}件は表示していません。
        </p>
      )}
      <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
        <button
          type="button"
          onClick={() =>
            setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
          }
          className="p-1.5 rounded-lg text-graphite hover:bg-mist"
          aria-label="前の月"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <h3 className="font-bold text-ink font-numeric">{monthLabel}</h3>
        <button
          type="button"
          onClick={() =>
            setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
          }
          className="p-1.5 rounded-lg text-graphite hover:bg-mist"
          aria-label="次の月"
        >
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-7 border-b border-rule bg-mist">
        {WEEKDAY_LABELS.map((w) => (
          <div
            key={w}
            className="px-2 py-1.5 text-center text-xs font-bold text-graphite/70"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const key = dateKey(day);
          const dayTasks = tasksByDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={`min-h-[92px] border-b border-r border-rule p-1.5 ${
                inMonth ? "bg-paper" : "bg-mist/50"
              }`}
            >
              <p
                className={`text-xs font-numeric mb-1 ${
                  isToday
                    ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-ink text-paper"
                    : inMonth
                      ? "text-graphite"
                      : "text-graphite/40"
                }`}
              >
                {day.getDate()}
              </p>
              <div className="space-y-1">
                {dayTasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onOpen(t)}
                    className={`w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate ${priorityBadgeClass(t.priority)}`}
                    title={t.title}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `page.tsx`に`calendar`分岐を追加**

Task 5で追加した`) : view === "table" ? ( ... ) : (`の直前に、以下を挿入する：

```tsx
      ) : view === "calendar" ? (
        <CalendarView tasks={visibleTasks} onOpen={openEditModal} />
```

ファイル冒頭のimportに追加：

```tsx
import CalendarView from "./CalendarView";
```

- [ ] **Step 3: 型チェック・全テスト実行**

Run: `npx tsc --noEmit && npm test`
Expected: 両方PASS

- [ ] **Step 4: ブラウザで手動確認**

`npm run dev`で`/clubtasks`を開き、「カレンダー」ボタンをクリック。前月/次月ボタンで月が切り替わること、期限日のマスにタスクが表示され、今日のマスが強調されること、タスククリックで編集モーダルが開くことを確認。確認後サーバーを停止。

- [ ] **Step 5: コミット**

```bash
git add app/\(club\)/clubtasks/CalendarView.tsx app/\(club\)/clubtasks/page.tsx
git commit -m "feat(clubtasks): カレンダービューを追加"
```

---

### Task 7: スイムレーン化（`SwimlaneBoard`）を追加し、`handleDragEnd`を対応させる

**Files:**
- Create: `app/(club)/clubtasks/SwimlaneBoard.tsx`
- Modify: `app/(club)/clubtasks/page.tsx`（`swimlaneAxis`ステート追加、グルーピング切替UI追加、かんばん描画の分岐、`handleDragEnd`の拡張）

**Interfaces:**
- Consumes: `SwimlaneAxis`・`groupTasksIntoSwimlanes`・`swimlaneRowKeyForTask`・`encodeSwimlaneDroppableId`・`decodeSwimlaneDroppableId`・`resolveSwimlaneRowChange`（Task 2の`@/lib/tasks/taskSwimlanes`）、`DraggableTaskCard`（Task 4）
- Produces: `SwimlaneBoard`（デフォルトexport）

- [ ] **Step 1: `app/(club)/clubtasks/SwimlaneBoard.tsx`を作成**

```tsx
"use client";

import { Droppable } from "@hello-pangea/dnd";
import { CheckCircle2 } from "lucide-react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import {
  encodeSwimlaneDroppableId,
  groupTasksIntoSwimlanes,
  type SwimlaneAxis,
} from "@/lib/tasks/taskSwimlanes";
import DraggableTaskCard from "./DraggableTaskCard";

type LaneMeta = { id: TaskStatus; title: string };

type Props = {
  tasks: TaskRow[];
  axis: SwimlaneAxis;
  lanes: LaneMeta[];
  laneTintById: Record<TaskStatus, string | null>;
  whiteTextLanes: TaskStatus[];
  normalizeStatus: (s: string | null | undefined) => TaskStatus;
  sortTasksInLane: (a: TaskRow, b: TaskRow) => number;
  memberNameById: Record<string, string>;
  onOpen: (task: TaskRow) => void;
};

function rowLabel(
  key: string,
  axis: SwimlaneAxis,
  memberNameById: Record<string, string>
): string {
  if (key === "__unassigned__") {
    return axis === "category" ? "種別未設定" : "担当者未定";
  }
  return axis === "category" ? key : memberNameById[key] ?? "（元メンバー）";
}

export default function SwimlaneBoard({
  tasks,
  axis,
  lanes,
  laneTintById,
  whiteTextLanes,
  normalizeStatus,
  sortTasksInLane,
  memberNameById,
  onOpen,
}: Props) {
  const statuses = lanes.map((l) => l.id);
  const rows = groupTasksIntoSwimlanes(
    tasks,
    axis,
    statuses,
    normalizeStatus,
    sortTasksInLane
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-rule bg-mist p-6 text-center text-sm text-graphite/70">
        表示できるタスクがありません。
      </div>
    );
  }

  return (
    <div className="min-w-max px-2 space-y-6">
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
          <div className="flex gap-4 p-3 overflow-x-auto">
            {lanes.map((lane) => {
              const isDone = lane.id === "done";
              const tint = laneTintById[lane.id];
              const whiteText = whiteTextLanes.includes(lane.id);
              const items = row.tasksByStatus[lane.id] ?? [];
              const droppableId = encodeSwimlaneDroppableId(row.key, lane.id);

              return (
                <div
                  key={lane.id}
                  className="w-[280px] flex-shrink-0 rounded-lg border border-rule bg-mist overflow-hidden flex flex-col"
                >
                  <div
                    className={`px-3 py-2 border-b border-rule bg-paper shrink-0 border-l-4 ${
                      isDone ? "border-l-ink" : ""
                    }`}
                    style={tint ? { borderLeftColor: tint } : undefined}
                  >
                    <h4 className="font-bold text-xs flex items-center gap-2">
                      {isDone && (
                        <CheckCircle2
                          className="w-[14px] h-[14px] text-ink shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-ink">{lane.title}</span>
                      <span
                        className="inline-flex items-center justify-center min-w-[1.5rem] px-1 py-0.5 rounded-full text-[10px] font-bold font-numeric tabular-nums"
                        style={{
                          backgroundColor: isDone ? "#002B5C" : tint ?? undefined,
                          color: whiteText ? "#FFFFFF" : "#002B5C",
                        }}
                      >
                        （{items.length}）
                      </span>
                    </h4>
                  </div>
                  <Droppable droppableId={droppableId}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="p-2 space-y-2 min-h-[100px] flex-1"
                      >
                        {items.map((task, index) => (
                          <DraggableTaskCard
                            key={task.id}
                            task={task}
                            index={index}
                            status={lane.id}
                            isDone={isDone}
                            tint={tint}
                            memberNameById={memberNameById}
                            onOpen={onOpen}
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `page.tsx`に`swimlaneAxis`ステートとグルーピング切替UIを追加**

`app/(club)/clubtasks/page.tsx`の`view`ステート宣言の直後に追加：

```tsx
  const [swimlaneAxis, setSwimlaneAxis] = useState<SwimlaneAxis | "flat">(
    "flat"
  );
```

ファイル冒頭のimportに追加：

```tsx
import {
  decodeSwimlaneDroppableId,
  resolveSwimlaneRowChange,
  swimlaneRowKeyForTask,
  type SwimlaneAxis,
} from "@/lib/tasks/taskSwimlanes";
import SwimlaneBoard from "./SwimlaneBoard";
```

種別フィルタの行（`種別で絞り込み`というラベルを含む`<div className="flex items-center gap-2">`ブロック。元のファイルの578〜596行目付近だが、ここまでの編集で行番号がずれているため、`種別で絞り込み`という文字列を目印に探すこと）の直後・ビュー切替ボタン群（Task 5で追加した4ボタンの`<div className="inline-flex ...">`）の前に、グルーピング切替セレクトを追加する：

```tsx
        {view === "kanban" && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="swimlane-axis"
              className="text-sm text-graphite/70 shrink-0"
            >
              グルーピング
            </label>
            <select
              id="swimlane-axis"
              value={swimlaneAxis}
              onChange={(e) =>
                setSwimlaneAxis(e.target.value as SwimlaneAxis | "flat")
              }
              className="border border-rule rounded-lg px-2 py-1.5 text-sm bg-paper text-ink"
            >
              <option value="flat">フラット</option>
              <option value="category">種別ごと</option>
              <option value="assignee">担当者ごと</option>
            </select>
          </div>
        )}
```

- [ ] **Step 3: フラットかんばんとスイムレーンを切り替えるよう描画を分岐**

Task 6までで、かんばん分岐は次の形になっている（外側`<div className="overflow-x-auto pb-4 -mx-2">`→`<DragDropContext onDragEnd={handleDragEnd}>`→`<div className="flex gap-4 min-w-max px-2">`→`{tasksByLane.map(({ lane, items }) => { ... })}`という3重のネスト。中身の`tasksByLane.map`のコールバック本体はTask 4で`DraggableTaskCard`を使う形に更新済みで、この本文はここでは変更しない）。この構造全体を、`swimlaneAxis`で分岐する次の形に置き換える。`{tasksByLane.map(({ lane, items }) => { ... })}`のコールバック本体（`return (`から対応する`);`まで）はTask 4完了時点のコードをそのまま1文字も変えずにこの位置へ移すだけでよい：

```tsx
      ) : (
      <div className="overflow-x-auto pb-4 -mx-2">
        <DragDropContext onDragEnd={handleDragEnd}>
          {swimlaneAxis === "flat" ? (
            <div className="flex gap-4 min-w-max px-2">
              {tasksByLane.map(({ lane, items }) => {
                // ここから先はTask 4完了時点の tasksByLane.map コールバック本体を
                // そのまま移動する（isDone/tint/whiteText の算出と、
                // レーン見出し・Droppable・DraggableTaskCard の描画を含む return 文一式）。
                // 新規に書き直すコードはない。
              })}
            </div>
          ) : (
            <SwimlaneBoard
              tasks={visibleTasks}
              axis={swimlaneAxis}
              lanes={LANES}
              laneTintById={STATUS_TINT}
              whiteTextLanes={WHITE_TEXT_LANES}
              normalizeStatus={normalizeStatus}
              sortTasksInLane={sortTasksInLane}
              memberNameById={memberNameById}
              onOpen={openEditModal}
            />
          )}
        </DragDropContext>
      </div>
      )}
```

- [ ] **Step 4: `handleDragEnd`をスイムレーンのDroppable IDに対応させる**

`app/(club)/clubtasks/page.tsx`の`const handleDragEnd = useCallback(`から、対応する`,\n    [tasks, notifyTaskChange, currentUserId]\n  );`までの関数定義全体（元のファイルの452〜516行目付近。ここまでの編集で行番号はずれているが、この関数はTask 1〜6では変更していないため中身は元のままで、`const handleDragEnd = useCallback(`という文字列を目印に探せば一意に見つかる）を、次のコードで置き換える：

```tsx
  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      const task = tasks.find((t) => t.id === draggableId);
      if (!task) return;

      const sourceDecoded = decodeSwimlaneDroppableId(source.droppableId);
      const destDecoded = decodeSwimlaneDroppableId(destination.droppableId);

      const fromLane = sourceDecoded
        ? sourceDecoded.status
        : (source.droppableId as TaskStatus);
      const toLane = destDecoded
        ? destDecoded.status
        : (destination.droppableId as TaskStatus);
      const fromRowKey = sourceDecoded?.rowKey ?? null;
      const toRowKey = destDecoded?.rowKey ?? null;

      const sameLane = fromLane === toLane;
      const sameRow = fromRowKey === toRowKey;

      if (sameLane && sameRow) {
        const laneTasks = tasks
          .filter((t) => normalizeStatus(t.status) === fromLane)
          .filter((t) =>
            swimlaneAxis === "flat" || fromRowKey === null
              ? true
              : swimlaneRowKeyForTask(t, swimlaneAxis) === fromRowKey
          )
          .sort(sortTasksInLane);
        const reordered = reorder(laneTasks, source.index, destination.index);
        const laneTaskIds = new Set(laneTasks.map((t) => t.id));
        const others = tasks.filter((t) => !laneTaskIds.has(t.id));
        setTasks([...others, ...reordered]);
        return;
      }

      const newStatus = toLane;
      const rowChange: Partial<Pick<TaskRow, "category" | "assignee_id">> =
        destDecoded && swimlaneAxis !== "flat" && !sameRow
          ? resolveSwimlaneRowChange(swimlaneAxis, destDecoded.rowKey)
          : {};

      const prevTasks = tasks;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === draggableId ? { ...t, status: newStatus, ...rowChange } : t
        )
      );

      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus, ...rowChange })
        .eq("id", draggableId);

      if (error) {
        setTasks(prevTasks);
        toast.error("移動に失敗しました");
        return;
      }

      const prevReview = {
        status: normalizeStatus(task.status),
        reviewerId: task.reviewer_id,
      };
      const nextReview = { status: newStatus, reviewerId: task.reviewer_id };
      if (shouldNotifyReviewAssigned(prevReview, nextReview, currentUserId)) {
        void notifyTaskChange({
          type: "task_review_assigned",
          recipientId: task.reviewer_id!,
          taskTitle: task.title,
        });
      }

      toast.success("移動しました");
    },
    [tasks, notifyTaskChange, currentUserId, swimlaneAxis]
  );
```

- [ ] **Step 5: 型チェック・全テスト実行**

Run: `npx tsc --noEmit && npm test`
Expected: 両方PASS

- [ ] **Step 6: ブラウザで手動確認**

`npm run dev`で`/clubtasks`を開き、以下を確認する：
1. カンバン表示で「グルーピング」を「種別ごと」に切り替える → 種別ごとの行に既存5ステータスの列が並んで表示される
2. 同じ行内でカードを別ステータス列にドラッグ → ステータスのみ変わり、種別は変わらないこと
3. 別の行（別の種別）にカードをドラッグ → ステータスと種別の両方が変わること（編集モーダルを開いて`category`が更新されていることを確認）
4. 「担当者ごと」に切り替えて同様の操作を確認
5. 「フラット」に戻すと従来通りの単一行かんばんに戻ること
6. 既存の通知（レビュー待ちへの移行時のメール）が壊れていないこと（`is_notification_enabled`のRPC呼び出しがコンソールエラーを出していないか確認）

確認後、開発サーバーを停止する。

- [ ] **Step 7: コミット**

```bash
git add app/\(club\)/clubtasks/SwimlaneBoard.tsx app/\(club\)/clubtasks/page.tsx
git commit -m "$(cat <<'EOF'
feat(clubtasks): カンバンのスイムレーン化（種別/担当者で行グルーピング）を追加

列は既存5ステータス固定、行を種別または担当者で切替可能にした。
行をまたぐドラッグはステータスに加えグルーピング軸の値も更新する
（monday.com方式）。フラット表示は従来通り。
EOF
)"
```

---

### Task 8: 最終確認

**Files:** なし（確認のみ）

- [ ] **Step 1: 型チェック・全テストの最終確認**

Run: `npx tsc --noEmit && npm test`
Expected: 両方PASS

- [ ] **Step 2: 4ビュー全体の通し確認**

`npm run dev`で`/clubtasks`を開き、カンバン（フラット／種別ごと／担当者ごと）・表・カレンダー・ガントチャートの全ビューを一通り操作し、以下が崩れていないことを確認する：
- 新規タスク作成・編集モーダルでの保存
- 種別フィルタ（すべて／特定の種別）が各ビューに反映される
- レビュー移行・担当者アサイン時のメール通知（`docs/superpowers/specs/2026-08-17-task-notifications-design.md`の挙動）

確認後、開発サーバーを停止する。

- [ ] **Step 3: タスクボードの更新**

`docs/task-board.md`の645行目「幅出し段階（検討中扱い）：タスク管理機能改修」の記載を、Phase 1完了の実績に更新する（具体的な追記文言は実装完了時点で決める）。

- [ ] **Step 4: コミット**

```bash
git add docs/task-board.md
git commit -m "docs: /clubtasks Phase 1（表/カレンダー/スイムレーン化）の完了をタスクボードに反映"
```
