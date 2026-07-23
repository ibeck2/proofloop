"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui";

export default function ClassInfoPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-mist text-graphite font-body flex items-center justify-center p-6">
      <main className="w-full max-w-2xl">
        <section className="bg-paper border border-rule shadow-sm rounded-lg p-8 md:p-10 text-center">
          <div className="mx-auto mb-5 w-20 h-20 rounded-full bg-mist flex items-center justify-center">
            <Construction className="w-10 h-10 text-ink" aria-hidden="true" />
          </div>

          <h1 className="text-2xl md:text-3xl font-black font-mincho text-ink tracking-tight">
            準備中
          </h1>
          <p className="mt-4 text-graphite leading-relaxed">
            授業レビュー・過去問機能は現在開発中です。
            <br />
            公開までもうしばらくお待ちください！
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              戻る
            </Button>
            <Link href="/">
              <Button type="button" variant="primary">
                ホームへ
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
