-- Marketing display view counts per episode (separate from real funnel tracking)

ALTER TABLE public.episodes
ADD COLUMN IF NOT EXISTS display_view_count INT DEFAULT NULL;

COMMENT ON COLUMN public.episodes.display_view_count IS
  'Marketing display count shown on episode cards. Intentionally separate from real view tracking.';

-- Seed REDBIRD placeholder counts (early launch)
UPDATE public.episodes AS e
SET display_view_count = v.count
FROM public.series AS s,
(
  VALUES
    (1, 3417),
    (2, 2854),
    (3, 2391),
    (4, 1186),
    (5, 943),
    (6, 812),
    (7, 728),
    (8, 651),
    (9, 587)
) AS v(episode_number, count)
WHERE e.series_id = s.id
  AND (s.slug = 'redbird' OR lower(s.title) = 'redbird')
  AND e.episode_number = v.episode_number;
