import { describe, expect, it } from "vitest";
import {
  buildSimulatorCompleteParams,
  buildSimulatorShareParams,
  scoreToBand,
} from "./simulatorEvents";

describe("scoreToBand", () => {
  it("scoreLabel の区切り（85 / 70 / 55 / 40）で帯に分ける", () => {
    expect(scoreToBand(100)).toBe("85-100");
    expect(scoreToBand(85)).toBe("85-100");
    expect(scoreToBand(84)).toBe("70-84");
    expect(scoreToBand(70)).toBe("70-84");
    expect(scoreToBand(69)).toBe("55-69");
    expect(scoreToBand(55)).toBe("55-69");
    expect(scoreToBand(54)).toBe("40-54");
    expect(scoreToBand(40)).toBe("40-54");
    expect(scoreToBand(39)).toBe("0-39");
    expect(scoreToBand(0)).toBe("0-39");
  });
});

describe("buildSimulatorCompleteParams", () => {
  it("GA4 に送るパラメータへ変換する（score は帯に丸める）", () => {
    expect(
      buildSimulatorCompleteParams({
        score: 72,
        wallStatus: "safe",
        circleLevel: "normal",
        credits: 14,
        targetIncome: 60000,
      })
    ).toEqual({
      score_band: "70-84",
      wall_status: "safe",
      circle_level: "normal",
      credits: 14,
      target_income: 60000,
    });
  });
});

describe("buildSimulatorShareParams", () => {
  it("シェア先プラットフォームを share_platform として送る", () => {
    expect(buildSimulatorShareParams("x")).toEqual({ share_platform: "x" });
    expect(buildSimulatorShareParams("line")).toEqual({ share_platform: "line" });
  });
});
