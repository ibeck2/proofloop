"use client";

import Link from "next/link";
import {
  Briefcase,
  Clock,
  MapPin,
  JapaneseYen,
  TrendingUp,
  LineChart,
  ArrowRight,
  Scale,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ExternalLink,
  Loader2,
  SearchX,
  PiggyBank,
  Home,
  BookOpen,
} from "lucide-react";

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
  /** カードのリンク先URL。is_affiliate=true のときは広告リンク */
  affiliate_url: string | null;
  /** true=広告（rel=sponsored と「広告」開示を付ける） / false=公式サイトへの通常リンク */
  is_affiliate: boolean;
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
    Icon: Clock,
    title: "学業・サークルと両立できるか確認する",
    body: "テスト期間にシフトを減らせるか、週何回から入れるかを応募前に必ず確認しましょう。「週1〜OK」「シフト自由」の表記が目安です。",
  },
  {
    Icon: MapPin,
    title: "通勤30分以内を目安にする",
    body: "移動時間はそのまま「失われる時間」です。大学・自宅から近い場所を優先することで、浮いた時間を勉強やサークルに使えます。",
  },
  {
    Icon: JapaneseYen,
    title: "年収の壁を把握する（2025年改正済）",
    body: "2025年の税制改正で「103万円の壁」は引き上げられましたが、壁は複数あります。所得税・扶養・社会保険それぞれで基準が異なるため、自分に関係する壁を正確に把握しましょう。",
  },
  {
    Icon: TrendingUp,
    title: "「稼ぐ」だけでなく「得るもの」で選ぶ",
    body: "家庭教師・インターン・ITバイトなどは時給以上にスキルや就活ネタが得られます。将来を見据えた選択が大学生活を豊かにします。",
  },
] as const;

// タイプ別おすすめバイト（エディトリアル・非広告）
const RECOMMENDED_BAITO = [
  {
    name: "塾講師・家庭教師",
    wage: "1,200〜2,500円",
    balance: "◎",
    skill: "学力・伝える力・就活ネタ",
    forWhom: "高時給とスキルを両立したい人",
  },
  {
    name: "カフェ・飲食店",
    wage: "1,050〜1,300円",
    balance: "○",
    skill: "接客・臨機応変さ",
    forWhom: "未経験から始めたい・仲間が欲しい人",
  },
  {
    name: "コンビニ",
    wage: "1,050〜1,250円",
    balance: "◎",
    skill: "幅広い業務対応力",
    forWhom: "家や大学の近くで働きたい人",
  },
  {
    name: "在宅ワーク（データ入力・採点）",
    wage: "1,100〜1,500円",
    balance: "◎",
    skill: "PC操作・自己管理",
    forWhom: "スキマ時間を使いたい・通勤したくない人",
  },
  {
    name: "単発・スキマバイト",
    wage: "1,100〜1,500円",
    balance: "◎",
    skill: "多様な現場経験",
    forWhom: "予定が不規則・まず試したい人",
  },
  {
    name: "アパレル・販売",
    wage: "1,050〜1,300円",
    balance: "○",
    skill: "接客・提案力・服割",
    forWhom: "ファッションが好きな人",
  },
  {
    name: "イベント・設営",
    wage: "1,200〜1,800円",
    balance: "○（単発）",
    skill: "体力・チーム連携",
    forWhom: "短期でまとめて稼ぎたい人",
  },
  {
    name: "長期インターン・IT",
    wage: "1,300〜2,000円",
    balance: "△〜○",
    skill: "実務スキル・就活で有利",
    forWhom: "将来のキャリアに繋げたい人",
  },
] as const;

