import { describe, expect, it } from "vitest";
import { checklistProgressLabel, formatDue, priorityBadgeClass, priorityLabel } from "./taskFormatting";

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

describe("checklistProgressLabel", () => {
  it("returns null when there are no checklist items", () => {
    expect(checklistProgressLabel(0, 0)).toBeNull();
  });

  it("formats done/total when items exist", () => {
    expect(checklistProgressLabel(2, 5)).toBe("2/5");
  });

  it("formats correctly when all items are done", () => {
    expect(checklistProgressLabel(3, 3)).toBe("3/3");
  });

  it("formats correctly when none are done yet", () => {
    expect(checklistProgressLabel(0, 4)).toBe("0/4");
  });
});
