import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col items-center justify-center px-4">
      <p className="text-primary text-2xl md:text-3xl font-bold mb-8">ページが見つかりません</p>
      <Link
        href="/"
        className="bg-primary text-white px-8 py-3 font-bold text-sm hover:bg-[#001f45] transition-colors"
      >
        ホームに戻る
      </Link>
    </div>
  );
}
