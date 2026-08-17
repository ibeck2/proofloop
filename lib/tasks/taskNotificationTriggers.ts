/**
 * タスク通知の発火判定。UIコンポーネント（app/(club)/clubtasks/page.tsx）から
 * ドラッグ操作・フォーム保存の両方で呼ばれる想定。prev=null は新規タスク作成を表す
 * （「以前はこの状態でなかった」に自然に該当するため、新規作成もこの1本のルールで
 * カバーできる）。
 */

export interface TaskReviewState {
  status: string;
  reviewerId: string | null;
}

export function shouldNotifyReviewAssigned(
  prev: TaskReviewState | null,
  next: TaskReviewState,
  actorUserId: string | null
): boolean {
  if (next.status !== "in_review") return false;
  if (!next.reviewerId) return false;
  if (next.reviewerId === actorUserId) return false;

  const wasInReview = prev?.status === "in_review";
  const sameReviewer = prev?.reviewerId === next.reviewerId;
  if (wasInReview && sameReviewer) return false;

  return true;
}

export interface TaskAssigneeState {
  assigneeId: string | null;
}

export function shouldNotifyAssigneeChanged(
  prev: TaskAssigneeState | null,
  next: TaskAssigneeState,
  actorUserId: string | null
): boolean {
  if (!next.assigneeId) return false;
  if (next.assigneeId === actorUserId) return false;
  if (prev?.assigneeId === next.assigneeId) return false;

  return true;
}
