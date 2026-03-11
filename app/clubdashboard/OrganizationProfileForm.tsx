"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Input, Textarea, Button } from "@/components/ui";

type OrganizationRow = {
  id: string;
  user_id: string;
  name: string | null;
  university: string | null;
  category: string | null;
  description: string | null;
  created_at: string;
};

const CATEGORY_OPTIONS = [
  "国際交流・政治",
  "文化・芸術",
  "スポーツ",
  "学術・研究",
  "ボランティア・NPO",
  "就職・キャリア",
  "その他",
];

export default function OrganizationProfileForm() {
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<"success" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const loadProfile = async (uid: string) => {
      if (cancelled) return;
      setUserId(uid);
      setErrorMessage(null);
      const { data: rows, error: fetchError } = await supabase
        .from("organizations")
        .select("id, user_id, name, university, category, description, created_at")
        .eq("user_id", uid)
        .limit(1);
      if (cancelled) return;
      if (fetchError) {
        setErrorMessage("プロフィールの取得に失敗しました。");
      }
      const org = (rows as OrganizationRow[] | null)?.[0];
      if (org) {
        setOrgId(org.id);
        setName(org.name ?? "");
        setUniversity(org.university ?? "");
        setCategory(org.category ?? "");
        setDescription(org.description ?? "");
      }
      setIsLoading(false);
    };

    const tryInitFromSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user) {
        await loadProfile(session.user.id);
        return true;
      }
      return false;
    };

    (async () => {
      if (await tryInitFromSession()) return;
      unsubscribe = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return;
        if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
          if (session?.user) {
            loadProfile(session.user.id);
          } else {
            setErrorMessage("ログイン情報を取得できませんでした。");
            setIsLoading(false);
          }
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = undefined;
          }
        }
      });
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaveMessage(null);
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const payload = {
        user_id: userId,
        name: name.trim() || null,
        university: university.trim() || null,
        category: category.trim() || null,
        description: description.trim() || null,
      };

      if (orgId) {
        const { error } = await supabase
          .from("organizations")
          .update(payload)
          .eq("id", orgId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("organizations")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        if (inserted?.id) setOrgId(inserted.id);
      }
      setSaveMessage("success");
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存に失敗しました。";
      setErrorMessage(msg);
      setSaveMessage("error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700">
        <p className="text-text-sub dark:text-slate-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700">
      <h3 className="text-primary dark:text-white text-lg font-bold mb-6">団体プロフィール（登録・編集）</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="org-name" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
            団体名
          </label>
          <Input
            id="org-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: AFPLA (Asian Future Political Leaders Association)"
            disabled={isSaving || !userId}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="org-university" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
            活動拠点・大学名
          </label>
          <Input
            id="org-university"
            type="text"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            placeholder="例: 東京大学 駒場キャンパス"
            disabled={isSaving || !userId}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="org-category" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
            カテゴリ
          </label>
          <select
            id="org-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isSaving || !userId}
            className="w-full border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none text-slate-900 dark:text-slate-100 dark:bg-slate-700 dark:border-slate-600 rounded-none px-3 py-2"
          >
            <option value="">選択してください</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="org-description" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
            活動内容
          </label>
          <Textarea
            id="org-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="活動内容や実績を入力してください"
            rows={5}
            disabled={isSaving || !userId}
            className="w-full"
          />
        </div>
        {errorMessage && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errorMessage}
          </p>
        )}
        {saveMessage === "success" && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium" role="status">
            保存しました
          </p>
        )}
        <Button type="submit" variant="primary" className="w-full" disabled={isSaving || !userId}>
          {isSaving ? "保存中..." : "保存する"}
        </Button>
      </form>
    </div>
  );
}
