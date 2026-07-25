"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";
import type {
  FinanceCategory,
  FinanceKind,
  FinancePeriod,
  FinanceProject,
  ProjectKind,
} from "@/lib/finance/types";

const CATEGORY_KINDS: FinanceKind[] = ["income", "expense"];
const CATEGORY_KIND_LABEL: Record<FinanceKind, string> = {
  income: "収入",
  expense: "支出",
};

const PROJECT_KIND_LABEL: Record<ProjectKind, string> = {
  event: "イベント",
  grant: "助成金",
  sponsor: "協賛",
  general: "一般",
};
const PROJECT_KIND_OPTIONS: ProjectKind[] = ["event", "grant", "sponsor", "general"];

export default function FinanceSettingsContent() {
  const {
    loading: ctxLoading,
    activeOrgId: orgId,
    activeOrgName: orgName,
    hasNoMemberships,
    isReady,
  } = useClubOrganization();

  const [canManage, setCanManage] = useState(false);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [projects, setProjects] = useState<FinanceProject[]>([]);
  const [periods, setPeriods] = useState<FinancePeriod[]>([]);
  const [loading, setLoading] = useState(true);

  const [newCategoryName, setNewCategoryName] = useState<Record<FinanceKind, string>>({
    income: "",
    expense: "",
  });
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectKind, setNewProjectKind] = useState<ProjectKind>("general");

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id ?? null;
    let manage = false;
    if (uid) {
      const { data: mem } = await supabase
        .from("organization_members")
        .select("can_manage_finance")
        .eq("organization_id", orgId)
        .eq("user_id", uid)
        .maybeSingle();
      manage = !!(mem as { can_manage_finance?: boolean } | null)?.can_manage_finance;
    }
    setCanManage(manage);

    const { data: cats } = await supabase
      .from("finance_categories")
      .select("*")
      .eq("organization_id", orgId)
      .order("sort_order", { ascending: true });
    setCategories((cats as FinanceCategory[]) ?? []);

    const { data: projs } = await supabase
      .from("finance_projects")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });
    setProjects((projs as FinanceProject[]) ?? []);

    const { data: pers } = await supabase
      .from("finance_periods")
      .select("*")
      .eq("organization_id", orgId)
      .order("starts_on", { ascending: false });
    setPeriods((pers as FinancePeriod[]) ?? []);

    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    if (orgId) load();
  }, [orgId, load]);

  const handleRenameCategory = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("費目名を入力してください");
      return;
    }
    const { error } = await supabase.from("finance_categories").update({ name: trimmed }).eq("id", id);
    if (error) {
      toast.error("費目の更新に失敗しました");
      return;
    }
    toast.success("費目を更新しました");
    await load();
  };

  const handleToggleCategoryArchive = async (cat: FinanceCategory) => {
    const { error } = await supabase
      .from("finance_categories")
      .update({ is_archived: !cat.is_archived })
      .eq("id", cat.id);
    if (error) {
      toast.error("費目の更新に失敗しました");
      return;
    }
    toast.success(cat.is_archived ? "費目を復元しました" : "費目をアーカイブしました");
    await load();
  };

  const handleAddCategory = async (kind: FinanceKind) => {
    if (!orgId) return;
    const name = newCategoryName[kind].trim();
    if (!name) {
      toast.error("費目名を入力してください");
      return;
    }
    const maxSort = categories.reduce((m, c) => Math.max(m, c.sort_order), -1);
    const { error } = await supabase
      .from("finance_categories")
      .insert({ organization_id: orgId, name, kind, sort_order: maxSort + 1 });
    if (error) {
      toast.error("費目の追加に失敗しました");
      return;
    }
    toast.success("費目を追加しました");
    setNewCategoryName((prev) => ({ ...prev, [kind]: "" }));
    await load();
  };

  const handleToggleProjectArchive = async (project: FinanceProject) => {
    const { error } = await supabase
      .from("finance_projects")
      .update({ is_archived: !project.is_archived })
      .eq("id", project.id);
    if (error) {
      toast.error("事業タグの更新に失敗しました");
      return;
    }
    toast.success(project.is_archived ? "事業タグを復元しました" : "事業タグをアーカイブしました");
    await load();
  };

  const handleAddProject = async () => {
    if (!orgId) return;
    const name = newProjectName.trim();
    if (!name) {
      toast.error("事業タグ名を入力してください");
      return;
    }
    const { error } = await supabase
      .from("finance_projects")
      .insert({ organization_id: orgId, name, kind: newProjectKind });
    if (error) {
      toast.error("事業タグの追加に失敗しました");
      return;
    }
    toast.success("事業タグを追加しました");
    setNewProjectName("");
    setNewProjectKind("general");
    await load();
  };

  const handleSavePeriod = async (period: FinancePeriod, name: string, openingBalance: string) => {
    const trimmed = name.trim();
    const balance = Math.round(Number(openingBalance));
    if (!trimmed) {
      toast.error("会計期間名を入力してください");
      return;
    }
    if (!Number.isFinite(balance)) {
      toast.error("繰越金は数値で入力してください");
      return;
    }
    const { error } = await supabase
      .from("finance_periods")
      .update({ name: trimmed, opening_balance: balance })
      .eq("id", period.id);
    if (error) {
      toast.error("会計期間の更新に失敗しました");
      return;
    }
    toast.success("会計期間を更新しました");
    await load();
  };

  if (ctxLoading || loading) {
    return (
      <div className="p-6 md:p-10">
        <p className="text-graphite/70 py-20 text-center">読み込み中...</p>
      </div>
    );
  }
  if (hasNoMemberships || !isReady || !orgId) {
    return (
      <div className="p-6 md:p-10">
        <div className="rounded-lg border border-rule border-l-4 border-l-seal bg-mist p-6 text-center">
          <p className="text-ink font-medium">管理できる団体がありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6">
        <Link
          href={`/clubfinance?orgId=${orgId}`}
          className="inline-flex items-center gap-1 text-sm text-graphite hover:text-ink"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          会計・財務に戻る
        </Link>
        <h1 className="text-2xl font-bold text-ink font-mincho mt-2">会計・財務の設定</h1>
        <p className="text-graphite text-sm mt-1">{orgName}</p>
        {!canManage && (
          <p className="text-graphite text-xs mt-2">閲覧のみ可能です（編集には会計担当の権限が必要です）。</p>
        )}
      </div>

      {/* 費目 */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-ink font-mincho mb-3">費目</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CATEGORY_KINDS.map((kind) => (
            <div key={kind} className="rounded-xl border border-rule bg-paper p-4">
              <h3 className="text-sm font-bold text-ink mb-3">{CATEGORY_KIND_LABEL[kind]}の費目</h3>
              <div className="space-y-2">
                {categories
                  .filter((c) => c.kind === kind)
                  .map((cat) => (
                    <CategoryRow
                      key={cat.id}
                      category={cat}
                      canManage={canManage}
                      onRename={(name) => handleRenameCategory(cat.id, name)}
                      onToggleArchive={() => handleToggleCategoryArchive(cat)}
                    />
                  ))}
                {categories.filter((c) => c.kind === kind).length === 0 && (
                  <p className="text-graphite/70 text-sm">費目がまだありません。</p>
                )}
              </div>
              {canManage && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-rule">
                  <Input
                    value={newCategoryName[kind]}
                    onChange={(e) =>
                      setNewCategoryName((prev) => ({ ...prev, [kind]: e.target.value }))
                    }
                    placeholder="新しい費目名"
                    className="text-sm"
                  />
                  <Button
                    variant="outlineMuted"
                    size="sm"
                    onClick={() => handleAddCategory(kind)}
                    className="inline-flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    追加
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 事業タグ */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-ink font-mincho mb-3">事業タグ</h2>
        <div className="rounded-xl border border-rule bg-paper p-4">
          <div className="space-y-2">
            {projects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                canManage={canManage}
                onToggleArchive={() => handleToggleProjectArchive(project)}
              />
            ))}
            {projects.length === 0 && <p className="text-graphite/70 text-sm">事業タグがまだありません。</p>}
          </div>
          {canManage && (
            <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-3 border-t border-rule">
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="新しい事業タグ名"
                className="text-sm"
              />
              <select
                value={newProjectKind}
                onChange={(e) => setNewProjectKind(e.target.value as ProjectKind)}
                className="border border-rule bg-paper text-graphite text-sm px-3 py-2 shrink-0"
              >
                {PROJECT_KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {PROJECT_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
              <Button
                variant="outlineMuted"
                size="sm"
                onClick={handleAddProject}
                className="inline-flex items-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                追加
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* 会計期間 */}
      <section>
        <h2 className="text-lg font-bold text-ink font-mincho mb-3">会計期間</h2>
        <div className="space-y-3">
          {periods.map((period) => (
            <PeriodRow
              key={period.id}
              period={period}
              canManage={canManage}
              onSave={(name, opening) => handleSavePeriod(period, name, opening)}
            />
          ))}
          {periods.length === 0 && (
            <div className="rounded-lg border border-rule bg-mist p-4 text-center text-graphite text-sm">
              会計期間がまだありません。「会計・財務」ページに会計担当がアクセスすると自動で作成されます。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function CategoryRow({
  category,
  canManage,
  onRename,
  onToggleArchive,
}: {
  category: FinanceCategory;
  canManage: boolean;
  onRename: (name: string) => void;
  onToggleArchive: () => void;
}) {
  const [draft, setDraft] = useState(category.name);
  const changed = draft.trim() !== category.name && draft.trim().length > 0;

  if (!canManage) {
    return (
      <div className={`flex items-center justify-between gap-2 text-sm ${category.is_archived ? "opacity-50" : ""}`}>
        <span className="text-ink">{category.name}</span>
        {category.is_archived && <span className="text-xs text-graphite">アーカイブ済み</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${category.is_archived ? "opacity-50" : ""}`}>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="text-sm"
      />
      {changed && (
        <Button variant="outlineMuted" size="sm" onClick={() => onRename(draft)} className="shrink-0">
          保存
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onToggleArchive} className="shrink-0 whitespace-nowrap">
        {category.is_archived ? "復元" : "アーカイブ"}
      </Button>
    </div>
  );
}

function ProjectRow({
  project,
  canManage,
  onToggleArchive,
}: {
  project: FinanceProject;
  canManage: boolean;
  onToggleArchive: () => void;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 text-sm ${project.is_archived ? "opacity-50" : ""}`}>
      <span className="text-ink">
        {project.name}
        <span className="text-xs text-graphite ml-2">{PROJECT_KIND_LABEL[project.kind]}</span>
        {project.is_archived && <span className="text-xs text-graphite ml-2">アーカイブ済み</span>}
      </span>
      {canManage && (
        <Button variant="ghost" size="sm" onClick={onToggleArchive} className="shrink-0 whitespace-nowrap">
          {project.is_archived ? "復元" : "アーカイブ"}
        </Button>
      )}
    </div>
  );
}

function PeriodRow({
  period,
  canManage,
  onSave,
}: {
  period: FinancePeriod;
  canManage: boolean;
  onSave: (name: string, opening: string) => void;
}) {
  const [name, setName] = useState(period.name);
  const [opening, setOpening] = useState(String(period.opening_balance));
  const changed = name.trim() !== period.name || Math.round(Number(opening)) !== period.opening_balance;

  return (
    <div className="rounded-xl border border-rule bg-paper p-4">
      <p className="text-xs text-graphite mb-2">
        {period.starts_on} 〜 {period.ends_on}
        {period.is_closed && <span className="ml-2 text-seal">締め済み</span>}
      </p>
      {canManage ? (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div>
            <label className="block text-xs text-graphite mb-1">期間名</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="text-sm" />
          </div>
          <div>
            <label className="block text-xs text-graphite mb-1">繰越金（期首残高・円）</label>
            <Input
              type="number"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              className="text-sm font-numeric tabular-nums"
            />
          </div>
          {changed && (
            <Button variant="outlineMuted" size="sm" onClick={() => onSave(name, opening)} className="shrink-0">
              保存
            </Button>
          )}
        </div>
      ) : (
        <div className="text-sm text-ink">
          {period.name}・繰越金 ¥{period.opening_balance.toLocaleString("ja-JP")}
        </div>
      )}
    </div>
  );
}
