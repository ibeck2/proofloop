"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "proofloop-theme";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  // 初回のtheme反映エフェクトは「DOM/localStorageへ書き戻す」処理をスキップする。
  // 初期化スクリプト（app/layout.tsxのbeforeInteractiveスクリプト）が既に正しい
  // .darkクラスとlocalStorage値を設定済みのため、ここで再度書き込むと
  // setTheme直後の再レンダリング前に古いtheme（既定値"light"）で一瞬上書きしてしまう
  // 競合が起きる（Task3レビューで指摘）。
  const isFirstSync = useRef(true);

  // 初期化スクリプトが<html>に付けた.darkクラスの実際の状態へ同期する
  // （サーバー側は常にlightでレンダリングされるため）。
  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (isFirstSync.current) {
      isFirstSync.current = false;
      return;
    }
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
