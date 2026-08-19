import { describe, expect, it } from "vitest";
import {
  applyDragToRange,
  formatDateOnly,
  pixelDeltaToDayDelta,
} from "./dateRangeDrag";

describe("pixelDeltaToDayDelta", () => {
  it("converts a positive pixel delta to a positive day delta", () => {
    expect(pixelDeltaToDayDelta(28, 28)).toBe(1);
    expect(pixelDeltaToDayDelta(56, 28)).toBe(2);
  });

  it("converts a negative pixel delta to a negative day delta", () => {
    expect(pixelDeltaToDayDelta(-28, 28)).toBe(-1);
    expect(pixelDeltaToDayDelta(-56, 28)).toBe(-2);
  });

  it("rounds to the nearest day", () => {
    expect(pixelDeltaToDayDelta(10, 28)).toBe(0);
    expect(pixelDeltaToDayDelta(20, 28)).toBe(1);
  });

  it("returns 0 when dayWidthPx is zero or negative (defensive)", () => {
    expect(pixelDeltaToDayDelta(100, 0)).toBe(0);
    expect(pixelDeltaToDayDelta(100, -10)).toBe(0);
  });
});

describe("applyDragToRange", () => {
  const base = { startDate: "2026-08-10", dueDate: "2026-08-20" };

  it("moves the start edge forward and backward within range", () => {
    expect(applyDragToRange(base, "start", 3)).toEqual({
      startDate: "2026-08-13",
      dueDate: "2026-08-20",
    });
    expect(applyDragToRange(base, "start", -3)).toEqual({
      startDate: "2026-08-07",
      dueDate: "2026-08-20",
    });
  });

  it("moves the due edge forward and backward within range", () => {
    expect(applyDragToRange(base, "due", 3)).toEqual({
      startDate: "2026-08-10",
      dueDate: "2026-08-23",
    });
    expect(applyDragToRange(base, "due", -3)).toEqual({
      startDate: "2026-08-10",
      dueDate: "2026-08-17",
    });
  });

  it("clamps the start edge to the due date when dragged past it", () => {
    expect(applyDragToRange(base, "start", 20)).toEqual({
      startDate: "2026-08-20",
      dueDate: "2026-08-20",
    });
  });

  it("clamps the due edge to the start date when dragged past it", () => {
    expect(applyDragToRange(base, "due", -20)).toEqual({
      startDate: "2026-08-10",
      dueDate: "2026-08-10",
    });
  });

  it("allows the start and due date to become the same day (1-day task)", () => {
    expect(applyDragToRange(base, "start", 10)).toEqual({
      startDate: "2026-08-20",
      dueDate: "2026-08-20",
    });
  });

  it("returns the same range unchanged when dayDelta is 0", () => {
    expect(applyDragToRange(base, "start", 0)).toEqual(base);
    expect(applyDragToRange(base, "due", 0)).toEqual(base);
  });

  it("rolls over month and year boundaries correctly", () => {
    expect(
      applyDragToRange(
        { startDate: "2026-12-28", dueDate: "2026-12-30" },
        "due",
        5
      )
    ).toEqual({ startDate: "2026-12-28", dueDate: "2027-01-04" });
    expect(
      applyDragToRange(
        { startDate: "2026-03-01", dueDate: "2026-03-10" },
        "start",
        -5
      )
    ).toEqual({ startDate: "2026-02-24", dueDate: "2026-03-10" });
  });
});

describe("formatDateOnly", () => {
  it("formats a Date as YYYY-MM-DD using local time components", () => {
    expect(formatDateOnly(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(formatDateOnly(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});
