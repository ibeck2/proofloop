"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatSupabaseError } from "@/lib/supabaseErrorMessage";
import { Button } from "@/components/ui";

type AdminRequestRow = {
  id: string;
  organization_id: string | null;
  user_id: string;
  sns_type: string | null;
  proof_link: string;
  message: string | null;
  status: string;
  created_at: string;
  new_org_name: string | null;
  new_org_university: string | null;
  // Joinで取得する申請者情報（profiles）
  profiles?:
    | {
        full_name: string | null;
        university: string | null;
        contact_email: string | null;
      }
    | Array<{
        full_name: string | null;
        university: string | null;
        contact_email: string | null;
      }>
    | null;
  // Joinで取得する対象団体情報（organizations）
  organizations?:
    | {
        name: string | null;
      }
    | Array<{
        name: string | null;
      }>
    | null;
};

function normalizeFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] ?? null) as T | null;
  return value as T;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractHandleFromProofLink(link: string, snsType: string): string | null {
  try {
    const url = new URL(link);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const last = pathParts[pathParts.length - 1] ?? "";
    if (!last) return null;
    const handle = last.startsWith("@") ? last : `@${last}`;
    // SNS以外（Web/その他）は handle 表示を短くするため fallback
    if (snsType === "団体公式Webサイト") return link;
    return handle;
  } catch {
    return link || null;
  }
}

