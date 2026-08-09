-- ---------------------------------------------------------------------------
-- 025 — Paywall after episode 1 (only episode 1 free)
--
-- MANUAL APPLY: run in Platform Supabase SQL editor (joqibhmmegycfadipnki).
-- ---------------------------------------------------------------------------

ALTER TABLE public.series
  ALTER COLUMN free_episode_count SET DEFAULT 1;

UPDATE public.series
SET free_episode_count = 1
WHERE free_episode_count IS DISTINCT FROM 1;

UPDATE public.episodes AS e
SET is_free = (e.episode_number <= s.free_episode_count)
FROM public.series AS s
WHERE e.series_id = s.id;
