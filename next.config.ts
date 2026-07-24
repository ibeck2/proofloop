import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 型エラーはビルドを止める。以前は ignoreBuildErrors: true にしていたため、
  // 型が壊れたコードでもデプロイされてしまう状態だった（2026-07-24 に解消）。
  // ここを再び true にすると、本番に壊れたコードが出る経路が復活する。
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingRoot: path.resolve(__dirname),

  async redirects() {
    return [
      {
        // 旧ルートのスペルミス（dashborad → dashboard）を修正した際の後方互換。
        // 企業側のログイン後ページなのでブックマークされている可能性があり、
        // 恒久リダイレクト(308)で新URLへ寄せる。
        source: "/companydashborad",
        destination: "/companydashboard",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
