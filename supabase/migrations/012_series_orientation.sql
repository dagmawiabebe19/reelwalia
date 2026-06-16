-- Per-series video orientation: vertical (9:16) or landscape (16:9).
-- Existing rows default to 'vertical' (REDBIRD and all current series stay vertical).

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS orientation TEXT NOT NULL DEFAULT 'vertical';

ALTER TABLE public.series
  DROP CONSTRAINT IF EXISTS series_orientation_check;

ALTER TABLE public.series
  ADD CONSTRAINT series_orientation_check
  CHECK (orientation IN ('vertical', 'landscape'));
