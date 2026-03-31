"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────
type JobListing = {
  id: string;
  title: string;
  type: "baito" | "intern";
  company_name: string | null;
  description: string | null;
  hourly_wage_min: number | null;
  hourly_wage_max: number | null;
  location: string | null;
  work_style: string | null;
  score_balance: number | null;
  score_skill: number | null;
  score_income: number | null;
  tags: string[];
  affiliate_url: string | null;
  is_active: boolean;
  display_order: number;
};

const EMPTY_FORM: Omit<JobListing, "id"> = {
  title: "",
  type: "baito",
  company_name: "",
  description: "",
  hourly_wage_min: null,
  hourly_wage_max: null,
  location: "",
  work_style: "",
  score_balance: 3,
  score_skill: 3,
  score_income: 3,
  tags: [],
  affiliate_url: "",
  is_active: true,
  display_order: 0,
};

const PRESET_TAGS = [
  "未経験OK", "高時給", "シフト自由", "週1〜OK",
  "リモート可", "スキルになる", "就活有利",
  "理系向け", "文系OK", "在宅可",
];

// ─────────────────────────────────────────────
// 管理者認証チェック Hook
// ─────────────────────────────────────────────
function useAdminGuard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace("/"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .limit(1);

      if (cancelled) return;
      const role = (data?.[0] as { role?: string } | undefined)?.role;
      if (role !== "admin") { router.replace("/"); return; }
      setIsAdmin(true);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [router]);

  return { ready, isAdmin };
}

