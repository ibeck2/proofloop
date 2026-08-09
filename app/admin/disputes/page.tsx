"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";
import {
  freezeStatus,
  resolutionHelpText,
  resolveDisputeErrorMessage,
  resolveDisputeSuccessMessage,
  type ResolveDisputeSuccess,
} from "@/lib/claims/disputeResolution";
import type { DisputeRow } from "@/lib/claims/types";

export default function AdminDisputesPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<DisputeRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_open_disputes");
    if (error) {
      toast.error("申立ての取得に失敗しました");
      setRows([]);
      return;
    }
    setRows((data ?? []) as DisputeRow[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/");
        return;
      }
      const { data: prof } = await supabase
        .from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      const ok = (prof as { role?: string } | null)?.role === "admin";
      setIsAdmin(ok);
      if (!ok) {
        router.replace("/");
        return;
      }
      await load();
    })();
  }, [router, load]);

  const resolve = async (row: DisputeRow, resolution: "uphold" | "dismiss") => {
    setBusyId(row.id);
    try {
      const { data, error } = await supabase.rpc("resolve_dispute", {
        p_dispute_id: row.id,
        p_resolution: resolution,
        p_note: notes[row.id]?.trim() || null,
      });
      if (error) {
        toast.error(error.message || "処理に失敗しました");
        return;
      }
      const r = data as { ok: boolean; error?: string } & Partial<ResolveDisputeSuccess>;
      if (!r?.ok) {
        toast.error(resolveDisputeErrorMessage(r?.error));
        return;
      }
      toast.success(
        resolveDisputeSuccessMessage(r as ResolveDisputeSuccess, row.froze_organization)
      );
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (isAdmin === null) {
    return <div className="min-h-screen bg-mist p-8 text-graphite">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-mist p-6">
      <div className="max-w-[900px] mx-auto">
        <div className="flex items-baseline justify-between mb-2">
          <h1 className="text-2xl font-bold text-ink">掲載についての申立て</h1>
          <Link href="/admin" className="text-sm text-ink hover:underline">管理トップ</Link>
        </div>
        <p className="text-xs text-graphite/70 mb-6">
          申立てごとに凍結の有無が異なります。「凍結されていません」の申立ては掲載内容が
          現状のまま公開中なので、対応を後回しにしないでください。
        </p>

        {rows.length === 0 ? (
          <p className="text-graphite text-sm bg-paper border border-rule p-6">
            対応中の申立てはありません。
          </p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const status = freezeStatus(row.froze_organization);
              return (
                <div key={row.id} className="bg-paper border border-rule p-5">
                  <Link
                    href={`/organizations/${row.organization_id}`}
                    className="text-ink font-bold hover:underline"
                  >
                    {row.organization_name || "（名称なし）"}
                  </Link>
                  <p className="text-xs text-graphite/70 mt-0.5 mb-3">
                    {new Date(row.created_at).toLocaleString("ja-JP")} に受付
                  </p>

                  <div
                    className={
                      status.tone === "frozen"
                        ? "bg-mist border border-rule p-3 mb-3"
                        : "bg-seal/10 border border-seal p-3 mb-3"
                    }
                  >
                    <p
                      className={
                        status.tone === "frozen"
                          ? "text-xs font-bold text-ink mb-1"
                          : "text-xs font-bold text-seal mb-1"
                      }
                    >
                      {status.label}
                    </p>
                    <p className="text-xs text-graphite">{status.description}</p>
                  </div>

                  <dl className="text-sm text-graphite space-y-1 mb-3">
                    <div><dt className="inline font-bold text-ink">申告者：</dt>{" "}
                      <dd className="inline">{row.reporter_name}</dd></div>
                    <div><dt className="inline font-bold text-ink">連絡先：</dt>{" "}
                      <dd className="inline">{row.reporter_contact}</dd></div>
                  </dl>

                  <p className="text-sm text-graphite bg-mist p-3 mb-3 whitespace-pre-wrap">
                    {row.body}
                  </p>

                  <input
                    type="text"
                    value={notes[row.id] ?? ""}
                    onChange={(e) => setNotes((p) => ({ ...p, [row.id]: e.target.value }))}
                    placeholder="対応のメモ（監査に残ります）"
                    className="w-full border border-rule px-3 py-2 text-sm text-graphite mb-3"
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button" variant="primary" disabled={busyId === row.id}
                      onClick={() => resolve(row, "uphold")}
                    >
                      認容（管理権限を剥奪）
                    </Button>
                    <Button
                      type="button" variant="outlineMuted" disabled={busyId === row.id}
                      onClick={() => resolve(row, "dismiss")}
                    >
                      却下
                    </Button>
                  </div>
                  <p className="text-xs text-graphite/60 mt-2">
                    {resolutionHelpText("uphold", row.froze_organization)}
                  </p>
                  <p className="text-xs text-graphite/60 mt-1">
                    {resolutionHelpText("dismiss", row.froze_organization)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
