"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";

type TabType = "student" | "company";

/** 運営アカウント特例：大学メール欄・企業タブでこのアドレスと完全一致のときの扱いに使用 */
const OPERATIONS_EMAIL_WHITELIST = "ibeckzoom@gmail.com";
const EMAIL_REGEX = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
const UNIVERSITY_DOMAIN_ERROR = "大学発行のメールアドレス（.ac.jpなど）を入力してください";

const companySignupSchema = z.object({
  companyEmail: z.string().min(1, "法人メールアドレスを入力してください").email("正しいメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください").min(6, "パスワードは6文字以上で入力してください"),
});

type CompanySignupForm = z.infer<typeof companySignupSchema>;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isAllowedUniversityDomainFromEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
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

export default function SignupPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>("student");

  // Student state
  const [universityEmail, setUniversityEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [admissionYear, setAdmissionYear] = useState("2026");
  const [graduationYear, setGraduationYear] = useState("2026");
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  // Company state (keep existing)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanySignupForm>({
    resolver: zodResolver(companySignupSchema),
    defaultValues: { companyEmail: "", password: "" },
  });

  const ADMISSION_YEARS = ["2022", "2023", "2024", "2025", "2026"];
  const GRADUATION_YEARS = ["2026", "2027", "2028", "2029", "2030"];

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setSubmitError(null);

    const uEmail = normalizeEmail(universityEmail);
    const cEmail = normalizeEmail(contactEmail);
    const p = password.trim();

    const [universityLocal, universityDomain] = uEmail.split("@");
    if (!uEmail || !universityLocal || !universityDomain) {
      setSubmitError("大学のメールアドレスを正しい形式で入力してください。");
      return;
    }
    if (!isAllowedUniversityDomainFromEmail(uEmail)) {
      setSubmitError(UNIVERSITY_DOMAIN_ERROR);
      return;
    }

    if (p.length < 8) {
      setSubmitError("パスワードは8文字以上で入力してください。");
      return;
    }
    if (!fullName.trim()) {
      setSubmitError("氏名を入力してください。");
      return;
    }
    const contactEmailValidation = z.string().email().safeParse(cEmail);
    if (!cEmail || !contactEmailValidation.success) {
      setSubmitError("連絡先メールアドレスを正しい形式で入力してください。");
      return;
    }
    if (!university.trim()) {
      setSubmitError("大学名を入力してください。");
      return;
    }
    if (!faculty.trim()) {
      setSubmitError("学部・学科を入力してください。");
      return;
    }
    if (!admissionYear) {
      setSubmitError("入学年度を選択してください。");
      return;
    }
    if (!graduationYear) {
      setSubmitError("卒業予定年度を選択してください。");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: uEmail,
        password: p,
        options: {
          data: {
            full_name: fullName.trim(),
            contact_email: cEmail,
            university: university.trim(),
            faculty: faculty.trim(),
            admission_year: admissionYear,
            graduation_year: graduationYear,
          },
        },
      });
      if (error) throw error;
      setSignupSuccess(true);
      setSentEmail(uEmail);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "登録に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanySubmit = async (data: CompanySignupForm) => {
    setSubmitError(null);
    const email = normalizeEmail(data.companyEmail);
    if (email === OPERATIONS_EMAIL_WHITELIST) {
      router.push("/companydashboard");
      return;
    }
    if (isLoading) return;
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

  if (tab === "student" && signupSuccess) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
        <div className="w-full max-w-[520px] bg-white border border-slate-200 shadow-sm">
          <div className="p-10">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl text-primary inline-block">mail</span>
              <h2 className="mt-4 text-primary text-xl font-bold">確認リンクを送信しました</h2>
              <p className="text-slate-600 text-sm mt-3">
                本人確認のため、入力された大学のメールアドレス（{sentEmail}）に確認リンクを送信しました。リンクをクリックして本登録を完了してください。
              </p>
              <div className="mt-8">
                <Link href="/login" className="text-primary font-bold hover:underline">
                  ログインへ
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
      <div className="w-full max-w-[520px] bg-white border border-slate-200 shadow-sm">
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
                tab === "student" ? "text-primary border-b-2 border-primary" : "text-grey-custom hover:text-primary"
              }`}
            >
              学生・団体の方
            </button>
            <button
              type="button"
              onClick={() => setTab("company")}
              className={`flex-1 py-3 text-center text-sm font-bold transition-colors ${
                tab === "company" ? "text-primary border-b-2 border-primary" : "text-grey-custom hover:text-primary"
              }`}
            >
              企業の方
            </button>
          </div>

          {tab === "student" && (
            <form className="space-y-6" onSubmit={handleStudentSubmit}>
              <div>
                <label htmlFor="university-email" className="block text-primary font-bold text-sm mb-2">
                  大学のメールアドレス（認証用）
                </label>
                <Input
                  id="university-email"
                  type="email"
                  value={universityEmail}
                  onChange={(e) => setUniversityEmail(e.target.value)}
                  placeholder="xxx@xxx.ac.jp"
                  disabled={isLoading}
                  className="w-full"
                />
                <p className="text-slate-500 text-xs mt-2">
                  ※本人確認のため、大学発行のメールアドレスのみ有効です
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-primary font-bold text-sm mb-2">
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8文字以上"
                  disabled={isLoading}
                  className="w-full border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none text-slate-900 bg-white placeholder-gray-400 rounded-none px-3 py-2"
                />
              </div>

              <div>
                <label htmlFor="full-name" className="block text-primary font-bold text-sm mb-2">
                  氏名
                </label>
                <Input
                  id="full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="例: 山田 太郎"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-primary font-bold text-sm mb-2">
                  よく確認する連絡先メールアドレス（連絡用）
                </label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Gmail等"
                  disabled={isLoading}
                />
                <p className="text-slate-500 text-xs mt-2">
                  ※選考の案内等はこちらに届きます
                </p>
              </div>

              <div>
                <label htmlFor="university" className="block text-primary font-bold text-sm mb-2">
                  大学名
                </label>
                <Input
                  id="university"
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="例: 東京大学"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="faculty" className="block text-primary font-bold text-sm mb-2">
                  学部・学科
                </label>
                <Input
                  id="faculty"
                  type="text"
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  placeholder="例: 法学部"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="admission-year" className="block text-primary font-bold text-sm mb-2">
                    入学年度
                  </label>
                  <select
                    id="admission-year"
                    value={admissionYear}
                    onChange={(e) => setAdmissionYear(e.target.value)}
                    disabled={isLoading}
                    className="w-full border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none text-slate-900 bg-white px-3 py-2"
                  >
                    {ADMISSION_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}年度
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="graduation-year" className="block text-primary font-bold text-sm mb-2">
                    卒業予定年度
                  </label>
                  <select
                    id="graduation-year"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    disabled={isLoading}
                    className="w-full border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none text-slate-900 bg-white px-3 py-2"
                  >
                    {GRADUATION_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}年度
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {submitError && (
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
                setSubmitError("入力内容を確認してください。");
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
                {errors.companyEmail && <p className="mt-1 text-red-600 text-xs">{errors.companyEmail.message}</p>}
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
                {errors.password && <p className="mt-1 text-red-600 text-xs">{errors.password.message}</p>}
              </div>
              <div className="text-right">
                <Link href="/login" className="text-sm text-grey-custom hover:text-primary hover:underline">
                  パスワードを忘れた場合
                </Link>
              </div>
              {submitError && <p className="text-sm text-red-600" role="alert">{submitError}</p>}
              <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
                {isLoading ? "処理中..." : "登録"}
              </Button>
            </form>
          )}

          <p className="text-center text-grey-custom text-sm mt-8">
            すでにアカウントをお持ちの方は
            <Link href="/login" className="text-primary font-bold hover:underline ml-1">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
