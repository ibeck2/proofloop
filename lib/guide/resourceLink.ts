export type ResourceKind = "official" | "guide" | "affiliate";

export interface ResourceLinkAttrs {
  rel: string;
  target: string;
  isAd: boolean;
}

/** リンク種別から rel / target / 広告フラグを決める。
 * affiliate は必ず sponsored を含め、広告として開示する（付け忘れ防止）。 */
export function resourceLinkAttrs(kind: ResourceKind): ResourceLinkAttrs {
  if (kind === "affiliate") {
    return { rel: "sponsored noopener noreferrer", target: "_blank", isAd: true };
  }
  return { rel: "noopener noreferrer", target: "_blank", isAd: false };
}