export default function AdminRequestsPage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AdminRequestRow[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        if (!cancelled) {
          setSessionChecked(true);
          router.replace("/");
        }
        return;
      }

      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, full_name, display_name, university")
        .eq("id", user.id)
        .limit(1);

      if (cancelled) return;
      if (profileError || !profileRows || profileRows.length === 0) {
        setIsAdmin(false);
        setSessionChecked(true);
        router.replace("/");
        return;
      }

      const role = (profileRows[0] as { role?: string }).role;
      setIsAdmin(role === "admin");
      setSessionChecked(true);
      if (role !== "admin") router.replace("/");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organization_admin_requests")
        .select(
          "*, profiles(full_name,university,contact_email), organizations(name)"
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests((data as AdminRequestRow[]) ?? []);
    } catch (err) {
      // Supabase の PostgREST エラーは { message, details, hint } を含むため分解して出す
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e: any = err;
      console.error(
        "fetch error:",
        e?.message || err,
        e?.details,
        e?.hint
      );
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionChecked && isAdmin) loadPending();
  }, [sessionChecked, isAdmin, loadPending]);

  const handleReject = useCallback(
    async (requestId: string) => {
      if (!isAdmin) return;
      setActionId(requestId);
      try {
        const { error } = await supabase
          .from("organization_admin_requests")
          .update({ status: "rejected" })
          .eq("id", requestId);
        if (error) throw error;
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        toast.success("申請を却下しました");
      } catch (err) {
        toast.error(`却下に失敗しました: ${formatSupabaseError(err)}`);
      } finally {
        setActionId(null);
      }
    },
    [isAdmin]
  );

  const handleApprove = useCallback(
    async (request: AdminRequestRow) => {
      if (!isAdmin) return;
      setActionId(request.id);
      try {
        // RPC に一元化（organizations / organization_admin_requests を含む更新は RPC 側で実行）
        const { data: approveData, error } = await supabase.rpc("approve_admin_request", {
          target_request_id: request.id,
        });
        if (error) {
          console.error(
            "Approve RPC error:",
            formatSupabaseError(error),
            error
          );
          toast.error(`承認に失敗しました: ${formatSupabaseError(error)}`);
          return;
        }

        // 将来の互換: RPC が例外を投げず { ok: false } を返す場合
        if (
          approveData &&
          typeof approveData === "object" &&
          "ok" in approveData &&
          (approveData as { ok?: boolean }).ok === false
        ) {
          const detail = JSON.stringify(approveData);
          console.error("Approve returned ok=false:", detail);
          toast.error(`承認に失敗しました: ${detail}`);
          return;
        }

        setRequests((prev) => prev.filter((r) => r.id !== request.id));

        // 承認通知メール（ベストエフォート：失敗しても DB はロールバックしない）
        const profilesRow = normalizeFirst(request.profiles);
        const organizationsRow = normalizeFirst(request.organizations);
        const organizationNameForMail =
          request.organization_id && organizationsRow?.name?.trim()
            ? organizationsRow.name.trim()
            : (request.new_org_name?.trim() ?? "団体");
        const notifyEmail = profilesRow?.contact_email?.trim();

        const toastAfterApproval = (
          emailSent: boolean,
          skipped: boolean,
          emailNote?: string
        ) => {
          if (emailSent) {
            toast.success("申請を承認し、通知メールを送信しました。");
            return;
          }
          if (!notifyEmail) {
            toast.success(
              "申請を承認しました（申請者の連絡用メールが未登録のため通知メールは送っていません）。"
            );
            return;
          }
          if (skipped) {
            toast.success(
              "申請を承認しました（メール送信はスキップされました。開発時は RESEND_API_KEY を設定してください）。"
            );
            return;
          }
          toast.success(
            `申請を承認しました（通知メールの送信に失敗しました。承認処理は完了しています。${emailNote ? ` ${emailNote}` : ""}）`
          );
        };

        if (notifyEmail) {
          try {
            const res = await fetch("/api/emails/approve", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: notifyEmail,
                applicantName: profilesRow?.full_name?.trim() || "名前未設定",
                organizationName: organizationNameForMail,
              }),
            });
            let payload: Record<string, unknown> = {};
            try {
              payload = (await res.json()) as Record<string, unknown>;
            } catch {
              /* ignore */
            }
            if (!res.ok) {
              console.error("Approve notification email HTTP error:", res.status, payload);
              toastAfterApproval(false, false, `HTTP ${res.status}`);
              return;
            }
            const emailSent = payload.emailSent === true;
            const skipped = payload.skipped === true;
            const msg =
              typeof payload.message === "string" ? payload.message : undefined;
            toastAfterApproval(emailSent, skipped, msg);
          } catch (err) {
            console.error("Approve notification email fetch error:", err);
            toastAfterApproval(false, false);
          }
        } else {
          toastAfterApproval(false, false);
        }
      } catch (err) {
        console.error("Approve catch error:", formatSupabaseError(err), err);
        toast.error(`承認に失敗しました: ${formatSupabaseError(err)}`);
      } finally {
        setActionId(null);
      }
    },
    [isAdmin]
  );

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">確認中...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">アクセスできません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-display">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">運営・団体管理者申請（審査）</h1>
            <p className="text-slate-600 text-sm mt-1">pending 状態の申請を承認または却下できます。</p>
          </div>
          <Link href="/" className="text-accent text-sm font-bold hover:underline inline-flex items-center gap-1">
            ← トップに戻る
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-500">読み込み中...</p>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-300 rounded-lg bg-white">
            <p className="text-slate-500 font-medium">審査中の申請はありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => {
              const profiles = normalizeFirst(r.profiles);
              const organizations = normalizeFirst(r.organizations);

              const applicantName = profiles?.full_name?.trim() || "名前未設定";
              const applicantUniversity = profiles?.university?.trim() || null;

              const targetName =
                r.organization_id && organizations?.name
                  ? organizations.name
                  : r.new_org_name ?? "（団体名なし）";

              const snsType = r.sns_type ?? "";
              const snsHandle = r.proof_link ? extractHandleFromProofLink(r.proof_link, snsType) : null;

              return (
                <div key={r.id} className="p-5 rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500">
                        {formatDate(r.created_at)}
                      </p>
                      <div className="mt-1">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          申請者: {applicantName}
                        </p>
                        {applicantUniversity && (
                          <p className="text-xs text-slate-500">大学: {applicantUniversity}</p>
                        )}
                        <p className="text-sm font-bold text-primary mt-2">
                          対象団体: {targetName}
                        </p>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-xs font-bold text-slate-500">本人確認リンク</p>
                          {snsType ? (
                            <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5">
                              {snsType}:{snsHandle ? ` ${snsHandle}` : ""}
                            </span>
                          ) : null}
                        </div>
                        <a
                          href={r.proof_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent text-sm font-medium hover:underline break-all"
                        >
                          {r.proof_link}
                        </a>
                      </div>

                      {r.message && r.message.trim() && (
                        <div className="mt-3">
                          <p className="text-xs font-bold text-slate-500 mb-1">運営へのメッセージ</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.message}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={actionId === r.id}
                        onClick={() => handleApprove(r)}
                      >
                        {actionId === r.id ? "承認中..." : "承認"}
                      </Button>
                      <Button
                        type="button"
                        variant="outlineMuted"
                        size="sm"
                        disabled={actionId === r.id}
                        onClick={() => handleReject(r.id)}
                      >
                        {actionId === r.id ? "処理中..." : "却下"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

