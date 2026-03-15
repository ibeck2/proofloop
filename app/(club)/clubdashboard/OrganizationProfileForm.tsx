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
  x_id: string | null;
  instagram_id: string | null;
  line_url: string | null;
  website_url: string | null;
  member_count: string | null;
  activity_frequency: string | null;
  logo_url: string | null;
  is_intercollege: boolean | null;
  target_grades: string | null;
  selection_process: string | null;
  gender_ratio: string | null;
  grade_composition: string | null;
  location_detail: string | null;
  fee_entry: string | null;
  fee_annual: string | null;
  created_at: string;
};

const TARGET_GRADES_OPTIONS = [
  "",
  "学部1年生",
  "学部2年生",
  "学部3年生",
  "学部4年生",
  "院生可",
  "学部生のみ",
  "学年不問",
  "その他",
];

const SELECTION_PROCESS_OPTIONS = [
  "",
  "選考あり",
  "選考なし",
  "面接あり",
  "書類選考あり",
  "その他",
];

const CATEGORY_OPTIONS = [
  "運動系（スポーツ・アウトドア）",
  "文化系（音楽・演劇・アート）",
  "学術・研究（ゼミ・研究会・勉強会）",
  "ビジネス・キャリア（起業・就活）",
  "国際交流・語学",
  "ボランティア・NPO",
  "イベント・企画（インカレ・学園祭等）",
  "メディア・出版",
  "趣味・その他",
];

