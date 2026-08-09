/** claim トークンを送る先の候補チャネル。優先順もこの並び順で表す */
export const CHANNEL_PRIORITY = ["x", "instagram", "website", "line"] as const;
export type ChannelKind = (typeof CHANNEL_PRIORITY)[number];

export type OrgChannels = {
  id: string;
  x_id: string | null;
  instagram_id: string | null;
  website_url: string | null;
  line_url: string | null;
};

export type SharedHandleMap = Record<ChannelKind, Set<string>>;

export type PrimaryChannel = {
  channel: ChannelKind;
  handle: string;
};

/** 表記ゆれ（前後空白・先頭@・大文字小文字）を吸収する。空はnull */
export function normalizeHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().replace(/^@+/, "").toLowerCase();
  return v.length > 0 ? v : null;
}

const FIELD_OF: Record<ChannelKind, keyof OrgChannels> = {
  x: "x_id",
  instagram: "instagram_id",
  website: "website_url",
  line: "line_url",
};

function handleOf(org: OrgChannels, channel: ChannelKind): string | null {
  return normalizeHandle(org[FIELD_OF[channel]] as string | null);
}

/**
 * 2団体以上で使われているハンドルを、チャネルごとに集める。
 * 共有されているハンドルは「その団体専用の連絡先」ではないため、
 * claim トークンの送り先にしてはいけない。
 */
export function findSharedHandles(orgs: OrgChannels[]): SharedHandleMap {
  const counts: Record<ChannelKind, Map<string, number>> = {
    x: new Map(),
    instagram: new Map(),
    website: new Map(),
    line: new Map(),
  };
  for (const org of orgs) {
    for (const channel of CHANNEL_PRIORITY) {
      const h = handleOf(org, channel);
      if (!h) continue;
      counts[channel].set(h, (counts[channel].get(h) ?? 0) + 1);
    }
  }
  const shared = {} as SharedHandleMap;
  for (const channel of CHANNEL_PRIORITY) {
    shared[channel] = new Set(
      [...counts[channel].entries()].filter(([, n]) => n > 1).map(([h]) => h)
    );
  }
  return shared;
}

/**
 * その団体専用のチャネルを優先順に1つ選ぶ。
 * 1つも無ければ null＝通知対象外（誰に届くか保証できないため送らない）。
 */
export function pickPrimaryChannel(
  org: OrgChannels,
  shared: SharedHandleMap
): PrimaryChannel | null {
  for (const channel of CHANNEL_PRIORITY) {
    const handle = handleOf(org, channel);
    if (handle && !shared[channel].has(handle)) return { channel, handle };
  }
  return null;
}
