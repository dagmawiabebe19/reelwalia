-- Add project type to creator submissions intake

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS project_type TEXT;

UPDATE public.creator_submissions
SET project_type = 'Episodic Series'
WHERE project_type IS NULL;

ALTER TABLE public.creator_submissions
  ALTER COLUMN project_type SET NOT NULL;

ALTER TABLE public.creator_submissions
  DROP CONSTRAINT IF EXISTS creator_submissions_project_type_check;

ALTER TABLE public.creator_submissions
  ADD CONSTRAINT creator_submissions_project_type_check
  CHECK (
    project_type IN (
      'Feature Film',
      'Episodic Series',
      'Short Film',
      'AI Episodic Series',
      'AI Feature Film',
      'AI Short Film',
      'AI Vertical Series',
      'Vertical Drama Series'
    )
  );
