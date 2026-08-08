"use client";

import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { disputeErrorMessage, disputeCompletionMessage } from "@/lib/claims/disputeOutcome";

/**
 * claim 済みの団体ページにだけ出す「乗っ取り」の申告窓口。
 * /listing-policy は掲載停止の窓口であり、乗っ取りの申告先としては見つけにくいので
 * 団体ページに直接置く。
 *
 * submit_dispute は 032 でレート制限を追加し、直近1時間の自動凍結が閾値に
 * 達しているときは凍結・巻き戻しを見送り、申立てだけを記録して
 * {"ok":true,"frozen":false} を返す。完了画面の文言分岐は lib/claims/disputeOutcome.ts
 * の純粋関数に切り出してあるので、ここでは分岐しない。
 */
export function DisputeForm({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [frozen, setFrozen] = useState<boolean | null>(null);

  const submit = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.rpc("submit_dispute", {
        p_org: organizationId,
        p_name: name.trim(),
        p_contact: contact.trim(),
        p_body: body.trim(),
      });
      if (error) {
        toast.error(error.message || "送信に失敗しました");
        return;
      }
      const r = data as { ok: boolean; error?: string; frozen?: boolean };
      if (!r?.ok) {
        toast.error(disputeErrorMessage(r?.error));
        return;
      }
      setFrozen(r.frozen === true);
    } finally {
      setSending(false);
    }
  };

  if (frozen !== null) {
    const { title, body: completionBody } = disputeCompletionMessage(frozen);
    return (
      <div className="border border-rule bg-mist p-4">
        <p className="text-sm text-ink font-bold mb-1">{title}</p>
        <p className="text-xs text-graphite leading-relaxed">{completionBody}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-graphite/70 hover:text-ink hover:underline"
      >
        掲載内容に心当たりがない場合はこちら
      </button>
    );
  }

  const ready = name.trim() && contact.trim() && body.trim();

  return (
    <div className="border border-rule bg-paper p-4 space-y-3">
      <p className="text-sm text-ink font-bold">掲載内容についての申告</p>
      <p className="text-xs text-graphite leading-relaxed">
        この団体の関係者の方で、身に覚えのない管理者による掲載が行われている場合にご連絡ください。
        確認のため、お名前とご連絡先が必要です。
      </p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="お名前（必須）"
        className="w-full border border-rule px-3 py-2 text-sm text-graphite"
      />
      <input
        type="text"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="ご連絡先メールアドレス（必須）"
        className="w-full border border-rule px-3 py-2 text-sm text-graphite"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="状況をご記入ください（必須）"
        className="w-full border border-rule px-3 py-2 text-sm text-graphite"
      />
      <div className="flex gap-2">
        <Button type="button" variant="primary" disabled={sending || !ready} onClick={submit}>
          {sending ? "送信中..." : "送信する"}
        </Button>
        <Button type="button" variant="outlineMuted" onClick={() => setOpen(false)}>
          閉じる
        </Button>
      </div>
    </div>
  );
}
