import type { GrantLevel, PermissionFlags } from "./types";

/**
 * 付与レベルから権限フラグを決める。
 *
 * limited で止めるのは次の2つだけ:
 *  - can_manage_members … 偽オーナーが仲間を招くと巻き戻しが困難になる
 *  - can_manage_applications … 他人の個人情報
 *
 * profile / posts / finance は「団体自身が claim 後に入れるデータ」なので開ける。
 * 特に finance を止めると「実運用団体＝財務DXに実データを入れている団体」という
 * KPI そのものを塞いでしまう。
 */
export function resolvePermissions(level: GrantLevel): PermissionFlags {
  const full = level === "full";
  return {
    can_edit_profile: true,
    can_manage_posts: true,
    can_manage_finance: true,
    can_manage_members: full,
    can_manage_applications: full,
  };
}
