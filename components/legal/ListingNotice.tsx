import Link from "next/link";
import { COMPANY } from "@/lib/legal/company";

/**
 * 団体ページの末尾に置く、掲載についての告知。
 *
 * 掲載は公表情報にもとづくオプトアウト方式のため、停止の手段を必ず示す。
 * あわせて「自分で編集できる」導線を並べ、苦情の入口を団体登録の入口にする。
 */
export default function ListingNotice() {
  return (
    <aside className="bg-mist border-t border-rule">
      <div className="max-w-[1100px] mx-auto px-6 py-8 flex flex-col gap-2">
        <h2 className="text-ink font-bold text-sm">この掲載について</h2>
        <p className="text-graphite text-xs leading-relaxed">
          このページは、団体または大学が公開している情報をもとに {COMPANY.serviceName} が作成しています。
          掲載の停止や内容の訂正をご希望の場合は{" "}
          <a href={`mailto:${COMPANY.contactEmail}`} className="text-ink underline">
            {COMPANY.contactEmail}
          </a>{" "}
          までご連絡ください。理由の説明は不要です。
        </p>
        <p className="text-graphite text-xs leading-relaxed">
          団体としてアカウントを登録いただくと、掲載内容をご自身で編集できます。詳しくは{" "}
          <Link href="/listing-policy" className="text-ink underline">
            掲載ポリシー
          </Link>
          をご覧ください。
        </p>
      </div>
    </aside>
  );
}