const BAITO_FAQ = [
  {
    q: "大学生のバイトはいつから始めるべき？",
    a: "多くの学生は入学直後の4〜5月から始めます。授業の時間割が固まる履修登録後に探し始めると、無理なくシフトを組めます。前期の生活リズムに慣れてから始めても遅くはありません。",
  },
  {
    q: "大学生に一番おすすめのバイトは？",
    a: "「両立×スキル×時給」のバランスなら塾講師・家庭教師、通勤なしでスキマ時間を活かすなら在宅ワーク、未経験から始めるなら飲食・コンビニが定番です。目的（稼ぐ／スキル／楽さ）を決めてから選ぶのが失敗しないコツです。",
  },
  {
    q: "楽なバイトはどれ？",
    a: "監視・受付や、在宅の採点・データ入力などは体力的な負担が軽めです。ただし「楽」の感じ方は人それぞれ。人と話すのが苦手なら在宅、単純作業が退屈なら接客、と自分の性格に合うものを選ぶと長続きします。",
  },
  {
    q: "一番稼げるバイトは？",
    a: "時給水準なら塾講師・家庭教師・イベント設営・長期インターンが高めです。ただし稼ぐほど年収の壁（扶養）に近づくため、下の「年収の壁」の項目を必ず確認してください。",
  },
  {
    q: "週何回・何時間くらいが目安？",
    a: "学業と両立するなら週2〜3回・月40〜60時間が目安です。テスト期間にシフトを減らせるバイトを選ぶと安心。週4回以上は生活が回るか慎重に判断しましょう。",
  },
  {
    q: "扶養を外れない年収はいくら？",
    a: "2025年の改正で大学生（19〜22歳）は年収150万円まで親の控除が満額適用されます。ただし社会保険の130万円の壁は据え置きです。詳しくは本ページの「年収の壁」の項目を参照してください。",
  },
] as const;

// ─────────────────────────────────────────────
// スコアバー
// ─────────────────────────────────────────────
function ScoreBar({ label, score }: { label: string; score: number | null }) {
  if (!score) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-graphite w-16 shrink-0">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-4 h-2 ${i <= score ? "bg-ink" : "bg-mist"}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FAQアコーディオン
// ─────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="border-b border-rule last:border-0 group">
      <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none">
        <span className="font-bold text-ink text-sm leading-snug">{q}</span>
        <ChevronDown
          className="w-5 h-5 text-graphite shrink-0 group-open:rotate-180 transition-transform duration-200"
          aria-hidden="true"
        />
      </summary>
      <p className="text-graphite text-sm leading-relaxed pb-5">{a}</p>
    </details>
  );
}

