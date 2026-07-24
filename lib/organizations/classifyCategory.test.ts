import { describe, expect, it } from "vitest";
import { CATEGORIES, classifyCategory, normalizeOrgName } from "./classifyCategory";

describe("normalizeOrgName", () => {
  it("学部名を落とす（所属であって活動分野ではない）", () => {
    // これが無いと「医学」で学術・研究に落ちてしまう
    expect(normalizeOrgName("アメリカンフットボール部(医学部)")).not.toContain("医学");
  });

  it("大学名を落とす（「国際基督教大学」の「国際」で誤判定しないため）", () => {
    expect(normalizeOrgName("国際基督教大学ハンドベルクワイア")).not.toContain("国際");
  });

  it("university フィールドが分かっていればそれも落とす", () => {
    expect(normalizeOrgName("上智大学写真部(SPC)", "上智大学")).toContain("写真");
    expect(normalizeOrgName("上智大学写真部(SPC)", "上智大学")).not.toContain("上智");
  });

  it("「大学祭」は落とさない（イベント名なので手がかりになる）", () => {
    expect(normalizeOrgName("大学祭中央実行委員会")).toContain("大学祭");
  });
});

describe("classifyCategory", () => {
  describe("現状のDBで実際に誤分類されていた団体", () => {
    // 以下はすべて本番DBの実データ。修正前は括弧内のカテゴリになっていた。
    it("音楽系を運動系から救う", () => {
      expect(classifyCategory("音楽部交響楽団", "京都大学")).toBe(CATEGORIES.culture); // 旧: 運動系
      expect(classifyCategory("ギター部")).toBe(CATEGORIES.culture); // 旧: 運動系
      expect(classifyCategory("上智大学写真部(SPC)", "上智大学")).toBe(CATEGORIES.culture); // 旧: 運動系
    });

    it("スポーツ系を文化系から救う", () => {
      expect(classifyCategory("B.Y.Bラグビーフットボールクラブ")).toBe(CATEGORIES.sports); // 旧: 文化系
      expect(classifyCategory("K.I.Cバスケットボール同好会")).toBe(CATEGORIES.sports); // 旧: 文化系
    });

    it("囲碁・将棋は運動系ではなく趣味", () => {
      expect(classifyCategory("囲碁部")).toBe(CATEGORIES.hobby); // 旧: 運動系
    });

    it("新聞・放送はメディアに寄せる", () => {
      expect(classifyCategory("一橋新聞部")).toBe(CATEGORIES.media); // 旧: 運動系
      expect(classifyCategory("KUBS 京都大学放送局", "京都大学")).toBe(CATEGORIES.media); // 旧: 学術
    });

    it("実行委員会はイベント・企画", () => {
      expect(classifyCategory("大学祭中央実行委員会")).toBe(CATEGORIES.event); // 旧: 学術
      expect(classifyCategory("ソフィア祭実行委員会")).toBe(CATEGORIES.event); // 旧: 文化系
    });

    it("留学生会・ESSは国際交流・語学", () => {
      expect(classifyCategory("上智大学中国留学生会", "上智大学")).toBe(CATEGORIES.international);
      expect(classifyCategory("英語研究部（ESS）")).toBe(CATEGORIES.international); // 旧: 運動系
    });

    it("ボランティア団体をボランティアに寄せる", () => {
      expect(classifyCategory("ボランティアサークル たなぼた")).toBe(CATEGORIES.volunteer); // 旧: 文化系
    });
  });

  describe("ルールの順序が効いていること", () => {
    it("「スポーツ新聞会」は運動系ではなくメディア", () => {
      expect(classifyCategory("スポーツ新聞会")).toBe(CATEGORIES.media);
    });

    it("「ジャズ研究会」は学術ではなく文化系", () => {
      expect(classifyCategory("ジャズ研究会")).toBe(CATEGORIES.culture);
    });

    it("「アメリカンミュージック研究会」も文化系", () => {
      expect(classifyCategory("アメリカンミュージック研究会")).toBe(CATEGORIES.culture);
    });

    it("伝統芸能・音楽ジャンル名も文化系として拾う", () => {
      // 「◯◯研究会」という名前だと、ジャンル名を拾えないと全部学術に落ちてしまう
      expect(classifyCategory("能楽研究会宝生流")).toBe(CATEGORIES.culture);
      expect(classifyCategory("ブルーグラス研究会")).toBe(CATEGORIES.culture);
    });

    it("「奇術研究会」は学術ではなく趣味", () => {
      expect(classifyCategory("奇術研究会")).toBe(CATEGORIES.hobby);
    });

    it("分野の手がかりが無い「研究会」だけが学術に落ちる", () => {
      expect(classifyCategory("アマチュア無線研究会")).toBe(CATEGORIES.academic);
      expect(classifyCategory("ロボット技術研究会")).toBe(CATEGORIES.academic);
    });

    it("「アメリカンフットボール部(医学部)」は学術ではなく運動系", () => {
      expect(classifyCategory("アメリカンフットボール部(医学部)")).toBe(CATEGORIES.sports);
    });

    it("「ソングリーダー部」は応援・チア系なので運動系", () => {
      // 「グリー」への部分一致で文化系に落ちる誤爆があったため、
      // 文化系のキーワードは「グリークラブ」にしてある
      expect(classifyCategory("ソングリーダー部（Capellas）")).toBe(CATEGORIES.sports);
    });
  });

  describe("確信が持てないときは現状維持にする", () => {
    it("手がかりの無い名前は null", () => {
      expect(classifyCategory("さくらの会")).toBeNull();
      expect(classifyCategory("Bridge")).toBeNull();
    });

    it("空の名前は null", () => {
      expect(classifyCategory(null)).toBeNull();
      expect(classifyCategory("")).toBeNull();
      expect(classifyCategory("   ")).toBeNull();
    });
  });
});
