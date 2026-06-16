-- REDBIRD paywall: Episode 1 free, Episode 2+ requires subscription

UPDATE public.series
SET free_episode_count = 1
WHERE slug = 'redbird'
   OR lower(title) = 'redbird';

UPDATE public.episodes AS e
SET is_free = (e.episode_number <= 1)
FROM public.series AS s
WHERE e.series_id = s.id
  AND (s.slug = 'redbird' OR lower(s.title) = 'redbird');
