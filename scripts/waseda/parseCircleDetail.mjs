/**
 * 早稲田ウィークリー「サークル詳細」ページから項目を取り出す。
 *
 * ページはラベル付きの節（活動内容 / 活動日時・場所 / 所属人数 / 設立年 /
 * 外国人学生の受け入れ / リンク）で構成されている。ラベル行の位置を見つけ、
 * 次のラベルまでを値として拾う。HTMLのclass名に依存すると先方の改修で壊れるので、
 * 表示ラベルを手がかりにしている。
 */

const LABELS = [
  "活動内容",
  "活動日時・場所",
  "所属人数",
  "設立年",
  "外国人学生の受け入れ",
  "リンク",
];

/** HTMLを可視テキストの行配列にする */
function toLines(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseCircleDetail(html, id) {
  // 存在しないID・サークル以外のページを弾く
  if (!html.includes("サークル詳細")) return null;

  const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(html);
  const rawTitle = titleMatch ? titleMatch[1].replace(/&#8211;|–/g, "|").split("|")[0].trim() : "";

  const lines = toLines(html);

  // ラベルは目次と本文の2回出てくる。本文側＝2回目以降の並びを使う。
  // 「活動内容」の最後の出現位置から後ろを本文とみなす。
  const bodyStart = lines.lastIndexOf("活動内容");
  if (bodyStart < 0) return null;
  const body = lines.slice(bodyStart);

  // サークル名は、先頭側の「Waseda Circle Search:」の直後に出る。
  // ページ末尾にも同じ見出しがあり、そちらの直後はジャンル表示になる。
  const nameIdx = lines.indexOf("Waseda Circle Search:");
  const circleName = nameIdx >= 0 ? (lines[nameIdx + 1] ?? "") : "";

  const values = {};
  for (let i = 0; i < body.length; i++) {
    const label = body[i];
    if (!LABELS.includes(label)) continue;
    const chunk = [];
    for (let j = i + 1; j < body.length; j++) {
      if (LABELS.includes(body[j])) break;
      if (body[j] === "Waseda Circle Search:") break;
      chunk.push(body[j]);
    }
    if (!(label in values)) values[label] = chunk.join(" ").trim();
  }

  // ジャンル表示（「野球 / Baseball」形式）は Waseda Circle Search: の直後
  const gi = body.indexOf("Waseda Circle Search:");
  const genreLabel = gi >= 0 ? (body[gi + 1] ?? "") : "";

  const name = circleName || rawTitle;

  // リンクはページ全体から拾ってはいけない。ヘッダ・フッタに早稲田ウィークリー自身の
  // Instagram や寄付ページが入っていて、サークルのものとして取り込んでしまう。
  // 本文（活動内容の見出し〜末尾の「Waseda Circle Search:」）に範囲を限定する。
  const htmlBodyStart = html.indexOf("活動内容", html.indexOf("活動内容") + 1);
  const htmlBodyEnd = html.lastIndexOf("Waseda Circle Search:");
  const slice =
    htmlBodyStart >= 0 && htmlBodyEnd > htmlBodyStart ? html.slice(htmlBodyStart, htmlBodyEnd) : "";

  const links = [
    ...new Set(
      [...slice.matchAll(/href="(https?:\/\/[^"]+)"/g)]
        .map((m) => m[1])
        .filter((u) => !/\.waseda\.jp|\/\/waseda\.jp/.test(u))
        .filter((u) => !/\.(jpg|jpeg|png|gif|css|js)(\?|$)/i.test(u))
    ),
  ];

  const pick = (re) => links.find((u) => re.test(u)) ?? null;

  return {
    id,
    source_url: `https://www.waseda.jp/inst/weekly/circleguide/detail/?id=${id}`,
    name,
    genre_label: genreLabel,
    description: values["活動内容"] || null,
    activity: values["活動日時・場所"] || null,
    member_count_raw: values["所属人数"] || null,
    founded_raw: values["設立年"] || null,
    intl_raw: values["外国人学生の受け入れ"] || null,
    x_url: pick(/twitter\.com|(^|\/\/)x\.com/),
    instagram_url: pick(/instagram\.com/),
    line_url: pick(/line\.me|lin\.ee/),
    website_url:
      links.find(
        (u) => !/twitter\.com|x\.com|instagram\.com|line\.me|lin\.ee|facebook\.com|youtube\.com|tiktok\.com/.test(u)
      ) ?? null,
  };
}
