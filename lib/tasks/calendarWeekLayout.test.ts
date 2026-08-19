import { describe, expect, it } from "vitest";
import { layoutWeekSegments } from "./calendarWeekLayout";

// 週の初日は日曜始まり。2026-08-16(日)〜2026-08-22(土)を基準の週とする。
const WEEK_START = "2026-08-16";

describe("layoutWeekSegments", () => {
  it("returns an empty array when no tasks intersect the week", () => {
    const result = layoutWeekSegments(
      [{ id: "a", startDate: "2026-08-01", dueDate: "2026-08-01" }],
      WEEK_START
    );
    expect(result).toEqual([]);
  });

  it("places a task fully inside the week with correct startCol/span", () => {
    const result = layoutWeekSegments(
      [{ id: "a", startDate: "2026-08-18", dueDate: "2026-08-19" }],
      WEEK_START
    );
    expect(result).toEqual([
      {
        taskId: "a",
        startCol: 2,
        span: 2,
        lane: 0,
        continuesLeft: false,
        continuesRight: false,
      },
    ]);
  });

  it("clips a task that starts before the week and marks continuesLeft", () => {
    const result = layoutWeekSegments(
      [{ id: "a", startDate: "2026-08-10", dueDate: "2026-08-17" }],
      WEEK_START
    );
    expect(result).toEqual([
      {
        taskId: "a",
        startCol: 0,
        span: 2,
        lane: 0,
        continuesLeft: true,
        continuesRight: false,
      },
    ]);
  });

  it("clips a task that ends after the week and marks continuesRight", () => {
    const result = layoutWeekSegments(
      [{ id: "a", startDate: "2026-08-20", dueDate: "2026-08-30" }],
      WEEK_START
    );
    expect(result).toEqual([
      {
        taskId: "a",
        startCol: 4,
        span: 3,
        lane: 0,
        continuesLeft: false,
        continuesRight: true,
      },
    ]);
  });

  it("marks both continuesLeft and continuesRight when the task spans the whole week and beyond", () => {
    const result = layoutWeekSegments(
      [{ id: "a", startDate: "2026-08-01", dueDate: "2026-09-01" }],
      WEEK_START
    );
    expect(result).toEqual([
      {
        taskId: "a",
        startCol: 0,
        span: 7,
        lane: 0,
        continuesLeft: true,
        continuesRight: true,
      },
    ]);
  });

  it("assigns non-overlapping tasks to the same lane", () => {
    const result = layoutWeekSegments(
      [
        { id: "a", startDate: "2026-08-16", dueDate: "2026-08-17" },
        { id: "b", startDate: "2026-08-18", dueDate: "2026-08-19" },
      ],
      WEEK_START
    );
    expect(result.map((s) => ({ taskId: s.taskId, lane: s.lane }))).toEqual([
      { taskId: "a", lane: 0 },
      { taskId: "b", lane: 0 },
    ]);
  });

  it("assigns overlapping tasks to different lanes", () => {
    const result = layoutWeekSegments(
      [
        { id: "a", startDate: "2026-08-16", dueDate: "2026-08-20" },
        { id: "b", startDate: "2026-08-18", dueDate: "2026-08-19" },
      ],
      WEEK_START
    );
    expect(result.map((s) => ({ taskId: s.taskId, lane: s.lane }))).toEqual([
      { taskId: "a", lane: 0 },
      { taskId: "b", lane: 1 },
    ]);
  });

  it("reuses a freed lane once an earlier task's span ends", () => {
    const result = layoutWeekSegments(
      [
        { id: "a", startDate: "2026-08-16", dueDate: "2026-08-16" },
        { id: "b", startDate: "2026-08-16", dueDate: "2026-08-18" },
        { id: "c", startDate: "2026-08-17", dueDate: "2026-08-19" },
      ],
      WEEK_START
    );
    // 同じstartCol(0)のa・bはspan降順で並ぶためb(span3)が先、a(span1)が後。
    // b→レーン0(endCol=2)。a(startCol0)はレーン0と重なるためレーン1(endCol=0)。
    // c(startCol1)はレーン0(endCol=2)と重なるが、レーン1(endCol=0 < 1)は空いているため再利用。
    expect(result.map((s) => ({ taskId: s.taskId, lane: s.lane }))).toEqual([
      { taskId: "b", lane: 0 },
      { taskId: "a", lane: 1 },
      { taskId: "c", lane: 1 },
    ]);
  });
});
