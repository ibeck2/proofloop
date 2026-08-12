"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button, Textarea } from "@/components/ui";
import { evaluateSignals, resolveVerdict } from "@/lib/claims/signals";
import { claimDecisionErrorMessage } from "@/lib/claims/claimDecision";
import {
  claimRevocationErrorMessage,
  canSubmitClaimRevocation,
  revokeClaimSuccessMessage,
} from "@/lib/claims/claimRevocation";
import type { RawSignals, SignalColor, ApprovedClaimRow } from "@/lib/claims/types";

type ClaimRow = {
  id: string;
  organization_id: string;
  organization_name: string | null;
  organization_university: string | null;
  channel: string;
  channel_handle: string | null;
  applicant_role: string | null;
  applicant_note: string | null;
  applied_at: string;
  signals: RawSignals;
};

const LABELS: Record<keyof ReturnType<typeof evaluateSignals>, string> = {
  channelExclusive: "チャネルの専有性",
  universityDomain: "大学ドメイン整合",
  competingClaims: "競合申請",
  applicantIdentity: "申請者の素性",
  recordHealth: "レコードの健全性",
};

function Dot({ color }: { color: SignalColor }) {
  const cls =
    color === "green" ? "bg-ink" : color === "red" ? "bg-seal" : "bg-rule";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls}`} aria-hidden="true" />;
}

export default function AdminClaimsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [approvedRows, setApprovedRows] = useState<ApprovedClaimRow[]>([]);
  const [openRevokeId, setOpenRevokeId] = useState<string | null>(null);
  const [revokeReasons, setRevokeReasons] = useState<Record<string, string>>({});
  const [revokeBusyId, setRevokeBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_pending_claims");
    if (error) {
      toast.error("申請の取得に失敗しました");
      setRows([]);
      return;
    }
    setRows((data ?? []) as ClaimRow[]);
  }, []);

  const loadApproved = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_approved_claims");
    if (error) {
      toast.error("承認済み申請の取得に失敗しました");
      setApprovedRows([]);
      return;
    }
    setApprovedRows((data ?? []) as ApprovedClaimRow[]);
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
      await Promise.all([load(), loadApproved()]);
    })();
  }, [router, load, loadApproved]);

  const decide = async (
    row: ClaimRow,
    decision: "approve" | "reject",
    level: "full" | "limited" | null
  ) => {
    setBusyId(row.id);
    try {
      // 判定色は TypeScript 側の責務。RPC は受け取った値をそのまま監査に残す
      const verdict = resolveVerdict(evaluateSignals(row.signals));
      // RPC を直接ではなく Route Handler 経由で呼ぶ。承認で claim_status が
      // 変わるので、その団体ページ（ISR）を同じ処理の中で再検証する。
      // 認可は decide_claim 自身の is_system_admin() が持つ。
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/claims/decide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          claimId: row.id,
          organizationId: row.organization_id,
          decision,
          level,
          note: notes[row.id]?.trim() || null,
          verdict,
        }),
      });
      const r = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r?.ok) {
        toast.error(claimDecisionErrorMessage(r?.error ?? (res.ok ? undefined : "rpc_error")));
        return;
      }
      toast.success(decision === "approve" ? "承認しました" : "却下しました");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (row: ApprovedClaimRow) => {
    const reason = revokeReasons[row.id] ?? "";
    if (!canSubmitClaimRevocation(reason)) return;
    setRevokeBusyId(row.id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/claims/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          claimId: row.id,
          organizationId: row.organization_id,
          reason: reason.trim(),
        }),
      });
      const r = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        removed_members?: number;
        removed_invitations?: number;
      };
      if (!r?.ok) {
        toast.error(
          claimRevocationErrorMessage(r?.error ?? (res.ok ? undefined : "rpc_error"))
        );
        return;
      }
      toast.success(
        revokeClaimSuccessMessage({
          ok: true,
          removed_members: r.removed_members ?? 0,
          removed_invitations: r.removed_invitations ?? 0,
        })
      );
      setOpenRevokeId(null);
      setRevokeReasons((p) => ({ ...p, [row.id]: "" }));
      await loadApproved();
    } finally {
      setRevokeBusyId(null);
    }
  };

  if (isAdmin === null) {
    return <div className="min-h-screen bg-mist p-8 text-graphite">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-mist p-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">団体ページの引き取り申請</h1>
          <Link href="/admin" className="text-sm text-ink hover:underline">管理トップ</Link>
        </div>

        {rows.length === 0 ? (
          <p className="text-graphite text-sm bg-paper border border-rule p-6">
            未処理の申請はありません。
          </p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const evaluated = evaluateSignals(row.signals);
              const verdict = resolveVerdict(evaluated);
              const shared = row.signals.shared_with ?? [];
              return (
                <div key={row.id} className="bg-paper border border-rule p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <Link
                        href={`/organizations/${row.organization_id}`}
                        className="text-ink font-bold hover:underline"
                      >
                        {row.organization_name || "（名称なし）"}
                      </Link>
                      <p className="text-xs text-graphite/70 mt-0.5">
                        {row.organization_university} ／ {row.channel}:{row.channel_handle}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-1 ${
                        verdict === "green" ? "bg-mist text-ink" : "bg-seal text-paper"
                      }`}
                    >
                      {verdict === "green" ? "危険信号なし" : "要確認"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                    {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((k) => (
                      <div key={k} className="flex items-center gap-1.5 text-xs text-graphite">
                        <Dot color={evaluated[k]} />
                        {LABELS[k]}
                      </div>
                    ))}
                  </div>

                  {shared.length > 0 && (
                    <div className="bg-mist border-l-2 border-seal p-3 mb-3">
                      <p className="text-xs text-seal font-bold mb-1">
                        この連絡先は他 {shared.length} 団体と共有されています
                      </p>
                      <p className="text-xs text-graphite leading-relaxed">
                        {shared.join(" ／ ")}
                      </p>
                    </div>
                  )}

                  <dl className="text-sm text-graphite space-y-1 mb-3">
                    <div><dt className="inline font-bold text-ink">役職：</dt>{" "}
                      <dd className="inline">{row.applicant_role || "（未記入）"}</dd></div>
                    {row.applicant_note && (
                      <div><dt className="inline font-bold text-ink">補足：</dt>{" "}
                        <dd className="inline">{row.applicant_note}</dd></div>
                    )}
                  </dl>

                  <input
                    type="text"
                    value={notes[row.id] ?? ""}
                    onChange={(e) => setNotes((p) => ({ ...p, [row.id]: e.target.value }))}
                    placeholder="判断のメモ（監査に残ります）"
                    className="w-full border border-rule px-3 py-2 text-sm text-graphite mb-3"
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button" variant="primary" disabled={busyId === row.id}
                      onClick={() => decide(row, "approve", "full")}
                    >
                      承認（フル権限）
                    </Button>
                    <Button
                      type="button" variant="outlineMuted" disabled={busyId === row.id}
                      onClick={() => decide(row, "approve", "limited")}
                    >
                      承認（限定権限）
                    </Button>
                    <Button
                      type="button" variant="outlineMuted" disabled={busyId === row.id}
                      onClick={() => decide(row, "reject", null)}
                    >
                      却下
                    </Button>
                  </div>
                  <p className="text-xs text-graphite/60 mt-2">
                    限定権限＝メンバー招待と応募者情報を保留。判断材料が揃わないなら却下でよい
                    （未claimのままでも団体は何も失わない）。
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-10">
          <h2 className="text-xl font-bold text-ink mb-1">承認済み（発行の取消）</h2>
          <p className="text-xs text-graphite/70 mb-4">
            第三者からの異議申立てを待たずに、運営の判断で管理権限を取り消せます。
            取り消すとメンバー・招待が削除され、掲載内容は引き取り前の状態に戻ります。
          </p>

          {approvedRows.length === 0 ? (
            <p className="text-graphite text-sm bg-paper border border-rule p-6">
              承認済みの申請はありません。
            </p>
          ) : (
            <div className="space-y-4">
              {approvedRows.map((row) => {
                const frozen = row.organization_claim_status === "frozen";
                const isOpen = openRevokeId === row.id;
                return (
                  <div key={row.id} className="bg-paper border border-rule p-5">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <Link
                          href={`/organizations/${row.organization_id}`}
                          className="text-ink font-bold hover:underline"
                        >
                          {row.organization_name || "（名称なし）"}
                        </Link>
                        <p className="text-xs text-graphite/70 mt-0.5">
                          {row.organization_university} ／ {row.applicant_name || "（氏名不明）"}
                          {row.applicant_email ? ` ・ ${row.applicant_email}` : ""}
                        </p>
                        <p className="text-xs text-graphite/50 mt-0.5">
                          {row.decided_at
                            ? `${new Date(row.decided_at).toLocaleString("ja-JP")} 承認`
                            : ""}
                        </p>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 bg-mist text-ink">
                        {row.granted_level === "full" ? "フル権限" : "限定権限"}
                      </span>
                    </div>

                    {frozen ? (
                      <div className="bg-seal/10 border border-seal p-3 mt-3">
                        <p className="text-xs font-bold text-seal mb-1">
                          異議申立て対応中です
                        </p>
                        <p className="text-xs text-graphite">
                          この団体は現在凍結中です。取消は{" "}
                          <Link href="/admin/disputes" className="underline">
                            /admin/disputes
                          </Link>{" "}
                          から対応してください。
                        </p>
                      </div>
                    ) : isOpen ? (
                      <div className="bg-mist border border-seal p-3 mt-3">
                        <p className="text-xs font-bold text-seal mb-2">
                          この操作は取り消せません。メンバー・招待が削除され、掲載内容は引き取り前の状態に戻ります。
                        </p>
                        <Textarea
                          value={revokeReasons[row.id] ?? ""}
                          onChange={(e) =>
                            setRevokeReasons((p) => ({ ...p, [row.id]: e.target.value }))
                          }
                          placeholder="取消理由（必須・監査に残ります）"
                          rows={2}
                          className="mb-2"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={
                              revokeBusyId === row.id ||
                              !canSubmitClaimRevocation(revokeReasons[row.id] ?? "")
                            }
                            onClick={() => revoke(row)}
                          >
                            取り消しを実行
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={revokeBusyId === row.id}
                            onClick={() => setOpenRevokeId(null)}
                          >
                            キャンセル
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outlineMuted"
                        onClick={() => setOpenRevokeId(row.id)}
                      >
                        発行の取消
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
