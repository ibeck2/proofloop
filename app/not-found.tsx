import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-mist flex flex-col items-center justify-center px-4">
      <p className="text-ink text-2xl md:text-3xl font-bold mb-8">ページが見つかりません</p>
      <Link
        href="/"
        className="bg-ink text-paper px-8 py-3 font-bold text-sm hover:bg-[#001f45] transition-colors"
      >
        ホームに戻る
      </Link>
    </div>
  );
}
