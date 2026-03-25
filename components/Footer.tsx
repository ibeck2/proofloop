import Link from "next/link";
import { Instagram, Twitter, ExternalLink } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-10 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* ロゴ / ビジョン */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="font-display font-black tracking-tight text-xl">
                ProofLoop
              </span>
            </Link>
            <p className="text-white/70 text-sm mt-3 leading-relaxed">
              学生団体と学生をつなぐプラットフォーム。
            </p>
          </div>

          {/* About Us */}
          <div>
            <h3 className="text-sm font-bold tracking-wide text-white mb-4">
              About Us（ProofLoopについて）
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/for-students"
                  className="text-white/70 hover:text-white transition-colors"
                >
                  一般学生の方へ
                </Link>
              </li>
              <li>
                <Link
                  href="/for-clubs"
                  className="text-white/70 hover:text-white transition-colors"
                >
                  学生団体の方へ
                </Link>
              </li>
            </ul>
          </div>

          {/* 公式SNS */}
          <div>
            <h3 className="text-sm font-bold tracking-wide text-white mb-4">
              公式SNS
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <Twitter className="w-4 h-4" aria-hidden="true" />
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <Instagram className="w-4 h-4" aria-hidden="true" />
                  Instagram
                </a>
              </li>
            </ul>
          </div>

          {/* お問い合わせ */}
          <div>
            <h3 className="text-sm font-bold tracking-wide text-white mb-4">
              お問い合わせ
            </h3>
            <a
              href="https://proofloop-2cea.vercel.app/organizations/4003e084-8da8-4315-b0dc-3dcce3da42d0"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
            >
              お問い合わせ・運営事務局
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-xs text-white/50">
            © {year} ProofLoop. All rights reserved.
          </p>
          <p className="text-xs text-white/50">
            学生団体と学生の出会いを、もっとスムーズに。
          </p>
        </div>
      </div>
    </footer>
  );
}

