import { revalidatePath, revalidateTag } from "next/cache";
import { organizationCacheTag, organizationPagePath } from "./paths";

/**
 * 団体詳細ページ（ISR）を1件だけ再検証する。Route Handler 専用。
 *
 * `/organizations/[id]` は `revalidate = 300` の ISR なので、放っておくと
 * claim_status の変化が最大5分反映されない。凍結は「乗っ取りを見つけて
 * 緊急停止する」機能なので、そこだけ即座に反映させる。
 *
 * 呼び出しは**状態を変える RPC が成功した直後だけ**に限ること。
 * 単独で叩ける再検証エンドポイントは作らない（連打でISRの意味が消えるため）。
 */
export function revalidateOrganizationPage(id: string | null | undefined): boolean {
  const path = organizationPagePath(id);
  if (!path || !id) return false;
  // データキャッシュ（unstable_cache）を捨てる。DBへ問い合わせ直させる本命はこちら。
  revalidateTag(organizationCacheTag(id));
  // HTML がフルルートキャッシュに載っている場合に備えて、ページ側も落とす。
  // これが無いと、ルートキャッシュがHITした瞬間にレンダリング自体が走らず、
  // タグを捨てても古い claim_status が最大300秒残る。
  revalidatePath(path);
  return true;
}
