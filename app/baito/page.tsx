"use client";

import Link from "next/link";

import { useState, useEffect, useCallback } from "react";
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
};

// ─────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────
const ALL_TAGS = [
  "未経験OK",
  "高時給",
  "シフト自由",
  "週1〜OK",
  "リモート可",
  "スキルになる",
  "就活有利",
  "理系向け",
  "文系OK",
  "在宅可",
] as const;

const GUIDE_ITEMS = [
  {
    icon: "schedule",
    title: "学業・サークルと両立できるか確認する",
    body: "テスト期間にシフトを減らせるか、週何回から入れるかを応募前に必ず確認しましょう。「週1〜OK」「シフト自由」の表記が目安です。",
  },
  {
    icon: "location_on",
    title: "通勤30分以内を目安にする",
    body: "移動時間はそのまま「失われる時間」です。大学・自宅から近い場所を優先することで、浮いた時間を勉強やサークルに使えます。",
  },
  {
    icon: "currency_yen",
    title: "年収の壁を把握する（2025年改正済）",
    body: "2025年の税制改正で「103万円の壁」は引き上げられましたが、壁は複数あります。所得税・扶養・社会保険それぞれで基準が異なるため、自分に関係する壁を正確に把握しましょう。",
  },
  {
    icon: "trending_up",
    title: "「稼ぐ」だけでなく「得るもの」で選ぶ",
    body: "家庭教師・インターン・ITバイトなどは時給以上にスキルや就活ネタが得られます。将来を見据えた選択が大学生活を豊かにします。",
  },
] as const;