export default function OrganizationProfileForm() {
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [memberCount, setMemberCount] = useState("");
  const [activityFrequency, setActivityFrequency] = useState("");
  const [xId, setXId] = useState("");
  const [instagramId, setInstagramId] = useState("");
  const [lineUrl, setLineUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isIntercollege, setIsIntercollege] = useState(false);
  const [targetGrades, setTargetGrades] = useState("");
  const [selectionProcess, setSelectionProcess] = useState("");
  const [genderRatio, setGenderRatio] = useState("");
  const [gradeComposition, setGradeComposition] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [feeEntry, setFeeEntry] = useState("");
  const [feeAnnual, setFeeAnnual] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
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
        .select("id, user_id, name, university, category, description, x_id, instagram_id, line_url, website_url, member_count, activity_frequency, logo_url, is_intercollege, target_grades, selection_process, gender_ratio, grade_composition, location_detail, fee_entry, fee_annual, created_at")
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
        setMemberCount(org.member_count ?? "");
        setActivityFrequency(org.activity_frequency ?? "");
        setXId(org.x_id ?? "");
        setInstagramId(org.instagram_id ?? "");
        setLineUrl(org.line_url ?? "");
        setWebsiteUrl(org.website_url ?? "");
        setIsIntercollege(org.is_intercollege ?? false);
        setTargetGrades(org.target_grades ?? "");
        setSelectionProcess(org.selection_process ?? "");
        setGenderRatio(org.gender_ratio ?? "");
        setGradeComposition(org.grade_composition ?? "");
        setLocationDetail(org.location_detail ?? "");
        setFeeEntry(org.fee_entry ?? "");
        setFeeAnnual(org.fee_annual ?? "");
        setLogoUrl(org.logo_url ?? null);
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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaveMessage(null);
    setErrorMessage(null);
    setIsSaving(true);

    try {
      let finalLogoUrl: string | null = logoUrl;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop() || "jpg";
        const safeExt = /^[a-z0-9]+$/i.test(ext) ? ext : "jpg";
        const path = `${userId}/${Date.now()}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}.${safeExt}`;
        const { error: uploadError } = await supabase.storage.from("logos").upload(path, logoFile, {
          cacheControl: "3600",
          upsert: false,
        });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
        finalLogoUrl = urlData.publicUrl;
        setLogoUrl(finalLogoUrl);
        setLogoFile(null);
        if (logoPreview) URL.revokeObjectURL(logoPreview);
        setLogoPreview(null);
      }

      const payload = {
        user_id: userId,
        name: name.trim() || null,
        university: university.trim() || null,
        category: category.trim() || null,
        description: description.trim() || null,
        x_id: xId.trim() || null,
        instagram_id: instagramId.trim() || null,
        line_url: lineUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
        member_count: memberCount.trim() || null,
        activity_frequency: activityFrequency.trim() || null,
        logo_url: finalLogoUrl,
        is_intercollege: isIntercollege,
        target_grades: targetGrades.trim() || null,
        selection_process: selectionProcess.trim() || null,
        gender_ratio: genderRatio.trim() || null,
        grade_composition: gradeComposition.trim() || null,
        location_detail: locationDetail.trim() || null,
        fee_entry: feeEntry.trim() || null,
        fee_annual: feeAnnual.trim() || null,
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

  const inputDisabled = isSaving || !userId;
  const inputClass = "w-full border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none text-slate-900 dark:text-slate-100 dark:bg-slate-700 dark:border-slate-600 rounded-none px-3 py-2";

  const displayLogoUrl = logoPreview || logoUrl;

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700">
      <h3 className="text-primary dark:text-white text-lg font-bold mb-6">団体プロフィール（登録・編集）</h3>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 団体ロゴ */}
        <section className="space-y-4">
          <h4 className="text-primary dark:text-white font-bold text-base border-b border-slate-200 dark:border-slate-600 pb-2">
            団体ロゴ
          </h4>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-shrink-0">
              <label
                htmlFor="org-logo"
                className="block w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:border-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
              >
                {displayLogoUrl ? (
                  <img
                    src={displayLogoUrl}
                    alt="団体ロゴプレビュー"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                    <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                  </span>
                )}
                <input
                  id="org-logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  disabled={inputDisabled}
                  className="sr-only"
                />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-sub dark:text-slate-400 text-sm mb-1">
                団体ロゴ画像をアップロードできます。クリックまたはタップして画像を選択してください。
              </p>
              <p className="text-text-sub dark:text-slate-400 text-xs">
                JPEG / PNG / GIF / WebP（保存時にアップロードされます）
              </p>
            </div>
          </div>
        </section>

        {/* 基本情報セクション */}
        <section className="space-y-6">
          <h4 className="text-primary dark:text-white font-bold text-base border-b border-slate-200 dark:border-slate-600 pb-2">
            基本情報
          </h4>
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
              disabled={inputDisabled}
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
              disabled={inputDisabled}
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
              disabled={inputDisabled}
              className={inputClass}
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
              disabled={inputDisabled}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="org-member-count" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
                所属人数
              </label>
              <Input
                id="org-member-count"
                type="text"
                value={memberCount}
                onChange={(e) => setMemberCount(e.target.value)}
                placeholder="例: 約50名"
                disabled={inputDisabled}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="org-activity-frequency" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
                活動頻度
              </label>
              <Input
                id="org-activity-frequency"
                type="text"
                value={activityFrequency}
                onChange={(e) => setActivityFrequency(e.target.value)}
                placeholder="例: 週2回"
                disabled={inputDisabled}
                className="w-full"
              />
            </div>
          </div>
        </section>

        {/* 属性・選考セクション */}
        <section className="space-y-6">
          <h4 className="text-primary dark:text-white font-bold text-base border-b border-slate-200 dark:border-slate-600 pb-2">
            属性・選考
          </h4>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isIntercollege}
                onChange={(e) => setIsIntercollege(e.target.checked)}
                disabled={inputDisabled}
                className="w-5 h-5 border-slate-300 text-accent focus:ring-accent rounded"
              />
              <span className="text-primary dark:text-slate-200 font-bold text-sm">
                インカレ（他大学の参加可）
              </span>
            </label>
            <p className="text-text-sub dark:text-slate-400 text-xs mt-1 ml-8">
              チェックを付けると「インカレ」として表示されます
            </p>
          </div>
          <div>
            <label htmlFor="org-target-grades" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
              対象学年
            </label>
            <select
              id="org-target-grades"
              value={targetGrades}
              onChange={(e) => setTargetGrades(e.target.value)}
              disabled={inputDisabled}
              className={inputClass}
            >
              {TARGET_GRADES_OPTIONS.map((opt) => (
                <option key={opt || "blank"} value={opt}>
                  {opt || "選択してください"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="org-selection-process" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
              選考の有無
            </label>
            <select
              id="org-selection-process"
              value={selectionProcess}
              onChange={(e) => setSelectionProcess(e.target.value)}
              disabled={inputDisabled}
              className={inputClass}
            >
              {SELECTION_PROCESS_OPTIONS.map((opt) => (
                <option key={opt || "blank"} value={opt}>
                  {opt || "選択してください"}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* 構成・費用セクション */}
        <section className="space-y-6">
          <h4 className="text-primary dark:text-white font-bold text-base border-b border-slate-200 dark:border-slate-600 pb-2">
            構成・費用
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="org-gender-ratio" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
                男女比
              </label>
              <Input
                id="org-gender-ratio"
                type="text"
                value={genderRatio}
                onChange={(e) => setGenderRatio(e.target.value)}
                placeholder="例: 6:4（男子:女子）"
                disabled={inputDisabled}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="org-grade-composition" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
                学年構成
              </label>
              <Input
                id="org-grade-composition"
                type="text"
                value={gradeComposition}
                onChange={(e) => setGradeComposition(e.target.value)}
                placeholder="例: 1年40%、2年30%、3年20%、4年10%"
                disabled={inputDisabled}
                className="w-full"
              />
            </div>
          </div>
          <div>
            <label htmlFor="org-location-detail" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
              主な活動場所
            </label>
            <Input
              id="org-location-detail"
              type="text"
              value={locationDetail}
              onChange={(e) => setLocationDetail(e.target.value)}
              placeholder="例: 駒場キャンパス 1号館"
              disabled={inputDisabled}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="org-fee-entry" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
                初期費用
              </label>
              <Input
                id="org-fee-entry"
                type="text"
                value={feeEntry}
                onChange={(e) => setFeeEntry(e.target.value)}
                placeholder="例: 入会金3,000円"
                disabled={inputDisabled}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="org-fee-annual" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
                年会費
              </label>
              <Input
                id="org-fee-annual"
                type="text"
                value={feeAnnual}
                onChange={(e) => setFeeAnnual(e.target.value)}
                placeholder="例: 年12,000円"
                disabled={inputDisabled}
                className="w-full"
              />
            </div>
          </div>
        </section>

        {/* SNS・連絡先セクション */}
        <section className="space-y-6">
          <h4 className="text-primary dark:text-white font-bold text-base border-b border-slate-200 dark:border-slate-600 pb-2">
            SNS・連絡先
          </h4>
          <div>
            <label htmlFor="org-x-id" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
              X (Twitter) ID
            </label>
            <Input
              id="org-x-id"
              type="text"
              value={xId}
              onChange={(e) => setXId(e.target.value)}
              placeholder="例: @proofloop"
              disabled={inputDisabled}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="org-instagram-id" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
              Instagram ID
            </label>
            <Input
              id="org-instagram-id"
              type="text"
              value={instagramId}
              onChange={(e) => setInstagramId(e.target.value)}
              placeholder="例: @proofloop"
              disabled={inputDisabled}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="org-line-url" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
              公式LINE URL
            </label>
            <Input
              id="org-line-url"
              type="url"
              value={lineUrl}
              onChange={(e) => setLineUrl(e.target.value)}
              placeholder="例: https://line.me/ti/p/xxxxx"
              disabled={inputDisabled}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="org-website-url" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
              WebサイトURL
            </label>
            <Input
              id="org-website-url"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="例: https://example.com"
              disabled={inputDisabled}
              className="w-full"
            />
          </div>
        </section>

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
