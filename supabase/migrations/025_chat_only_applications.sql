-- エントリー非依存のチャット用（applications を会話スレッドとして再利用）
-- chat-only な会話は ATS / エントリー数などの集計から除外する前提

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS is_chat_only boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_applications_org_chat_only
  ON public.applications (organization_id, is_chat_only);

CREATE INDEX IF NOT EXISTS idx_applications_user_chat_only
  ON public.applications (user_id, is_chat_only);

