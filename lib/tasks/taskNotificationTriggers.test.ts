import { describe, expect, it } from "vitest";
import {
  shouldNotifyReviewAssigned,
  shouldNotifyAssigneeChanged,
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
