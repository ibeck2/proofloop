"use client";

import Link from "next/link";
import { useState } from "react";

// ─────────────────────────────────────────────
// 質問定義
// ─────────────────────────────────────────────
const QUESTIONS = [
  {
    id: "purpose",
    text: "留学の一番の目的は？",
    icon: "flag",
    options: [
      { value: "english", label: "英語力を上げたい", icon: "translate" },
      { value: "academic", label: "専門分野を学びたい", icon: "school" },
      { value: "culture", label: "異文化・現地生活を体験したい", icon: "explore" },
      { value: "career", label: "就活・キャリアに活かしたい", icon: "business_center" },
    ],
  },
  {
    id: "period",
    text: "希望する留学期間は？",
    icon: "calendar_month",
    options: [
      { value: "short", label: "1ヶ月以内（短期・夏休み）", icon: "bolt" },
      { value: "mid", label: "3〜6ヶ月（1学期程度）", icon: "schedule" },
      { value: "long", label: "半年〜1年（交換・認定留学）", icon: "flight" },
      { value: "verylong", label: "1年以上（休学留学）", icon: "public" },
    ],
  },
  {
    id: "budget",
    text: "総予算の目安は？（渡航〜生活費込み）",
    icon: "savings",
    options: [
      { value: "low", label: "〜50万円", icon: "money_off" },
      { value: "mid", label: "50〜150万円", icon: "currency_yen" },
      { value: "high", label: "150〜300万円", icon: "attach_money" },
      { value: "veryhigh", label: "300万円以上", icon: "diamond" },
    ],
  },
  {
    id: "english",
    text: "現在の英語力は？",
    icon: "record_voice_over",
    options: [
      { value: "beginner", label: "ほぼゼロ・日常会話以下", icon: "sentiment_dissatisfied" },
      { value: "basic", label: "日常会話程度（TOEIC 500前後）", icon: "sentiment_neutral" },
      {
        value: "intermediate",
        label: "大学の授業を受けられる（TOEIC 700・TOEFL 70前後）",
        icon: "sentiment_satisfied",
      },
      { value: "advanced", label: "流暢に話せる（TOEFL 90以上）", icon: "sentiment_very_satisfied" },
    ],
  },
  {
    id: "priority",
    text: "留学先に最も重視することは？",
    icon: "star",
    options: [
      { value: "safety", label: "治安・安全性", icon: "shield" },
      { value: "cost", label: "コスパ（費用対効果）", icon: "price_check" },
      { value: "english_env", label: "英語環境（英語圏）", icon: "language" },
      { value: "fun", label: "生活の楽しさ・観光", icon: "beach_access" },
    ],
  },
] as const;

type Answers = Record<string, string>;

// ─────────────────────────────────────────────
// レコメンド先定義
// ─────────────────────────────────────────────
type Destination = {
  country: string;
  city: string;
  flag: string;
  region: "英語圏" | "ヨーロッパ" | "アジア" | "英語圏（アジア）";
  universities: string[];
  merit: string;
  demerit: string;
  cost: "低" | "中" | "高" | "非常に高";
  english_required: boolean;
  safety: "高" | "中" | "低";
  fun: "高" | "中" | "低";
  tags: string[];
  score: (a: Answers) => number;
};

