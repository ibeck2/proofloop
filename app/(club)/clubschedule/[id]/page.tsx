"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { asRow, asRows } from "@/lib/supabase-rows";
import { Button } from "@/components/ui";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";
import { withOrgIdQuery } from "@/lib/organizationMembers";
import { responseBadgeClass, responseLabel } from "@/lib/schedule/scheduleResponse";
import { computeReadStatus, type ScheduleReadStatus } from "@/lib/schedule/scheduleReadStatus";
import { reminderTargetUserIds } from "@/lib/schedule/scheduleReminderTargets";

type PollRow = {
  id: string;
  title: string;
  description: string | null;
  created_by: string | null;
  organization_id: string;
  organizations: { name: string | null } | null;
};
type CandidateRow = { id: string; starts_at: string; is_decided: boolean };
type ResponseRow = { candidate_id: string; user_id: string; response: string };
type ViewRow = { user_id: string };
type MemberRow = { user_id: string; name: string; email: string | null; role: string | null };

function formatCandidateDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const READ_STATUS_LABEL: Record<ScheduleReadStatus, string> = {
  unread: "未読",
  viewed_no_response: "既読・未回答",
  responded: "回答済み",
};

export default function ClubSchedulePollDetailPage() {
  const params = useParams<{ id: string }>();
  const pollId = params.id;
  // ページ自体はpollの実際のorganization_idでスコープする。isReadyはログイン済み＆
  // どこかの団体に所属していることの簡易ゲートとしてのみ使う（活動データはpollOrgIdで決める）。
  const { isReady } = useClubOrganization();

  const [userId, setUserId] = useState<string | null>(null);
  const [poll, setPoll] = useState<PollRow | null>(null);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [views, setViews] = useState<ViewRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [savingCandidateId, setSavingCandidateId] = useState<string | null>(null);
  const [decidingCandidateId, setDecidingCandidateId] = useState<string | null>(null);
  const [remindSending, setRemindSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  const loadAll = useCallback(async () => {
    if (!pollId) return;

    // pollの実際のorganization_idを先に確定させる（context側のactiveOrgIdは使わない）。
    const { data: pollData } = await supabase
      .from("schedule_polls")
      .select("id, title, description, created_by, organization_id, organizations ( name )")
      .eq("id", pollId)
      .single();
    const pollRow = pollData ? asRow<PollRow>(pollData) : null;
    setPoll(pollRow);
    const pollOrgId = pollRow?.organization_id ?? null;

    const [{ data: candData }, { data: memberRows }] = await Promise.all([
      supabase
        .from("schedule_poll_candidates")
        .select("id, starts_at, is_decided")
        .eq("poll_id", pollId)
        .order("starts_at", { ascending: true }),
      pollOrgId
        ? supabase.from("organization_members").select("user_id, role").eq("organization_id", pollOrgId)
        : Promise.resolve({ data: null as Array<{ user_id: string; role: string }> | null, error: null }),
    ]);

    const candRows = asRows<CandidateRow>(candData);
    setCandidates(candRows);

    const candidateIds = candRows.map((c) => c.id);
    if (candidateIds.length > 0) {
      const { data: respData } = await supabase
        .from("schedule_poll_responses")
        .select("candidate_id, user_id, response")
        .in("candidate_id", candidateIds);
      setResponses(asRows<ResponseRow>(respData));
    } else {
      setResponses([]);
    }

    const { data: viewData } = await supabase
      .from("schedule_poll_views")
      .select("user_id")
      .eq("poll_id", pollId);
    setViews(asRows<ViewRow>(viewData));

    const memberRoleById = new Map(
      (memberRows as Array<{ user_id: string; role: string }> | null)?.map((m) => [m.user_id, m.role]) ?? []
    );
    const memberIds = Array.from(memberRoleById.keys());
    if (memberIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, email")
        .in("id", memberIds);
      const profiles =
        (profileRows as Array<{
          id: string;
          full_name: string | null;
          display_name: string | null;
          email: string | null;
        }> | null) ?? [];
      setMembers(
        profiles.map((p) => ({
          user_id: p.id,
          name: p.full_name?.trim() || p.display_name?.trim() || "（氏名未設定）",
          email: p.email?.trim() || null,
          role: memberRoleById.get(p.id) ?? null,
        }))
      );
    } else {
      setMembers([]);
    }
  }, [pollId]);

  useEffect(() => {
    if (isReady) loadAll();
  }, [isReady, loadAll]);

  // 詳細ページを開いた時点で既読を記録する（初回のみ、SET句が無いのでUPDATE権限は不要）
  useEffect(() => {
    if (!pollId || !userId) return;
    supabase
      .from("schedule_poll_views")
      .upsert({ poll_id: pollId, user_id: userId }, { onConflict: "poll_id,user_id", ignoreDuplicates: true })
      .then(({ error }) => {
        if (error) console.error("schedule_poll_views upsert error:", error);
      });
  }, [pollId, userId]);

  const candidateIds = useMemo(() => candidates.map((c) => c.id), [candidates]);

  const responsesByUser = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const r of responses) {
      if (!map[r.user_id]) map[r.user_id] = {};
      map[r.user_id][r.candidate_id] = r.response;
    }
    return map;
  }, [responses]);

  const viewedUserIds = useMemo(() => new Set(views.map((v) => v.user_id)), [views]);

  const memberStatuses = useMemo(
    () =>
      members.map((m) => {
        const respondedCandidateIds = Object.keys(responsesByUser[m.user_id] ?? {});
        const status = computeReadStatus(
          { hasViewed: viewedUserIds.has(m.user_id), respondedCandidateIds },
          candidateIds
        );
        return { ...m, status };
      }),
    [members, responsesByUser, viewedUserIds, candidateIds]
  );

  const reminderTargets = useMemo(
    () =>
      reminderTargetUserIds(memberStatuses.map((m) => ({ userId: m.user_id, status: m.status }))),
    [memberStatuses]
  );

  // activeRoleはcontext（activeOrgId）に紐づくため、pollの実際の団体での自分の役割を
  // メンバー一覧（pollOrgIdでフェッチ済み）から直接引く。
  const ownRole = userId ? members.find((m) => m.user_id === userId)?.role : undefined;
  const canDecide = ownRole === "owner" || ownRole === "admin" || poll?.created_by === userId;

  const handleRespond = async (candidateId: string, response: "yes" | "maybe" | "no") => {
    setSavingCandidateId(candidateId);
    setErrorMessage(null);
    try {
      const { error } = await supabase.rpc("submit_schedule_poll_response", {
        p_candidate_id: candidateId,
        p_response: response,
      });
      if (error) throw error;
      await loadAll();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "回答の保存に失敗しました。");
    } finally {
      setSavingCandidateId(null);
    }
  };

  const handleDecide = async (candidateId: string) => {
    setDecidingCandidateId(candidateId);
    setErrorMessage(null);
    try {
      const { error } = await supabase.rpc("decide_schedule_poll_candidate", {
        p_candidate_id: candidateId,
      });
      if (error) throw error;
      await loadAll();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "確定に失敗しました。");
    } finally {
      setDecidingCandidateId(null);
    }
  };

  const handleRemind = async () => {
    const pollOrgId = poll?.organization_id ?? null;
    if (!pollOrgId || !userId || !poll) return;
    setRemindSending(true);
    setErrorMessage(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const actorName =
        members.find((m) => m.user_id === userId)?.name || "運営メンバー";

      for (const recipientId of reminderTargets) {
        const recipient = members.find((m) => m.user_id === recipientId);
        if (!recipient?.email) continue;

        const { data: enabled, error: prefErr } = await supabase.rpc(
          "is_notification_enabled",
          {
            p_user_id: recipientId,
            p_notification_type: "schedule_poll_reminder",
            p_organization_id: pollOrgId,
          }
        );
        if (prefErr) {
          console.error("is_notification_enabled error:", prefErr);
        } else if (enabled === false) {
          continue;
        }

        await fetch("/api/emails/schedule-notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
          },
          body: JSON.stringify({
            type: "schedule_poll_reminder",
            email: recipient.email,
            recipientName: recipient.name,
            actorName,
            pollTitle: poll.title,
            organizationName: poll.organizations?.name ?? "団体",
            pollId,
          }),
        });
      }
    } catch (err) {
      console.error("reminder send error:", err);
      setErrorMessage("リマインドの送信に失敗しました。");
    } finally {
      setRemindSending(false);
    }
  };

  if (!poll) {
    return (
      <div className="p-6 lg:p-10">
        <p className="text-graphite/70">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl">
      <Link
        href={withOrgIdQuery("/clubschedule", poll.organization_id)}
        className="inline-flex items-center gap-1.5 text-sm text-graphite/70 hover:text-ink mb-4"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        日程調整一覧に戻る
      </Link>
      <h2 className="text-2xl font-bold text-ink font-mincho mb-2">{poll.title}</h2>
      {poll.description && <p className="text-graphite/70 text-sm mb-6">{poll.description}</p>}

      {errorMessage && (
        <div className="border border-rule border-l-4 border-l-seal bg-mist px-3 py-2 mb-6" role="alert">
          <p className="text-sm text-graphite">{errorMessage}</p>
        </div>
      )}

      <div className="mb-8 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 border-b border-rule text-graphite/70 font-medium">候補日時</th>
              <th className="text-left p-2 border-b border-rule text-graphite/70 font-medium">集計</th>
              <th className="text-left p-2 border-b border-rule text-graphite/70 font-medium">あなたの回答</th>
              {canDecide && (
                <th className="text-left p-2 border-b border-rule text-graphite/70 font-medium">確定</th>
              )}
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => {
              const counts = { yes: 0, maybe: 0, no: 0 };
              for (const r of responses) {
                if (r.candidate_id === c.id && r.response in counts) {
                  counts[r.response as "yes" | "maybe" | "no"] += 1;
                }
              }
              const myResponse = userId ? responsesByUser[userId]?.[c.id] : undefined;
              return (
                <tr key={c.id} className={c.is_decided ? "bg-mist" : undefined}>
                  <td className="p-2 border-b border-rule">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-graphite/70" aria-hidden="true" />
                      {formatCandidateDate(c.starts_at)}
                      {c.is_decided && (
                        <span className="text-xs font-bold border border-ink bg-ink text-paper px-2 py-0.5">
                          確定
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 border-b border-rule">
                    ○{counts.yes} / △{counts.maybe} / ×{counts.no}
                  </td>
                  <td className="p-2 border-b border-rule">
                    <div className="flex gap-1">
                      {(["yes", "maybe", "no"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          disabled={savingCandidateId === c.id}
                          onClick={() => handleRespond(c.id, v)}
                          className={`px-3 py-1.5 text-sm font-bold transition-colors ${
                            myResponse === v
                              ? responseBadgeClass(v)
                              : "border border-rule bg-paper text-graphite hover:border-ink"
                          }`}
                        >
                          {responseLabel(v)}
                        </button>
                      ))}
                    </div>
                  </td>
                  {canDecide && (
                    <td className="p-2 border-b border-rule">
                      <Button
                        variant={c.is_decided ? "outlineMuted" : "primary"}
                        size="sm"
                        disabled={decidingCandidateId === c.id || c.is_decided}
                        onClick={() => handleDecide(c.id)}
                      >
                        {c.is_decided ? "確定済み" : "この候補に決定"}
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-ink">回答状況（{members.length}人中）</h3>
        <Button
          variant="outlineMuted"
          size="sm"
          disabled={reminderTargets.length === 0 || remindSending}
          onClick={handleRemind}
        >
          {remindSending
            ? "送信中..."
            : `未回答者にリマインドを送る（${reminderTargets.length}人）`}
        </Button>
      </div>
      <div className="space-y-2">
        {memberStatuses.map((m) => (
          <div
            key={m.user_id}
            className="flex items-center justify-between p-3 border border-rule rounded"
          >
            <span className="text-ink text-sm">{m.name}</span>
            <span className="text-xs font-bold text-graphite/70">
              {READ_STATUS_LABEL[m.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
