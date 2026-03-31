import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import AppShell from "@/components/AppShell";
import Footer from "@/components/Footer";

const SITE_URL = "https://proofloop-green.vercel.app";

export const metadata: Metadata = {
  // サブページで上書きされる際のテンプレート
  title: {
    default: "ProofLoop | 全ての大学生のポテンシャルを引き出す",
    template: "%s | ProofLoop",
  },
  description:
    "学生団体と企業を繋ぐ次世代プラットフォーム。サークル検索、授業レビュー、過去問共有から、バイト・インターン紹介まで。",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "ProofLoop",
    title: "ProofLoop | 全ての大学生のポテンシャルを引き出す",
    description:
      "学生団体と企業を繋ぐ次世代プラットフォーム。サークル検索、授業レビュー、過去問共有から、バイト・インターン紹介まで。",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ProofLoop | 全ての大学生のポテンシャルを引き出す",
    description:
      "学生団体と企業を繋ぐ次世代プラットフォーム。サークル検索、授業レビュー、バイト・インターン紹介まで。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Lexend:wght@400;700&family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <AppShell>
          {children}
          <Footer />
        </AppShell>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#ffffff",
              color: "#002b5c",
              border: "1px solid #e5e7eb",
            },
          }}
        />
      </body>
    </html>
  );
}
