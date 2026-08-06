import { describe, expect, it } from "vitest";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_TOO_SHORT_MESSAGE,
  validateNewPassword,
} from "./password";

describe("PASSWORD_MIN_LENGTH", () => {
  it("8文字である", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });

  // 画面に出す文言と実際の閾値がずれると、利用者は何文字必要か分からなくなる。
  it("エラー文言に閾値の数字が含まれている", () => {
    expect(PASSWORD_TOO_SHORT_MESSAGE).toContain(String(PASSWORD_MIN_LENGTH));
  });
});

describe("validateNewPassword", () => {
  it("8文字ちょうどは通る", () => {
    expect(validateNewPassword("abcd1234")).toEqual({ ok: true });
  });

  it("9文字以上は通る", () => {
    expect(validateNewPassword("abcd12345")).toEqual({ ok: true });
  });

  it("7文字は短すぎとして弾く", () => {
    expect(validateNewPassword("abcd123")).toEqual({
      ok: false,
      message: PASSWORD_TOO_SHORT_MESSAGE,
    });
  });

  it("空欄は「入力してください」で弾く（短すぎとは区別する）", () => {
    const result = validateNewPassword("");
    expect(result.ok).toBe(false);
    expect(result).not.toEqual({ ok: false, message: PASSWORD_TOO_SHORT_MESSAGE });
  });

  it("空白だけの入力は空欄として扱う", () => {
    expect(validateNewPassword("        ")).toEqual(validateNewPassword(""));
  });

  // 前後の空白は登録時に trim される。trim 後の長さで判定しないと、
  // 「        a」のような実質1文字のパスワードが通ってしまう。
  it("前後の空白を除いた長さで判定する", () => {
    expect(validateNewPassword("   abcd1234   ")).toEqual({ ok: true });
    expect(validateNewPassword("   abcd123   ")).toEqual({
      ok: false,
      message: PASSWORD_TOO_SHORT_MESSAGE,
    });
  });

  it("マルチバイト文字も1文字として数える", () => {
    expect(validateNewPassword("ぱすわーど八")).toEqual({
      ok: false,
      message: PASSWORD_TOO_SHORT_MESSAGE,
    });
    expect(validateNewPassword("ぱすわーど八文字")).toEqual({ ok: true });
  });
});
