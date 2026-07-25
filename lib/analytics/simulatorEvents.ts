type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

export type SimulatorWallStatus = "safe" | "warn" | "over";
export type SimulatorCircleLevel = "none" | "light" | "normal" | "hardcore";
export type SimulatorSharePlatform = "x" | "line";

export interface SimulatorCompleteInput {
  score: number; // 0〜100 の充実度スコア
  wallStatus: SimulatorWallStatus;
  circleLevel: SimulatorCircleLevel;
  credits: number;
  targetIncome: number;
}

/** 充実度スコア（0〜100）を帯に丸める。
 * 区切りは page.tsx の scoreLabel（85 / 70 / 55 / 40）と揃えている。
 * 生スコアをそのまま送るとカーディナリティが高くレポートで扱いにくいため、
 * gpa の value_band と同じ思想で帯にする。 */
export function scoreToBand(score: number): string {
  if (score >= 85) return "85-100";
  if (score >= 70) return "70-84";
  if (score >= 55) return "55-69";
  if (score >= 40) return "40-54";
  return "0-39";
}

/** GA4 イベント simulator_complete のパラメータを組み立てる（純粋関数・テスト対象）。 */
export function buildSimulatorCompleteParams(e: SimulatorCompleteInput) {
  return {
    score_band: scoreToBand(e.score),
    wall_status: e.wallStatus,
    circle_level: e.circleLevel,
    credits: e.credits,
    target_income: e.targetIncome,
  };
}

/** GA4 イベント simulator_share のパラメータを組み立てる（純粋関数・テスト対象）。 */
export function buildSimulatorShareParams(platform: SimulatorSharePlatform) {
  return { share_platform: platform };
}

/** シミュレーターの診断完了を GA4 に送る。gtag が無い環境では何もしない。 */
export function trackSimulatorComplete(e: SimulatorCompleteInput): void {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  if (typeof w.gtag !== "function") return;
  w.gtag("event", "simulator_complete", buildSimulatorCompleteParams(e));
}

/** シミュレーター結果のシェアを GA4 に送る。gtag が無い環境では何もしない。 */
export function trackSimulatorShare(platform: SimulatorSharePlatform): void {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  if (typeof w.gtag !== "function") return;
  w.gtag("event", "simulator_share", buildSimulatorShareParams(platform));
}
