import type { SignalColor } from "./types";

/**
 * 大学とメールドメインの対応表。掲載団体が存在する13大学ぶん。
 * サブドメインは接尾辞一致で吸収する（g.ecc.u-tokyo.ac.jp → u-tokyo.ac.jp）。
 *
 * ⚠️ この表は不完全であることを前提にしている。載っていないドメインは
 * 「赤」ではなく「灰」に倒す。取りこぼしで正当な団体を弾くと claim 率が落ちるため。
 */
export const UNIVERSITY_DOMAINS: Record<string, string[]> = {
  早稲田大学: ["waseda.jp"],
  慶應義塾大学: ["keio.jp"],
  上智大学: ["sophia.ac.jp"],
  京都大学: ["kyoto-u.ac.jp"],
  東京大学: ["u-tokyo.ac.jp"],
  一橋大学: ["hit-u.ac.jp"],
  大阪大学: ["osaka-u.ac.jp"],
  北海道大学: ["hokudai.ac.jp"],
  九州大学: ["kyushu-u.ac.jp"],
  名古屋大学: ["nagoya-u.ac.jp", "thers.ac.jp"],
  東北大学: ["tohoku.ac.jp"],
  国際基督教大学: ["icu.ac.jp"],
  東京科学大学: ["isct.ac.jp", "titech.ac.jp", "tmd.ac.jp"],
};

/** すべての既知ドメイン（どの大学のものか問わず） */
const ALL_KNOWN = new Set(Object.values(UNIVERSITY_DOMAINS).flat());

function domainOf(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const d = email.slice(at + 1).trim().toLowerCase();
  return d.length > 0 ? d : null;
}

function matchesBase(domain: string, base: string): boolean {
  return domain === base || domain.endsWith(`.${base}`);
}

/**
 * 申請者の大学メールが、団体の大学と整合するか。
 * green＝一致 / red＝明確に別大学 / gray＝判断材料にならない
 */
export function matchUniversityDomain(
  email: string | null,
  university: string | null,
  isIntercollege: boolean
): SignalColor {
  if (isIntercollege) return "gray"; // インカレは大学が一意でない
  if (!email || !university) return "gray";

  const bases = UNIVERSITY_DOMAINS[university];
  if (!bases) return "gray"; // 対応表に無い大学

  const domain = domainOf(email);
  if (!domain) return "gray";

  if (bases.some((b) => matchesBase(domain, b))) return "green";

  // 他大学のドメインだと確実に言える場合だけ赤にする
  const isKnownOther = [...ALL_KNOWN].some((b) => matchesBase(domain, b));
  return isKnownOther ? "red" : "gray";
}
