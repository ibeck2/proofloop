"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Input, Textarea, Button } from "@/components/ui";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";
import {
  UNIVERSITY_OPTIONS,
  UNIVERSITY_OTHER,
  resolveUniversityValue,
  toUniversityFormState,
} from "@/constants/universities";

type OrganizationRow = {
  id: string;
  user_id?: string;
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
  selection_flow: SelectionFlowStep[] | null;
  gender_ratio: string | null;
  grade_composition: string | null;
  location_detail: string | null;
  fee_entry: string | null;
  fee_annual: string | null;
  created_at: string;
};

export type SelectionFlowStep = {
  name: string;
  date_type: "pin" | "deadline" | "period" | "none";
  date_value: string;
  description: string;
  url: string;
};

const TARGET_GRADES_CHECKBOX_OPTIONS = [
  "学部1年",
  "学部2年",
  "学部3年",
  "学部4年",
  "大学院1年",
  "大学院2年",
] as const;

const SELECTION_PROCESS_RADIO_OPTIONS = [
  { value: "選考あり", label: "選考あり" },
  { value: "選考なし", label: "選考なし" },
  { value: "その他", label: "その他" },
] as const;

const DATE_TYPE_OPTIONS = [
  { value: "pin", label: "開催日時" },
  { value: "deadline", label: "締切日時" },
  { value: "period", label: "大体の時期" },
  { value: "none", label: "設定なし" },
] as const;

const DEFAULT_SELECTION_FLOW: SelectionFlowStep[] = [
  { name: "新歓説明会", date_type: "period", date_value: "", description: "", url: "" },
  { name: "書類選考", date_type: "deadline", date_value: "", description: "", url: "" },
  { name: "面接", date_type: "period", date_value: "", description: "", url: "" },
  { name: "内定", date_type: "pin", date_value: "", description: "", url: "" },
];

