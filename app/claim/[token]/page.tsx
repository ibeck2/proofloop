"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Repeat } from "lucide-react";
import { Button, Input, Textarea } from "@/components/ui";

type Preview = {
  ok: boolean;
  reason?: "invalid" | "already_claimed";
  organization_id?: string;
  organization_name?: string | null;
  already_applied?: boolean;
};

const RETURN_KEY = "proofloop.claim.returnTo";
/** このブラウザから「自分が」申請済みかどうかを覚えておくためのキー接頭辞。
 *  get_claim_preview().already_applied はトークン単位の状態（誰かが申請済みか）
 *  であって「あなたが」申請したかは示さない。同じトークンを持つ別の関係者が
 *  このページを開いたときに、他人の申請結果を「申請を受け付けました」と
 *  誤って自分の結果のように見せてしまうため、成功はローカルにも記録する。 */
const appliedKey = (token: string) => `proofloop.claim.applied.${token}`;

export default function ClaimPage() {
  const params = useParams();
  const raw = params?.token;
  const token = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const [note, setNote] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setPreview({ ok: false, reason: "invalid" });
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("get_claim_preview", { p_token: token });
    if (error) {
      setPreview({ ok: false, reason: "invalid" });
    } else {
      const p = data as Preview;
      setPreview(p);
      // 「誰かが申請済み」＝「自分が申請済み」ではない。このブラウザで実際に
      // apply_for_claim が成功したときだけ完了画面を出す。
      let iApplied = false;
      try {
        // 審査には数日かかるとフォーム上で案内しているため、タブを閉じても
        // 判定結果が引き継がれるよう localStorage を使う（sessionStorage不可）。
        iApplied = localStorage.getItem(appliedKey(token)) === "1";
      } catch {
        // 参照できない環境では通常のフォームに倒す
      }
      if (p.already_applied && iApplied) setDone(true);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  /** ログイン後にこのページへ戻れるよう、遷移前にトークンを控える */
  const rememberReturn = () => {
    try {
      sessionStorage.setItem(RETURN_KEY, `/claim/${token}`);
    } catch {
      // プライベートブラウジング等で失敗しても致命ではない
    }
  };

  const handleSubmit = async () => {
    if (!agreed || role.trim() === "") return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("apply_for_claim", {
        p_token: token,
        p_role: role.trim(),
        p_note: note.trim(),
      });
      if (error) {
        toast.error(error.message || "申請に失敗しました");
        return;
      }
      const r = data as { ok: boolean; error?: string };
      if (!r?.ok) {
        if (r?.error === "already_claimed") {
          toast.error("この団体は既に引き取られています");
        } else if (r?.error === "already_applied_by_other") {
          // このトークンには既に別の人物から申請が届いている。
          // 上書きさせず、運営の確認に委ねる。
          toast.error(
            "この団体には既に別の方から申請が届いています。運営が内容を確認します。"
          );
        } else if (r?.error === "not_authenticated") {
          toast.error("ログインが必要です");
        } else {
          toast.error("この申請リンクは無効です");
        }
        return;
      }
      try {
        localStorage.setItem(appliedKey(token), "1");
      } catch {
        // 記録できなくても申請自体は成功しているため致命ではない
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  const orgName = preview?.organization_name?.trim() || "この団体";

  return (
    <div className="min-h-screen bg-mist flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] bg-paper border border-rule shadow-sm">
        <div className="p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-ink font-numeric font-bold text-xl tracking-tight">
              <Repeat className="w-6 h-6" aria-hidden="true" />
              ProofLoop
            </Link>
            <p className="text-graphite text-sm mt-2">団体ページの引き取り</p>
          </div>

          {loading ? (
            <p className="text-graphite text-sm">読み込み中...</p>
          ) : done ? (
            <div className="space-y-4">
              <p className="text-ink font-bold">申請を受け付けました</p>
              <p className="text-graphite text-sm leading-relaxed">
                運営が内容を確認します。結果はご登録のメールアドレスにお知らせします。
                確認には数日いただく場合があります。
              </p>
              <Link href="/" className="text-sm text-ink hover:underline">トップへ戻る</Link>
            </div>
          ) : preview?.reason === "already_claimed" ? (
            <div className="space-y-4">
              <p className="text-graphite text-sm leading-relaxed">
                <strong className="text-ink">{orgName}</strong>{" "}
                は既に関係者の方が管理しています。
              </p>
              <p className="text-graphite text-sm leading-relaxed">
                メンバーとして参加したい場合は、団体の管理者に招待を依頼してください。
              </p>
              {preview.organization_id && (
                <Link
                  href={`/organizations/${preview.organization_id}`}
                  className="text-sm text-ink hover:underline"
                >
                  団体ページを見る（掲載内容に心当たりがない場合の窓口もこちら）
                </Link>
              )}
            </div>
          ) : !preview?.ok ? (
            // 無効・期限切れ・取消を区別しない（総当たりに情報を与えない）
            <p className="text-graphite text-sm">このリンクは無効です。</p>
          ) : !userId ? (
            <div className="space-y-4">
              <p className="text-graphite text-sm leading-relaxed">
                <strong className="text-ink">{orgName}</strong>{" "}
                のページを引き取るには、ログインが必要です。
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/signup"
                  onClick={rememberReturn}
                  className="font-bold transition-colors rounded-none inline-flex items-center justify-center gap-2 bg-ink text-paper hover:bg-[#001f45] border-0 px-6 py-2.5 text-sm w-full text-center"
                >
                  新規登録
                </Link>
                <Link
                  href="/login"
                  onClick={rememberReturn}
                  className="font-bold transition-colors rounded-none inline-flex items-center justify-center gap-2 bg-paper border border-rule text-ink hover:border-seal hover:text-seal px-6 py-2.5 text-sm w-full text-center"
                >
                  ログイン
                </Link>
              </div>
              <p className="text-xs text-graphite/70">
                登録後、このページに戻って申請を続けられます。
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-graphite text-sm leading-relaxed">
                <strong className="text-ink">{orgName}</strong>{" "}
                のページを引き取り、管理者になる申請をします。
              </p>

              {preview.already_applied && (
                <p className="text-xs text-graphite/70 leading-relaxed">
                  このリンクには既に申請が届いています。あなたも関係者であれば、
                  引き続き申請してください。
                </p>
              )}

              <div>
                <label htmlFor="claim-role" className="block text-sm text-ink font-bold mb-1">
                  団体での役職 <span className="text-seal">必須</span>
                </label>
                <Input
                  id="claim-role"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="代表 / 会計 / 広報 など"
                  className="text-sm px-3 py-2"
                />
              </div>

              <div>
                <label htmlFor="claim-note" className="block text-sm text-ink font-bold mb-1">
                  補足（任意）
                </label>
                <Textarea
                  id="claim-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="活動内容や、確認に役立つ情報があればご記入ください"
                  className="text-sm px-3 py-2"
                />
              </div>

              <label className="flex items-start gap-2 text-sm text-graphite">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1"
                />
                <span>私はこの団体の関係者であり、記載内容に相違ありません。</span>
              </label>

              <Button
                type="button"
                variant="primary"
                className="w-full"
                disabled={submitting || !agreed || role.trim() === ""}
                onClick={handleSubmit}
              >
                {submitting ? "送信中..." : "引き取りを申請する"}
              </Button>

              <p className="text-xs text-graphite/70 leading-relaxed">
                申請するとすぐに管理者になるわけではありません。運営が内容を確認したうえで
                お知らせします。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
