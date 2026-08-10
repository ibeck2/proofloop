import { describe, it, expect } from "vitest";
import { parseBasicAuthHeader, constantTimeEqual, evaluateBasicAuth } from "./basicAuth";

/** テスト用に Basic ヘッダを組み立てる */
const header = (user: string, password: string) =>
  `Basic ${Buffer.from(`${user}:${password}`, "utf8").toString("base64")}`;

describe("parseBasicAuthHeader", () => {
  it("ユーザー名とパスワードを取り出す", () => {
    expect(parseBasicAuthHeader(header("ops", "s3cret"))).toEqual({
      user: "ops",
      password: "s3cret",
    });
  });

  it("スキーム名の大文字小文字は問わない（RFC 7617）", () => {
    expect(parseBasicAuthHeader(header("ops", "s3cret").replace("Basic", "basic"))).toEqual({
      user: "ops",
      password: "s3cret",
    });
  });

  // パスワードに : が入るのは正当。最初の : だけで区切る
  it("パスワードに含まれるコロンを壊さない", () => {
    expect(parseBasicAuthHeader(header("ops", "a:b:c"))).toEqual({
      user: "ops",
      password: "a:b:c",
    });
  });

  it("非ASCIIのパスワードをUTF-8として復元する", () => {
    expect(parseBasicAuthHeader(header("ops", "パス𝟙ワード"))).toEqual({
      user: "ops",
      password: "パス𝟙ワード",
    });
  });

  it("ヘッダが無い・別スキーム・壊れたbase64は null", () => {
    expect(parseBasicAuthHeader(null)).toBeNull();
    expect(parseBasicAuthHeader("")).toBeNull();
    expect(parseBasicAuthHeader("Bearer abc")).toBeNull();
    expect(parseBasicAuthHeader("Basic !!!not-base64!!!")).toBeNull();
  });

  // コロンが無い＝ユーザーとパスワードの区切りが無い。空パスワードとして通さない
  it("コロンを含まない値は null", () => {
    expect(parseBasicAuthHeader(`Basic ${Buffer.from("opsonly").toString("base64")}`)).toBeNull();
  });
});

describe("constantTimeEqual", () => {
  it("同じ文字列は true、違えば false", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
  });

  it("長さが違えば false", () => {
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
    expect(constantTimeEqual("", "a")).toBe(false);
  });

  it("両方空なら true", () => {
    expect(constantTimeEqual("", "")).toBe(true);
  });
});

describe("evaluateBasicAuth", () => {
  const configured = { expectedUser: "ops", expectedPassword: "s3cret" };

  it("正しい資格情報なら通す", () => {
    expect(
      evaluateBasicAuth({ header: header("ops", "s3cret"), ...configured, isProduction: true })
    ).toEqual({ allow: true, reason: "credentials_ok" });
  });

  it("パスワードが違えば拒否", () => {
    expect(
      evaluateBasicAuth({ header: header("ops", "wrong"), ...configured, isProduction: true })
    ).toEqual({ allow: false, reason: "bad_credentials" });
  });

  it("ユーザー名が違えば拒否", () => {
    expect(
      evaluateBasicAuth({ header: header("other", "s3cret"), ...configured, isProduction: true })
    ).toEqual({ allow: false, reason: "bad_credentials" });
  });

  it("ヘッダが無ければ拒否（ブラウザに認証を促す合図）", () => {
    expect(evaluateBasicAuth({ header: null, ...configured, isProduction: true })).toEqual({
      allow: false,
      reason: "missing_header",
    });
  });

  it("ヘッダが壊れていれば拒否", () => {
    expect(
      evaluateBasicAuth({ header: "Bearer xyz", ...configured, isProduction: true })
    ).toEqual({ allow: false, reason: "malformed_header" });
  });

  // ここが方針の要。設定漏れを「素通し」にすると、
  // 入れたつもりの防壁が黙って存在しない状態になる
  it("本番で環境変数が未設定なら閉じる（fail closed）", () => {
    expect(
      evaluateBasicAuth({
        header: header("ops", "s3cret"),
        expectedUser: "",
        expectedPassword: "",
        isProduction: true,
      })
    ).toEqual({ allow: false, reason: "not_configured" });
  });

  it("片方だけ設定されていても本番では閉じる", () => {
    expect(
      evaluateBasicAuth({
        header: header("ops", "s3cret"),
        expectedUser: "ops",
        expectedPassword: "",
        isProduction: true,
      })
    ).toEqual({ allow: false, reason: "not_configured" });
  });

  // ローカル開発で毎回パスワードを入れさせると、開発が止まるだけで何も守れない
  it("本番以外で未設定なら通す", () => {
    expect(
      evaluateBasicAuth({
        header: null,
        expectedUser: "",
        expectedPassword: "",
        isProduction: false,
      })
    ).toEqual({ allow: true, reason: "not_configured_dev" });
  });

  it("本番以外でも設定されていれば検証する", () => {
    expect(
      evaluateBasicAuth({ header: header("ops", "wrong"), ...configured, isProduction: false })
    ).toEqual({ allow: false, reason: "bad_credentials" });
  });
});