const DESTINATIONS: Destination[] = [
  {
    country: "フィリピン（セブ島）",
    city: "セブ島",
    flag: "🇵🇭",
    region: "英語圏",
    universities: ["University of San Carlos", "University of Cebu"],
    merit: "英語圏で最も費用が安い。マンツーマン授業中心で伸びが早く、初心者でも始めやすい。",
    demerit: "欧米圏の留学経験と比べると就活での評価がやや低い。治安に注意が必要なエリアもある。",
    cost: "低",
    english_required: false,
    safety: "中",
    fun: "高",
    tags: ["コスパ最高", "初心者OK", "英語圏", "マンツーマン"],
    score: (a) => {
      let s = 0;
      if (a.purpose === "english") s += 30;
      if (a.period === "short" || a.period === "mid") s += 20;
      if (a.budget === "low" || a.budget === "mid") s += 30;
      if (a.english === "beginner" || a.english === "basic") s += 20;
      if (a.priority === "cost") s += 30;
      if (a.priority === "english_env") s += 15;
      return s;
    },
  },
  {
    country: "カナダ",
    city: "バンクーバー・トロント",
    flag: "🇨🇦",
    region: "英語圏",
    universities: ["UBC（ブリティッシュコロンビア大学）", "トロント大学", "マギル大学"],
    merit: "英語圏で治安が良く、多文化社会。アメリカよりコストが低め。ワーキングホリデーとの組み合わせも可能。",
    demerit: "冬が非常に寒い都市が多い。UBCやトロント大は交換留学の競争率が高い。",
    cost: "高",
    english_required: true,
    safety: "高",
    fun: "高",
    tags: ["英語圏", "治安良い", "多文化", "ワーホリ併用可"],
    score: (a) => {
      let s = 0;
      if (a.purpose === "english" || a.purpose === "culture") s += 25;
      if (a.period === "long" || a.period === "verylong") s += 20;
      if (a.budget === "high" || a.budget === "veryhigh") s += 25;
      if (a.english === "intermediate" || a.english === "advanced") s += 20;
      if (a.priority === "safety") s += 30;
      if (a.priority === "english_env") s += 25;
      return s;
    },
  },
  {
    country: "アメリカ",
    city: "ニューヨーク・LA・ボストン",
    flag: "🇺🇸",
    region: "英語圏",
    universities: ["UCLA", "ニューヨーク大学", "ジョージタウン大学", "ミシガン大学"],
    merit: "世界トップ大学が集中。英語圏の中心で就活・キャリアへの訴求力が最大。様々な文化・人種が混在する刺激的な環境。",
    demerit: "費用が非常に高い（特に主要都市）。大学によってはTOEFL 90以上が必要。",
    cost: "非常に高",
    english_required: true,
    safety: "中",
    fun: "高",
    tags: ["英語圏", "名門大学", "就活に強い", "多様性"],
    score: (a) => {
      let s = 0;
      if (a.purpose === "academic" || a.purpose === "career") s += 30;
      if (a.period === "long" || a.period === "verylong") s += 15;
      if (a.budget === "veryhigh") s += 30;
      if (a.budget === "high") s += 15;
      if (a.english === "advanced") s += 25;
      if (a.english === "intermediate") s += 10;
      if (a.priority === "english_env") s += 25;
      if (a.priority === "fun") s += 15;
      return s;
    },
  },
  {
    country: "イギリス",
    city: "ロンドン・エディンバラ",
    flag: "🇬🇧",
    region: "英語圏",
    universities: ["ロンドン大学（UCL・LSE等）", "エディンバラ大学", "マンチェスター大学"],
    merit: "ヨーロッパへのアクセスが良く、歴史・文化が豊か。BBC英語が身につく。名門大学が揃い就活でも評価が高い。",
    demerit: "ロンドンの生活費は欧州最高水準。天候が悪い（曇り・雨が多い）。",
    cost: "非常に高",
    english_required: true,
    safety: "高",
    fun: "高",
    tags: ["英語圏", "欧州観光の拠点", "名門大学", "文化豊か"],
    score: (a) => {
      let s = 0;
      if (a.purpose === "academic" || a.purpose === "culture") s += 25;
      if (a.period === "long" || a.period === "verylong") s += 20;
      if (a.budget === "veryhigh") s += 25;
      if (a.english === "advanced" || a.english === "intermediate") s += 20;
      if (a.priority === "safety") s += 20;
      if (a.priority === "fun") s += 20;
      if (a.priority === "english_env") s += 20;
      return s;
    },
  },
  {
    country: "オーストラリア",
    city: "シドニー・メルボルン",
    flag: "🇦🇺",
    region: "英語圏",
    universities: ["シドニー大学", "メルボルン大学", "ANU（オーストラリア国立大学）"],
    merit: "温暖な気候と豊かな自然。ワーキングホリデービザを取得すれば働きながら留学できる。日本人が多くサポートが充実。",
    demerit: "アジアからの物理的距離が遠く航空費が高い。ワーホリ目的の人が多いため英語環境が弱くなることも。",
    cost: "高",
    english_required: true,
    safety: "高",
    fun: "高",
    tags: ["英語圏", "ワーホリ", "温暖な気候", "治安良い"],
    score: (a) => {
      let s = 0;
      if (a.purpose === "english" || a.purpose === "culture") s += 25;
      if (a.period === "verylong" || a.period === "long") s += 20;
      if (a.budget === "high" || a.budget === "veryhigh") s += 20;
      if (a.english === "basic" || a.english === "intermediate") s += 20;
      if (a.priority === "safety") s += 25;
      if (a.priority === "fun") s += 25;
      return s;
    },
  },
  {
    country: "シンガポール",
    city: "シンガポール",
    flag: "🇸🇬",
    region: "英語圏（アジア）",
    universities: ["NUS（シンガポール国立大学）", "NTU（南洋理工大学）"],
    merit: "英語で授業を受けられる。アジアで治安が最も良い国の一つ。NUS・NTUは世界ランキング上位の名門。金融・ビジネスの中心地。",
    demerit: "生活費が非常に高い（東京と同水準）。交換留学枠が少なく競争が激しい。",
    cost: "非常に高",
    english_required: true,
    safety: "高",
    fun: "中",
    tags: ["英語圏", "世界トップ大学", "治安最高", "ビジネス拠点"],
    score: (a) => {
      let s = 0;
      if (a.purpose === "academic" || a.purpose === "career") s += 30;
      if (a.period === "long" || a.period === "verylong") s += 20;
      if (a.budget === "veryhigh") s += 25;
      if (a.english === "advanced" || a.english === "intermediate") s += 20;
      if (a.priority === "safety") s += 35;
      if (a.priority === "english_env") s += 20;
      return s;
    },
  },
  {
    country: "ドイツ",
    city: "ベルリン・ミュンヘン",
    flag: "🇩🇪",
    region: "ヨーロッパ",
    universities: ["ベルリン自由大学", "ミュンヘン工科大学（TUM）", "ハイデルベルク大学"],
    merit: "学費が無料または非常に安い国立大学が多い。ものづくり・工学系の世界的名門。ヨーロッパ旅行の拠点としても最高。",
    demerit: "ドイツ語が必要なケースが多い（英語開講コースを選べばOK）。寒い冬。",
    cost: "中",
    english_required: false,
    safety: "高",
    fun: "高",
    tags: ["学費安い", "工学系強い", "ヨーロッパ観光", "コスパ良い"],
    score: (a) => {
      let s = 0;
      if (a.purpose === "academic" || a.purpose === "culture") s += 25;
      if (a.period === "long" || a.period === "verylong") s += 15;
      if (a.budget === "mid" || a.budget === "high") s += 25;
      if (a.priority === "cost") s += 25;
      if (a.priority === "fun") s += 20;
      if (a.priority === "safety") s += 15;
      return s;
    },
  },
  {
    country: "フランス",
    city: "パリ・リヨン",
    flag: "🇫🇷",
    region: "ヨーロッパ",
    universities: ["ソルボンヌ大学", "Sciences Po（パリ政治学院）", "HEC Paris"],
    merit: "芸術・文化・ファッションの中心地。ビジネス・政治学系の名門が多い。ヨーロッパの中でも観光地として魅力が高い。",
    demerit: "生活費がかなり高い（特にパリ）。フランス語が必要なケースも。スリ・治安への注意が必要。",
    cost: "高",
    english_required: false,
    safety: "中",
    fun: "高",
    tags: ["芸術・文化", "ビジネス名門", "観光地", "ヨーロッパ"],
    score: (a) => {
      let s = 0;
      if (a.purpose === "culture" || a.purpose === "academic") s += 25;
      if (a.period === "long" || a.period === "verylong") s += 15;
      if (a.budget === "high" || a.budget === "veryhigh") s += 20;
      if (a.priority === "fun") s += 30;
      if (a.priority === "cost") s -= 10;
      return s;
    },
  },
  {
    country: "オランダ",
    city: "アムステルダム・デルフト",
    flag: "🇳🇱",
    region: "ヨーロッパ",
    universities: ["アムステルダム大学", "デルフト工科大学", "ライデン大学"],
    merit: "英語で授業を受けられる大学が多い（ヨーロッパ随一）。国民の英語力が非常に高い。自転車文化・開放的な社会。",
    demerit: "物価が高め。冬は雨・曇りが多い。",
    cost: "高",
    english_required: true,
    safety: "高",
    fun: "高",
    tags: ["英語OK", "ヨーロッパ", "開放的な文化", "工学系"],
    score: (a) => {
      let s = 0;
      if (a.purpose === "academic" || a.purpose === "culture") s += 25;
      if (a.period === "long" || a.period === "verylong") s += 15;
      if (a.budget === "high" || a.budget === "veryhigh") s += 20;
      if (a.english === "intermediate" || a.english === "advanced") s += 20;
      if (a.priority === "english_env") s += 20;
      if (a.priority === "safety") s += 20;
      if (a.priority === "fun") s += 15;
      return s;
    },
  },
  {
    country: "韓国",
    city: "ソウル・釜山",
    flag: "🇰🇷",
    region: "アジア",
    universities: ["ソウル大学", "延世大学校", "高麗大学校", "成均館大学校"],
    merit: "アジア圏で費用が安く、日本からのアクセスも抜群。Kカルチャー好きには最高の環境。英語開講コースも充実してきている。",
    demerit: "韓国語を学ぶ目的でないと言語面でのスキルアップが限定的。就活での訴求力はやや低め。",
    cost: "中",
    english_required: false,
    safety: "高",
    fun: "高",
    tags: ["アクセス良い", "費用安い", "Kカルチャー", "治安良い"],
    score: (a) => {
      let s = 0;
      if (a.purpose === "culture" || a.purpose === "english") s += 20;
      if (a.period === "short" || a.period === "mid" || a.period === "long") s += 20;
      if (a.budget === "low" || a.budget === "mid") s += 30;
      if (a.english === "beginner" || a.english === "basic") s += 20;
      if (a.priority === "cost") s += 25;
      if (a.priority === "safety") s += 25;
      if (a.priority === "fun") s += 20;
      return s;
    },
  },
  {
    country: "中国",
    city: "北京・上海",
    flag: "🇨🇳",
    region: "アジア",
    universities: ["北京大学", "清華大学", "復旦大学（上海）", "同済大学（上海）"],
    merit: "世界2位の経済大国でビジネス経験が積める。費用が安い。中国語習得で将来のキャリアが大きく広がる。アジアで最も規模の大きい留学市場。",
    demerit: "インターネット規制（VPN必須）。政治的緊張の影響を受けることも。大気汚染（都市による）。",
    cost: "低",
    english_required: false,
    safety: "中",
    fun: "中",
    tags: ["費用安い", "中国語習得", "ビジネス拠点", "アジア"],
    score: (a) => {
      let s = 0;
      if (a.purpose === "academic" || a.purpose === "career") s += 25;
      if (a.period === "long" || a.period === "verylong") s += 15;
      if (a.budget === "low" || a.budget === "mid") s += 30;
      if (a.english === "beginner" || a.english === "basic") s += 20;
      if (a.priority === "cost") s += 30;
      return s;
    },
  },
  {
    country: "スウェーデン",
    city: "ストックホルム・ウプサラ",
    flag: "🇸🇪",
    region: "ヨーロッパ",
    universities: ["ストックホルム大学", "ウプサラ大学", "王立工科大学（KTH）"],
    merit: "英語で授業を受けられる大学が多い。環境・福祉・テクノロジー分野が世界的に強い。生活水準が高く治安も良い。",
    demerit: "物価が非常に高い（北欧最高水準）。冬は日照時間が極端に短い。",
    cost: "非常に高",
    english_required: true,
    safety: "高",
    fun: "中",
    tags: ["英語OK", "環境・福祉", "テクノロジー", "治安最高"],
    score: (a) => {
      let s = 0;
      if (a.purpose === "academic") s += 30;
      if (a.period === "long" || a.period === "verylong") s += 15;
      if (a.budget === "veryhigh") s += 20;
      if (a.english === "advanced" || a.english === "intermediate") s += 20;
      if (a.priority === "safety") s += 25;
      if (a.priority === "english_env") s += 20;
      return s;
    },
  },
];

