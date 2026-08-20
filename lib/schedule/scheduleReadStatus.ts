/**
 * 日程調整の既読/未読判定。「回答済み」は全候補に回答した状態のみを指す
 * （一部の候補だけ回答した状態は viewed_no_response のまま——poll全体としては
 * まだリマインド対象、という扱いにする）。
 */

export type ScheduleReadStatus = "unread" | "viewed_no_response" | "responded";

export interface ScheduleMemberResponseState {
  hasViewed: boolean;
  respondedCandidateIds: string[];
}

export function computeReadStatus(
  member: ScheduleMemberResponseState,
  candidateIds: string[]
): ScheduleReadStatus {
  const respondedSet = new Set(member.respondedCandidateIds);
  const respondedAll =
    candidateIds.length > 0 && candidateIds.every((id) => respondedSet.has(id));

  if (respondedAll) return "responded";
  if (member.hasViewed) return "viewed_no_response";
  return "unread";
}
