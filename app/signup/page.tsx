"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";

const MAGIC_EMAIL = "ibeckzoom@gmail.com";
type TabType = "student" | "company";

const companySignupSchema = z.object({
  companyEmail: z
    .string()
    .min(1, "法人メールアドレスを入力してください")
    .email("正しいメールアドレスを入力してください"),
  password: z
    .string()
    .min(1, "パスワードを入力してください")
    .min(6, "パスワードは6文字以上で入力してください"),
});

type CompanySignupForm = z.infer<typeof companySignupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>("student");
  const [acEmail, setAcEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanySignupForm>({
    resolver: zodResolver(companySignupSchema),
    defaultValues: { companyEmail: "", password: "" },
  });

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const email = acEmail.trim().toLowerCase();
    if (!email) {
      setSubmitError("メールアドレスを入力してください。");
      return;
    }
    if (studentPassword.length < 6) {
      setSubmitError("パスワードは6文字以上で入力してください。");
      return;
    }
    if (email === MAGIC_EMAIL) {
      router.push("/mypage");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: studentPassword.trim(),
      });
      if (error) throw error;
      router.push("/mypage");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "登録に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanySubmit = async (data: CompanySignupForm) => {
    setSubmitError(null);
    const email = data.companyEmail.trim().toLowerCase();
    if (email === MAGIC_EMAIL) {
      router.push("/companydashboard");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: data.password,
      });
      if (error) throw error;
      router.push("/companydashboard");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "登録に失敗しました。");
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
            <p className="text-text-grey text-sm mt-2">新規登録</p>
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
                LINEでログイン（または登録）
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
                <label htmlFor="student-email" className="block text-primary font-bold text-sm mb-2">
                  大学のメールアドレス（.ac.jp）で登録
                </label>
                <Input
                  id="student-email"
                  type="email"
                  value={acEmail}
                  onChange={(e) => setAcEmail(e.target.value)}
                  placeholder="xxx@xxx.ac.jp"
                  disabled={isLoading}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="student-password" className="block text-primary font-bold text-sm mb-2">
                  パスワード
                </label>
                <input
                  id="student-password"
                  type="password"
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  placeholder="パスワードを入力（6文字以上）"
                  disabled={isLoading}
                  className="w-full border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none text-slate-900 bg-white placeholder-gray-400 rounded-none px-3 py-2"
                />
              </div>
              {submitError && tab === "student" && (
                <p className="text-sm text-red-600" role="alert">
                  {submitError}
                </p>
              )}
              <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
                {isLoading ? "処理中..." : "登録"}
              </Button>
            </form>
          )}

          {tab === "company" && (
            <form
              className="space-y-5"
              onSubmit={handleSubmit(handleCompanySubmit, () => {
                toast("入力内容を確認してください", {
                  icon: (
                    <span className="material-symbols-outlined" style={{ color: "#8B0000", fontSize: 20 }}>
                      error
                    </span>
                  ),
                });
              })}
            >
              <div>
                <label className="block text-primary font-bold text-sm mb-2">法人メールアドレス</label>
                <Input
                  type="email"
                  placeholder="メールアドレスを入力"
                  {...register("companyEmail")}
                  disabled={isLoading}
                  className={errors.companyEmail ? "border-accent" : ""}
                />
                {errors.companyEmail && (
                  <p className="mt-1 text-red-600 text-xs">{errors.companyEmail.message}</p>
                )}
              </div>
              <div>
                <label className="block text-primary font-bold text-sm mb-2">パスワード</label>
                <Input
                  type="password"
                  placeholder="パスワードを入力（6文字以上）"
                  {...register("password")}
                  disabled={isLoading}
                  className={errors.password ? "border-accent" : ""}
                />
                {errors.password && (
                  <p className="mt-1 text-red-600 text-xs">{errors.password.message}</p>
                )}
              </div>
              <div className="text-right">
                <Link
                  href="/login"
                  className="text-sm text-grey-custom hover:text-primary hover:underline"
                >
                  パスワードを忘れた場合
                </Link>
              </div>
              {submitError && tab === "company" && (
                <p className="text-sm text-red-600" role="alert">
                  {submitError}
                </p>
              )}
              <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
                {isLoading ? "処理中..." : "登録"}
              </Button>
            </form>
          )}

          <p className="text-center text-grey-custom text-sm mt-8">
            {tab === "student" ? (
              <>
                すでにアカウントをお持ちの方は
                <Link href="/login" className="text-primary font-bold hover:underline ml-1">ログイン</Link>
              </>
            ) : (
              <>
                すでにアカウントをお持ちの方は
                <Link href="/login" className="text-primary font-bold hover:underline ml-1">ログイン</Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
