import { describe, it, expect } from "vitest";
import { summarizeSearchResults } from "./searchResultSummary";

describe("summarizeSearchResults", () => {
  it("全件が返っていれば件数だけを言う", () => {
    expect(summarizeSearchResults({ shown: 42, total: 42 })).toEqual({
      total: 42,
      shown: 42,
      truncated: false,
    });
  });

  // 本番で実際に起きていた状態。PostgREST が1,000行で打ち切るため、
  // 表示件数をそのまま「全 N 件」と書くと 2,421 件を 1,000 件と偽ることになる
  it("打ち切られていれば、総数と表示数を分けて持つ", () => {
    expect(summarizeSearchResults({ shown: 1000, total: 2421 })).toEqual({
      total: 2421,
      shown: 1000,
      truncated: true,
    });
  });

  it("0件は打ち切りではない", () => {
    expect(summarizeSearchResults({ shown: 0, total: 0 })).toEqual({
      total: 0,
      shown: 0,
      truncated: false,
    });
  });

  // count が取れないことは起こり得る（PostgRESTがヘッダを返さない等）。
  // そのときに 0 と書くと「該当なし」に見えてしまうので、表示数を総数として扱う
  it("総数が取れなければ表示数を総数とみなし、打ち切り扱いにしない", () => {
    expect(summarizeSearchResults({ shown: 30, total: null })).toEqual({
      total: 30,
      shown: 30,
      truncated: false,
    });
  });

  // 総数のほうが小さいのは、件数取得と本体取得の間にデータが減った場合など。
  // 差を「打ち切り」と解釈すると存在しない打ち切り表示が出る
  it("総数が表示数より小さければ表示数に合わせる", () => {
    expect(summarizeSearchResults({ shown: 10, total: 3 })).toEqual({
      total: 10,
      shown: 10,
      truncated: false,
    });
  });
});
