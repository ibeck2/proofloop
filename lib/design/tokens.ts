/**
 * ProofLoop のデザイントークン（唯一の定義元）
 * 仕様: docs/superpowers/specs/2026-07-23-ui-identity-design.md §5
 *
 * 色は6つだけ。ここに色を足す前に、既存の6色で表現できないか必ず検討すること。
 */
export const COLORS = {
  /** 紺。見出し・面・ヘッダー・フッター地 */
  ink: "#002B5C",
  /** 深紅。「印」として静止状態で1画面2箇所まで */
  seal: "#8B0000",
  /** 地 */
  paper: "#FFFFFF",
  /** 面の切り替え。青みのある紙色 */
  mist: "#F2F4F7",
  /** 罫線 */
  rule: "#C9D2DC",
  /** 本文 */
  graphite: "#1F2A36",
} as const;

export const FONT_FAMILIES = {
  /** 見出し（h1・主要セクション見出しのみ） */
  mincho: ["Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", "serif"],
  /** 本文・UI */
  body: ["Noto Sans JP", "sans-serif"],
  /** 数値・ラベル */
  numeric: ["Inter", "sans-serif"],
} as const;