// ─────────────────────────────────────────────
// スコアバー
// ─────────────────────────────────────────────
function ScoreBar({ label, score }: { label: string; score: number | null }) {
  if (!score) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-grey w-16 shrink-0">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-4 h-2 ${i <= score ? "bg-accent" : "bg-slate-200"}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 案件カード
// ─────────────────────────────────────────────
function JobCard({ job }: { job: JobListing }) {
  const typeLabel = job.type === "baito" ? "バイト" : "インターン";
  const typeBg = job.type === "baito" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent";

  return (
    <article className="bg-white border border-[#f0f2f5] hover:border-accent/40 hover:shadow-sm transition-all flex flex-col">
      {/* ヘッダー */}
      <div className="p-5 border-b border-[#f0f2f5] flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 ${typeBg}`}>
            {typeLabel}
          </span>
          <span className="text-xs text-text-grey">{job.company_name}</span>
        </div>
        <h3 className="text-primary text-lg font-black leading-snug">{job.title}</h3>
        {/* メタ情報 */}
        <div className="flex flex-wrap gap-3 text-xs text-text-grey">
          {job.location && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">location_on</span>
              {job.location}
            </span>
          )}
          {job.work_style && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">work</span>
              {job.work_style}
            </span>
          )}
        </div>
      </div>

      {/* 本文 */}
      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* 説明 */}
        {job.description && (
          <p className="text-text-grey text-sm leading-relaxed">
            {job.description}
          </p>
        )}

        {/* こんな人におすすめタグ */}
        {job.tags && job.tags.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-primary">こんな人におすすめ</p>
            <div className="flex flex-wrap gap-1.5">
              {job.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-primary/5 text-primary border border-primary/10"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* スコア */}
        <div className="flex flex-col gap-1.5 pt-1">
          <ScoreBar label="両立しやすさ" score={job.score_balance} />
          <ScoreBar label="スキルになる" score={job.score_skill} />
          <ScoreBar label="稼ぎやすさ" score={job.score_income} />
        </div>
      </div>

      {/* CTA */}
      <div className="p-5 pt-0 flex flex-col gap-2">
        {job.affiliate_url ? (
          <a
            href={job.affiliate_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="w-full flex items-center justify-center gap-2 bg-accent text-white hover:bg-[#600000] transition-colors py-3 font-bold text-sm"
          >
            {job.title}で探す
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </a>
        ) : (
          <div className="w-full flex items-center justify-center py-3 bg-slate-100 text-text-grey text-sm">
            準備中
          </div>
        )}
        <p className="text-[10px] text-text-grey text-center">
          ※外部サービスに移動します（広告）
        </p>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────
// メインページ
// ─────────────────────────────────────────────
export default function BaitoPage() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<"all" | "baito" | "intern">("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("job_listings")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (activeType !== "all") {
      query = query.eq("type", activeType);
    }
    if (activeTags.length > 0) {
      query = query.contains("tags", activeTags);
    }

    const { data, error } = await query;
    if (error) {
      console.error("job_listings fetch error:", error);
      setJobs([]);
    } else {
      setJobs((data as JobListing[]) ?? []);
    }
    setLoading(false);
  }, [activeType, activeTags]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="bg-white text-primary min-h-screen flex flex-col font-body pb-20 md:pb-0">
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 py-12 md:py-20 flex flex-col gap-16">

        {/* ── Hero ── */}
        <section className="flex flex-col gap-6 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-accent text-2xl">work</span>
            <span className="text-accent text-sm font-bold tracking-widest uppercase">Baito & Intern</span>
          </div>
          <h1 className="text-primary text-3xl md:text-5xl font-black leading-tight tracking-tight">
            バイト・インターン<br />どうする？
          </h1>
          <p className="text-text-grey text-base md:text-lg leading-relaxed">
            授業・サークルとの両立を考えながら、自分に合ったバイト・インターンを探そう。
            ProofLoopが大学生目線で厳選した案件を紹介します。
          </p>
        </section>

        {/* ── シミュレーター導線 ── */}
        <section
          style={{ backgroundColor: "#002b5c", color: "#ffffff" }}
          className="p-8 flex flex-col md:flex-row items-center gap-6 justify-between"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-xl"
                style={{ color: "#8B0000" }}
              >
                auto_graph
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                NEW
              </span>
            </div>
            <h2
              className="font-black text-xl md:text-2xl leading-snug"
              style={{ color: "#ffffff" }}
            >
              授業・サークル・バイト、<br className="md:hidden" />
              全部両立できる？
            </h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              3つの質問に答えるだけで、あなたの大学生活の可処分時間・月収・年収の壁を一括シミュレーション。
            </p>
          </div>
          <Link
            href="/baito/simulator"
            className="shrink-0 inline-flex items-center gap-2 bg-accent text-white hover:bg-[#600000] transition-colors px-8 py-4 font-black text-base whitespace-nowrap"
          >
            シミュレートしてみる
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </section>

        {/* ── 選び方ガイド ── */}
        <section className="flex flex-col gap-6">
          <h2 className="text-primary text-xl md:text-2xl font-black">
            バイト選びで後悔しない4つの軸
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GUIDE_ITEMS.map((item, i) => (
              <div key={i} className="border border-[#f0f2f5] p-6 flex gap-4">
                <div className="w-10 h-10 bg-primary/5 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-xl">{item.icon}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-primary text-sm font-bold">{item.title}</h3>
                  <p className="text-text-grey text-sm leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 年収の壁コラム（2025年改正版） ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-accent text-xl">policy</span>
            <h2 className="text-primary text-xl md:text-2xl font-black">年収の壁、2025年に大きく変わりました</h2>
          </div>

          <p className="text-text-grey text-sm leading-relaxed">
            「103万円の壁」という言葉をよく聞くと思いますが、2025年の税制改正で仕組みが変わりました。
            ただし<strong className="text-primary">壁はひとつではなく、税・扶養・社会保険で別々に存在します。</strong>
            混同しやすいので、種類ごとに整理しましょう。
          </p>

          {/* 壁の一覧テーブル */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-[#f0f2f5]">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="px-4 py-3 text-left font-bold text-xs whitespace-nowrap">壁の種類</th>
                  <th className="px-4 py-3 text-left font-bold text-xs whitespace-nowrap">改正前</th>
                  <th className="px-4 py-3 text-left font-bold text-xs whitespace-nowrap">2025年改正後</th>
                  <th className="px-4 py-3 text-left font-bold text-xs">超えると何が起きる？</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#f0f2f5] bg-white">
                  <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">所得税の壁</td>
                  <td className="px-4 py-3 text-text-grey whitespace-nowrap">103万円</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-emerald-700">160万円</span>
                    <span className="text-xs text-text-grey ml-1">に引き上げ</span>
                  </td>
                  <td className="px-4 py-3 text-text-grey text-xs">自分自身に所得税がかかる</td>
                </tr>
                <tr className="border-t border-[#f0f2f5] bg-slate-50/50">
                  <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">扶養控除の壁</td>
                  <td className="px-4 py-3 text-text-grey whitespace-nowrap">103万円</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-emerald-700">123万円</span>
                    <span className="text-xs text-text-grey ml-1">に引き上げ</span>
                  </td>
                  <td className="px-4 py-3 text-text-grey text-xs">親が扶養控除（63万円）を受けられなくなる</td>
                </tr>
                <tr className="border-t border-[#f0f2f5] bg-white">
                  <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      大学生特例
                      <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent font-bold">NEW</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-grey whitespace-nowrap">なし</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-emerald-700">150万円</span>
                    <span className="text-xs text-text-grey ml-1">まで親の控除が満額</span>
                  </td>
                  <td className="px-4 py-3 text-text-grey text-xs">19〜22歳は特定親族特別控除が適用。188万円まで段階的控除あり</td>
                </tr>
                <tr className="border-t border-[#f0f2f5] bg-slate-50/50">
                  <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">住民税の壁</td>
                  <td className="px-4 py-3 text-text-grey whitespace-nowrap">100万円</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-emerald-700">110万円</span>
                    <span className="text-xs text-text-grey ml-1">に引き上げ</span>
                  </td>
                  <td className="px-4 py-3 text-text-grey text-xs">住民税がかかる（翌年6月から徴収）</td>
                </tr>
                <tr className="border-t border-[#f0f2f5] bg-white">
                  <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">社会保険の壁</td>
                  <td className="px-4 py-3 text-text-grey whitespace-nowrap">106万円 / 130万円</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-amber-600">130万円は変わらず</span>
                  </td>
                  <td className="px-4 py-3 text-text-grey text-xs">親の社会保険の扶養から外れ、自分で国民健康保険に加入</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 注意ポイント */}
          <div className="flex flex-col gap-3">
            <div className="bg-amber-50 border border-amber-200 px-5 py-4 flex gap-3">
              <span className="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">warning</span>
              <div className="flex flex-col gap-1">
                <p className="text-amber-800 font-bold text-sm">130万円の壁は2025年も変わっていません</p>
                <p className="text-amber-700 text-xs leading-relaxed">
                  所得税の壁は引き上げられましたが、<strong>社会保険（健康保険・年金）の130万円の壁は据え置きです。</strong>
                  130万円を超えると親の扶養から外れ、自分で国民健康保険料を払う必要があります（年間約20万円〜）。
                  106万円の壁（51人以上の企業）は2026年10月をめどに撤廃予定です。
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 px-5 py-4 flex gap-3">
              <span className="material-symbols-outlined text-emerald-600 text-lg shrink-0 mt-0.5">check_circle</span>
              <div className="flex flex-col gap-1">
                <p className="text-emerald-800 font-bold text-sm">大学生（19〜22歳）は特に優遇されています</p>
                <p className="text-emerald-700 text-xs leading-relaxed">
                  2025年の改正で新設された<strong>「特定親族特別控除」</strong>により、大学生の年収が123万円を超えても
                  <strong>150万円まで親の控除（63万円）が満額</strong>適用されます。
                  さらに188万円まで段階的に控除が続くため、以前より大きく稼ぎやすくなっています。
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-text-grey">
            ※上記は2025年3月の税制改正大綱に基づく内容です。詳細は国税庁・首相官邸の公式情報をご確認ください。
            掛け持ちバイトの場合は複数の収入を合算して管理しましょう。
          </p>
        </section>

        {/* ── 案件一覧 ── */}
        <section className="flex flex-col gap-6">
          <h2 className="text-primary text-xl md:text-2xl font-black">
            ProofLoop厳選 求人一覧
          </h2>

          {/* フィルター：タイプ */}
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              {(["all", "baito", "intern"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`px-5 py-2 text-sm font-bold transition-colors ${
                    activeType === t
                      ? "bg-primary text-white"
                      : "bg-white border border-[#f0f2f5] text-text-grey hover:border-primary hover:text-primary"
                  }`}
                >
                  {t === "all" ? "すべて" : t === "baito" ? "バイト" : "インターン"}
                </button>
              ))}
            </div>

            {/* フィルター：タグ */}
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                    activeTags.includes(tag)
                      ? "bg-accent text-white"
                      : "bg-white border border-[#f0f2f5] text-text-grey hover:border-accent hover:text-accent"
                  }`}
                >
                  {tag}
                </button>
              ))}
              {activeTags.length > 0 && (
                <button
                  onClick={() => setActiveTags([])}
                  className="px-3 py-1.5 text-xs text-text-grey underline"
                >
                  クリア
                </button>
              )}
            </div>
          </div>

          {/* 案件グリッド */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-text-grey gap-2">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              読み込み中...
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-grey">
              <span className="material-symbols-outlined text-4xl">search_off</span>
              <p className="text-sm">条件に合う案件が見つかりませんでした</p>
              <button
                onClick={() => { setActiveType("all"); setActiveTags([]); }}
                className="text-accent text-sm underline"
              >
                フィルターをリセット
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>

        {/* ── 次のステップ：サークルを探す ── */}
        <section className="border border-[#f0f2f5] p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex flex-col gap-2">
            <h3 className="text-primary font-black text-lg">バイトが決まったら、サークルも探そう</h3>
            <p className="text-text-grey text-sm">
              ProofLoopでは全国の学生団体を検索できます。バイトと両立できるサークルがきっと見つかります。
            </p>
          </div>
          <a
            href="/search"
            className="shrink-0 inline-flex items-center gap-2 bg-primary text-white hover:bg-primary-hover transition-colors px-8 py-3 font-bold text-sm"
          >
            サークルを探す
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </a>
        </section>

      </main>
    </div>
  );
}