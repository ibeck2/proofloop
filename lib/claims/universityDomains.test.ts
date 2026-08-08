import { describe, it, expect } from "vitest";
import { matchUniversityDomain } from "./universityDomains";

describe("matchUniversityDomain", () => {
  it("ドメインが一致すれば緑", () => {
    expect(matchUniversityDomain("a@waseda.jp", "早稲田大学", false)).toBe("green");
    expect(matchUniversityDomain("a@u-tokyo.ac.jp", "東京大学", false)).toBe("green");
  });

  it("サブドメインでも一致とみなす", () => {
    expect(matchUniversityDomain("a@g.ecc.u-tokyo.ac.jp", "東京大学", false)).toBe("green");
    expect(matchUniversityDomain("a@eagle.sophia.ac.jp", "上智大学", false)).toBe("green");
  });

  it("別大学のドメインなら赤", () => {
    expect(matchUniversityDomain("a@keio.jp", "早稲田大学", false)).toBe("red");
  });

  it("対応表に無い大学は灰（取りこぼしで正当な団体を弾かない）", () => {
    expect(matchUniversityDomain("a@example.ac.jp", "どこかの大学", false)).toBe("gray");
  });

  it("対応表にある大学でも、未知のドメインは灰（赤にしない）", () => {
    expect(matchUniversityDomain("a@unknown.ac.jp", "早稲田大学", false)).toBe("gray");
  });

  it("インカレ団体は大学が一意でないので常に灰", () => {
    expect(matchUniversityDomain("a@keio.jp", "早稲田大学", true)).toBe("gray");
  });

  it("メールが無ければ灰", () => {
    expect(matchUniversityDomain(null, "早稲田大学", false)).toBe("gray");
  });
});
