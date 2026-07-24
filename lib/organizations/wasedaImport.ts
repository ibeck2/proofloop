/**
 * 早稲田ウィークリー「公認サークルガイド」から取得した項目を、
 * organizations テーブルの形に合わせる。
 *
 * 収集は scripts/waseda/ 配下。ここは純粋な変換だけを持ち、テストできるようにしてある。
 */

import { classifyCategory, CATEGORIES, type Category } from "./classifyCategory";

export type WasedaCircle = {
  id: number;
  source_url: string;
  name: string;
  genre_label: string | null;
  description: string | null;
  activity: string | null;
  member_count_raw: string | null;
  founded_raw: string | null;
  x_url: string | null;
  instagram_url: string | null;
  line_url: string | null;
  website_url: string | null;
};

/**
 * 早稲田側のジャンル（一覧ページの genre[] の値）を ProofLoop のカテゴリに寄せる。
 *
 * ジャンルは詳細ページからは取れない。詳細ページ末尾にある
 * 「Waseda Circle Search: 音楽 / Music」は関連サークル欄の見出しであって、
 * そのサークル自身のジャンルではない（ロッククライミングのページに
 * 「音楽」と出ていた）。一覧ページ側の genre → ID の対応が正しい情報源。
 */
const SLUG_TO_CATEGORY: Record<string, Category> = {
  // スポーツ
  "american-football": CATEGORIES.sports, badminton: CATEGORIES.sports,
  "ball-game": CATEGORIES.sports, baseball: CATEGORIES.sports,
  basketball: CATEGORIES.sports, cycling: CATEGORIES.sports, dance: CATEGORIES.sports,
  football: CATEGORIES.sports, futsal: CATEGORIES.sports, golf: CATEGORIES.sports,
  "horse-riding": CATEGORIES.sports, "martial-arts": CATEGORIES.sports,
  "other-ball-game": CATEGORIES.sports, "other-sports": CATEGORIES.sports,
  outdoor: CATEGORIES.sports, rugby: CATEGORIES.sports, skiing: CATEGORIES.sports,
  sport: CATEGORIES.sports, swimming: CATEGORIES.sports, tennis: CATEGORIES.sports,
  volleyball: CATEGORIES.sports, yacht: CATEGORIES.sports,

  // 文化・芸術
  cinema: CATEGORIES.culture, "culture-art": CATEGORIES.culture,
  "fine-art": CATEGORIES.culture, "japanese-culture": CATEGORIES.culture,
  "japanese-literature": CATEGORIES.culture, music: CATEGORIES.culture,
  "other-culture": CATEGORIES.culture, "performing-arts": CATEGORIES.culture,
  singing: CATEGORIES.culture, theater: CATEGORIES.culture,

  // 学術・研究
  economy: CATEGORIES.academic, history: CATEGORIES.academic, law: CATEGORIES.academic,
  learning: CATEGORIES.academic, "natural-science": CATEGORIES.academic,
  philosophy: CATEGORIES.academic, politics: CATEGORIES.academic,
  religion: CATEGORIES.academic, study: CATEGORIES.academic, technology: CATEGORIES.academic,

  // 国際交流・語学
  "international-exchange": CATEGORIES.international, language: CATEGORIES.international,
  "international-exchange-volunteer": CATEGORIES.international,

  // ボランティア
  volunteer: CATEGORIES.volunteer,

  // メディア・出版
  communication: CATEGORIES.media, media: CATEGORIES.media,
  "media-publication": CATEGORIES.media, publication: CATEGORIES.media,

  // イベント・企画
  planning: CATEGORIES.event, recreation: CATEGORIES.event,

  // その他
  hobby: CATEGORIES.hobby, "other-circle": CATEGORIES.hobby, others: CATEGORIES.hobby,
  toumonkai: CATEGORIES.hobby,
};

/**
 * 上位の受け皿ジャンル。同じサークルが「baseball」と「ball-game」の両方に
 * 属していたら、細かいほうを見たい。
 */
