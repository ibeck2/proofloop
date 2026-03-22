import type { Config } from "tailwindcss";

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
        display: ["Inter", "Lexend", "Noto Sans JP", "sans-serif"],
        body: ["Noto Sans JP", "sans-serif"],
      },
      borderRadius: {
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
