export type WallMarker = { val: number; label: string };
export type WallMarkerLabelGroup = { positionPct: number; text: string };

/**
 * 隣接するマーカーの位置が近すぎてラベルが重なる場合、1つのグループにまとめる。
 * markersはval昇順で渡されている前提。
 */
export function groupWallMarkerLabels(
  markers: WallMarker[],
  annualMax: number,
  crowdThresholdPct: number = 6,
): WallMarkerLabelGroup[] {
  const groups: { positionPct: number; labels: string[] }[] = [];
  for (const m of markers) {
    const pct = (m.val / annualMax) * 100;
    const last = groups[groups.length - 1];
    if (last && pct - last.positionPct < crowdThresholdPct) {
      last.labels.push(m.label);
      last.positionPct = (last.positionPct + pct) / 2;
    } else {
      groups.push({ positionPct: pct, labels: [m.label] });
    }
  }
  return groups.map((g) => ({ positionPct: g.positionPct, text: g.labels.join("/") }));
}
