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

export interface TaskCommentRoles {
  assigneeId: string | null;
  reviewerId: string | null;
  createdBy: string | null;
}

/**
 * コメント投稿時に通知すべき相手（担当者・レビュー者・作成者）を、
 * 投稿者自身を除き重複無く返す。順序は 担当者→レビュー者→作成者。
 */
export function commentNotificationRecipients(
  task: TaskCommentRoles,
  authorId: string
): string[] {
  const candidates = [task.assigneeId, task.reviewerId, task.createdBy];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of candidates) {
    if (id && id !== authorId && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}