const UMBRELLA = new Set([
  "ball-game", "sport", "study", "culture-art", "media-publication",
  "international-exchange-volunteer", "others", "other-circle",
]);

/** 参考用に残している旧マッピング（詳細ページの日本語ジャンル表示向け） */
const GENRE_TO_CATEGORY: Record<string, Category> = {
  // スポーツ
  野球: CATEGORIES.sports, ラグビー: CATEGORIES.sports, サッカー: CATEGORIES.sports,
  フットサル: CATEGORIES.sports, テニス: CATEGORIES.sports, ゴルフ: CATEGORIES.sports,
  バドミントン: CATEGORIES.sports, バレーボール: CATEGORIES.sports,
  バスケットボール: CATEGORIES.sports, アメリカンフットボール: CATEGORIES.sports,
  その他の球技: CATEGORIES.sports, その他のスポーツ: CATEGORIES.sports,
  サイクリング: CATEGORIES.sports, 武道: CATEGORIES.sports, ダンス: CATEGORIES.sports,
  スキー: CATEGORIES.sports, 水泳: CATEGORIES.sports, 馬術: CATEGORIES.sports,
  ヨット: CATEGORIES.sports, アウトドア: CATEGORIES.sports,

  // 文化・芸術
  音楽: CATEGORIES.culture, 声楽: CATEGORIES.culture, 演劇: CATEGORIES.culture,
  映画: CATEGORIES.culture, 美術: CATEGORIES.culture, 舞台芸術: CATEGORIES.culture,
  日本文化: CATEGORIES.culture, 日本文学: CATEGORIES.culture,
  その他の文化: CATEGORIES.culture,

  // 学術・研究
  学問: CATEGORIES.academic, 哲学: CATEGORIES.academic, 宗教: CATEGORIES.academic,
  歴史: CATEGORIES.academic, 政治: CATEGORIES.academic, 経済: CATEGORIES.academic,
  法学: CATEGORIES.academic, 自然科学: CATEGORIES.academic, 技術: CATEGORIES.academic,

  // 国際交流・語学
  国際交流: CATEGORIES.international, 言語: CATEGORIES.international,

  // ボランティア
  ボランティア: CATEGORIES.volunteer,

  // メディア・出版
  出版: CATEGORIES.media, マスメディア: CATEGORIES.media,
  コミュニケーション: CATEGORIES.media,

  // イベント・企画
  企画: CATEGORIES.event, レクリエーション: CATEGORIES.event,

  // その他
  趣味: CATEGORIES.hobby, 学生稲門会: CATEGORIES.hobby,
};

/** 「野球 / Baseball」から日本語側だけ取り出す */
export function genreJa(label: string | null | undefined): string {
  if (!label) return "";
  return label.split("/")[0].trim();
}

/**
 * 一覧ページ由来のジャンルからカテゴリを決める。
 *
 * 一覧はジャンルあたり24件で頭打ちになるため、全サークルのジャンルが取れるわけ
 * ではない（実測で463件中425件）。取れなかった分は団体名から推定する。
 */
export function categoryForGenres(slugs: readonly string[], name: string): Category {
  // 細かいジャンルを先に見る
  const ordered = [...slugs].sort((a, b) => Number(UMBRELLA.has(a)) - Number(UMBRELLA.has(b)));
  for (const s of ordered) {
    const c = SLUG_TO_CATEGORY[s];
    if (c) return c;
  }
  return classifyCategory(name) ?? CATEGORIES.hobby;
}

/** @deprecated 詳細ページのジャンル表示は関連サークル欄のもので当てにならない */
export function categoryFor(circle: Pick<WasedaCircle, "genre_label" | "name">): Category {
  const mapped = GENRE_TO_CATEGORY[genreJa(circle.genre_label)];
  if (mapped) return mapped;
  return classifyCategory(circle.name) ?? CATEGORIES.hobby;
}

