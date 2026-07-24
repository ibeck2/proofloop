import { describe, expect, it } from "vitest";
import { CATEGORIES } from "./classifyCategory";
import {
  categoryForGenres,
  genreJa,
  handleFrom,
  splitActivity,
  toOrganization,
  type WasedaCircle,
} from "./wasedaImport";

// 実際に取得した1件（id=3162）
const base: WasedaCircle = {
  id: 3162,
  source_url: "https://www.waseda.jp/inst/weekly/circleguide/detail/?id=3162",
  name: "軟式野球部",
  genre_label: "野球 / Baseball",
  description: "私たち軟式野球部は東京六大学軟式野球連盟に所属し、春季秋季のリーグ戦を戦っています。",
  activity: "月〜金曜日/9時〜11時or13時/石神井公園・浮間公園など",
  member_count_raw: "46人",
  founded_raw: "1961年",
  x_url: "https://twitter.com/AgouWASEDA",
  instagram_url: null,
  line_url: null,
  website_url: null,
};

describe("genreJa", () => {
  it("「野球 / Baseball」から日本語側を取り出す", () => {
    expect(genreJa("野球 / Baseball")).toBe("野球");
  });

  it("スペースが無い表記にも耐える（実データに「宗教 /Religion」がある）", () => {
    expect(genreJa("宗教 /Religion")).toBe("宗教");
    expect(genreJa("スキー/ Skiing")).toBe("スキー");
  });
});

describe("categoryForGenres", () => {
  it("団体名から決まるならそれを使う", () => {
    expect(categoryForGenres(["baseball"], "軟式野球部")).toBe(CATEGORIES.sports);
    expect(categoryForGenres([], "ロッククライミング")).toBe(CATEGORIES.sports);
    expect(categoryForGenres([], "交響楽団")).toBe(CATEGORIES.culture);
  });

  it("早稲田のジャンルが既存DBの分類と食い違うときは既存側に揃える", () => {
    // 早稲田では囲碁・将棋は japanese-culture、管絃楽団やショパンの会は hobby。
    // 既存1,958団体では囲碁部＝趣味、交響楽団＝文化系にしてあるので、そちらに合わせる
    expect(categoryForGenres(["japanese-culture"], "囲碁会")).toBe(CATEGORIES.hobby);
    expect(categoryForGenres(["japanese-culture"], "将棋部")).toBe(CATEGORIES.hobby);
    expect(categoryForGenres(["hobby"], "早稲田大学フィルハーモニー管絃楽団")).toBe(CATEGORIES.culture);
  });

  it("名前にも手がかりが無ければ、早稲田のジャンルに従う", () => {
    // 「ショパンの会」はピアノサークルだが名前からは決められない。
    // 作曲家名まで辞書に入れるときりが無いので、ジャンル（hobby）に委ねる
    expect(categoryForGenres(["hobby"], "ショパンの会")).toBe(CATEGORIES.hobby);
  });

  it("団体名で決まらないときにジャンルが効く", () => {
    expect(categoryForGenres(["volunteer"], "あいの会")).toBe(CATEGORIES.volunteer);
    expect(categoryForGenres(["tennis"], "タッチ☆ネッツ")).toBe(CATEGORIES.sports);
  });

  it("上位の受け皿ジャンルより細かいジャンルを優先する", () => {
    expect(categoryForGenres(["others", "volunteer"], "あいの会")).toBe(CATEGORIES.volunteer);
  });

  it("どちらでも決まらなければ趣味・その他に落とす", () => {
    expect(categoryForGenres([], "さくらの会")).toBe(CATEGORIES.hobby);
  });
});

describe("splitActivity", () => {
  it("日時と場所に振り分ける", () => {
    expect(splitActivity("毎週火曜日/18時半/学生会館")).toEqual({
      frequency: "毎週火曜日 / 18時半",
      location: "学生会館",
    });
  });

  it("場所しか無いときは活動頻度を空にする", () => {
    // 位置で決め打ちすると「学生会館E719」が活動頻度に入ってしまう
    expect(splitActivity("学生会館E719/大隈講堂")).toEqual({
      frequency: null,
      location: "学生会館E719 / 大隈講堂",
    });
  });

  it("全角スラッシュも区切りとして扱う", () => {
    expect(splitActivity("週１回／学生会館会議室")).toEqual({
      frequency: "週１回",
      location: "学生会館会議室",
    });
  });

  it("装飾で入っている空の区切りを落とす", () => {
    const r = splitActivity("平日（授業後）・土日/ /// /// //都内の野球場");
    expect(r.frequency).toBe("平日（授業後）・土日");
    expect(r.location).toBe("都内の野球場");
  });

  it("日時と場所が一体になった断片は日時側に寄せる", () => {
    const r = splitActivity("毎週水曜・「日本教室」/月曜〜金曜2-5限・15号館ラウンジ");
    expect(r.frequency).toContain("月曜〜金曜2-5限・15号館ラウンジ");
  });

  it("空なら両方 null", () => {
    expect(splitActivity(null)).toEqual({ frequency: null, location: null });
    expect(splitActivity("   ")).toEqual({ frequency: null, location: null });
  });
});

describe("handleFrom", () => {
  it("既存データに合わせて「@ハンドル」形式にする", () => {
    expect(handleFrom("https://twitter.com/AgouWASEDA")).toBe("@AgouWASEDA");
    expect(handleFrom("https://www.instagram.com/edonokai/")).toBe("@edonokai");
  });

  it("投稿URLなど、ハンドルでないものは拾わない", () => {
    expect(handleFrom("https://www.instagram.com/p/ABC123/")).toBeNull();
    expect(handleFrom(null)).toBeNull();
  });
});

describe("toOrganization", () => {
  it("活動内容は既定では取り込まない（転載になるため）", () => {
    expect(toOrganization(base).description).toBeNull();
  });

  it("明示的に指定したときだけ活動内容を入れる", () => {
    expect(toOrganization(base, { includeDescription: true }).description).toContain("軟式野球部");
  });

  it("既定では非公開で入れる", () => {
    expect(toOrganization(base).is_approved).toBe(false);
  });

  it("大学名を早稲田大学で埋める", () => {
    expect(toOrganization(base).university).toBe("早稲田大学");
  });

  it("人数は既存データに合わせて単位付きの文字列のまま入れる", () => {
    expect(toOrganization(base).member_count).toBe("46人");
  });

  it("全体像", () => {
    expect(toOrganization(base, { includeDescription: false, isApproved: true, genres: ["baseball"] })).toMatchObject({
      name: "軟式野球部",
      university: "早稲田大学",
      category: CATEGORIES.sports,
      member_count: "46人",
      activity_frequency: "月〜金曜日 / 9時〜11時or13時",
      location_detail: "石神井公園・浮間公園など",
      x_id: "@AgouWASEDA",
      instagram_id: null,
      is_verified: false,
      is_approved: true,
    });
  });
});
