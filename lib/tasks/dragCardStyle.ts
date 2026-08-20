import type { CSSProperties } from "react";
import type { DraggableStateSnapshot } from "@hello-pangea/dnd";

/**
 * ドロップ確定アニメーションの時間（ms）。@hello-pangea/dnd の既定は
 * 330〜550ms（距離に応じて可変）で、体感の重さの主因だったため短縮する。
 */
export const SHORT_DROP_DURATION_MS = 120;

/**
 * DraggableTaskCard のカード用style。draggableStyle（@hello-pangea/dnd が
 * ドラッグ追従・ドロップ確定アニメーションに使う transform/transition を含む）と
 * extraStyle（種別tint等のカード固有スタイル）を、どちらも失わずマージする。
 *
 * かつてはJSXで `{...draggableProvided.draggableProps} style={extraStyle}` と
 * 書いており、後勝ちのJSX仕様により draggableStyle が丸ごと消えていた
 * （ドラッグ中にカードがマウスに追従しない不具合の直接原因）。
 */
export function buildDragCardStyle(
  draggableStyle: CSSProperties | undefined,
  snapshot: Pick<DraggableStateSnapshot, "isDropAnimating" | "dropAnimation">,
  extraStyle: CSSProperties | undefined
): CSSProperties | undefined {
  if (snapshot.isDropAnimating && snapshot.dropAnimation) {
    return {
      ...draggableStyle,
      ...extraStyle,
      transition: `all ${SHORT_DROP_DURATION_MS}ms ${snapshot.dropAnimation.curve}`,
    };
  }
  if (!draggableStyle && !extraStyle) return undefined;
  return { ...draggableStyle, ...extraStyle };
}