/**
 * 「活動日時・場所」を、活動頻度と活動場所に振り分ける。
 *
 * 実データは「毎週火曜日/18時半/学生会館」のようにスラッシュ区切りだが、
 * 数は1〜14個とばらつき、「学生会館E719/大隈講堂」のように場所しか
 * 入っていないものもある。位置で決め打ちすると場所を活動頻度に入れてしまうので、
 * 各断片が日時を指すのか場所を指すのかを見て振り分ける。
 */
const SCHEDULE_HINT = /(毎週|隔週|毎月|週\s*[0-9０-９一二三四五六七八九十]|月\s*[0-9０-９]+\s*[日回]|[月火水木金土日]曜|平日|土日|不定|随時|時間|[0-9０-９]+\s*時|限)/;
const PLACE_HINT = /(会館|球場|グラウンド|グランド|体育館|教室|号館|ホール|公園|ラウンジ|キャンパス|道場|コート|記念|講堂|センター|室|場|E[0-9]{3})/;

export function splitActivity(activity: string | null | undefined): {
  frequency: string | null;
  location: string | null;
} {
  if (!activity || !activity.trim()) return { frequency: null, location: null };

  // 全角スラッシュも区切りとして扱う。空断片（「/ /// //」のような装飾）は落とす
  const parts = activity
    .split(/[/／]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (parts.length === 0) return { frequency: null, location: null };

  const freq: string[] = [];
  const place: string[] = [];
  for (const p of parts) {
    const isSchedule = SCHEDULE_HINT.test(p);
    const isPlace = PLACE_HINT.test(p);
    // 両方に当てはまる断片（「毎週水曜・15号館ラウンジ」など）は日時側に寄せる。
    // 日時のほうが絞り込みに使われるため。
    if (isSchedule) freq.push(p);
    else if (isPlace) place.push(p);
    else freq.push(p);
  }

  return {
    frequency: freq.length ? freq.join(" / ") : null,
    location: place.length ? place.join(" / ") : null,
  };
}

/** SNSのURLから「@ハンドル」を取り出す。既存データがこの形式のため合わせる。 */
export function handleFrom(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /^https?:\/\/(?:www\.)?[^/]+\/(?:#!\/)?@?([A-Za-z0-9._-]+)/.exec(url);
  if (!m) return null;
  const h = m[1];
  if (!h || /^(p|reel|explore|home|share|intent)$/i.test(h)) return null;
  return `@${h}`;
}

export type OrganizationInsert = {
  name: string;
  university: string;
  category: Category;
  description: string | null;
  member_count: string | null;
  activity_frequency: string | null;
  location_detail: string | null;
  x_id: string | null;
  instagram_id: string | null;
  line_url: string | null;
  website_url: string | null;
  is_verified: boolean;
  is_approved: boolean;
};

export type ToOrganizationOptions = {
  /** 活動内容の文章を取り込むか。転載にあたるので既定は取り込まない。 */
  includeDescription?: boolean;
  /** 公開するか。既定は非公開で入れて、確認してから公開する。 */
  isApproved?: boolean;
  /** 一覧ページ由来のジャンル。無ければ団体名から推定する。 */
  genres?: readonly string[];
};

export function toOrganization(
  circle: WasedaCircle,
  { includeDescription = false, isApproved = false, genres = [] }: ToOrganizationOptions = {}
): OrganizationInsert {
  const { frequency, location } = splitActivity(circle.activity);

  return {
    name: circle.name.trim(),
    university: "早稲田大学",
    category: categoryForGenres(genres, circle.name),
    description: includeDescription ? (circle.description?.trim() || null) : null,
    member_count: circle.member_count_raw?.trim() || null,
    activity_frequency: frequency,
    location_detail: location,
    x_id: handleFrom(circle.x_url),
    instagram_id: handleFrom(circle.instagram_url),
    line_url: circle.line_url,
    website_url: circle.website_url,
    is_verified: false,
    is_approved: isApproved,
  };
}
