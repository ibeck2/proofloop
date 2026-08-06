import { describe, expect, it } from "vitest";
import { creditsToRecover, gpaAfterFail } from "./dropImpact";

describe("gpaAfterFail", () => {
  it("GPA3.00・20単位の状態で2単位を落とすと2.73になる", () => {
    expect(gpaAfterFail({ currentGpa: 3.0, currentCredits: 20, failedCredits: 2 })).toBe(2.73);
  });

  it("落とした単位が0なら元のGPAのまま（履修取消で逃げた場合に相当）", () => {
    expect(gpaAfterFail({ currentGpa: 3.0, currentCredits: 20, failedCredits: 0 })).toBe(3.0);
  });

  it("同じ2単位でも、母数が大きいほど下げ幅は小さい", () => {
    const early = gpaAfterFail({ currentGpa: 3.0, currentCredits: 20, failedCredits: 2 });
    const late = gpaAfterFail({ currentGpa: 3.0, currentCredits: 100, failedCredits: 2 });
    expect(early).toBe(2.73);
    expect(late).toBe(2.94);
    expect(late! - early!).toBeGreaterThan(0);
  });

  it("4単位を落とすと2単位より大きく下がる", () => {
    expect(gpaAfterFail({ currentGpa: 3.0, currentCredits: 20, failedCredits: 4 })).toBe(2.5);
  });

  it("単位数が0なら計算できず null", () => {
    expect(gpaAfterFail({ currentGpa: 3.0, currentCredits: 0, failedCredits: 0 })).toBeNull();
  });
});

describe("creditsToRecover", () => {
  const failed = { currentGpa: 3.0, currentCredits: 20, failedCredits: 2 };

  it("優（3.0）を38単位積めば2.90まで戻る", () => {
    expect(creditsToRecover({ ...failed, targetGpa: 2.9, gradePoint: 3.0 })).toBe(38);
  });

  it("秀（4.0）なら6単位で3.00に戻る", () => {
    expect(creditsToRecover({ ...failed, targetGpa: 3.0, gradePoint: 4.0 })).toBe(6);
  });

  it("優（3.0）だけでは3.00には二度と戻らない（漸近するだけ）", () => {
    expect(creditsToRecover({ ...failed, targetGpa: 3.0, gradePoint: 3.0 })).toBeNull();
  });

  it("目標より低い成績をいくら積んでも届かない", () => {
    expect(creditsToRecover({ ...failed, targetGpa: 3.0, gradePoint: 2.0 })).toBeNull();
  });

  it("すでに目標を上回っていれば0単位", () => {
    expect(
      creditsToRecover({
        currentGpa: 3.5,
        currentCredits: 20,
        failedCredits: 2,
        targetGpa: 3.0,
        gradePoint: 4.0,
      })
    ).toBe(0);
  });

  it("解がちょうど整数のとき、浮動小数点誤差で1単位多く出さない", () => {
    // (2.9×22 − 3.0×20) ÷ (3.0 − 2.9) は数学的には厳密に 38
    expect(creditsToRecover({ ...failed, targetGpa: 2.9, gradePoint: 3.0 })).toBe(38);
    // (3.0×22 − 3.0×20) ÷ (4.0 − 3.0) は厳密に 6
    expect(creditsToRecover({ ...failed, targetGpa: 3.0, gradePoint: 4.0 })).toBe(6);
  });
});
