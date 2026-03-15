/**
 * Phase 6-C: 団体（採用目標・シミュレーター用）
 */

export interface Organization {
  id: string;
  name?: string | null;
  selection_flow?: unknown;
  /** 計画採用人数 */
  planned_hire_count?: number | null;
  /** ステップごとの目標通過率（%）key: ステップ名, value: 0–100 */
  step_target_rates?: Record<string, number> | null;
}
