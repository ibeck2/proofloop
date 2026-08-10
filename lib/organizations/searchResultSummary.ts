/**
 * 検索結果の「何件あって、いま何件見えているか」を決める。
 *
 * PostgREST は1リクエストの返却行数に上限があり（本番実測で1,000行）、
 * `/search` は絞り込み無しだと `HTTP 206 / Content-Range: 0-999/2421` になる。
 * それまで画面は取得できた行数をそのまま「全 N 件」と書いていたため、
 * トップに「2,421団体」と出しておきながら、その先の検索画面は「全 1000 件」と
 * 表示していた。数を偽らないために、総数と表示数を分けて持つ。
 */

export type SearchResultSummary = {
  /** 条件に一致する総数 */
  total: number;
  /** いま画面に出ている数 */
  shown: number;
  /** 上限で打ち切られているか */
  truncated: boolean;
};

export function summarizeSearchResults(params: {
  shown: number;
  /** PostgREST の count。取得できなければ null */
  total: number | null;
}): SearchResultSummary {
  const { shown } = params;

  // count が取れないことは起こり得る。0 として扱うと「該当なし」に見えるので、
  // 分かっている表示数を総数とみなす（少なくとも嘘にはならない）。
  // 総数が表示数より小さいのは取得の間にデータが減った場合。差を打ち切りと
  // 解釈すると、存在しない打ち切り表示が出る。
  const total = params.total === null || params.total < shown ? shown : params.total;

  return { total, shown, truncated: total > shown };
}
