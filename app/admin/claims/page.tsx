"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { evaluateSignals, resolveVerdict } from "@/lib/claims/signals";
import type { RawSignals, SignalColor } from "@/lib/claims/types";

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

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_pending_claims");
    if (error) {
      toast.error("申請の取得に失敗しました");
      setRows([]);
      return;
    }
    setRows((data ?? []) as ClaimRow[]);
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

  const decide = async (
    row: ClaimRow,
    decision: "approve" | "reject",
    level: "full" | "limited" | null
  ) => {
    setBusyId(row.id);
    try {
      // 判定色は TypeScript 側の責務。RPC は受け取った値をそのまま監査に残す
      const verdict = resolveVerdict(evaluateSignals(row.signals));
      const { data, error } = await supabase.rpc("decide_claim", {
        p_claim_id: row.id,
        p_decision: decision,
        p_level: level,
        p_note: notes[row.id]?.trim() || null,
        p_verdict: verdict,
      });
      if (error) {
        toast.error(error.message || "処理に失敗しました");
        return;
      }
      const r = data as { ok: boolean; error?: string };
      if (!r?.ok) {
        toast.error(r?.error === "forbidden" ? "権限がありません" : "処理に失敗しました");
        return;
      }
      toast.success(decision === "approve" ? "承認しました" : "却下しました");
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
      </div>
    </div>
  );
}
