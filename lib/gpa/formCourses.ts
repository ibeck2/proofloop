import type { Course, GradeScale } from "./types";

/** 科目行の入力値（すべて文字列で保持される） */
export type CourseFormRow = {
  name: string;
  credits: string;
  grade: string;
  score: string;
  weight: string;
};

/**
 * 空文字を 0 ではなく NaN にする。
 * `Number("")` は 0 になるため、素点や単位数の入力漏れが「0点」「0単位」として
 * 黙って計算に入り、誤った値が表示されてしまう。
 */
export function toNumber(value: string): number {
  return value.trim() === "" ? NaN : Number(value);
}

/** 完全に空の行かどうか */
function isEmptyRow(row: CourseFormRow): boolean {
  return (
    row.name.trim() === "" &&
    row.credits.trim() === "" &&
    row.grade.trim() === "" &&
    row.score.trim() === ""
  );
}

/**
 * 科目行の入力値から Course[] を組み立てる。
 *
 * 評点・素点はどちらも Course.score に入る。`grade` 方式**以外**（score と raw）は
 * すべて数値入力欄を表示するため、ここも同じ条件で値を渡さなければならない。
 * 以前ここが `method === "score"` に限定されており、基本平均点（raw）で
 * 学生が入力した評点が捨てられていた。
 */
export function coursesFromFormRows(
  rows: CourseFormRow[],
  scale: GradeScale
): Course[] {
  return rows.filter((r) => !isEmptyRow(r)).map((r, index) => ({
    id: String(index),
    name: r.name,
    credits: toNumber(r.credits),
    grade: scale.method === "grade" ? r.grade : undefined,
    score: scale.method === "grade" ? undefined : toNumber(r.score),
    weight: scale.usesWeight ? toNumber(r.weight) : undefined,
  }));
}
