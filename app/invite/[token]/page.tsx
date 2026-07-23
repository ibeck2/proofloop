"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui";

type PreviewRow = {
  organization_id: string;
  organization_name: string | null;
  invitation_email: string;
  invitation_role: string;
};

type AcceptResult = {
  ok?: boolean;
  error?: string;
  already_member?: boolean;
};

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const tokenParam = params?.token;
  const token =
    typeof tokenParam === "string"
      ? tokenParam
      : Array.isArray(tokenParam)
        ? tokenParam[0]
        : "";

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<PreviewRow | null>(null);
  const [invalidToken, setInvalidToken] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!token) {
      setInvalidToken(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("get_invitation_preview", {
      p_token: token,
    });
    if (error) {
      console.error(error);
      toast.error("招待情報の取得に失敗しました");
      setInvalidToken(true);
      setPreview(null);
      setLoading(false);
      return;
    }
    const rows = data as PreviewRow[] | null;
    const row = rows?.[0];
    if (!row) {
      setInvalidToken(true);
      setPreview(null);
    } else {
      setInvalidToken(false);
      setPreview(row);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUserId(session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc(
        "accept_organization_invitation",
        { p_token: token }
      );
      if (error) {
        toast.error(error.message || "参加処理に失敗しました");
        return;
      }
      const result = data as AcceptResult;
      if (!result?.ok) {
        if (result?.error === "email_mismatch") {
          toast.error(
            "ログイン中のアカウントのメールアドレスが招待先と一致しません。招待メールの宛先でログインしてください。"
          );
          return;
        }
        if (result?.error === "not_found") {
          toast.error("この招待は無効か、既に使用済みです");
          setInvalidToken(true);
          setPreview(null);
          return;
        }
        toast.error("参加処理に失敗しました");
        return;
      }
      if (result.already_member) {
        toast.success("既にこの団体のメンバーです");
      } else {
        toast.success("団体に参加しました");
      }
      router.replace("/mypage");
    } finally {
      setAccepting(false);
    }
  };

  const orgDisplayName = preview?.organization_name?.trim() || "団体";

  return (
    <div className="min-h-screen bg-mist flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-paper border border-rule shadow-sm">
        <div className="p-8">
          <div className="text-center mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-ink font-numeric font-bold text-xl tracking-tight"
            >
              <Repeat className="w-6 h-6" aria-hidden="true" />
              ProofLoop
            </Link>
            <p className="text-graphite text-sm mt-2">招待</p>
          </div>

          {loading ? (
            <p className="text-graphite text-sm">読み込み中...</p>
          ) : invalidToken || !preview ? (
            <p className="text-graphite text-sm">
              この招待リンクは無効か、期限切れです。
            </p>
          ) : (
            <>
              <p className="text-graphite text-sm mb-6">
                <strong className="text-ink">{orgDisplayName}</strong>
                の管理者として招待されています。
              </p>

              {!sessionUserId ? (
                <div className="space-y-4">
                  <p className="text-graphite text-sm leading-relaxed">
                    参加するにはログインまたは新規登録が必要です。
                    <br />
                    ログイン後、再度このリンクを開いてください。
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/signup"
                      className="font-bold transition-colors rounded-none inline-flex items-center justify-center gap-2 bg-ink text-paper hover:bg-[#001f45] border-0 px-6 py-2.5 text-sm w-full text-center"
                    >
                      新規登録
                    </Link>
                    <Link
                      href="/login"
                      className="font-bold transition-colors rounded-none inline-flex items-center justify-center gap-2 bg-paper border border-seal text-seal hover:bg-seal hover:text-paper px-6 py-2.5 text-sm w-full text-center"
                    >
                      ログイン
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-graphite/70">
                    招待先メール: {preview.invitation_email}
                  </p>
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full"
                    disabled={accepting}
                    onClick={handleAccept}
                  >
                    {accepting ? "処理中..." : `${orgDisplayName} に参加する`}
                  </Button>
                </div>
              )}
            </>
          )}

          <p className="mt-8 text-center">
            <Link href="/" className="text-sm text-ink hover:underline">
              トップへ戻る
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
