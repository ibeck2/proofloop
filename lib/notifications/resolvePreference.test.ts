import { describe, expect, it } from "vitest";
import { resolveNotificationEnabled } from "./resolvePreference";
import type { NotificationPreferenceRow } from "@/lib/types/notificationPreference";

const baseRow: NotificationPreferenceRow = {
  id: "row-1",
  user_id: "user-1",
  notification_type: "task_review_assigned",
  organization_id: "org-1",
  enabled: false,
};

describe("resolveNotificationEnabled", () => {
  it("returns true when no matching row exists (default on)", () => {
    expect(resolveNotificationEnabled([], "task_review_assigned", "org-1")).toBe(true);
  });

  it("returns false when a disabling row matches type and org", () => {
    expect(
      resolveNotificationEnabled([baseRow], "task_review_assigned", "org-1")
    ).toBe(false);
  });

  it("returns true when the row is for a different organization", () => {
    expect(
      resolveNotificationEnabled([baseRow], "task_review_assigned", "org-2")
    ).toBe(true);
  });

  it("returns true when the row is for a different notification type", () => {
    expect(
      resolveNotificationEnabled([baseRow], "task_assignee_changed", "org-1")
    ).toBe(true);
  });

  it("returns true when a matching row exists but enabled=true", () => {
    const enabledRow = { ...baseRow, enabled: true };
    expect(
      resolveNotificationEnabled([enabledRow], "task_review_assigned", "org-1")
    ).toBe(true);
  });

  it("matches a global (organization_id=null) row when organizationId is null", () => {
    const globalRow: NotificationPreferenceRow = {
      ...baseRow,
      organization_id: null,
    };
    expect(
      resolveNotificationEnabled([globalRow], "task_review_assigned", null)
    ).toBe(false);
  });
});
