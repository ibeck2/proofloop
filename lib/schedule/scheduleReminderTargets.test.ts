import { describe, expect, it } from "vitest";
import { reminderTargetUserIds } from "./scheduleReminderTargets";

describe("reminderTargetUserIds", () => {
  it("includes unread and viewed_no_response members, excludes responded members", () => {
    const result = reminderTargetUserIds([
      { userId: "u1", status: "unread" },
      { userId: "u2", status: "viewed_no_response" },
      { userId: "u3", status: "responded" },
    ]);
    expect(result).toEqual(["u1", "u2"]);
  });

  it("returns an empty array when everyone has responded", () => {
    expect(
      reminderTargetUserIds([{ userId: "u1", status: "responded" }])
    ).toEqual([]);
  });

  it("returns an empty array for an empty member list", () => {
    expect(reminderTargetUserIds([])).toEqual([]);
  });
});
