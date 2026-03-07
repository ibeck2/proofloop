"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";

const MAGIC_EMAIL = "ibeckzoom@gmail.com";

type TabType = "student" | "company";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>("student");
  const [acEmail, setAcEmail] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyEmail.trim().toLowerCase() === MAGIC_EMAIL) {
      router.push("/clubdashboard");
      return;
    }
    // その他のメールはデモでは何もしない（必要なら別処理）
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-white border border-slate-200 shadow-sm">
        <div className="p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-primary font-display font-bold text-xl tracking-tight">
              <span className="material-symbols-outlined text-2xl">loop</span>
              ProofLoop
            </Link>
            <p className="text-text-grey text-sm mt-2">ログイン</p>
          </div>

          {/* タブ: 学生・団体 / 企業 */}
          <div className="flex border-b border-slate-200 mb-8">
            <button
              type="button"
              onClick={() => setTab("student")}
              className={`flex-1 py-3 text-center text-sm font-bold transition-colors ${
                tab === "student"
                  ? "text-primary border-b-2 border-primary"
                  : "text-grey-custom hover:text-primary"
              }`}
            >
              学生・団体の方
            </button>
            <button
              type="button"
              onClick={() => setTab("company")}
              className={`flex-1 py-3 text-center text-sm font-bold transition-colors ${
                tab === "company"
                  ? "text-primary border-b-2 border-primary"
                  : "text-grey-custom hover:text-primary"
              }`}
            >
              企業の方
            </button>
          </div>

          {tab === "student" && (
            <div className="space-y-6">
              <button
                type="button"
                className="w-full py-4 px-4 flex items-center justify-center gap-2 bg-[#2d5a3d] text-white font-bold text-sm hover:bg-[#244a32] transition-colors"
              >
                <span className="material-symbols-outlined text-xl">chat</span>
                LINEでログイン
              </button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-grey-custom">または</span>
                </div>
              </div>
              <div>
                <label className="block text-primary font-bold text-sm mb-2">
                  大学のメールアドレス（.ac.jp）でログイン
                </label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={acEmail}
                    onChange={(e) => setAcEmail(e.target.value)}
                    placeholder="xxx@xxx.ac.jp"
                    className="flex-1"
                  />
                  <Button type="button" variant="primary" className="shrink-0">
                    送信
                  </Button>
                </div>
              </div>
            </div>
          )}

          {tab === "company" && (
            <form className="space-y-5" onSubmit={handleCompanySubmit}>
              <div>
                <label className="block text-primary font-bold text-sm mb-2">法人メールアドレス</label>
                <Input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="メールアドレスを入力"
                />
              </div>
              <div>
                <label className="block text-primary font-bold text-sm mb-2">パスワード</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="パスワードを入力"
                />
              </div>
              <div className="text-right">
                <Link
                  href="#"
                  className="text-sm text-grey-custom hover:text-primary hover:underline"
                >
                  パスワードを忘れた場合
                </Link>
              </div>
              <Button type="submit" variant="primary" className="w-full">
                ログイン
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
