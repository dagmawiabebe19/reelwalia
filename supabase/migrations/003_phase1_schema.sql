-- Phase 1: Bunny Stream + admin fields

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS free_episode_count INT NOT NULL DEFAULT 5;

ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS bunny_video_id TEXT,
  ADD COLUMN IF NOT EXISTS subtitle_url TEXT;

CREATE INDEX IF NOT EXISTS idx_episodes_bunny_video ON public.episodes (bunny_video_id)
  WHERE bunny_video_id IS NOT NULL;