// ─────────────────────────────────────────────
// スコア入力
// ─────────────────────────────────────────────
function ScoreInput({
  label, value, onChange,
}: { label: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 w-28 shrink-0">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={`w-8 h-8 text-sm font-bold border transition-colors ${
              value === i
                ? "bg-accent text-white border-accent"
                : "bg-white text-slate-400 border-slate-200 hover:border-accent hover:text-accent"
            }`}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 求人フォーム（新規・編集共用）
// ─────────────────────────────────────────────
function JobForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: Omit<JobListing, "id">;
  onSave: (data: Omit<JobListing, "id">) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const toggleTag = (tag: string) =>
    set("tags", form.tags.includes(tag)
      ? form.tags.filter((t) => t !== tag)
      : [...form.tags, tag]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("職種名は必須です"); return; }
    onSave(form);
  };

  const inputCls = "w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-primary";
  const labelCls = "block text-sm font-bold text-slate-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* 基本情報 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>職種名 <span className="text-accent">*</span></label>
          <input className={inputCls} value={form.title}
            onChange={(e) => set("title", e.target.value)} placeholder="例: カフェスタッフ" />
        </div>
        <div>
          <label className={labelCls}>種別</label>
          <select className={inputCls} value={form.type}
            onChange={(e) => set("type", e.target.value as "baito" | "intern")}>
            <option value="baito">バイト</option>
            <option value="intern">インターン</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>掲載サービス名</label>
          <input className={inputCls} value={form.company_name ?? ""}
            onChange={(e) => set("company_name", e.target.value)} placeholder="例: マイナビバイト" />
        </div>
        <div>
          <label className={labelCls}>勤務地</label>
          <input className={inputCls} value={form.location ?? ""}
            onChange={(e) => set("location", e.target.value)} placeholder="例: 全国・リモート可" />
        </div>
        <div>
          <label className={labelCls}>時給（下限）</label>
          <input className={inputCls} type="number" value={form.hourly_wage_min ?? ""}
            onChange={(e) => set("hourly_wage_min", e.target.value ? Number(e.target.value) : null)}
            placeholder="例: 1050" />
        </div>
        <div>
          <label className={labelCls}>時給（上限）</label>
          <input className={inputCls} type="number" value={form.hourly_wage_max ?? ""}
            onChange={(e) => set("hourly_wage_max", e.target.value ? Number(e.target.value) : null)}
            placeholder="例: 1500" />
        </div>
        <div>
          <label className={labelCls}>働き方</label>
          <input className={inputCls} value={form.work_style ?? ""}
            onChange={(e) => set("work_style", e.target.value)} placeholder="例: 週2〜・シフト制" />
        </div>
        <div>
          <label className={labelCls}>表示順（小さいほど上）</label>
          <input className={inputCls} type="number" value={form.display_order}
            onChange={(e) => set("display_order", Number(e.target.value))} />
        </div>
      </div>

      {/* 説明文 */}
      <div>
        <label className={labelCls}>説明文</label>
        <textarea className={`${inputCls} resize-none`} rows={3}
          value={form.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          placeholder="大学生目線でのバイトの魅力・特徴を2〜3行で書いてください" />
      </div>

      {/* アフィリエイトURL */}
      <div>
        <label className={labelCls}>アフィリエイトURL（ASPリンク）</label>
        <input className={inputCls} value={form.affiliate_url ?? ""}
          onChange={(e) => set("affiliate_url", e.target.value)}
          placeholder="https://..." />
        <p className="text-xs text-slate-400 mt-1">承認後に差し込む場合は空欄でOKです</p>
      </div>

      {/* タグ */}
      <div>
        <label className={labelCls}>タグ</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_TAGS.map((tag) => (
            <button key={tag} type="button" onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 text-xs font-bold border transition-colors ${
                form.tags.includes(tag)
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-slate-500 border-slate-200 hover:border-primary"
              }`}>
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* スコア */}
      <div className="flex flex-col gap-3">
        <label className={labelCls}>ProofLoopスコア（1〜5）</label>
        <ScoreInput label="両立しやすさ" value={form.score_balance}
          onChange={(v) => set("score_balance", v)} />
        <ScoreInput label="スキルになる" value={form.score_skill}
          onChange={(v) => set("score_skill", v)} />
        <ScoreInput label="稼ぎやすさ" value={form.score_income}
          onChange={(v) => set("score_income", v)} />
      </div>

      {/* 公開設定 */}
      <div className="flex items-center gap-3">
        <input type="checkbox" id="is_active" checked={form.is_active}
          onChange={(e) => set("is_active", e.target.checked)}
          className="w-4 h-4 accent-primary" />
        <label htmlFor="is_active" className="text-sm font-bold text-slate-700">
          公開する（チェックを外すと非表示）
        </label>
      </div>

      {/* ボタン */}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="px-8 py-2.5 bg-primary text-white font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
          {saving ? "保存中..." : "保存する"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-8 py-2.5 border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
          キャンセル
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────
// 案件行
// ─────────────────────────────────────────────
function JobRow({
  job,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  job: JobListing;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const wage = job.hourly_wage_min
    ? `¥${job.hourly_wage_min.toLocaleString()}〜${job.hourly_wage_max ? "¥" + job.hourly_wage_max.toLocaleString() : ""}`
    : "—";

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-sm text-primary">{job.title}</span>
          {job.company_name && (
            <span className="text-xs text-slate-400">{job.company_name}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-bold px-2 py-0.5 ${
          job.type === "baito" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
        }`}>
          {job.type === "baito" ? "バイト" : "インターン"}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{wage}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {job.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500">{t}</span>
          ))}
          {job.tags.length > 3 && (
            <span className="text-[10px] text-slate-400">+{job.tags.length - 3}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">{job.display_order}</td>
      <td className="px-4 py-3">
        <button onClick={onToggleActive}
          className={`text-xs font-bold px-2 py-1 transition-colors ${
            job.is_active
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "bg-slate-100 text-slate-400 hover:bg-slate-200"
          }`}>
          {job.is_active ? "公開中" : "非公開"}
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button onClick={onEdit}
            className="text-xs px-3 py-1.5 border border-slate-200 text-slate-600 font-bold hover:border-primary hover:text-primary transition-colors">
            編集
          </button>
          <button onClick={onDelete}
            className="text-xs px-3 py-1.5 border border-rose-200 text-rose-500 font-bold hover:bg-rose-50 transition-colors">
            削除
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────
// メインページ
// ─────────────────────────────────────────────
export default function AdminJobsPage() {
  const { ready, isAdmin } = useAdminGuard();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // モーダル制御
  const [mode, setMode] = useState<"list" | "new" | "edit">("list");
  const [editTarget, setEditTarget] = useState<JobListing | null>(null);

  // 削除確認
  const [deleteTarget, setDeleteTarget] = useState<JobListing | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("job_listings")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) { toast.error("取得に失敗しました"); }
    else { setJobs((data as JobListing[]) ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { if (isAdmin) fetchJobs(); }, [isAdmin, fetchJobs]);

  // 保存（新規・更新共用）
  const handleSave = async (data: Omit<JobListing, "id">) => {
    setSaving(true);
    if (mode === "new") {
      const { error } = await supabase.from("job_listings").insert([data]);
      if (error) { toast.error("追加に失敗しました: " + error.message); }
      else { toast.success("追加しました"); setMode("list"); fetchJobs(); }
    } else if (mode === "edit" && editTarget) {
      const { error } = await supabase
        .from("job_listings").update(data).eq("id", editTarget.id);
      if (error) { toast.error("更新に失敗しました: " + error.message); }
      else { toast.success("更新しました"); setMode("list"); fetchJobs(); }
    }
    setSaving(false);
  };

  // 削除
  const handleDelete = async (job: JobListing) => {
    const { error } = await supabase
      .from("job_listings").delete().eq("id", job.id);
    if (error) { toast.error("削除に失敗しました"); }
    else { toast.success(`「${job.title}」を削除しました`); setDeleteTarget(null); fetchJobs(); }
  };

  // 公開/非公開トグル
  const handleToggleActive = async (job: JobListing) => {
    const { error } = await supabase
      .from("job_listings").update({ is_active: !job.is_active }).eq("id", job.id);
    if (error) { toast.error("更新に失敗しました"); }
    else {
      toast.success(job.is_active ? "非公開にしました" : "公開しました");
      fetchJobs();
    }
  };

  // ─── ローディング・権限チェック ───
  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400">確認中...</p>
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-body">
      <main className="max-w-6xl mx-auto p-6 flex flex-col gap-6">

        {/* ヘッダー */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <a href="/admin" className="text-slate-400 text-sm hover:text-primary transition-colors">
                管理者ダッシュボード
              </a>
              <span className="text-slate-300">/</span>
              <span className="text-sm text-primary font-bold">求人管理</span>
            </div>
            <h1 className="text-2xl font-black text-primary">求人管理</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              バイト・インターン案件の追加・編集・削除ができます
            </p>
          </div>
          {mode === "list" && (
            <button
              onClick={() => setMode("new")}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 font-bold text-sm hover:bg-primary-hover transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              新規追加
            </button>
          )}
        </div>

        {/* フォーム（新規・編集） */}
        {(mode === "new" || mode === "edit") && (
          <div className="bg-white border border-slate-200 p-6">
            <h2 className="text-base font-black text-primary mb-5">
              {mode === "new" ? "新規求人を追加" : `「${editTarget?.title}」を編集`}
            </h2>
            <JobForm
              initial={mode === "edit" && editTarget
                ? { ...editTarget }
                : { ...EMPTY_FORM }}
              onSave={handleSave}
              onCancel={() => { setMode("list"); setEditTarget(null); }}
              saving={saving}
            />
          </div>
        )}

        {/* 一覧 */}
        {mode === "list" && (
          <div className="bg-white border border-slate-200">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                読み込み中...
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <span className="material-symbols-outlined text-4xl">work_off</span>
                <p className="text-sm">案件がまだ登録されていません</p>
                <button onClick={() => setMode("new")}
                  className="text-accent text-sm font-bold underline">
                  最初の案件を追加する
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["職種名", "種別", "時給", "タグ", "表示順", "公開状態", "操作"].map((h) => (
                        <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <JobRow key={job.id} job={job}
                        onEdit={() => { setEditTarget(job); setMode("edit"); }}
                        onDelete={() => setDeleteTarget(job)}
                        onToggleActive={() => handleToggleActive(job)}
                      />
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
                  全 {jobs.length} 件
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 flex flex-col gap-4">
            <h3 className="font-black text-primary text-lg">削除の確認</h3>
            <p className="text-slate-600 text-sm">
              「<strong>{deleteTarget.title}</strong>」を削除します。この操作は取り消せません。
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="px-6 py-2.5 bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 transition-colors"
              >
                削除する
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-6 py-2.5 border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
