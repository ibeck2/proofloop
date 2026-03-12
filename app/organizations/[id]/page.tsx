import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, name, university, category, description, logo_url, member_count, activity_frequency")
    .eq("id", id)
    .single();

  if (error || !org) notFound();

  return (
    <div className="min-h-screen bg-white text-slate-900 font-display">
      <main className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/search" className="text-accent text-sm font-bold mb-6 inline-flex items-center gap-1 hover:underline">
          ← 検索に戻る
        </Link>
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {org.logo_url ? (
            <img
              src={org.logo_url}
              alt={`${org.name ?? "団体"}のロゴ`}
              className="w-32 h-32 rounded-full object-contain bg-slate-100 border border-grey-custom/20"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-slate-100 border border-grey-custom/20 flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-5xl">groups</span>
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-navy mb-2">{org.name ?? "（団体名なし）"}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              {org.university && (
                <span className="text-sm px-2 py-0.5 border border-grey-custom text-grey-custom rounded">
                  {org.university}
                </span>
              )}
              {org.category && (
                <span className="text-sm px-2 py-0.5 border border-accent text-accent rounded">
                  {org.category}
                </span>
              )}
            </div>
            {(org.member_count || org.activity_frequency) && (
              <div className="flex flex-wrap gap-4 text-sm text-grey-custom mb-4">
                {org.member_count && <span>人数: {org.member_count}</span>}
                {org.activity_frequency && <span>活動: {org.activity_frequency}</span>}
              </div>
            )}
            {org.description && (
              <p className="text-grey-custom whitespace-pre-wrap">{org.description}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
