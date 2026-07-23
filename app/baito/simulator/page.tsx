"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  SlidersHorizontal,
  Share2,
  Loader2,
  Download,
  RefreshCw,
} from "lucide-react";

// ─────────────────────────────────────────────
// 型・定数
// ─────────────────────────────────────────────
type CircleLevel = "none" | "light" | "normal" | "hardcore";
type CommuteMins = 15 | 30 | 60 | 90;
type Priority = "study" | "circle" | "baito" | "free";

const CIRCLE_HOURS: Record<CircleLevel, number> = {
  none: 0,
  light: 3,
  normal: 7,
  hardcore: 15,
};

const CIRCLE_LABELS: Record<CircleLevel, string> = {
  none: "入らない",
  light: "週1〜2回（ゆる）",
  normal: "週3〜4回（普通）",
  hardcore: "ガチ勢・体育会",
};

const COMMUTE_LABELS: Record<CommuteMins, string> = {
  15: "〜15分",
  30: "〜30分",
  60: "〜1時間",
  90: "1時間以上",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  study: "📚 勉強・授業",
  circle: "🎾 サークル",
  baito: "💰 バイト",
  free: "🎮 自由時間",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  study: "#002b5c",
  circle: "#0ea5e9",
  baito: "#8B0000",
  free: "#10b981",
};

