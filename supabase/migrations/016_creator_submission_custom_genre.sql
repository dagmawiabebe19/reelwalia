-- Custom genre text when submission genre is "Other"

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS custom_genre TEXT;
