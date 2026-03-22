"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";

type MemberRow = {
  id: string;
  user_id: string;
  role: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
};

type InvitationRow = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

function roleLabel(role: string): string {
  const r = role.toLowerCase();
  if (r === "owner") return "Owner（代表者）";
  if (r === "admin") return "Admin（一般管理者）";
  return role;
}

export default function ClubMembersSettingsPage() {
  const {
    loading: ctxLoading,
    activeOrgId: orgId,
    activeOrgName: orgName,
    activeRole,
    hasNoMemberships,
    isReady,
  } = useClubOrganization();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [profilesByUserId, setProfilesByUserId] = useState<
    Record<string, ProfileRow>
  >({});
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "admin">("admin");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const canManage =
    activeRole === "owner" || activeRole === "admin";

  const loadLists = useCallback(async () => {
    if (!orgId) return;
    setListLoading(true);
    try {
      const { data: memData, error: memErr } = await supabase
        .from("organization_members")
        .select("id, user_id, role")
        .eq("organization_id", orgId)
        .order("role", { ascending: true });

      if (memErr) {
        console.error(memErr);
        toast.error("メンバー一覧の取得に失敗しました");
        setMembers([]);
        setProfilesByUserId({});
      } else {
        const list = (memData ?? []) as MemberRow[];
        setMembers(list);
        const ids = list.map((m) => m.user_id).filter(Boolean);
        if (ids.length === 0) {
          setProfilesByUserId({});
        } else {
          const { data: profData, error: profErr } = await supabase
            .from("profiles")
            .select("id, full_name, display_name, email")
            .in("id", ids);
          if (profErr) {
            console.error(profErr);
            toast.error("プロフィールの取得に失敗しました");
            setProfilesByUserId({});
          } else {
            const map: Record<string, ProfileRow> = {};
            for (const p of (profData ?? []) as ProfileRow[]) {
              map[p.id] = p;
            }
            setProfilesByUserId(map);
          }
        }
      }

      const { data: invData, error: invErr } = await supabase
        .from("organization_invitations")
        .select("id, email, role, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (invErr) {
        console.error(invErr);
        toast.error("招待一覧の取得に失敗しました");
        setInvitations([]);
      } else {
        setInvitations((invData ?? []) as InvitationRow[]);
      }
    } finally {
      setListLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !canManage) return;
    loadLists();
  }, [orgId, canManage, loadLists]);

  const displayNameForUser = (userId: string) => {
    const p = profilesByUserId[userId];
    const name =
      p?.full_name?.trim() ||
      p?.display_name?.trim() ||
      p?.email?.trim() ||
      null;
    return name || "（氏名未設定）";
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) {
      toast.error("メールアドレスを入力してください");
      return;
    }
    if (!orgId || !orgName) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("ログインセッションが無効です");
      return;
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, display_name")
      .eq("id", session.user.id)
      .maybeSingle();

    const inviterName =
      (prof as { full_name?: string | null; display_name?: string | null } | null)
        ?.full_name?.trim() ||
      (prof as { full_name?: string | null; display_name?: string | null } | null)
        ?.display_name?.trim() ||
      session.user.email?.split("@")[0] ||
      "";

    setInviteSubmitting(true);
    try {
      const res = await fetch("/api/emails/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          organization_id: orgId,
          email,
          role: inviteRole,
          inviterName,
          organizationName: orgName,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error || "招待の送信に失敗しました");
        return;
      }
      toast.success("招待メールを送信しました");
      setModalOpen(false);
      setInviteEmail("");
      setInviteRole("admin");
      await loadLists();
    } catch {
      toast.error("招待の送信に失敗しました");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleCancelInvite = async (id: string) => {
    setCancelingId(id);
    try {
      const { error } = await supabase
        .from("organization_invitations")
        .delete()
        .eq("id", id);
      if (error) {
        toast.error(error.message || "キャンセルに失敗しました");
        return;
      }
      toast.success("招待を取り消しました");
      await loadLists();
    } finally {
      setCancelingId(null);
    }
  };

  if (ctxLoading) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[200px]">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  if (hasNoMemberships || !isReady || !orgId) {
    return (
      <div className="p-6 lg:p-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-6 text-center">
          <p className="text-amber-800 dark:text-amber-200 font-medium">
            管理できる団体がありません
          </p>
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="p-6 lg:p-10 max-w-3xl mx-auto w-full">
        <h1 className="text-primary text-2xl font-bold tracking-tight">
          メンバー管理
        </h1>
        <p className="mt-4 text-slate-600 dark:text-slate-400">
          メンバー管理は代表者（Owner）または一般管理者（Admin）のみが利用できます。
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-primary text-2xl font-bold tracking-tight">
            メンバー管理
          </h1>
          {orgName && (
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              {orgName}
            </p>
          )}
        </div>
        <Button
          type="button"
          className="bg-primary text-white shrink-0"
          onClick={() => {
            if (activeRole !== "owner" && inviteRole === "owner") {
              setInviteRole("admin");
            }
            setModalOpen(true);
          }}
        >
          メンバーを招待
        </Button>
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
          現在のメンバー
        </h2>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          {listLoading ? (
            <p className="p-4 text-slate-500 text-sm">読み込み中...</p>
          ) : members.length === 0 ? (
            <p className="p-4 text-slate-500 text-sm">メンバーがいません</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                >
                  <span className="font-medium text-slate-900 dark:text-white">
                    {displayNameForUser(m.user_id)}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {roleLabel(m.role)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
          招待中
        </h2>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          {listLoading ? (
            <p className="p-4 text-slate-500 text-sm">読み込み中...</p>
          ) : invitations.length === 0 ? (
            <p className="p-4 text-slate-500 text-sm">招待中のメンバーはいません</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {invitations.map((inv) => (
                <li
                  key={inv.id}
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {inv.email}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {roleLabel(inv.role)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50 shrink-0"
                    disabled={cancelingId === inv.id}
                    onClick={() => handleCancelInvite(inv.id)}
                  >
                    {cancelingId === inv.id ? "処理中..." : "キャンセル"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="presentation"
          onClick={() => !inviteSubmitting && setModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="invite-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-white mb-4"
            >
              メンバーを招待
            </h2>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label
                  htmlFor="invite-email"
                  className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  メールアドレス <span className="text-red-600">*</span>
                </label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="example@univ.ac.jp"
                  className="w-full"
                />
              </div>
              <div>
                <label
                  htmlFor="invite-role"
                  className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  権限
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "owner" | "admin")
                  }
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="admin">Admin（一般管理者）</option>
                  <option value="owner" disabled={activeRole !== "owner"}>
                    Owner（代表者）— 代表者のみ
                  </option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  <strong>Owner</strong>
                  ：団体の代表として、全ての管理機能と他の代表者の招待が可能です。
                  <br />
                  <strong>Admin</strong>
                  ：採用・メッセージ・イベント等の日常運用が可能です。代表者の招待は代表者のみが行えます。
                </p>
                {activeRole !== "owner" && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                    あなたは Admin のため、Owner
                    の招待は送信できません（代表者のみ）。
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={inviteSubmitting}
                  onClick={() => setModalOpen(false)}
                >
                  閉じる
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-white"
                  disabled={inviteSubmitting}
                >
                  {inviteSubmitting ? "送信中..." : "招待を送信"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
