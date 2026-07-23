"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, Repeat } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";

const OPERATIONS_EMAIL_WHITELIST = "ibeckzoom@gmail.com";
const UNIVERSITY_DOMAIN_ERROR = "大学発行のメールアドレス（.ac.jpなど）を入力してください";

type TabType = "student" | "company";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isAllowedUniversityDomainFromEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (normalized === OPERATIONS_EMAIL_WHITELIST) {
    return true;
  }
  const domain = normalized.split("@")[1];
  return (
    !!domain &&
    (domain.endsWith(".ac.jp") ||
      domain.endsWith(".waseda.jp") ||
      domain === "keio.jp" ||
      domain.endsWith(".keio.jp"))
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>("student");
  const [acEmail, setAcEmail] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyPassword, setCompanyPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const signIn = async (
    email: string,
    passwordRaw: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = normalizeEmail(email);
    const trimmedPassword = passwordRaw.trim();
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
      console.error("Login Error:", error);
      return { success: false, error: error.message ?? "ログインに失敗しました。" };
    }
    return { success: true };
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const email = normalizeEmail(acEmail);
    if (!isAllowedUniversityDomainFromEmail(email)) {
      setErrorMessage(UNIVERSITY_DOMAIN_ERROR);
      toast.error(UNIVERSITY_DOMAIN_ERROR);
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn(acEmail, password);
      if (result.success) {
        router.push("/mypage");
        return;
      }
      const msg = result.error ?? "ログインに失敗しました。";
      setErrorMessage(msg);
      toast.error(msg);
    } catch (err) {
      console.error("Login Error:", err);
      const msg =
        err instanceof Error ? err.message : "予期しないエラーが発生しました。";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const result = await signIn(companyEmail, companyPassword);
      if (result.success) {
        router.push("/companydashboard");
        return;
      }
      const msg = result.error ?? "ログインに失敗しました。";
      setErrorMessage(msg);
      toast.error(msg);
    } catch (err) {
      console.error("Login Error:", err);
      const msg =
        err instanceof Error ? err.message : "予期しないエラーが発生しました。";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

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
            <p className="text-graphite text-sm mt-2">ログイン</p>
          </div>

          <div className="flex border-b border-rule mb-8">
            <button
              type="button"
              onClick={() => setTab("student")}
              className={`flex-1 py-3 text-center text-sm font-bold transition-colors ${
                tab === "student"
                  ? "text-ink border-b-2 border-ink"
                  : "text-graphite hover:text-ink"
              }`}
            >
              学生・団体の方
            </button>
            <button
              type="button"
              onClick={() => setTab("company")}
              className={`flex-1 py-3 text-center text-sm font-bold transition-colors ${
                tab === "company"
                  ? "text-ink border-b-2 border-ink"
                  : "text-graphite hover:text-ink"
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
                <MessageSquare className="w-5 h-5" aria-hidden="true" />
                LINEでログイン
              </button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-rule" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-paper px-2 text-graphite">または</span>
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="student-email"
                    className="block text-ink font-bold text-sm mb-2"
                  >
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
                  <label
                    htmlFor="student-password"
                    className="block text-ink font-bold text-sm mb-2"
                  >
                    パスワード
                  </label>
                  <input
                    id="student-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワードを入力"
                    disabled={isLoading}
                    className="w-full border border-rule focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-ink text-graphite bg-paper placeholder-graphite/50 rounded-none px-3 py-2"
                  />
                </div>
              </div>
              {errorMessage && tab === "student" && (
                <p className="text-sm text-seal" role="alert">
                  {errorMessage}
                </p>
              )}
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "処理中..." : "ログイン"}
              </Button>
              <p className="text-center text-sm text-graphite mt-4">
                アカウントをお持ちでない方
                <Link href="/signup" className="text-ink font-bold hover:underline ml-1">
                  はこちら
                </Link>
              </p>
            </form>
          )}

          {tab === "company" && (
            <form className="space-y-5" onSubmit={handleCompanySubmit}>
              <div>
                <label className="block text-ink font-bold text-sm mb-2">
                  法人メールアドレス
                </label>
                <Input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="メールアドレスを入力"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-ink font-bold text-sm mb-2">
                  パスワード
                </label>
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
                  className="text-sm text-graphite hover:text-ink hover:underline"
                >
                  パスワードを忘れた場合
                </Link>
              </div>
              {errorMessage && tab === "company" && (
                <p className="text-sm text-seal" role="alert">
                  {errorMessage}
                </p>
              )}
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "処理中..." : "ログイン"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
