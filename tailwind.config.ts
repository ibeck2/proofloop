import type { Config } from "tailwindcss";
import { FONT_FAMILIES } from "./lib/design/tokens";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    // lib/ 配下にはTailwindクラス文字列を返す純粋関数（例: lib/schedule/scheduleResponse.ts
    // のresponseBadgeClass）がある。ここが未スキャンだと、そこでしか使われていない
    // クラス（例: 初出のbg-graphite裸利用）がビルドされず、クラス名としては正しいのに
    // 背景色が透明のまま表示される（実機QAで発見・073直前のFix1で実際に踏んだ）。
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // 6色のみ。値はapp/globals.cssのCSS変数（:root / :root.dark、スペース区切りの
        // RGBチャンネル値）を参照する。rgb(var(...) / <alpha-value>)はTailwind標準の
        // 不透明度対応パターンで、これによりtext-ink/70のような透明度修飾子が機能する
        // （CSS変数を素のhex文字列にすると、Tailwindが値をRGBチャンネルへ分解できず
        // 透明度修飾子のCSSが一切生成されない——実際にこれで559箇所が壊れた）。
        // ここに色を足す前に、既存6色で表現できないか必ず検討すること。
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        seal: "rgb(var(--color-seal) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        mist: "rgb(var(--color-mist) / <alpha-value>)",
        rule: "rgb(var(--color-rule) / <alpha-value>)",
        graphite: "rgb(var(--color-graphite) / <alpha-value>)",
      },
      fontFamily: {
        // Tailwind の既定 sans を上書きして、サイト全体の基準フォントを固定する。
        // globals.css の body 指定を外したので、これが無いと OS の UI フォントになる。
        sans: ["Inter", "Noto Sans JP", "sans-serif"],
        mincho: [...FONT_FAMILIES.mincho],
        body: [...FONT_FAMILIES.body],
        numeric: [...FONT_FAMILIES.numeric],
        // 旧エイリアス: 既存ページの font-display が壊れないよう元のスタックを維持する。
        // Inter だけにすると CJK フォールバックが失われ、スコープ外21ページの日本語表示が変わる。
        display: ["Inter", "Lexend", "Noto Sans JP", "sans-serif"],
      },
      borderRadius: {
        // 全キー0の指定は維持する。外すと rounded-lg(112箇所) が一斉に角丸化する
        DEFAULT: "0px",
        none: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        full: "0px",
      },
    },
  },
  plugins: [],
};

export default config;
