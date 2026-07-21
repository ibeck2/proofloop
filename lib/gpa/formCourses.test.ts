import { describe, expect, it } from "vitest";
import { coursesFromFormRows, toNumber } from "./formCourses";
import { GENERIC_SCALES } from "./scales";
import { findScaleById } from "./universities";
import type { CourseFormRow } from "./formCourses";

const gradeScale = GENERIC_SCALES[0];
const rawScale = findScaleById("u-tokyo-basic-average-scale")!;

function row(over: Partial<CourseFormRow> = {}): CourseFormRow {
  return { name: "", credits: "", grade: "", score: "", weight: "1", ...over };
}

describe("toNumber", () => {
  it("空文字は NaN になる（0 にしない）", () => {
    expect(Number.isNaN(toNumber(""))).toBe(true);
    expect(Number.isNaN(toNumber("   "))).toBe(true);
  });

  it("数値文字列は数値になる", () => {
    expect(toNumber("2")).toBe(2);
    expect(toNumber("0.1")).toBe(0.1);
  });
});

describe("coursesFromFormRows", () => {
  it("raw方式では入力した評点が score に渡る", () => {
    const courses = coursesFromFormRows(
      [row({ name: "英語", credits: "2", score: "74", weight: "1" })],
      rawScale
    );
    expect(courses).toEqual([
      { id: "0", name: "英語", credits: 2, grade: undefined, score: 74, weight: 1 },
    ]);
  });

  it("raw方式では重率が渡る", () => {
    const courses = coursesFromFormRows(
      [row({ credits: "2", score: "80", weight: "0.1" })],
      rawScale
    );
    expect(courses[0].weight).toBe(0.1);
  });

  it("評語方式では score も weight も渡さない", () => {
    const courses = coursesFromFormRows(
      [row({ credits: "2", grade: "秀", score: "99", weight: "0.1" })],
      gradeScale
    );
    expect(courses[0].grade).toBe("秀");
    expect(courses[0].score).toBeUndefined();
    expect(courses[0].weight).toBeUndefined();
  });

  it("完全に空の行は除外する", () => {
    const courses = coursesFromFormRows(
      [row(), row({ credits: "2", grade: "秀" }), row()],
      gradeScale
    );
    expect(courses).toHaveLength(1);
  });

  it("空欄の単位数・評点は NaN として渡す（0 にしない）", () => {
    const courses = coursesFromFormRows(
      [row({ name: "微分積分", credits: "", score: "" })],
      rawScale
    );
    expect(Number.isNaN(courses[0].credits)).toBe(true);
    expect(Number.isNaN(courses[0].score!)).toBe(true);
  });
});
