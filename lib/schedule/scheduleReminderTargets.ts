import type { ScheduleReadStatus } from "./scheduleReadStatus";

export interface ScheduleMemberStatus {
  userId: string;
  status: ScheduleReadStatus;
}

export function reminderTargetUserIds(members: ScheduleMemberStatus[]): string[] {
  return members.filter((m) => m.status !== "responded").map((m) => m.userId);
}
