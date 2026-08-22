import type { Config } from "tailwindcss";
import { FONT_FAMILIES } from "./lib/design/tokens";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // 6色のみ。値はapp/globals.cssのCSS変数（:root / :root.dark）を参照する。
        // ここに色を足す前に、既存6色で表現できないか必ず検討すること。
        ink: "var(--color-ink)",
        seal: "var(--color-seal)",
        paper: "var(--color-paper)",
        mist: "var(--color-mist)",
        rule: "var(--color-rule)",
        graphite: "var(--color-graphite)",
      },
      fontFamily: {
        // Tailwind の既定 sans を上書きして、サイト全体の基準フォントを固定する。
        // globals.css の body 指定を外したので、これが無いと OS の UI フォントになる。
        sans: ["Inter", "Noto Sans JP", "sans-serif"],
        mincho: [...FONT_FAMILIES.mincho],
        body: [...FONT_FAMILIES.body],
        numeric: [...FONT_FAMILIES.numeric],
        // 旧エイリアス: 既存ページの font-display が壊れないよう元のスタックを維持する。
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
