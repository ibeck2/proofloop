import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
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
