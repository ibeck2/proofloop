/**
 * 団体ページ（/organizations/[id]）の title / description を組み立てる。
 *
 * なぜ必要か：
 * 以前は generateMetadata が無く、承認済み1,958団体すべてが root layout の
 * 既定値をそのまま使っていた。つまり全ページが同一タイトル・同一 description で、
 * 検索エンジンから見て見分けがつかない状態だった。名前と大学だけでも一意にできる。
 *
 * 方針：
 * - 持っていない情報を書かない。activity_frequency と member_count は
 *   埋まっている団体だけに触れる（それぞれ43%・13%しか入っていない）。
 * - カテゴリは title / description に入れない。分類自体の精度に問題があり
 *   （運動系に音楽系が混ざっている等）、誤りをメタデータに焼き付けたくないため。
 * - title の末尾に「| ProofLoop」を付けない。app/layout.tsx の
 *   title.template = "%s | ProofLoop" が自動で付与する。
 */

export type OrgMetaSource = {
  name: string | null;
  university: string | null;
  description: string | null;
  activity_frequency: string | null;
  /** DBの型は text。「46人」「４０人」のように単位付き・全角混じりで入っている */
  member_count: string | number | null;
};

/**
 * member_count から人数を取り出す。
 *
 * カラムは text で、実データは「46人」「１7人」「４０人」のように
 * 単位付きで、全角数字が混ざっているものもある。数値として比較できないと
 * 「0人」を弾けないので、ここで正規化する。
 */
export function parseMemberCount(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const normalized = value.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const m = /\d+/.exec(normalized);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** 表示に使えない値（null・空文字・空白のみ）を弾く */
function present(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

export function buildOrgTitle(org: OrgMetaSource): string {
  const name = present(org.name) ?? "学生団体";
  const univ = present(org.university);
  return univ ? `${name}（${univ}）` : name;
}

export function buildOrgDescription(org: OrgMetaSource): string {
  const name = present(org.name) ?? "この学生団体";
  const univ = present(org.university);
  const own = present(org.description);

  // 団体自身が書いた説明があるならそれを最優先で使う。
  // 我々が組み立てた定型文より、本人の言葉のほうが正確で情報量がある。
  if (own) {
    return own.length > 120 ? `${own.slice(0, 119)}…` : own;
  }

  const parts: string[] = [
    univ ? `${univ}の学生団体「${name}」の情報ページです。` : `学生団体「${name}」の情報ページです。`,
  ];

  const freq = present(org.activity_frequency);
  if (freq) parts.push(`活動頻度は${freq}。`);

  const members = parseMemberCount(org.member_count);
  if (members !== null && members > 0) parts.push(`メンバーは約${members}人。`);

  parts.push("公式サイトやSNSへのリンクをまとめています。");
  return parts.join("");
}
