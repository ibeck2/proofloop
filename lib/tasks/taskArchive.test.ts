import { describe, expect, it } from "vitest";
import { archiveLabelOptions, filterTasksByArchiveView } from "./taskArchive";
import type { TaskRow } from "@/lib/types/task";

function makeTask(overrides: Partial<TaskRow> & { id: string }): TaskRow {
  return {
    organization_id: "org-1",
    title: "タスク",
    description: null,
    status: "todo",
    priority: "medium",
    assignee_id: null,
    reviewer_id: null,
    created_by: null,
    category: null,
    due_date: null,
    recurrence_rule: null,
    archived_at: null,
    archive_label: null,
    ...overrides,
  };
}

describe("filterTasksByArchiveView", () => {
  it("returns only tasks without archived_at when view is current", () => {
    const tasks = [
      makeTask({ id: "1", archived_at: null }),
      makeTask({ id: "2", archived_at: "2026-08-18T00:00:00Z", archive_label: "2026年度" }),
    ];
    expect(filterTasksByArchiveView(tasks, { type: "current" })).toEqual([
      tasks[0],
    ]);
  });

  it("returns only tasks matching the given archive label, excluding current tasks", () => {
    const tasks = [
      makeTask({ id: "1", archived_at: null }),
      makeTask({ id: "2", archived_at: "2026-08-18T00:00:00Z", archive_label: "2026年度" }),
      makeTask({ id: "3", archived_at: "2025-08-18T00:00:00Z", archive_label: "2025年度" }),
    ];
    expect(
      filterTasksByArchiveView(tasks, { type: "label", label: "2026年度" })
    ).toEqual([tasks[1]]);
  });

  it("returns an empty array when no task matches the given label", () => {
    const tasks = [makeTask({ id: "1", archived_at: null })];
    expect(
      filterTasksByArchiveView(tasks, { type: "label", label: "2026年度" })
    ).toEqual([]);
  });
});

describe("archiveLabelOptions", () => {
  it("returns an empty array when nothing has been archived", () => {
    const tasks = [makeTask({ id: "1", archived_at: null })];
    expect(archiveLabelOptions(tasks)).toEqual([]);
  });

  it("dedupes labels and ignores rows missing archived_at or archive_label", () => {
    const tasks = [
      makeTask({ id: "1", archived_at: "2026-08-18T00:00:00Z", archive_label: "2026年度" }),
      makeTask({ id: "2", archived_at: "2026-08-19T00:00:00Z", archive_label: "2026年度" }),
      makeTask({ id: "3", archived_at: null, archive_label: null }),
    ];
    expect(archiveLabelOptions(tasks)).toEqual(["2026年度"]);
  });

  it("sorts labels by most recently archived first", () => {
    const tasks = [
      makeTask({ id: "1", archived_at: "2025-08-18T00:00:00Z", archive_label: "2025年度" }),
      makeTask({ id: "2", archived_at: "2026-08-18T00:00:00Z", archive_label: "2026年度" }),
    ];
    expect(archiveLabelOptions(tasks)).toEqual(["2026年度", "2025年度"]);
  });
});
