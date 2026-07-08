-- ---------------------------------------------------------------------------
-- 021 — Multilingual episode captions (WebVTT)
--
-- ⚠️ MANUAL APPLY (flagged): review before running against production.
--
-- 1. episode_captions: per-episode, per-language caption metadata.
-- 2. captions storage bucket: private; uploads via service_role only.
--    Watch page serves signed URLs only when the viewer has episode access.
-- ---------------------------------------------------------------------------

-- --- 1. episode_captions table ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.episode_captions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES public.episodes (id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  language_label TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (episode_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_episode_captions_episode
  ON public.episode_captions (episode_id);

ALTER TABLE public.episode_captions ENABLE ROW LEVEL SECURITY;

-- No client policies: reads/writes go through service_role (admin + watch SSR).

-- --- 2. captions storage bucket --------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'captions',
  'captions',
  false,
  5242880,
  ARRAY['text/vtt', 'text/plain', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "captions_service_upload" ON storage.objects;
CREATE POLICY "captions_service_upload"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'captions');

DROP POLICY IF EXISTS "captions_service_update" ON storage.objects;
CREATE POLICY "captions_service_update"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'captions');

DROP POLICY IF EXISTS "captions_service_delete" ON storage.objects;
CREATE POLICY "captions_service_delete"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'captions');

DROP POLICY IF EXISTS "captions_service_read" ON storage.objects;
CREATE POLICY "captions_service_read"
  ON storage.objects FOR SELECT
  TO service_role
  USING (bucket_id = 'captions');
