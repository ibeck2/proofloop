"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  fetchMyOrganizationMemberships,
  type OrganizationMembership,
} from "@/lib/organizationMembers";
import { getOptionalNotificationTypes } from "@/lib/notifications/registry";
import { resolveNotificationEnabled } from "@/lib/notifications/resolvePreference";
import type { NotificationPreferenceRow } from "@/lib/types/notificationPreference";

export default function MypageNotificationsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [rows, setRows] = useState<NotificationPreferenceRow[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const [membershipResult, prefResult] = await Promise.all([
      fetchMyOrganizationMemberships(supabase, user.id),
      supabase
        .from("notification_preferences")
        .select("id, user_id, notification_type, organization_id, enabled")
        .eq("user_id", user.id),
    ]);

    if (membershipResult.error) {
      console.error("memberships fetch error:", membershipResult.error);
    }
    setMemberships(membershipResult.data);

    if (prefResult.error) {
      console.error("notification_preferences fetch error:", prefResult.error);
      toast.error("通知設定の読み込みに失敗しました");
    } else {
      setRows((prefResult.data as NotificationPreferenceRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleToggle = async (
    notificationType: string,
    organizationId: string,
    nextEnabled: boolean
  ) => {
    if (!userId) return;
    const key = `${notificationType}:${organizationId}`;
    setSavingKey(key);
    try {
      const existing = rows.find(
        (r) =>
          r.notification_type === notificationType &&
          r.organization_id === organizationId
      );

      if (existing) {
        const { error } = await supabase
          .from("notification_preferences")
          .update({ enabled: nextEnabled })
          .eq("id", existing.id);
        if (error) throw error;
        setRows((prev) =>
          prev.map((r) => (r.id === existing.id ? { ...r, enabled: nextEnabled } : r))
        );
      } else if (!nextEnabled) {
        const { data, error } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: userId,
            notification_type: notificationType,
            organization_id: organizationId,
            enabled: false,
          })
          .select("id, user_id, notification_type, organization_id, enabled")
          .single();
        if (error) throw error;
        setRows((prev) => [...prev, data as NotificationPreferenceRow]);
      }
      // nextEnabled=true かつ既存行なし＝既にデフォルトON。書き込み不要。
      toast.success("通知設定を更新しました");
    } catch (err) {
      console.error("notification preference update error:", err);
      toast.error("更新に失敗しました");
    } finally {
      setSavingKey(null);
    }
  };

  const optionalTypes = getOptionalNotificationTypes();

  if (loading) {
    return (
      <div className="p-6 md:p-10">
        <p className="text-graphite/70">読み込み中...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="p-6 md:p-10">
        <p className="text-graphite">ログインが必要です。</p>
      </div>
    );
  }

  return (
    <div className="bg-mist text-graphite font-body min-h-screen pb-20 md:pb-8">
      <main className="max-w-[640px] mx-auto px-4 py-8 md:py-12">
        <Link
          href="/mypage"
          className="inline-flex items-center gap-1.5 text-sm text-graphite/70 hover:text-ink mb-4"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          マイページに戻る
        </Link>
        <h1 className="text-ink text-2xl font-bold font-mincho mb-8">通知設定</h1>

        {memberships.length === 0 ? (
          <p className="text-graphite/70 text-sm">
            通知設定は所属団体ごとに管理します。所属している団体がまだありません。
          </p>
        ) : (
          <div className="space-y-6">
            {memberships.map((m) => (
              <section
                key={m.membershipId}
                className="bg-paper border border-rule rounded-lg p-6 shadow-sm"
              >
                <h2 className="text-ink text-base font-bold mb-4">
                  {m.organization?.name?.trim() || "団体"}
                </h2>
                <div className="space-y-3">
                  {optionalTypes.map((t) => {
                    const enabled = resolveNotificationEnabled(
                      rows,
                      t.id,
                      m.organizationId
                    );
                    const key = `${t.id}:${m.organizationId}`;
                    return (
                      <label
                        key={key}
                        className="flex items-start gap-3 rounded border border-rule px-4 py-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={enabled}
                          disabled={savingKey === key}
                          onChange={(e) =>
                            handleToggle(t.id, m.organizationId, e.target.checked)
                          }
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block font-bold text-ink">{t.label}</span>
                          <span className="block text-graphite/70 mt-0.5">
                            {t.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