// ─────────────────────────────────────────────
// 案件カード
// ─────────────────────────────────────────────
function JobCard({ job }: { job: JobListing }) {
  const typeLabel = job.type === "baito" ? "バイト" : "インターン";
  const typeBg = "bg-mist text-ink";

  return (
    <article className="bg-paper border border-rule hover:border-ink/40 hover:shadow-sm transition-all flex flex-col">
      {/* ヘッダー */}
      <div className="p-5 border-b border-rule flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 ${typeBg}`}>
            {typeLabel}
          </span>
          <span className="text-xs text-graphite">{job.company_name}</span>
        </div>
        <h3 className="text-ink text-lg font-black leading-snug">{job.title}</h3>
        {/* メタ情報 */}
        <div className="flex flex-wrap gap-3 text-xs text-graphite">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" aria-hidden="true" />
              {job.location}
            </span>
          )}
          {job.work_style && (
            <span className="flex items-center gap-1">
              <Briefcase className="w-4 h-4" aria-hidden="true" />
              {job.work_style}
            </span>
          )}
        </div>
      </div>

      {/* 本文 */}
      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* 説明 */}
        {job.description && (
          <p className="text-graphite text-sm leading-relaxed">
            {job.description}
          </p>
        )}

        {/* こんな人におすすめタグ */}
        {job.tags && job.tags.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-ink">こんな人におすすめ</p>
            <div className="flex flex-wrap gap-1.5">
              {job.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-mist text-ink border border-rule"
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
            rel={
              job.is_affiliate
                ? "noopener noreferrer sponsored"
                : "noopener noreferrer"
            }
            className="w-full flex items-center justify-center gap-2 bg-ink text-paper hover:bg-ink/90 transition-colors py-3 font-bold text-sm"
          >
            {job.title}で探す
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </a>
        ) : (
          <div className="w-full flex items-center justify-center py-3 bg-mist text-graphite text-sm">
            準備中
          </div>
        )}
        <p className="text-[10px] text-graphite text-center">
          {job.is_affiliate
            ? "※外部サービスに移動します（広告）"
            : "※公式サイトに移動します"}
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
    <div className="bg-paper text-ink min-h-screen flex flex-col font-body pb-20 md:pb-0">
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 py-12 md:py-20 flex flex-col gap-16">

        {/* ── Hero ── */}
        <section className="flex flex-col gap-6 max-w-2xl">
          <div className="flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-ink" aria-hidden="true" />
            <span className="text-ink text-sm font-bold tracking-widest uppercase">Baito & Intern</span>
          </div>
          <h1 className="font-mincho text-ink text-3xl md:text-5xl font-bold leading-tight tracking-tight">
            バイト・インターン<br />どうする？
          </h1>
          <p className="text-graphite text-base md:text-lg leading-relaxed">
            授業・サークルとの両立を考えながら、自分に合ったバイト・インターンを探そう。
            ProofLoopが大学生目線で厳選した案件を紹介します。
          </p>
        </section>

        {/* ── シミュレーター導線 ── */}
        <section className="bg-ink text-paper p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-paper" aria-hidden="true" />
              <span className="text-sm font-bold text-paper/70">
                NEW
              </span>
            </div>
            <h2 className="font-mincho font-bold text-xl md:text-2xl leading-snug text-paper">
              授業・サークル・バイト、<br className="md:hidden" />
              全部両立できる？
            </h2>
            <p className="text-sm text-paper/70">
              3つの質問に答えるだけで、あなたの大学生活の可処分時間・月収・年収の壁を一括シミュレーション。
            </p>
          </div>
          <Link
            href="/baito/simulator"
            className="shrink-0 inline-flex items-center gap-2 bg-seal text-paper hover:bg-seal/90 transition-colors px-8 py-4 font-black text-base whitespace-nowrap"
          >
            シミュレートしてみる
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        </section>

        {/* ── 選び方ガイド ── */}
        <section className="flex flex-col gap-6">
          <h2 className="font-mincho text-ink text-xl md:text-2xl font-bold">
            バイト選びで後悔しない4つの軸
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GUIDE_ITEMS.map((item, i) => (
              <div key={i} className="border border-rule p-6 flex gap-4">
                <div className="w-10 h-10 bg-mist flex items-center justify-center shrink-0">
                  <item.Icon className="w-5 h-5 text-ink" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-ink text-sm font-bold">{item.title}</h3>
                  <p className="text-graphite text-sm leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── タイプ別おすすめバイト ── */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-mincho text-ink text-xl md:text-2xl font-bold">
              大学生におすすめのバイト【タイプ別】
            </h2>
            <p className="text-graphite text-sm leading-relaxed">
              「時給の高さ」「授業との両立しやすさ」「身につくスキル」は種類ごとに大きく違います。
              代表的な8タイプを比較して、自分の目的に合うバイトを見つけましょう。
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-rule">
              <thead>
                <tr className="bg-ink text-paper">
                  <th className="px-4 py-3 text-left font-bold text-xs whitespace-nowrap">バイトの種類</th>
                  <th className="px-4 py-3 text-left font-bold text-xs whitespace-nowrap">時給目安</th>
                  <th className="px-4 py-3 text-center font-bold text-xs whitespace-nowrap">両立</th>
                  <th className="px-4 py-3 text-left font-bold text-xs whitespace-nowrap hidden md:table-cell">身につくもの</th>
                  <th className="px-4 py-3 text-left font-bold text-xs">こんな人におすすめ</th>
                </tr>
              </thead>
              <tbody>
                {RECOMMENDED_BAITO.map((row, i) => (
                  <tr key={row.name} className={`border-t border-rule ${i % 2 === 1 ? "bg-mist" : "bg-paper"}`}>
                    <td className="px-4 py-3 font-bold text-ink">{row.name}</td>
                    <td className="px-4 py-3 text-ink font-bold font-numeric tabular-nums whitespace-nowrap">{row.wage}</td>
                    <td className="px-4 py-3 text-center font-black text-ink">{row.balance}</td>
                    <td className="px-4 py-3 text-graphite text-xs hidden md:table-cell">{row.skill}</td>
                    <td className="px-4 py-3 text-graphite text-xs">{row.forWhom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-graphite">
            ※時給は2026年時点の一般的な目安。地域・企業・経験により変動します。両立のしやすさ（◎○△）はシフトの融通・拘束時間からの編集部評価です。
            具体的な求人は<a href="#jobs" className="text-ink font-bold underline">下の求人一覧</a>から探せます。
          </p>
        </section>

        {/* ── 年収の壁コラム（2025年改正版） ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-ink" aria-hidden="true" />
            <h2 className="font-mincho text-ink text-xl md:text-2xl font-bold">年収の壁、2025年に大きく変わりました</h2>
          </div>

          <p className="text-graphite text-sm leading-relaxed">
            「103万円の壁」という言葉をよく聞くと思いますが、2025年の税制改正で仕組みが変わりました。
            ただし<strong className="text-ink">壁はひとつではなく、税・扶養・社会保険で別々に存在します。</strong>
            混同しやすいので、種類ごとに整理しましょう。
          </p>

          {/* 壁の一覧テーブル */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-rule">
              <thead>
                <tr className="bg-ink text-paper">
                  <th className="px-4 py-3 text-left font-bold text-xs whitespace-nowrap">壁の種類</th>
                  <th className="px-4 py-3 text-left font-bold text-xs whitespace-nowrap">改正前</th>
                  <th className="px-4 py-3 text-left font-bold text-xs whitespace-nowrap">2025年改正後</th>
                  <th className="px-4 py-3 text-left font-bold text-xs">超えると何が起きる？</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-rule bg-paper">
                  <td className="px-4 py-3 font-bold text-ink whitespace-nowrap">所得税の壁</td>
                  <td className="px-4 py-3 text-graphite font-numeric tabular-nums whitespace-nowrap">103万円</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-ink font-numeric tabular-nums">160万円</span>
                    <span className="text-xs text-graphite ml-1">に引き上げ</span>
                  </td>
                  <td className="px-4 py-3 text-graphite text-xs">自分自身に所得税がかかる</td>
                </tr>
                <tr className="border-t border-rule bg-mist">
                  <td className="px-4 py-3 font-bold text-ink whitespace-nowrap">扶養控除の壁</td>
                  <td className="px-4 py-3 text-graphite font-numeric tabular-nums whitespace-nowrap">103万円</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-ink font-numeric tabular-nums">123万円</span>
                    <span className="text-xs text-graphite ml-1">に引き上げ</span>
                  </td>
                  <td className="px-4 py-3 text-graphite text-xs">親が扶養控除（63万円）を受けられなくなる</td>
                </tr>
                <tr className="border-t border-rule bg-paper">
                  <td className="px-4 py-3 font-bold text-ink whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      大学生特例
                      <span className="text-[10px] px-1.5 py-0.5 bg-mist text-ink font-bold">NEW</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-graphite font-numeric tabular-nums whitespace-nowrap">なし</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-ink font-numeric tabular-nums">150万円</span>
                    <span className="text-xs text-graphite ml-1">まで親の控除が満額</span>
                  </td>
                  <td className="px-4 py-3 text-graphite text-xs">19〜22歳は特定親族特別控除が適用。188万円まで段階的控除あり</td>
                </tr>
                <tr className="border-t border-rule bg-mist">
                  <td className="px-4 py-3 font-bold text-ink whitespace-nowrap">住民税の壁</td>
                  <td className="px-4 py-3 text-graphite font-numeric tabular-nums whitespace-nowrap">100万円</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-ink font-numeric tabular-nums">110万円</span>
                    <span className="text-xs text-graphite ml-1">に引き上げ</span>
                  </td>
                  <td className="px-4 py-3 text-graphite text-xs">住民税がかかる（翌年6月から徴収）</td>
                </tr>
                <tr className="border-t border-rule bg-paper">
                  <td className="px-4 py-3 font-bold text-ink whitespace-nowrap">社会保険の壁</td>
                  <td className="px-4 py-3 text-graphite font-numeric tabular-nums whitespace-nowrap">106万円 / 130万円</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-ink font-numeric tabular-nums">130万円は変わらず</span>
                  </td>
                  <td className="px-4 py-3 text-graphite text-xs">親の社会保険の扶養から外れ、自分で国民健康保険に加入</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 注意ポイント */}
          <div className="flex flex-col gap-3">
            <div className="border border-rule border-l-4 border-l-seal bg-mist px-5 py-4 flex gap-3">
              <AlertTriangle className="w-[18px] h-[18px] text-seal shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <p className="text-ink font-bold text-sm">130万円の壁は2025年も変わっていません</p>
                <p className="text-graphite text-xs leading-relaxed">
                  所得税の壁は引き上げられましたが、<strong>社会保険（健康保険・年金）の130万円の壁は据え置きです。</strong>
                  130万円を超えると親の扶養から外れ、自分で国民健康保険料を払う必要があります（年間約20万円〜）。
                  106万円の壁（51人以上の企業）は2026年10月をめどに撤廃予定です。
                </p>
              </div>
            </div>

            <div className="border border-rule border-l-4 border-l-ink bg-mist px-5 py-4 flex gap-3">
              <CheckCircle2 className="w-[18px] h-[18px] text-ink shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <p className="text-ink font-bold text-sm">大学生（19〜22歳）は特に優遇されています</p>
                <p className="text-graphite text-xs leading-relaxed">
                  2025年の改正で新設された<strong>「特定親族特別控除」</strong>により、大学生の年収が123万円を超えても
                  <strong>150万円まで親の控除（63万円）が満額</strong>適用されます。
                  さらに188万円まで段階的に控除が続くため、以前より大きく稼ぎやすくなっています。
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-graphite">
            ※上記は2025年3月の税制改正大綱に基づく内容です。詳細は国税庁・首相官邸の公式情報をご確認ください。
            掛け持ちバイトの場合は複数の収入を合算して管理しましょう。
          </p>
        </section>

        {/* ── よくある質問 ── */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-ink" aria-hidden="true" />
            <h2 className="font-mincho text-ink text-xl md:text-2xl font-bold">大学生のバイト・よくある質問</h2>
          </div>
          <div className="border border-rule px-6">
            {BAITO_FAQ.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        {/* ── 案件一覧 ── */}
        <section id="jobs" className="flex flex-col gap-6 scroll-mt-20">
          <h2 className="font-mincho text-ink text-xl md:text-2xl font-bold">
            ProofLoop厳選 求人一覧
          </h2>
          <p className="text-graphite text-sm leading-relaxed">
            大学生が使いやすい求人サービスをまとめました。広告（提携先）と、提携のない公式サイトの両方を載せています。
            カード下の表記で見分けられます。
          </p>

          {/* フィルター：タイプ */}
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              {(["all", "baito", "intern"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`px-5 py-2 text-sm font-bold transition-colors ${
                    activeType === t
                      ? "bg-ink text-paper"
                      : "bg-paper border border-rule text-graphite hover:border-ink hover:text-ink"
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
                      ? "bg-ink text-paper"
                      : "bg-paper border border-rule text-graphite hover:border-ink hover:text-ink"
                  }`}
                >
                  {tag}
                </button>
              ))}
              {activeTags.length > 0 && (
                <button
                  onClick={() => setActiveTags([])}
                  className="px-3 py-1.5 text-xs text-graphite underline"
                >
                  クリア
                </button>
              )}
            </div>
          </div>

          {/* 案件グリッド */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-graphite gap-2">
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              読み込み中...
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-graphite">
              <SearchX className="w-9 h-9" aria-hidden="true" />
              <p className="text-sm">条件に合う案件が見つかりませんでした</p>
              <button
                onClick={() => { setActiveType("all"); setActiveTags([]); }}
                className="text-ink text-sm underline"
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

        {/* ── 関連ガイド ── */}
        <section className="border border-rule p-6 flex flex-col gap-4">
          <h3 className="font-mincho text-ink font-bold text-base">お金・生活の関連ガイド</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/guide/money"
              className="flex items-center gap-2 px-4 py-2 border border-rule hover:border-ink/40 text-sm font-bold text-ink transition-colors"
            >
              <PiggyBank className="w-4 h-4" aria-hidden="true" />
              お金・奨学金どうする？
            </Link>
            <Link
              href="/guide/living-alone"
              className="flex items-center gap-2 px-4 py-2 border border-rule hover:border-ink/40 text-sm font-bold text-ink transition-colors"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              一人暮らしどうする？
            </Link>
            <Link
              href="/guide"
              className="flex items-center gap-2 px-4 py-2 border border-rule hover:border-ink/40 text-sm font-bold text-ink transition-colors"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              新入生ガイド一覧へ
            </Link>
          </div>
        </section>

        {/* ── 次のステップ：サークルを探す ── */}
        <section className="border border-rule p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex flex-col gap-2">
            <h3 className="font-mincho text-ink font-bold text-lg">バイトが決まったら、サークルも探そう</h3>
            <p className="text-graphite text-sm">
              ProofLoopでは全国の学生団体を検索できます。バイトと両立できるサークルがきっと見つかります。
            </p>
          </div>
          <a
            href="/search"
            className="shrink-0 inline-flex items-center gap-2 bg-ink text-paper hover:bg-ink/90 transition-colors px-8 py-3 font-bold text-sm"
          >
            サークルを探す
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </section>

      </main>
    </div>
  );
}
