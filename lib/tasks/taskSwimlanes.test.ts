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
