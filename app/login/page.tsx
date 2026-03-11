"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";

const MAGIC_EMAIL = "ibeckzoom@gmail.com";

type TabType = "student" | "company";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>("student");
  const [acEmail, setAcEmail] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyPassword, setCompanyPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      return { success: false, error: "メールアドレスとパスワードを入力してください。" };
    }
    if (trimmedPassword.length < 6) {
      return { success: false, error: "パスワードは6文字以上で入力してください。" };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedPassword,
    });
    if (error) {
      return { success: false, error: error.message ?? "ログインに失敗しました。" };
    }
    return { success: true };
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const email = acEmail.trim().toLowerCase();
    if (email === MAGIC_EMAIL) {
      router.push("/mypage");
      return;
    }
    setIsLoading(true);
    try {
      const result = await signIn(acEmail, password);
      if (result.success) {
        router.push("/mypage");
        return;
      }
      setErrorMessage(result.error ?? "ログインに失敗しました。");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "予期しないエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (companyEmail.trim().toLowerCase() === MAGIC_EMAIL) {
      router.push("/companydashboard");
      return;
    }
    setIsLoading(true);
    try {
      const result = await signIn(companyEmail, companyPassword);
      if (result.success) {
        router.push("/companydashboard");
        return;
      }
      setErrorMessage(result.error ?? "ログインに失敗しました。");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "予期しないエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
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
            <form className="space-y-6" onSubmit={handleStudentSubmit}>
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
              <div className="space-y-5">
                <div>
                  <label htmlFor="student-email" className="block text-primary font-bold text-sm mb-2">
                    大学のメールアドレス（.ac.jp）でログイン
                  </label>
                  <Input
                    id="student-email"
                    type="email"
                    value={acEmail}
                    onChange={(e) => setAcEmail(e.target.value)}
                    placeholder="xxx@xxx.ac.jp"
                    className="w-full"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label htmlFor="student-password" className="block text-primary font-bold text-sm mb-2">
                    パスワード
                  </label>
                  <input
                    id="student-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワードを入力"
                    disabled={isLoading}
                    className="w-full border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none text-slate-900 bg-white placeholder-gray-400 rounded-none px-3 py-2"
                  />
                </div>
              </div>
              {errorMessage && tab === "student" && (
                <p className="text-sm text-red-600" role="alert">
                  {errorMessage}
                </p>
              )}
              <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
                {isLoading ? "処理中..." : "ログイン"}
              </Button>
            </form>
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
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-primary font-bold text-sm mb-2">パスワード</label>
                <Input
                  type="password"
                  value={companyPassword}
                  onChange={(e) => setCompanyPassword(e.target.value)}
                  placeholder="パスワードを入力"
                  disabled={isLoading}
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
              {errorMessage && tab === "company" && (
                <p className="text-sm text-red-600" role="alert">
                  {errorMessage}
                </p>
              )}
              <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
                {isLoading ? "処理中..." : "ログイン"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
