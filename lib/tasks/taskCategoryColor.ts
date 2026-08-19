/**
 * タスクの種別（category）は自由入力のためDB上に色の定義を持たない。
 * 文字列から決定的に色を算出し、同じ種別は常に同じ色になるようにする。
 *
 * パレットは dataviz スキルの検証済みカテゴリカルパレット（8色・中間彩度、
 * ProofLoopの白地 #FFFFFF に対して validate_palette.js で再検証済み）をそのまま採用。
 * lib/design/tokens.ts の6色（ブランドの「印」としての意味を持つ）とは独立した、
 * 種別タグ専用のセット。ink・seal等の既存トークンの意味は変更しない。
 */
export const CATEGORY_PALETTE = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
] as const;

export type CategoryColor = {
  /** ドット・ボーダー原色として使う6桁hex */
  hex: string;
  /** ドット塗りつぶし色（hexと同じ） */
  dot: string;
  /** バッジの枠線色（hex + 約40%アルファ） */
  border: string;
  /** バッジの背景の淡い色（hex + 約8%アルファ） */
  tint: string;
};

/**
 * 文字列を32bit符号なし整数にハッシュする（FNV系の単純な乗算ハッシュ）。
 * 日本語を含む任意のJS文字列に対して決定的に動作する。
 */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function categoryColor(
  category: string | null | undefined
): CategoryColor | null {
  const trimmed = category?.trim();
  if (!trimmed) return null;

  const index = hashString(trimmed) % CATEGORY_PALETTE.length;
  const hex = CATEGORY_PALETTE[index];

  return {
    hex,
    dot: hex,
    border: `${hex}66`,
    tint: `${hex}14`,
  };
}
