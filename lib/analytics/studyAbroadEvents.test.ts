import { describe, expect, it } from "vitest";
import { buildStudyAbroadCompleteParams } from "./studyAbroadEvents";

describe("buildStudyAbroadCompleteParams", () => {
  it("回答と1位のレコメンド先を GA4 パラメータへ変換する（english→english_level）", () => {
    expect(
      buildStudyAbroadCompleteParams({
        answers: {
          purpose: "english",
          period: "short",
          budget: "low",
          english: "beginner",
          priority: "cost",
        },
        topCountry: "フィリピン（セブ島）",
        topRegion: "英語圏",
      })
    ).toEqual({
      top_country: "フィリピン（セブ島）",
      top_region: "英語圏",
      purpose: "english",
      period: "short",
      budget: "low",
      english_level: "beginner",
      priority: "cost",
    });
  });

  it("回答が欠けていても空文字で埋める", () => {
    expect(
      buildStudyAbroadCompleteParams({
        answers: { purpose: "career" },
        topCountry: "アメリカ",
        topRegion: "英語圏",
      })
    ).toEqual({
      top_country: "アメリカ",
      top_region: "英語圏",
      purpose: "career",
      period: "",
      budget: "",
      english_level: "",
      priority: "",
    });
  });
});