// ─────────────────────────────────────────────
// スコアリングとレコメンド生成
// ─────────────────────────────────────────────
type ScoredDestination = Destination & { _score: number };

function getRecommendations(answers: Answers): ScoredDestination[] {
  return DESTINATIONS.map((d) => ({ ...d, _score: d.score(answers) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 3);
}

// ─────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────
export default function StudyAbroadRecommendClient() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [results, setResults] = useState<ScoredDestination[] | null>(null);

  const currentQ = QUESTIONS[step];
  const totalSteps = QUESTIONS.length;

  const handleAnswer = (value: string) => {
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);

    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      setResults(getRecommendations(newAnswers));
    }
  };

  const reset = () => {
    setStep(0);
    setAnswers({});
    setResults(null);
  };

  const costColor = (cost: Destination["cost"]) => {
    if (cost === "低") return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (cost === "中") return "text-blue-600 bg-blue-50 border-blue-200";
    if (cost === "高") return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const medal = ["🥇", "🥈", "🥉"];

  return (
    <div className="bg-white text-primary min-h-screen font-body pb-20 md:pb-0">
      <main className="w-full max-w-[800px] mx-auto px-6 py-12 md:py-20 flex flex-col gap-10">
        {/* パンくず */}
        <nav className="flex items-center gap-2 text-xs text-text-grey">
          <Link href="/guide" className="hover:text-primary transition-colors">
            新入生ガイド
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <Link href="/guide/study-abroad" className="hover:text-primary transition-colors">
            留学どうする？
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-primary font-bold">留学先診断</span>
        </nav>

        {/* ヘッダー */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-accent text-2xl">psychology</span>
            <span className="text-accent text-sm font-bold tracking-widest uppercase">Study Abroad Finder</span>
          </div>
          <h1 className="text-primary text-2xl md:text-4xl font-black leading-tight">
            あなたに合った留学先を診断
          </h1>
          <p className="text-text-grey text-sm">
            5つの質問に答えるだけで、英語圏・ヨーロッパ・アジアの中からあなたに最適な留学先をレコメンドします。
          </p>
        </div>

        {/* 質問フロー */}
        {!results ? (
          <div className="flex flex-col gap-8">
            {/* プログレスバー */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs text-text-grey">
                <span>
                  質問 {step + 1} / {totalSteps}
                </span>
                <span>{Math.round((step / totalSteps) * 100)}% 完了</span>
              </div>
              <div className="w-full h-2 bg-slate-100">
                <div
                  className="h-2 bg-accent transition-all duration-300"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* 質問カード */}
            <div className="border border-[#f0f2f5] p-8 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-xl">{currentQ.icon}</span>
                </div>
                <h2 className="text-primary font-black text-lg leading-snug">{currentQ.text}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentQ.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    className="group border border-[#f0f2f5] hover:border-accent hover:bg-accent/5 transition-all p-4 flex items-center gap-3 text-left"
                  >
                    <div className="w-9 h-9 bg-primary/5 group-hover:bg-accent/10 flex items-center justify-center shrink-0 transition-colors">
                      <span className="material-symbols-outlined text-primary group-hover:text-accent text-lg transition-colors">
                        {opt.icon}
                      </span>
                    </div>
                    <span className="text-primary font-bold text-sm group-hover:text-accent transition-colors">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 戻るボタン */}
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="text-text-grey text-sm flex items-center gap-1 hover:text-primary transition-colors self-start"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                前の質問に戻る
              </button>
            )}
          </div>
        ) : (
          /* 結果画面 */
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-primary text-xl md:text-2xl font-black">あなたにおすすめの留学先</h2>
              <p className="text-text-grey text-sm">回答内容をもとに、最適な留学先を上位3件選びました。</p>
            </div>

            <div className="flex flex-col gap-5">
              {results.map((dest, i) => (
                <div
                  key={`${dest.country}-${dest.city}`}
                  className={`border p-6 flex flex-col gap-4 ${
                    i === 0 ? "border-accent/40 bg-accent/5" : "border-[#f0f2f5]"
                  }`}
                >
                  {/* ヘッダー */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{dest.flag}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{medal[i]}</span>
                          <h3 className="font-black text-primary text-lg">{dest.country}</h3>
                        </div>
                        <p className="text-text-grey text-xs">{dest.region}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 border font-bold shrink-0 ${costColor(dest.cost)}`}>
                      費用：{dest.cost}
                    </span>
                  </div>

                  {/* 主要大学 */}
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-bold text-primary">主要大学・プログラム</p>
                    <p className="text-xs text-text-grey">{dest.universities.join("、")}</p>
                  </div>

                  {/* メリット・デメリット */}
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="flex gap-2">
                      <span className="text-emerald-600 font-bold shrink-0">◎ メリット</span>
                      <span className="text-text-grey leading-relaxed">{dest.merit}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-amber-600 font-bold shrink-0">△ 注意点</span>
                      <span className="text-text-grey leading-relaxed">{dest.demerit}</span>
                    </div>
                  </div>

                  {/* タグ */}
                  <div className="flex flex-wrap gap-1.5">
                    {dest.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 bg-primary/5 text-primary border border-primary/10"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* アクション */}
            <div className="flex flex-col gap-3">
              <Link
                href="/guide/study-abroad"
                className="w-full flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary-hover transition-colors py-4 font-black"
              >
                留学の詳しい情報を見る
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <button
                onClick={reset}
                className="w-full flex items-center justify-center gap-2 border border-[#f0f2f5] py-3 text-text-grey hover:text-primary hover:border-primary transition-colors text-sm font-bold"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                もう一度診断する
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

