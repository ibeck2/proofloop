import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";
import AppShell from "@/components/AppShell";
import Footer from "@/components/Footer";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { SITE_URL } from "@/lib/site-url";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  // サブページで上書きされる際のテンプレート
  title: {
    default: "ProofLoop | 全ての大学生のポテンシャルを引き出す",
    template: "%s | ProofLoop",
  },
  description:
    "サークル・学生団体と企業を繋ぐ次世代プラットフォーム。サークル検索、授業レビュー、過去問共有から、バイト・インターン紹介まで。",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "ProofLoop",
    title: "ProofLoop | 全ての大学生のポテンシャルを引き出す",
    description:
      "サークル・学生団体と企業を繋ぐ次世代プラットフォーム。サークル検索、授業レビュー、過去問共有から、バイト・インターン紹介まで。",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ProofLoop | 全ての大学生のポテンシャルを引き出す",
    description:
      "サークル・学生団体と企業を繋ぐ次世代プラットフォーム。サークル検索、授業レビュー、バイト・インターン紹介まで。",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "zicR4FeCTjvprBg307Ih47ItJeaX1UU42bMt0pd7MuQ",
  },
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("proofloop-theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Lexend:wght@400;700&family=Noto+Sans+JP:wght@400;500;700&family=Shippori+Mincho+B1:wght@600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <GoogleAnalytics />
          <AppShell>
            {children}
            <Footer />
          </AppShell>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "var(--color-paper)",
                color: "var(--color-ink)",
                border: "1px solid var(--color-rule)",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
