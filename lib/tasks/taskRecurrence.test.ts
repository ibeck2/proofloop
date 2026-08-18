import { describe, expect, it } from "vitest";
import {
  buildRecurringTask,
  isRecurrenceRule,
  nextDueDate,
} from "./taskRecurrence";

describe("isRecurrenceRule", () => {
  it("returns true for weekly/biweekly/monthly", () => {
    expect(isRecurrenceRule("weekly")).toBe(true);
    expect(isRecurrenceRule("biweekly")).toBe(true);
    expect(isRecurrenceRule("monthly")).toBe(true);
  });

  it("returns false for null, undefined, empty string, and unknown values", () => {
    expect(isRecurrenceRule(null)).toBe(false);
    expect(isRecurrenceRule(undefined)).toBe(false);
    expect(isRecurrenceRule("")).toBe(false);
    expect(isRecurrenceRule("daily")).toBe(false);
  });
});

describe("nextDueDate", () => {
  // これらのテストはcatch-upループ（今日以降になるまで間隔を繰り返し足す）
  // の対象外であることを検証したいので、todayを元期限と同じ日に固定する
  // （todayを省略して実行時刻に委ねると、実行日によって catch-up が発火し
  // 結果が変わってしまう時限爆弾になるため）。
  it("adds 7 days for weekly", () => {
    expect(
      nextDueDate("2026-08-20", "weekly", new Date(2026, 7, 20))
    ).toBe("2026-08-27");
  });

  it("adds 14 days for biweekly", () => {
    expect(
      nextDueDate("2026-08-20", "biweekly", new Date(2026, 7, 20))
    ).toBe("2026-09-03");
  });

  it("adds 1 month for monthly", () => {
    expect(
      nextDueDate("2026-08-20", "monthly", new Date(2026, 7, 20))
    ).toBe("2026-09-20");
  });

  it("follows JS Date's native month-overflow rollover for monthly (Jan 31 -> Mar 3, since Feb 2026 has 28 days)", () => {
    // todayを2026-01-31に固定し、この日付自体は過去に消化された想定にする
    // ことで、catch-upループを発火させずロールオーバー挙動だけを検証する。
    expect(
      nextDueDate("2026-01-31", "monthly", new Date(2026, 0, 31))
    ).toBe("2026-03-03");
  });

  it("uses the provided today as the base when due date is null", () => {
    const today = new Date(2026, 7, 18); // 2026-08-18 (JS month is 0-indexed)
    expect(nextDueDate(null, "weekly", today)).toBe("2026-08-25");
  });

  it("catches up to today by repeatedly adding the interval when the due date is far in the past", () => {
    // 2026-01-05起点でweekly。today=2026-08-18。7日ずつ足していき、
    // todayを跨いだ最初の日付まで進む。
    const today = new Date(2026, 7, 18); // 2026-08-18
    const result = nextDueDate("2026-01-05", "weekly", today);
    const resultDate = new Date(
      Number(result.slice(0, 4)),
      Number(result.slice(5, 7)) - 1,
      Number(result.slice(8, 10))
    );
    expect(resultDate.getTime()).toBeGreaterThanOrEqual(today.getTime());
    // 直前の間隔（1週間前）はまだtoday未満のはず
    const prevWeek = new Date(resultDate.getTime());
    prevWeek.setDate(prevWeek.getDate() - 7);
    expect(prevWeek.getTime()).toBeLessThan(today.getTime());
  });

  it("returns the same result as a single interval add when the due date is not overdue", () => {
    expect(nextDueDate("2026-08-20", "weekly", new Date(2026, 7, 18))).toBe(
      "2026-08-27"
    );
  });
});

describe("buildRecurringTask", () => {
  const baseSource = {
    organization_id: "org-1",
    title: "週次ミーティング議事録作成",
    description: "議事録テンプレートに沿って記入する",
    category: "運営",
    priority: "medium",
    assignee_id: "user-1",
    reviewer_id: "user-2",
    due_date: "2026-08-20",
    recurrence_rule: "weekly",
  };

  it("builds the next task payload when recurrence_rule is set", () => {
    const result = buildRecurringTask(baseSource, [], new Date(2026, 7, 20));
    expect(result).not.toBeNull();
    expect(result?.task).toEqual({
      organization_id: "org-1",
      title: "週次ミーティング議事録作成",
      description: "議事録テンプレートに沿って記入する",
      category: "運営",
      priority: "medium",
      assignee_id: "user-1",
      reviewer_id: "user-2",
      due_date: "2026-08-27",
      status: "todo",
      recurrence_rule: "weekly",
    });
  });

  it("returns null when recurrence_rule is null", () => {
    expect(
      buildRecurringTask({ ...baseSource, recurrence_rule: null }, [])
    ).toBeNull();
  });

  it("returns null when recurrence_rule is an invalid value (defense against a value that slipped past the DB CHECK constraint)", () => {
    expect(
      buildRecurringTask({ ...baseSource, recurrence_rule: "daily" }, [])
    ).toBeNull();
  });

  it("returns an empty checklist array when there are no checklist items", () => {
    const result = buildRecurringTask(baseSource, []);
    expect(result?.checklistItems).toEqual([]);
  });

  it("copies checklist items sorted by original position, all marked not done, with position renumbered from 0", () => {
    const result = buildRecurringTask(baseSource, [
      { text: "会場を予約する", position: 2 },
      { text: "議題を集める", position: 0 },
      { text: "参加者に連絡する", position: 1 },
    ]);
    expect(result?.checklistItems).toEqual([
      { text: "議題を集める", position: 0, is_done: false },
      { text: "参加者に連絡する", position: 1, is_done: false },
      { text: "会場を予約する", position: 2, is_done: false },
    ]);
  });
});