// ─────────────────────────────────────────────
// 計算ロジック
// ─────────────────────────────────────────────
function calcResult(params: {
  credits: number;
  circleLevel: CircleLevel;
  targetIncome: number;
  commuteMins: CommuteMins;
  hourlyWage: number;
}) {
  const { credits, circleLevel, targetIncome, commuteMins, hourlyWage } = params;

  const totalWeekHours = 168;
  const sleepHours = 49; // 7h × 7日
  const schoolDays = Math.min(Math.ceil(credits / 4), 5); // 週何日登校か
  const commuteHours = (commuteMins / 60) * 2 * schoolDays;
  const classHours = credits * 1.5;
  const homeworkHours = credits * 0.5;
  const circleHours = CIRCLE_HOURS[circleLevel];
  const baitoHoursNeeded = targetIncome / hourlyWage / 4.3;
  const baitoHours = Math.min(baitoHoursNeeded, 30); // 週30h上限

  const usedHours =
    sleepHours + commuteHours + classHours + homeworkHours + circleHours + baitoHours;
  const freeHours = Math.max(totalWeekHours - usedHours, 0);

  const actualMonthlyIncome = Math.round(baitoHours * 4.3 * hourlyWage);
  const annualIncome = actualMonthlyIncome * 12;

  // 年収の壁チェック
  type WallStatus = "safe" | "warn" | "over";
  let wallStatus: WallStatus = "safe";
  let wallLabel = "";
  if (annualIncome >= 1_500_000) {
    wallStatus = "over";
    wallLabel = "150万円超（大学生特例も終了）";
  } else if (annualIncome >= 1_300_000) {
    wallStatus = "warn";
    wallLabel = "130万円超（社会保険の扶養を外れる）";
  } else if (annualIncome >= 1_230_000) {
    wallStatus = "warn";
    wallLabel = "123万円超（扶養控除が外れる）";
  } else {
    wallStatus = "safe";
    wallLabel = "すべての扶養範囲内 ✅";
  }

  // 充実度スコア（0〜100）
  // ── 充実度スコア（100点満点）
  // 設計思想：授業・サークル・バイトを「ほどよく」こなしながら
  // 自由時間も確保できている状態が高得点

  // 軸1: 余裕スコア（35点）
  // 自由時間10〜25hが理想。少なすぎは激減点、多すぎ（=何もしてない）も減点
  let freeScore: number;
  if (freeHours < 5) {
    freeScore = freeHours * 1.5; // 0〜5h: 0→7.5
  } else if (freeHours <= 25) {
    freeScore = 7.5 + ((freeHours - 5) / 20) * 27.5; // 5〜25h: 7.5→35
  } else if (freeHours <= 45) {
    freeScore = 35 - ((freeHours - 25) / 20) * 15; // 25〜45h: 35→20
  } else {
    freeScore = Math.max(20 - ((freeHours - 45) / 30) * 15, 0); // 45h超: 20→0
  }

  // 軸2: 収入スコア（35点）
  // 月3〜8万が理想。0円と過剰稼ぎは減点
  let incomeScore: number;
  if (actualMonthlyIncome < 10000) {
    incomeScore = (actualMonthlyIncome / 10000) * 10;
  } else if (actualMonthlyIncome < 30000) {
    incomeScore = 10 + ((actualMonthlyIncome - 10000) / 20000) * 10;
  } else if (actualMonthlyIncome <= 80000) {
    incomeScore = 20 + ((actualMonthlyIncome - 30000) / 50000) * 15;
  } else if (actualMonthlyIncome <= 120000) {
    incomeScore = 35 - ((actualMonthlyIncome - 80000) / 40000) * 15;
  } else {
    incomeScore = Math.max(20 - ((actualMonthlyIncome - 120000) / 30000) * 10, 5);
  }

  // 軸3: 充実スコア（30点）
  // 授業+サークル+バイトがバランスよく存在するか
  // 極端な偏り（どれかが0）をペナルティ
  const activeHours = usedHours - sleepHours;
  const hasStudy = classHours > 0 ? 1 : 0;
  const hasCircle = circleHours > 0 ? 1 : 0;
  const hasBaito = baitoHours > 0 ? 1 : 0;
  const activityCount = hasStudy + hasCircle + hasBaito;

  let balanceScore: number;
  if (activityCount === 0) {
    balanceScore = 0;
  } else if (activityCount === 1) {
    balanceScore = 8; // 1種類しかやっていない
  } else if (activityCount === 2) {
    balanceScore = 18; // 2種類
  } else {
    balanceScore = 30; // 3種類全部やっている
  }
  // 詰め込みすぎペナルティ（活動110h超）
  if (activeHours > 110) {
    balanceScore = Math.max(balanceScore - ((activeHours - 110) / 5) * 8, 0);
  }

  const score = Math.round(freeScore + incomeScore + balanceScore);

  const scoreLabel =
    score >= 85 ? "理想的な大学生活 🎉" :
    score >= 70 ? "バランスが取れている 👍" :
    score >= 55 ? "少しハード気味 😅" :
    score >= 40 ? "かなりタイト 😓" : "限界に近い ⚠️";

  return {
    sleepHours,
    commuteHours: Math.round(commuteHours * 10) / 10,
    classHours: Math.round(classHours * 10) / 10,
    homeworkHours: Math.round(homeworkHours * 10) / 10,
    circleHours,
    baitoHours: Math.round(baitoHours * 10) / 10,
    freeHours: Math.round(freeHours * 10) / 10,
    actualMonthlyIncome,
    annualIncome,
    wallStatus,
    wallLabel,
    score,
    scoreLabel,
  };
}

// ─────────────────────────────────────────────
// Canvas 結果画像生成
// ─────────────────────────────────────────────
function generateShareImage(
  canvas: HTMLCanvasElement,
  params: {
    credits: number;
    circleLevel: CircleLevel;
    targetIncome: number;
    result: ReturnType<typeof calcResult>;
  }
) {
  const { credits, circleLevel, result } = params;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = 1200;
  const H = 630;
  canvas.width = W;
  canvas.height = H;

  // 背景
  ctx.fillStyle = "#002b5c";
  ctx.fillRect(0, 0, W, H);

  // 右側アクセント
  ctx.fillStyle = "#8B0000";
  ctx.fillRect(W - 8, 0, 8, H);

  // ロゴ
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("ProofLoop", 60, 70);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "18px sans-serif";
  ctx.fillText("大学生活シミュレーター", 60, 100);

  // スコア大きく
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 120px sans-serif";
  ctx.fillText(`${result.score}`, 60, 260);
  ctx.font = "bold 36px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("/ 100点", 220, 240);
  ctx.fillStyle = "#10b981";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(result.scoreLabel, 60, 300);

  // 区切り線
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 330);
  ctx.lineTo(W - 60, 330);
  ctx.stroke();

  // 3つの指標
  const metrics = [
    { label: "自由時間", value: `${result.freeHours}h/週`, color: "#10b981" },
    { label: "月収見込み", value: `¥${result.actualMonthlyIncome.toLocaleString()}`, color: "#f59e0b" },
    { label: "年収の壁", value: result.wallStatus === "safe" ? "✅ 安全圏" : "⚠️ 要注意", color: result.wallStatus === "safe" ? "#10b981" : "#f59e0b" },
  ];

  metrics.forEach((m, i) => {
    const x = 60 + i * 360;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(x, 360, 320, 130);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "16px sans-serif";
    ctx.fillText(m.label, x + 20, 392);
    ctx.fillStyle = m.color;
    ctx.font = "bold 36px sans-serif";
    ctx.fillText(m.value, x + 20, 450);
  });

  // 条件サマリー
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "16px sans-serif";
  ctx.fillText(
    `授業 ${credits}コマ ／ サークル ${CIRCLE_LABELS[circleLevel]} ／ バイト目標 ¥${params.targetIncome.toLocaleString()}/月`,
    60,
    560
  );

  // URL
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "14px sans-serif";
  ctx.fillText("proofloop.jp/baito/simulator", 60, 600);
}

