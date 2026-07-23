"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ImagePlus, Trash2 } from "lucide-react";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";

type PhotoRow = {
  id: string;
  organization_id: string;
  photo_url: string;
  created_at?: string;
};

export default function ClubPhotosPage() {
  const {
    loading: ctxLoading,
    activeOrgId: orgId,
    hasNoMemberships,
    isReady,
  } = useClubOrganization();

  const [userId, setUserId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    if (!orgId) return;
    const { data, error } = await supabase
      .from("organization_photos")
      .select("id, organization_id, photo_url, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("photos fetch error:", JSON.stringify(error, null, 2), error?.message);
      setPhotos([]);
    } else {
      setPhotos((data as PhotoRow[]) ?? []);
    }
  }, [orgId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (orgId) loadPhotos();
  }, [orgId, loadPhotos]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || !orgId || !userId) return;
    setUploading(true);
    setErrorMessage(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const safeExt = /^[a-z0-9]+$/i.test(ext) ? ext : "jpg";
      const path = `${orgId}/${Date.now()}-${crypto.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10)}.${safeExt}`;
      const { error: uploadError } = await supabase.storage.from("club_photos").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("club_photos").getPublicUrl(path);
      const { error: insertError } = await supabase.from("organization_photos").insert({
        organization_id: orgId,
        photo_url: urlData.publicUrl,
      });
      if (insertError) throw insertError;
      await loadPhotos();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (photo: PhotoRow) => {
    if (!confirm("この写真を削除しますか？")) return;
    setDeletingId(photo.id);
    try {
      const pathMatch = photo.photo_url.match(/\/storage\/v1\/object\/public\/club_photos\/(.+)$/);
      if (pathMatch?.[1]) {
        await supabase.storage.from("club_photos").remove([pathMatch[1]]);
      }
      const { error } = await supabase.from("organization_photos").delete().eq("id", photo.id);
      if (error) throw error;
      await loadPhotos();
    } catch (err) {
      console.error("delete error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  if (ctxLoading) {
    return (
      <div className="p-6 lg:p-10">
        <p className="text-graphite">読み込み中...</p>
      </div>
    );
  }

  if (hasNoMemberships || !isReady || !orgId) {
    return (
      <div className="p-6 lg:p-10">
        <p className="text-graphite">
          管理できる団体がありません。プロフィール編集から団体情報を作成すると、フォトギャラリーを管理できるようになります。
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl">
      <h2 className="font-mincho text-2xl font-bold text-ink mb-2">フォトギャラリー管理</h2>
      <p className="text-graphite text-sm mb-6">団体の写真をアップロードし、団体詳細ページのフォトギャラリーに表示できます。</p>

      <div className="mb-8 p-5 rounded-lg border border-rule bg-paper">
        <label className="block text-sm font-bold text-ink mb-2">写真をアップロード</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-graphite/70 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:font-bold file:bg-ink file:text-paper file:cursor-pointer hover:file:bg-ink/90"
        />
        {uploading && <p className="text-sm text-graphite/70 mt-2">アップロード中...</p>}
        {errorMessage && (
          <p className="text-sm text-seal mt-2" role="alert">
            {errorMessage}
          </p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-ink mb-4">アップロード済みの写真</h3>
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-rule bg-mist py-16 px-6 text-center">
            <ImagePlus className="w-10 h-10 text-graphite/40" aria-hidden="true" />
            <p className="text-graphite text-sm">
              まだ写真がありません。上から画像をアップロードしてください。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group aspect-square rounded-lg overflow-hidden bg-mist border border-rule"
              >
                <img
                  src={photo.photo_url}
                  alt="団体の写真"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleDelete(photo)}
                  disabled={deletingId === photo.id}
                  className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-paper text-sm font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  {deletingId === photo.id ? "削除中..." : "削除"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
