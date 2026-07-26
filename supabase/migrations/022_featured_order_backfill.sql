-- ---------------------------------------------------------------------------
-- 022 — Featured section ordering (backfill + docs)
--
-- ⚠️ MANUAL APPLY (flagged): run this in the PLATFORM Supabase SQL Editor.
-- Platform project ref: joqibhmmegycfadipnki (reelwalia.com)
-- Do NOT run against the Studio project (dxtieidijudvekuwljrs).
--
-- The Platform schema already has:
--   series.is_featured BOOLEAN
--   series.featured_order INT  (nullable; lower = shown first)
--   index idx_series_featured (is_featured, featured_order) WHERE is_featured
--
-- This migration does NOT add a new column. It reuses `featured_order` and:
--   1. Clears stale ranks on non-featured rows
--   2. Assigns sequential ranks (1..n) to featured rows that lack an order
-- ---------------------------------------------------------------------------

-- Non-featured titles should not keep a leftover rank.
UPDATE public.series
SET featured_order = NULL
WHERE is_featured = FALSE
  AND featured_order IS NOT NULL;

-- Backfill ranks for featured titles missing featured_order (append after
-- any already-ranked featured rows, by created_at).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn,
    COALESCE(
      (SELECT MAX(featured_order) FROM public.series WHERE is_featured = TRUE),
      0
    ) AS base
  FROM public.series
  WHERE is_featured = TRUE
    AND featured_order IS NULL
)
UPDATE public.series AS s
SET featured_order = ranked.base + ranked.rn
FROM ranked
WHERE s.id = ranked.id;
