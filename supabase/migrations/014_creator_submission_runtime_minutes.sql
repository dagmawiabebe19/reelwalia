-- Runtime in minutes for film submissions (nullable for series)

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS runtime_minutes INT;

ALTER TABLE public.creator_submissions
  DROP CONSTRAINT IF EXISTS creator_submissions_runtime_minutes_check;

ALTER TABLE public.creator_submissions
  ADD CONSTRAINT creator_submissions_runtime_minutes_check
  CHECK (runtime_minutes IS NULL OR runtime_minutes > 0);
