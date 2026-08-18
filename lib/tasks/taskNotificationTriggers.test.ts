import { describe, expect, it } from "vitest";
import {
  commentNotificationRecipients,
  shouldGenerateRecurringTask,
  shouldNotifyAssigneeChanged,
  shouldNotifyReviewAssigned,
} from "./taskNotificationTriggers";

describe("shouldNotifyReviewAssigned", () => {
  it("notifies when a brand-new task is created directly in review with a reviewer", () => {
    expect(
      shouldNotifyReviewAssigned(
        null,
        { status: "in_review", reviewerId: "user-r" },
        "user-actor"
      )
    ).toBe(true);
  });

  it("notifies when status transitions from another lane into in_review", () => {
    expect(
      shouldNotifyReviewAssigned(
        { status: "todo", reviewerId: "user-r" },
        { status: "in_review", reviewerId: "user-r" },
        "user-actor"
      )
    ).toBe(true);
  });

  it("does not notify when status stays in_review with the same reviewer", () => {
    expect(
      shouldNotifyReviewAssigned(
        { status: "in_review", reviewerId: "user-r" },
        { status: "in_review", reviewerId: "user-r" },
        "user-actor"
      )
    ).toBe(false);
  });

  it("notifies on reassignment even while status stays in_review", () => {
    expect(
      shouldNotifyReviewAssigned(
        { status: "in_review", reviewerId: "user-old" },
        { status: "in_review", reviewerId: "user-new" },
        "user-actor"
      )
    ).toBe(true);
  });

  it("does not notify when no reviewer is set", () => {
    expect(
      shouldNotifyReviewAssigned(
        { status: "todo", reviewerId: null },
        { status: "in_review", reviewerId: null },
        "user-actor"
      )
    ).toBe(false);
  });

  it("does not notify when the new status is not in_review", () => {
    expect(
      shouldNotifyReviewAssigned(
        { status: "in_review", reviewerId: "user-r" },
        { status: "done", reviewerId: "user-r" },
        "user-actor"
      )
    ).toBe(false);
  });

  it("does not notify when the reviewer is the actor themself", () => {
    expect(
      shouldNotifyReviewAssigned(
        { status: "todo", reviewerId: null },
        { status: "in_review", reviewerId: "user-actor" },
        "user-actor"
      )
    ).toBe(false);
  });
});

describe("shouldNotifyAssigneeChanged", () => {
  it("notifies when a brand-new task is created with an assignee", () => {
    expect(
      shouldNotifyAssigneeChanged(null, { assigneeId: "user-a" }, "user-actor")
    ).toBe(true);
  });

  it("notifies when assignee changes from one member to another", () => {
    expect(
      shouldNotifyAssigneeChanged(
        { assigneeId: "user-old" },
        { assigneeId: "user-new" },
        "user-actor"
      )
    ).toBe(true);
  });

  it("does not notify when assignee is unchanged", () => {
    expect(
      shouldNotifyAssigneeChanged(
        { assigneeId: "user-a" },
        { assigneeId: "user-a" },
        "user-actor"
      )
    ).toBe(false);
  });

  it("does not notify when assignee is cleared", () => {
    expect(
      shouldNotifyAssigneeChanged(
        { assigneeId: "user-a" },
        { assigneeId: null },
        "user-actor"
      )
    ).toBe(false);
  });

  it("does not notify when the assignee is the actor themself", () => {
    expect(
      shouldNotifyAssigneeChanged(
        { assigneeId: null },
        { assigneeId: "user-actor" },
        "user-actor"
      )
    ).toBe(false);
  });
});

describe("commentNotificationRecipients", () => {
  it("returns assignee, reviewer, and creator when all are distinct and none is the author", () => {
    const result = commentNotificationRecipients(
      { assigneeId: "user-a", reviewerId: "user-r", createdBy: "user-c" },
      "user-author"
    );
    expect(result).toEqual(["user-a", "user-r", "user-c"]);
  });

  it("deduplicates when the same person holds two roles", () => {
    const result = commentNotificationRecipients(
      { assigneeId: "user-x", reviewerId: "user-x", createdBy: "user-c" },
      "user-author"
    );
    expect(result).toEqual(["user-x", "user-c"]);
  });

  it("excludes the comment author even when they hold a role", () => {
    const result = commentNotificationRecipients(
      { assigneeId: "user-author", reviewerId: "user-r", createdBy: "user-c" },
      "user-author"
    );
    expect(result).toEqual(["user-r", "user-c"]);
  });

  it("returns an empty array when all roles are null", () => {
    const result = commentNotificationRecipients(
      { assigneeId: null, reviewerId: null, createdBy: null },
      "user-author"
    );
    expect(result).toEqual([]);
  });

  it("returns an empty array when the author holds every role", () => {
    const result = commentNotificationRecipients(
      { assigneeId: "user-author", reviewerId: "user-author", createdBy: "user-author" },
      "user-author"
    );
    expect(result).toEqual([]);
  });
});

describe("shouldGenerateRecurringTask", () => {
  it("returns true when status newly transitions to done with a recurrence rule set", () => {
    expect(
      shouldGenerateRecurringTask(
        { status: "todo", recurrenceRule: "weekly" },
        { status: "done", recurrenceRule: "weekly" }
      )
    ).toBe(true);
  });

  it("returns false when the task was already done (prevents duplicate generation)", () => {
    expect(
      shouldGenerateRecurringTask(
        { status: "done", recurrenceRule: "weekly" },
        { status: "done", recurrenceRule: "weekly" }
      )
    ).toBe(false);
  });

  it("returns false when the new status is not done", () => {
    expect(
      shouldGenerateRecurringTask(
        { status: "todo", recurrenceRule: "weekly" },
        { status: "in_progress", recurrenceRule: "weekly" }
      )
    ).toBe(false);
  });

  it("returns false when no recurrence rule is set", () => {
    expect(
      shouldGenerateRecurringTask(
        { status: "todo", recurrenceRule: null },
        { status: "done", recurrenceRule: null }
      )
    ).toBe(false);
  });
});