// ─────────────────────────────────────────────
// ドーナツチャートコンポーネント
// ─────────────────────────────────────────────
function DonutChart({ data }: { data: { label: string; hours: number; color: string }[] }) {
  const size = 200;
  const strokeWidth = 36;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((s, d) => s + d.hours, 0);

  let offset = 0;
  const segments = data.map((d) => {
    const pct = d.hours / total;
    const seg = { ...d, pct, offset, dash: pct * circumference };
    offset += pct * circumference;
    return seg;
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} className="-rotate-90">
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
            strokeDashoffset={-seg.offset}
          />
        ))}
      </svg>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-graphite">{d.label}</span>
            <span className="font-bold text-ink ml-auto">{d.hours}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// スライダー
// ─────────────────────────────────────────────
function Slider({
  label, value, min, max, step, unit, onChange, hint,
}: {
  label: string; value: number; min: number; max: number;
  step: number; unit: string; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-ink">{label}</span>
        <span className="text-ink font-black text-lg">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 appearance-none bg-mist accent-ink cursor-pointer"
      />
      <div className="flex justify-between text-xs text-graphite">
        <span>{min}{unit}</span>
        {hint && <span className="text-ink font-bold">{hint}</span>}
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP1 質問カード
// ─────────────────────────────────────────────
function QuestionCard({
  step, total, title, children,
}: { step: number; total: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 bg-ink text-paper font-black text-sm flex items-center justify-center shrink-0">
          {step}
        </span>
        <div className="flex-1 h-1 bg-mist relative">
          <div
            className="absolute inset-y-0 left-0 bg-ink transition-all duration-500"
            style={{ width: `${(step / total) * 100}%` }}
          />
        </div>
        <span className="text-xs text-graphite">{step}/{total}</span>
      </div>
      <h2 className="text-ink text-xl md:text-2xl font-black leading-snug">{title}</h2>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// メインページ
// ─────────────────────────────────────────────
export default function SimulatorPage() {
  const [phase, setPhase] = useState<"q1" | "q2" | "q3" | "result">("q1");

  // 質問の回答
  const [credits, setCredits] = useState(14);
  const [circleLevel, setCircleLevel] = useState<CircleLevel>("normal");
  const [targetIncome, setTargetIncome] = useState(60000);

  // 詳細調整パラメータ
  const [commuteMins, setCommuteMins] = useState<CommuteMins>(30);
  const [hourlyWage, setHourlyWage] = useState(1100);

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [imageGenerating, setImageGenerating] = useState(false);

  const result = calcResult({ credits, circleLevel, targetIncome, commuteMins, hourlyWage });

  // 結果画面になったら画像生成
  useEffect(() => {
    if (phase !== "result") return;
    setImageGenerating(true);
    setTimeout(() => {
      if (canvasRef.current) {
        generateShareImage(canvasRef.current, { credits, circleLevel, targetIncome, result });
        setShareImageUrl(canvasRef.current.toDataURL("image/png"));
      }
      setImageGenerating(false);
    }, 300);
  }, [phase, credits, circleLevel, targetIncome, commuteMins, hourlyWage]);

  const handleShare = useCallback((platform: "x" | "line") => {
    const text = encodeURIComponent(
      `授業${credits}コマ・${CIRCLE_LABELS[circleLevel]}・月収目標¥${targetIncome.toLocaleString()}で\n` +
      `充実度スコア ${result.score}点「${result.scoreLabel}」でした！\n` +
      `自由時間 ${result.freeHours}h/週・月収見込み ¥${result.actualMonthlyIncome.toLocaleString()}\n` +
      `#ProofLoop #大学生活シミュレーター`
    );
    const url = encodeURIComponent("https://proofloop.jp/baito/simulator");
    if (platform === "x") {
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
    } else {
      window.open(`https://social-plugins.line.me/lineit/share?url=${url}&text=${text}`, "_blank");
    }
  }, [credits, circleLevel, targetIncome, result]);

  const handleDownloadImage = useCallback(() => {
    if (!shareImageUrl) return;
    const a = document.createElement("a");
    a.href = shareImageUrl;
    a.download = "proofloop-simulator.png";
    a.click();
  }, [shareImageUrl]);

  // バイト検索への遷移パラメータ
  const baitoSearchParams = new URLSearchParams();
  if (result.baitoHours <= 10) baitoSearchParams.set("tags", "週1〜OK,シフト自由");
  else if (result.baitoHours <= 20) baitoSearchParams.set("tags", "シフト自由");
  if (targetIncome >= 80000) baitoSearchParams.set("tags", "高時給");

  // ドーナツチャートデータ
  const donutData = [
    { label: "睡眠", hours: result.sleepHours, color: "#94a3b8" },
    { label: "通学", hours: result.commuteHours, color: "#cbd5e1" },
    { label: "授業・課題", hours: result.classHours + result.homeworkHours, color: PRIORITY_COLORS.study },
    { label: "サークル", hours: result.circleHours, color: PRIORITY_COLORS.circle },
    { label: "バイト", hours: result.baitoHours, color: PRIORITY_COLORS.baito },
    { label: "自由時間", hours: result.freeHours, color: PRIORITY_COLORS.free },
  ].filter((d) => d.hours > 0);

  // 年収ゲージ（160万上限）
  const annualMax = 1_600_000;
  const wallMarkers = [
    { val: 1_230_000, label: "123万" },
    { val: 1_300_000, label: "130万" },
    { val: 1_500_000, label: "150万" },
  ];

  return (
    <div className="bg-paper text-ink min-h-screen font-body pb-20 md:pb-0">
      {/* 非表示Canvas（画像生成用） */}
      <canvas ref={canvasRef} className="hidden" />

      <main className="w-full max-w-2xl mx-auto px-6 py-12 md:py-16">

        {/* ── ヘッダー ── */}
        <div className="flex items-center gap-3 mb-10">
          <Link href="/baito" className="text-graphite hover:text-ink transition-colors text-sm flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            バイト・インターン
          </Link>
          <span className="text-rule">/</span>
          <span className="text-sm text-ink font-bold">大学生活シミュレーター</span>
        </div>

        {/* ────────── STEP1: 授業コマ数 ────────── */}
        {phase === "q1" && (
          <div className="flex flex-col gap-10">
            <QuestionCard step={1} total={3} title="週に何コマ授業を入れたいですか？">
              <div className="flex flex-col gap-6">
                <Slider
                  label="週の授業コマ数"
                  value={credits}
                  min={0} max={20} step={1}
                  unit="コマ"
                  onChange={setCredits}
                  hint="平均10〜14コマ"
                />
                {/* 学年別目安 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "1年生（標準）", val: 14, desc: "必修＋選択" },
                    { label: "2年生（標準）", val: 12, desc: "専門科目増" },
                    { label: "3年生（標準）", val: 8, desc: "ゼミ中心" },
                    { label: "4年生（標準）", val: 4, desc: "卒論・就活" },
                  ].map((p) => (
                    <button key={p.label} onClick={() => setCredits(p.val)}
                      className={`p-3 border text-left transition-colors ${
                        credits === p.val ? "border-ink bg-mist" : "border-rule bg-paper hover:border-ink/50"
                      }`}>
                      <p className="text-xs font-bold text-ink">{p.label}</p>
                      <p className="text-lg font-black text-ink">{p.val}コマ</p>
                      <p className="text-xs text-graphite">{p.desc}</p>
                    </button>
                  ))}
                </div>
                <div className="bg-mist px-4 py-3 text-sm text-graphite">
                  <strong className="text-ink">{credits}コマ</strong> の場合、
                  授業・課題で週 <strong className="text-ink">{(credits * 2).toFixed(0)}時間</strong> ほど使います
                  （1コマ90分＋課題30分換算）
                </div>
              </div>
            </QuestionCard>
            <button onClick={() => setPhase("q2")}
              className="w-full bg-ink text-paper font-black text-base py-4 hover:bg-ink/90 transition-colors flex items-center justify-center gap-2">
              次へ
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* ────────── STEP2: サークル ────────── */}
        {phase === "q2" && (
          <div className="flex flex-col gap-10">
            <QuestionCard step={2} total={3} title="サークル・部活はどのくらい入りますか？">
              <div className="flex flex-col gap-3">
                {(Object.keys(CIRCLE_LABELS) as CircleLevel[]).map((level) => (
                  <button key={level} onClick={() => setCircleLevel(level)}
                    className={`w-full p-4 border text-left flex items-center justify-between transition-colors ${
                      circleLevel === level ? "border-ink bg-mist" : "border-rule bg-paper hover:border-ink/50"
                    }`}>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-ink text-sm">{CIRCLE_LABELS[level]}</span>
                      <span className="text-xs text-graphite">
                        {level === "none" && "バイトや勉強に全集中したい人向け"}
                        {level === "light" && "友達作り・趣味程度に楽しみたい人向け"}
                        {level === "normal" && "サークルもしっかり楽しみたい人向け"}
                        {level === "hardcore" && "部活・体育会・本気のサークル所属"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-ink">{CIRCLE_HOURS[level]}h/週</span>
                      {circleLevel === level && (
                        <CheckCircle2 className="w-5 h-5 text-ink" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </QuestionCard>
            <div className="flex gap-3">
              <button onClick={() => setPhase("q1")}
                className="flex-1 border border-rule bg-paper text-graphite font-bold py-4 hover:bg-mist transition-colors">
                戻る
              </button>
              <button onClick={() => setPhase("q3")}
                className="flex-[3] bg-ink text-paper font-black text-base py-4 hover:bg-ink/90 transition-colors flex items-center justify-center gap-2">
                次へ
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* ────────── STEP3: 月収目標 ────────── */}
        {phase === "q3" && (
          <div className="flex flex-col gap-10">
            <QuestionCard step={3} total={3} title="バイトで月いくら稼ぎたいですか？">
              <div className="flex flex-col gap-6">
                <Slider
                  label="月収目標"
                  value={targetIncome}
                  min={0} max={150000} step={5000}
                  unit="円"
                  onChange={setTargetIncome}
                />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "交通費・食費のみ", val: 20000, desc: "最低限" },
                    { label: "普通の大学生", val: 50000, desc: "お小遣い程度" },
                    { label: "一人暮らし補助", val: 80000, desc: "生活費の足し" },
                    { label: "自活したい", val: 100000, desc: "家賃も自分で" },
                    { label: "しっかり貯めたい", val: 120000, desc: "将来のために" },
                    { label: "稼げるだけ稼ぐ", val: 150000, desc: "バイト中心" },
                  ].map((p) => (
                    <button key={p.label} onClick={() => setTargetIncome(p.val)}
                      className={`p-3 border text-left transition-colors ${
                        targetIncome === p.val ? "border-ink bg-mist" : "border-rule bg-paper hover:border-ink/50"
                      }`}>
                      <p className="text-xs text-graphite">{p.label}</p>
                      <p className="text-base font-black text-ink">¥{p.val.toLocaleString()}</p>
                      <p className="text-xs text-graphite">{p.desc}</p>
                    </button>
                  ))}
                </div>
                <div className="bg-mist px-4 py-3 text-sm text-graphite">
                  時給1,100円の場合、月
                  <strong className="text-ink"> {Math.ceil(targetIncome / 1100 / 4.3 * 10) / 10}時間/週</strong>
                  のバイトが必要です
                </div>
              </div>
            </QuestionCard>
            <div className="flex gap-3">
              <button onClick={() => setPhase("q2")}
                className="flex-1 border border-rule bg-paper text-graphite font-bold py-4 hover:bg-mist transition-colors">
                戻る
              </button>
              <button onClick={() => setPhase("result")}
                className="flex-[3] bg-seal text-paper font-black text-base py-4 hover:bg-seal/90 transition-colors flex items-center justify-center gap-2">
                シミュレート開始
                <TrendingUp className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* ────────── 結果画面 ────────── */}
        {phase === "result" && (
          <div className="flex flex-col gap-10">

            {/* スコアヘッダー */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-graphite text-sm mb-1">あなたの大学生活充実度スコア</p>
                  <div className="flex items-end gap-2">
                    <span className="text-ink font-black text-7xl leading-none">{result.score}</span>
                    <span className="text-graphite text-lg mb-2">/ 100</span>
                  </div>
                  <p className="font-bold text-lg mt-1 text-ink">{result.scoreLabel}</p>
                </div>
                {/* ドーナツチャート */}
                <DonutChart data={donutData} />
              </div>
            </div>

            {/* 3指標カード */}
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-rule p-4 flex flex-col gap-1">
                <p className="text-xs text-graphite">自由時間</p>
                <p className="text-2xl font-black text-ink">{result.freeHours}<span className="text-sm font-bold">h</span></p>
                <p className="text-xs text-graphite">週あたり</p>
              </div>
              <div className="border border-rule p-4 flex flex-col gap-1">
                <p className="text-xs text-graphite">月収見込み</p>
                <p className="text-xl font-black text-ink">¥{result.actualMonthlyIncome.toLocaleString()}</p>
                <p className="text-xs text-graphite">バイト{result.baitoHours}h/週</p>
              </div>
              <div className="border border-rule p-4 flex flex-col gap-1">
                <p className="text-xs text-graphite">年収見込み</p>
                <p className="text-xl font-black text-ink">¥{Math.round(result.annualIncome / 10000)}万</p>
                <p className="text-xs font-bold text-ink">
                  {result.wallStatus === "safe" ? "✅ 扶養内" : "⚠️ 要確認"}
                </p>
              </div>
            </div>

            {/* 年収ゲージ */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-bold text-ink">年収の壁チェック</p>
              <div className="relative h-8 bg-mist overflow-visible">
                {/* ゲージ */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-700 ${
                    result.wallStatus === "safe" ? "bg-ink" : "bg-seal"
                  }`}
                  style={{ width: `${Math.min((result.annualIncome / annualMax) * 100, 100)}%` }}
                />
                {/* 壁マーカー */}
                {wallMarkers.map((m) => (
                  <div key={m.val}
                    className="absolute top-0 bottom-0 w-0.5 bg-graphite/40 flex flex-col items-center"
                    style={{ left: `${(m.val / annualMax) * 100}%` }}>
                    <span className="absolute -top-5 text-[10px] font-bold text-graphite whitespace-nowrap">{m.label}</span>
                  </div>
                ))}
              </div>
              <p className={`text-sm font-bold ${result.wallStatus === "safe" ? "text-ink" : "text-seal"}`}>
                {result.wallLabel}
              </p>
            </div>

            {/* 詳細調整パネル */}
            <div className="border border-rule p-6 flex flex-col gap-6">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-[18px] h-[18px] text-ink" aria-hidden="true" />
                <h3 className="font-black text-ink">詳細パラメータを調整する</h3>
              </div>
              <Slider label="週の授業コマ数" value={credits} min={0} max={20} step={1}
                unit="コマ" onChange={setCredits} hint="平均10〜14コマ" />
              <div className="flex flex-col gap-2">
                <p className="text-sm font-bold text-ink">サークル頻度</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(CIRCLE_LABELS) as CircleLevel[]).map((level) => (
                    <button key={level} onClick={() => setCircleLevel(level)}
                      className={`px-3 py-2 text-xs font-bold border transition-colors ${
                        circleLevel === level ? "border-ink bg-ink text-paper" : "border-rule bg-paper text-graphite hover:border-ink"
                      }`}>
                      {CIRCLE_LABELS[level]}
                    </button>
                  ))}
                </div>
              </div>
              <Slider label="月収目標" value={targetIncome} min={0} max={150000} step={5000}
                unit="円" onChange={setTargetIncome} />
              <div className="flex flex-col gap-2">
                <p className="text-sm font-bold text-ink">通学時間（片道）</p>
                <div className="grid grid-cols-4 gap-2">
                  {([15, 30, 60, 90] as CommuteMins[]).map((m) => (
                    <button key={m} onClick={() => setCommuteMins(m)}
                      className={`px-2 py-2 text-xs font-bold border transition-colors ${
                        commuteMins === m ? "border-ink bg-ink text-paper" : "border-rule bg-paper text-graphite hover:border-ink"
                      }`}>
                      {COMMUTE_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
              <Slider label="バイト時給の想定" value={hourlyWage} min={900} max={3000} step={50}
                unit="円" onChange={setHourlyWage} hint="全国平均 約1,100円" />
            </div>

            {/* 合うバイトを見る */}
            <div className="border border-ink p-6 flex flex-col md:flex-row items-center gap-4 justify-between">
              <div>
                <p className="font-black text-ink">このバランスに合うバイトを探す</p>
                <p className="text-graphite text-sm mt-1">
                  週{result.baitoHours}h・月収¥{result.actualMonthlyIncome.toLocaleString()}に合う案件を表示します
                </p>
              </div>
              <Link href={`/baito?${baitoSearchParams.toString()}`}
                className="shrink-0 bg-ink text-paper font-bold px-8 py-3 hover:bg-ink/90 transition-colors flex items-center gap-2">
                バイトを探す
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>

            {/* シェアセクション */}
            <div className="flex flex-col gap-4">
              <h3 className="font-black text-ink flex items-center gap-2">
                <Share2 className="w-5 h-5 text-ink" aria-hidden="true" />
                結果をシェアする
              </h3>

              {/* プレビュー画像 */}
              {shareImageUrl && (
                <div className="border border-rule overflow-hidden">
                  <img src={shareImageUrl} alt="シミュレーター結果" className="w-full" />
                </div>
              )}
              {imageGenerating && (
                <div className="border border-rule h-32 flex items-center justify-center gap-2 text-graphite text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  画像を生成中...
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button onClick={() => handleShare("x")}
                  className="flex items-center justify-center gap-2 bg-black text-white font-bold py-3 hover:bg-graphite transition-colors">
                  <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  X（Twitter）でシェア
                </button>
                <button onClick={() => handleShare("line")}
                  className="flex items-center justify-center gap-2 font-bold py-3 hover:opacity-90 transition-colors text-white"
                  style={{ backgroundColor: "#06C755" }}>
                  <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.02 2 11c0 2.69 1.27 5.1 3.28 6.77L4.5 21l3.45-1.8C9.18 19.71 10.56 20 12 20c5.52 0 10-4.02 10-9S17.52 2 12 2z"/></svg>
                  LINEでシェア
                </button>
                <button onClick={handleDownloadImage} disabled={!shareImageUrl}
                  className="flex items-center justify-center gap-2 border border-rule bg-paper text-graphite font-bold py-3 hover:bg-mist transition-colors disabled:opacity-40">
                  <Download className="w-4 h-4" aria-hidden="true" />
                  画像を保存
                </button>
              </div>
            </div>

            {/* やり直し */}
            <button onClick={() => setPhase("q1")}
              className="w-full border border-rule bg-paper text-graphite/70 font-bold py-3 hover:bg-mist transition-colors text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              最初からやり直す
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

