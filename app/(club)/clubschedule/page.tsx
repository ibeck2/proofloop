"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { asRows } from "@/lib/supabase-rows";
import { Button, Input, Textarea } from "@/components/ui";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";

type PollRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

type CandidateFlagRow = {
  poll_id: string;
  is_decided: boolean;
};

type CandidateDraft = {
  key: string;
  value: string; // datetime-local文字列
};

function isoToLocalDatetime(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

export default function ClubSchedulePage() {
  const {
    loading: ctxLoading,
    activeOrgId: orgId,
    activeOrgName: orgName,
    hasNoMemberships,
    isReady,
    withOrgQuery,
  } = useClubOrganization();

  const [userId, setUserId] = useState<string | null>(null);
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [decidedPollIds, setDecidedPollIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [candidates, setCandidates] = useState<CandidateDraft[]>([
    { key: crypto.randomUUID(), value: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  const loadPolls = useCallback(async () => {
    if (!orgId) return;
    const { data, error } = await supabase
      .from("schedule_polls")
      .select("id, title, description, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("schedule_polls fetch error:", error);
      setPolls([]);
      return;
    }
    setPolls(asRows<PollRow>(data));

    const pollIds = (data ?? []).map((p) => (p as PollRow).id);
    if (pollIds.length === 0) {
      setDecidedPollIds(new Set());
      return;
    }
    const { data: candData, error: candErr } = await supabase
      .from("schedule_poll_candidates")
      .select("poll_id, is_decided")
      .in("poll_id", pollIds)
      .eq("is_decided", true);
    if (candErr) {
      console.error("schedule_poll_candidates fetch error:", candErr);
      setDecidedPollIds(new Set());
      return;
    }
    setDecidedPollIds(
      new Set(asRows<CandidateFlagRow>(candData).map((c) => c.poll_id))
    );
  }, [orgId]);

  useEffect(() => {
    if (orgId) loadPolls();
  }, [orgId, loadPolls]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCandidates([{ key: crypto.randomUUID(), value: "" }]);
    setShowForm(false);
    setErrorMessage(null);
  };

  const addCandidateRow = () => {
    setCandidates((prev) => [...prev, { key: crypto.randomUUID(), value: "" }]);
  };

  const removeCandidateRow = (key: string) => {
    setCandidates((prev) => (prev.length > 1 ? prev.filter((c) => c.key !== key) : prev));
  };

  const updateCandidateRow = (key: string, value: string) => {
    setCandidates((prev) => prev.map((c) => (c.key === key ? { ...c, value } : c)));
  };

  const sendCreatedNotifications = useCallback(
    async (pollId: string, pollTitle: string) => {
      if (!orgId || !userId) return;
      const { data: memberRows, error: memErr } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", orgId);
      if (memErr || !memberRows) return;

      const recipientIds = (memberRows as Array<{ user_id: string }>)
        .map((m) => m.user_id)
        .filter((id) => id !== userId);
      if (recipientIds.length === 0) return;

      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, email")
        .in("id", [...recipientIds, userId]);
      const profiles = (profileRows ?? []) as Array<{
        id: string;
        full_name: string | null;
        display_name: string | null;
        email: string | null;
      }>;
      const nameById: Record<string, string> = {};
      const emailById: Record<string, string> = {};
      for (const p of profiles) {
        nameById[p.id] = p.full_name?.trim() || p.display_name?.trim() || "メンバー";
        if (p.email) emailById[p.id] = p.email.trim();
      }
      const actorName = nameById[userId] || "運営メンバー";

      const {
        data: { session },
      } = await supabase.auth.getSession();

      for (const recipientId of recipientIds) {
        const email = emailById[recipientId];
        if (!email) continue;

        const { data: enabled, error: prefErr } = await supabase.rpc(
          "is_notification_enabled",
          {
            p_user_id: recipientId,
            p_notification_type: "schedule_poll_created",
            p_organization_id: orgId,
          }
        );
        if (prefErr) {
          console.error("is_notification_enabled error:", prefErr);
        } else if (enabled === false) {
          continue;
        }

        fetch("/api/emails/schedule-notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: session?.access_token
              ? `Bearer ${session.access_token}`
              : "",
          },
          body: JSON.stringify({
            type: "schedule_poll_created",
            email,
            recipientName: nameById[recipientId] ?? "メンバー",
            actorName,
            pollTitle,
            organizationName: orgName ?? "団体",
            pollId,
          }),
        }).catch((err) => {
          console.error("schedule-notification email error:", err);
        });
      }
    },
    [orgId, orgName, userId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validCandidates = candidates
      .map((c) => c.value.trim())
      .filter((v) => v.length > 0);
    if (!orgId || !title.trim() || validCandidates.length === 0) {
      setErrorMessage("タイトルと候補日時を1件以上入力してください。");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const { data: pollData, error: pollErr } = await supabase
        .from("schedule_polls")
        .insert({
          organization_id: orgId,
          created_by: userId,
          title: title.trim(),
          description: description.trim() || null,
        })
        .select("id")
        .single();
      if (pollErr || !pollData) throw pollErr ?? new Error("作成に失敗しました。");

      const pollId = (pollData as { id: string }).id;
      const { error: candErr } = await supabase.from("schedule_poll_candidates").insert(
        validCandidates.map((v) => ({
          poll_id: pollId,
          starts_at: new Date(v).toISOString(),
        }))
      );
      if (candErr) throw candErr;

      resetForm();
      loadPolls();
      void sendCreatedNotifications(pollId, title.trim());
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "作成に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const sortedPolls = useMemo(() => polls, [polls]);

  if (ctxLoading) {
    return (
      <div className="p-6 lg:p-10">
        <p className="text-graphite/70">読み込み中...</p>
      </div>
    );
  }

  if (hasNoMemberships || !isReady || !orgId) {
    return (
      <div className="p-6 lg:p-10">
        <p className="text-graphite/70">
          管理できる団体がありません。プロフィール編集から団体情報を作成すると、日程調整を利用できるようになります。
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl">
      <h2 className="text-2xl font-bold text-ink font-mincho mb-2">日程調整</h2>
      <p className="text-graphite/70 text-sm mb-6">
        候補日時に○/△/×で回答してもらい、未回答のメンバーを一目で確認できます。
      </p>

      {!showForm ? (
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)} className="mb-8">
          新しい日程調整を作成
        </Button>
      ) : (
        <div className="mb-8 p-6 rounded-lg border border-rule bg-paper">
          <h3 className="text-lg font-bold text-ink mb-4">日程調整を作成</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="poll-title" className="block text-sm font-bold text-ink mb-2">
                タイトル <span className="text-ink">*</span>
              </label>
              <Input
                id="poll-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 新歓説明会の日程"
                required
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="poll-description" className="block text-sm font-bold text-ink mb-2">
                補足
              </label>
              <Textarea
                id="poll-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="調整の背景や注意事項があれば入力してください"
                rows={3}
                className="w-full"
              />
            </div>
            <div>
              <span className="block text-sm font-bold text-ink mb-2">
                候補日時 <span className="text-ink">*</span>
              </span>
              <div className="space-y-2">
                {candidates.map((c) => (
                  <div key={c.key} className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={c.value}
                      onChange={(e) => updateCandidateRow(c.key, e.target.value)}
                      className="flex-1 border border-rule rounded px-3 py-2 text-ink bg-paper focus:ring-1 focus:ring-ink focus:border-ink"
                    />
                    <button
                      type="button"
                      onClick={() => removeCandidateRow(c.key)}
                      aria-label="この候補を削除"
                      className="p-2 text-graphite hover:text-seal transition-colors"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addCandidateRow}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-seal transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                候補を追加
              </button>
            </div>
            {errorMessage && (
              <div className="border border-rule border-l-4 border-l-seal bg-mist px-3 py-2" role="alert">
                <p className="text-sm text-graphite">{errorMessage}</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "作成中..." : "作成する"}
              </Button>
              <Button type="button" variant="outlineMuted" onClick={resetForm}>
                キャンセル
              </Button>
            </div>
          </form>
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-ink mb-4">これまでの日程調整</h3>
        {sortedPolls.length === 0 ? (
          <p className="text-graphite/70 py-8 text-center border border-dashed border-rule rounded-lg">
            日程調整はまだありません。上のボタンから作成してください。
          </p>
        ) : (
          <div className="space-y-3">
            {sortedPolls.map((poll) => (
              <Link
                key={poll.id}
                href={withOrgQuery(`/clubschedule/${poll.id}`)}
                className="flex items-center gap-4 p-5 rounded-lg border border-rule bg-paper hover:border-ink/30 transition-colors"
              >
                <CalendarClock className="w-5 h-5 text-graphite/70 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-ink font-bold">{poll.title}</h4>
                  {poll.description && (
                    <p className="text-graphite/70 text-sm mt-1 line-clamp-1">{poll.description}</p>
                  )}
                </div>
                {decidedPollIds.has(poll.id) && (
                  <span className="shrink-0 text-xs font-bold border border-ink bg-ink text-paper px-2 py-1">
                    確定済み
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