/** ISO or local datetime string → "YYYY-MM-DDTHH:mm" for datetime-local input (JST/local) */
function toLocalDatetimeInput(isoOrLocal: string): string {
  const d = new Date(isoOrLocal);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

/** Local "YYYY-MM-DDTHH:mm" → ISO UTC for Supabase */
function localDatetimeToISO(localStr: string): string {
  const d = new Date(localStr);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

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

const BadgeRequired = () => (
  <span className="ml-2 text-xs font-normal text-white bg-red-500 px-2 py-0.5 rounded">必須</span>
);
const BadgeOptional = () => (
  <span className="ml-2 text-xs font-normal text-slate-600 bg-slate-200 px-2 py-0.5 rounded dark:text-slate-300 dark:bg-slate-600">任意</span>
);

function resetFormToEmpty(
  setters: {
    setOrgId: (v: string | null) => void;
    setName: (v: string) => void;
    setUniversity: (v: string) => void;
    setCategory: (v: string) => void;
    setDescription: (v: string) => void;
    setMemberCount: (v: string) => void;
    setActivityFrequency: (v: string) => void;
    setXId: (v: string) => void;
    setInstagramId: (v: string) => void;
    setLineUrl: (v: string) => void;
    setWebsiteUrl: (v: string) => void;
    setIsIntercollege: (v: boolean) => void;
    setTargetGrades: (v: string[]) => void;
    setSelectionProcess: (v: string) => void;
    setSelectionFlow: (v: SelectionFlowStep[]) => void;
    setGenderRatio: (v: string) => void;
    setGradeComposition: (v: string) => void;
    setLocationDetail: (v: string) => void;
    setFeeEntry: (v: string) => void;
    setFeeAnnual: (v: string) => void;
    setLogoUrl: (v: string | null) => void;
  }
) {
  setters.setOrgId(null);
  setters.setName("");
  setters.setUniversity("");
  setters.setCategory("");
  setters.setDescription("");
  setters.setMemberCount("");
  setters.setActivityFrequency("");
  setters.setXId("");
  setters.setInstagramId("");
  setters.setLineUrl("");
  setters.setWebsiteUrl("");
  setters.setIsIntercollege(false);
  setters.setTargetGrades([]);
  setters.setSelectionProcess("選考なし");
  setters.setSelectionFlow([...DEFAULT_SELECTION_FLOW]);
  setters.setGenderRatio("");
  setters.setGradeComposition("");
  setters.setLocationDetail("");
  setters.setFeeEntry("");
  setters.setFeeAnnual("");
  setters.setLogoUrl(null);
}

export default function OrganizationProfileForm() {
  const {
    loading: ctxLoading,
    activeOrgId,
    hasNoMemberships,
    refreshMemberships,
  } = useClubOrganization();

  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [universityOther, setUniversityOther] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [memberCount, setMemberCount] = useState("");
  const [activityFrequency, setActivityFrequency] = useState("");
  const [xId, setXId] = useState("");
  const [instagramId, setInstagramId] = useState("");
  const [lineUrl, setLineUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isIntercollege, setIsIntercollege] = useState(false);
  const [targetGrades, setTargetGrades] = useState<string[]>([]);
  const [selectionProcess, setSelectionProcess] = useState("選考なし");
  const [selectionFlow, setSelectionFlow] = useState<SelectionFlowStep[]>([]);
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

  const applyOrgRow = useCallback((org: OrganizationRow) => {
    setOrgId(org.id);
    setName(org.name ?? "");
    const uniState = toUniversityFormState(org.university);
    setUniversity(uniState.selected);
    setUniversityOther(uniState.other);
    setCategory(org.category ?? "");
    setDescription(org.description ?? "");
    setMemberCount(org.member_count ?? "");
    setActivityFrequency(org.activity_frequency ?? "");
    setXId(org.x_id ?? "");
    setInstagramId(org.instagram_id ?? "");
    setLineUrl(org.line_url ?? "");
    setWebsiteUrl(org.website_url ?? "");
    setIsIntercollege(org.is_intercollege ?? false);
    if (org.target_grades) {
      try {
        const parsed = JSON.parse(org.target_grades) as unknown;
        setTargetGrades(Array.isArray(parsed) ? parsed : org.target_grades.split(",").map((s) => s.trim()).filter(Boolean));
      } catch {
        setTargetGrades(org.target_grades.split(",").map((s) => s.trim()).filter(Boolean));
      }
    } else {
      setTargetGrades([]);
    }
    setSelectionProcess(org.selection_process === "選考あり" || org.selection_process === "選考なし" || org.selection_process === "その他" ? org.selection_process : "選考なし");
    if (org.selection_flow && Array.isArray(org.selection_flow) && org.selection_flow.length > 0) {
      setSelectionFlow(org.selection_flow.map((s: unknown) => {
        const step = s as SelectionFlowStep;
        const dt = step.date_type ?? "none";
        const rawVal = (step.date_value ?? "").trim();
        const date_value = (dt === "pin" || dt === "deadline") && rawVal
          ? toLocalDatetimeInput(rawVal)
          : rawVal;
        return {
          name: step.name ?? "",
          date_type: dt,
          date_value,
          description: step.description ?? "",
          url: step.url ?? "",
        };
      }));
    } else {
      setSelectionFlow([...DEFAULT_SELECTION_FLOW]);
    }
    setGenderRatio(org.gender_ratio ?? "");
    setGradeComposition(org.grade_composition ?? "");
    setLocationDetail(org.location_detail ?? "");
    setFeeEntry(org.fee_entry ?? "");
    setFeeAnnual(org.fee_annual ?? "");
    setLogoUrl(org.logo_url ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFromContext = async (uid: string) => {
      if (cancelled) return;
      setErrorMessage(null);
      setIsLoading(true);
      try {
        if (ctxLoading) return;
        if (activeOrgId) {
          const { data: rows, error: fetchError } = await supabase
            .from("organizations")
            .select("id, user_id, name, university, category, description, x_id, instagram_id, line_url, website_url, member_count, activity_frequency, logo_url, is_intercollege, target_grades, selection_process, selection_flow, gender_ratio, grade_composition, location_detail, fee_entry, fee_annual, created_at")
            .eq("id", activeOrgId)
            .limit(1);
          if (cancelled) return;
          if (fetchError) {
            setErrorMessage("プロフィールの取得に失敗しました。");
            return;
          }
          const org = (rows as OrganizationRow[] | null)?.[0];
          if (org) applyOrgRow(org);
          else setErrorMessage("団体が見つかりません。");
        } else if (hasNoMemberships) {
          resetFormToEmpty({
            setOrgId,
            setName,
            setUniversity,
            setCategory,
            setDescription,
            setMemberCount,
            setActivityFrequency,
            setXId,
            setInstagramId,
            setLineUrl,
            setWebsiteUrl,
            setIsIntercollege,
            setTargetGrades,
            setSelectionProcess,
            setSelectionFlow,
            setGenderRatio,
            setGradeComposition,
            setLocationDetail,
            setFeeEntry,
            setFeeAnnual,
            setLogoUrl,
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user) {
        setErrorMessage("ログイン情報を取得できませんでした。");
        setIsLoading(false);
        return;
      }
      setUserId(session.user.id);
      if (ctxLoading) {
        setIsLoading(true);
        return;
      }
      await loadFromContext(session.user.id);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" && session?.user) {
        setUserId(session.user.id);
        if (!ctxLoading) void loadFromContext(session.user.id);
      }
      if (event === "SIGNED_OUT") {
        setUserId(null);
        resetFormToEmpty({
          setOrgId,
          setName,
          setUniversity,
          setCategory,
          setDescription,
          setMemberCount,
          setActivityFrequency,
          setXId,
          setInstagramId,
          setLineUrl,
          setWebsiteUrl,
          setIsIntercollege,
          setTargetGrades,
          setSelectionProcess,
          setSelectionFlow,
          setGenderRatio,
          setGradeComposition,
          setLocationDetail,
          setFeeEntry,
          setFeeAnnual,
          setLogoUrl,
        });
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [ctxLoading, activeOrgId, hasNoMemberships, applyOrgRow]);

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

    if (!name.trim()) {
      setErrorMessage("団体名は必須です。");
      return;
    }
    if (!category.trim()) {
      setErrorMessage("カテゴリは必須です。");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("理念・活動内容は必須です。");
      return;
    }
    if (targetGrades.length === 0) {
      setErrorMessage("対象学年を1つ以上選択してください。");
      return;
    }
    if (selectionProcess === "選考あり") {
      const stepsToValidate = selectionFlow.length > 0 ? selectionFlow : DEFAULT_SELECTION_FLOW;
      const emptyNameIndex = stepsToValidate.findIndex((s) => !(s.name ?? "").trim());
      if (emptyNameIndex !== -1) {
        setErrorMessage(`選考フロー ステップ ${emptyNameIndex + 1} のステップ名は必須です。`);
        return;
      }
    }

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
        university: resolveUniversityValue(university, universityOther).trim() || null,
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
        target_grades: targetGrades.length > 0 ? targetGrades.join(",") : null,
        selection_process: selectionProcess.trim() || null,
        selection_flow: selectionProcess === "選考あり"
          ? (selectionFlow.length > 0 ? selectionFlow : DEFAULT_SELECTION_FLOW).map((step) => {
              const dt = step.date_type ?? "none";
              const rawVal = (step.date_value ?? "").trim();
              const date_value = (dt === "pin" || dt === "deadline") && rawVal
                ? localDatetimeToISO(rawVal)
                : rawVal;
              return {
                name: (step.name ?? "").trim(),
                date_type: dt,
                date_value,
                description: (step.description ?? "").trim(),
                url: (step.url ?? "").trim(),
              };
            })
          : null,
        gender_ratio: genderRatio.trim() || null,
        grade_composition: gradeComposition.trim() || null,
        location_detail: locationDetail.trim() || null,
        fee_entry: feeEntry.trim() || null,
        fee_annual: feeAnnual.trim() || null,
      };

      if (orgId) {
        const { user_id: _omitUserId, ...updatePayload } = payload as typeof payload & { user_id: string };
        const { error } = await supabase
          .from("organizations")
          .update(updatePayload)
          .eq("id", orgId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("organizations")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        if (inserted?.id) {
          const { error: memErr } = await supabase.from("organization_members").insert({
            organization_id: inserted.id,
            user_id: userId,
            role: "owner",
          });
          if (memErr) throw memErr;
          await refreshMemberships();
          setOrgId(inserted.id);
        }
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
            <BadgeOptional />
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
              <BadgeRequired />
            </label>
            <Input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 〇〇大学野球部 / 〇〇大学公認テニスサークル"
              disabled={inputDisabled}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="org-university" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
              大学名
              <BadgeOptional />
            </label>
            <select
              id="org-university"
              value={university}
              disabled={inputDisabled}
              onChange={(e) => {
                const v = e.target.value;
                setUniversity(v);
                if (v !== UNIVERSITY_OTHER) setUniversityOther("");
              }}
              className={inputClass}
            >
              <option value="">選択してください</option>
              {UNIVERSITY_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            {university === UNIVERSITY_OTHER && (
              <Input
                id="org-university-other"
                type="text"
                value={universityOther}
                onChange={(e) => setUniversityOther(e.target.value)}
                placeholder="大学名を入力"
                disabled={inputDisabled}
                className="w-full mt-2"
              />
            )}
          </div>
          <div>
            <label htmlFor="org-category" className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
              カテゴリ
              <BadgeRequired />
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
              理念・活動内容
              <BadgeRequired />
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
                <BadgeOptional />
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
                <BadgeOptional />
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
            <span className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
              対象学年
              <BadgeRequired />
            </span>
            <p className="text-text-sub dark:text-slate-400 text-xs mb-2">複数選択可</p>
            <div className="flex flex-wrap gap-4">
              {TARGET_GRADES_CHECKBOX_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targetGrades.includes(opt)}
                    onChange={(e) => {
                      if (e.target.checked) setTargetGrades((prev) => [...prev, opt]);
                      else setTargetGrades((prev) => prev.filter((g) => g !== opt));
                    }}
                    disabled={inputDisabled}
                    className="w-5 h-5 border-slate-300 text-accent focus:ring-accent rounded"
                  />
                  <span className="text-sm text-primary dark:text-slate-200">{opt}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <span className="block text-primary dark:text-slate-200 font-bold text-sm mb-2">
              選考の有無
              <BadgeRequired />
            </span>
            <div className="flex flex-wrap gap-6">
              {SELECTION_PROCESS_RADIO_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="org-selection-process"
                    value={opt.value}
                    checked={selectionProcess === opt.value}
                    onChange={() => {
                      setSelectionProcess(opt.value);
                      if (opt.value === "選考あり" && selectionFlow.length === 0)
                        setSelectionFlow([...DEFAULT_SELECTION_FLOW]);
                    }}
                    disabled={inputDisabled}
                    className="w-4 h-4 border-slate-300 text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-primary dark:text-slate-200">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          {selectionProcess === "選考あり" && (
            <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h5 className="text-primary dark:text-white font-bold text-sm">選考フロー</h5>
              <p className="text-text-sub dark:text-slate-400 text-xs">ステップを追加・編集・削除できます</p>
              {(selectionFlow.length === 0 ? DEFAULT_SELECTION_FLOW : selectionFlow).map((step, index) => (
                <div key={index} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">ステップ {index + 1}</span>
                    {selectionFlow.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectionFlow((prev) => prev.filter((_, i) => i !== index))}
                        disabled={inputDisabled || selectionFlow.length <= 1}
                        className="text-red-600 hover:text-red-700 text-sm disabled:opacity-40"
                      >
                        削除
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      ステップ名
                      <span className="ml-1 text-[10px] font-normal text-white bg-red-500 px-1.5 py-0.5 rounded">必須</span>
                    </label>
                    <Input
                      value={step.name}
                      onChange={(e) => {
                        if (selectionFlow.length === 0) setSelectionFlow([...DEFAULT_SELECTION_FLOW]);
                        setSelectionFlow((prev) => {
                          const next = prev.length ? [...prev] : [...DEFAULT_SELECTION_FLOW];
                          next[index] = { ...next[index], name: e.target.value };
                          return next;
                        });
                      }}
                      placeholder="例: 新歓説明会"
                      disabled={inputDisabled}
                      className="w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      日時タイプ
                      <span className="ml-1 text-[10px] font-normal text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded dark:text-slate-300 dark:bg-slate-600">任意</span>
                    </label>
                    <select
                      value={step.date_type}
                      onChange={(e) => {
                        if (selectionFlow.length === 0) setSelectionFlow([...DEFAULT_SELECTION_FLOW]);
                        setSelectionFlow((prev) => {
                          const next = prev.length ? [...prev] : [...DEFAULT_SELECTION_FLOW];
                          next[index] = { ...next[index], date_type: e.target.value as SelectionFlowStep["date_type"] };
                          return next;
                        });
                      }}
                      disabled={inputDisabled}
                      className="w-full border border-slate-300 dark:border-slate-500 rounded px-3 py-2 text-sm bg-white dark:bg-slate-700"
                    >
                      {DATE_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      {step.date_type === "pin" ? "開催日時" : step.date_type === "deadline" ? "締切日時" : step.date_type === "period" ? "大体の時期" : "備考"}
                      <span className="ml-1 text-[10px] font-normal text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded dark:text-slate-300 dark:bg-slate-600">任意</span>
                    </label>
                    {step.date_type === "pin" || step.date_type === "deadline" ? (
                      <Input
                        type="datetime-local"
                        value={step.date_value}
                        onChange={(e) => {
                          if (selectionFlow.length === 0) setSelectionFlow([...DEFAULT_SELECTION_FLOW]);
                          setSelectionFlow((prev) => {
                            const next = prev.length ? [...prev] : [...DEFAULT_SELECTION_FLOW];
                            next[index] = { ...next[index], date_value: e.target.value };
                            return next;
                          });
                        }}
                        disabled={inputDisabled}
                        className="w-full text-sm"
                      />
                    ) : (
                      <Input
                        type="text"
                        value={step.date_value}
                        onChange={(e) => {
                          if (selectionFlow.length === 0) setSelectionFlow([...DEFAULT_SELECTION_FLOW]);
                          setSelectionFlow((prev) => {
                            const next = prev.length ? [...prev] : [...DEFAULT_SELECTION_FLOW];
                            next[index] = { ...next[index], date_value: e.target.value };
                            return next;
                          });
                        }}
                        placeholder={step.date_type === "period" ? "例: 4月上旬" : ""}
                        disabled={inputDisabled}
                        className="w-full text-sm"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      詳細説明
                      <span className="ml-1 text-[10px] font-normal text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded dark:text-slate-300 dark:bg-slate-600">任意</span>
                    </label>
                    <Textarea
                      value={step.description}
                      onChange={(e) => {
                        if (selectionFlow.length === 0) setSelectionFlow([...DEFAULT_SELECTION_FLOW]);
                        setSelectionFlow((prev) => {
                          const next = prev.length ? [...prev] : [...DEFAULT_SELECTION_FLOW];
                          next[index] = { ...next[index], description: e.target.value };
                          return next;
                        });
                      }}
                      placeholder="説明を入力"
                      rows={2}
                      disabled={inputDisabled}
                      className="w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      関連URL
                      <span className="ml-1 text-[10px] font-normal text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded dark:text-slate-300 dark:bg-slate-600">任意</span>
                    </label>
                    <Input
                      type="text"
                      value={step.url}
                      onChange={(e) => {
                        if (selectionFlow.length === 0) setSelectionFlow([...DEFAULT_SELECTION_FLOW]);
                        setSelectionFlow((prev) => {
                          const next = prev.length ? [...prev] : [...DEFAULT_SELECTION_FLOW];
                          next[index] = { ...next[index], url: e.target.value };
                          return next;
                        });
                      }}
                      placeholder="例: Google FormやZoomリンク"
                      disabled={inputDisabled}
                      className="w-full text-sm"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSelectionFlow((prev) => [...(prev.length ? prev : DEFAULT_SELECTION_FLOW), { name: "", date_type: "none", date_value: "", description: "", url: "" }])}
                disabled={inputDisabled}
                className="text-sm text-accent hover:underline font-bold"
              >
                + ステップを追加
              </button>
            </div>
          )}
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
                <BadgeOptional />
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
                <BadgeOptional />
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
              <BadgeOptional />
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
                <BadgeOptional />
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
                <BadgeOptional />
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
              公式X (Twitter) ID
              <BadgeOptional />
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
              公式Instagram ID
              <BadgeOptional />
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
              <BadgeOptional />
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
              公式WebサイトURL
              <BadgeOptional />
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
