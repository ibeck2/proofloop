import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * このページで seal（深紅）を静止状態で使う唯一の箇所。
 * 仕様 §5.1「1画面2箇所まで」。他の箇所に seal を足す前にここを確認すること。
 */
export default function ForClubsCallout() {
  return (
    <section className="border-l-4 border-seal bg-mist px-6 py-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <h2 className="font-mincho font-bold text-ink text-lg">
          学生団体を運営している方へ
        </h2>
        <p className="font-body text-sm text-graphite">
          メンバー管理・新歓・イベント・タスクを、ひとつの場所で。
        </p>
      </div>
      <Link
        href="/for-clubs"
        className="inline-flex items-center gap-2 bg-ink text-paper px-6 py-3 font-body font-bold text-sm shrink-0 hover:bg-ink/90 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        導入について見る
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
