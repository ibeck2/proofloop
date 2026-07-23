import type { Config } from "tailwindcss";
import { COLORS, FONT_FAMILIES } from "./lib/design/tokens";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── 新トークン（これから書くコードはこちらだけを使う）
        ...COLORS,

        // ── 以下は移行期間中のみ残す旧エイリアス。新規使用禁止。
        //    全ページ移行後に削除する（docs/task-board.md タスクA）
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#002b5c",
        accent: "#8B0000",
        "text-grey": "#707070",
        "background-light": "#ffffff",
        "background-dark": "#0f1823",
        navy: "#002B5C",
        "grey-custom": "#707070",
        "accent-red": "#8b0000",
        "secondary-grey": "#707070",
        secondary: "#8B0000",
        "text-main": "#002B5C",
        "text-sub": "#707070",
        "neutral-light": "#f0f0f5",
        "neutral-grey": "#707070",
        "border-grey": "#e5e7eb",
        "neutral-gray": "#707070",
        "primary-hover": "#001f42",
        "filter-bg": "#F5F5F5",
        "navy-custom": "#002B5C",
        "background-message": "#f8f5f5",
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
