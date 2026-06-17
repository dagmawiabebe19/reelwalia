-- Acquisition workflow status, notes, and activity history

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS submission_status TEXT;

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS acquisition_notes TEXT;

UPDATE public.creator_submissions
SET submission_status = 'new_submission'
WHERE submission_status IS NULL;

ALTER TABLE public.creator_submissions
  ALTER COLUMN submission_status SET NOT NULL;

ALTER TABLE public.creator_submissions
  ALTER COLUMN submission_status SET DEFAULT 'new_submission';

ALTER TABLE public.creator_submissions
  DROP CONSTRAINT IF EXISTS creator_submissions_submission_status_check;

ALTER TABLE public.creator_submissions
  ADD CONSTRAINT creator_submissions_submission_status_check
  CHECK (
    submission_status IN (
      'new_submission',
      'under_review',
      'interested',
      'request_materials',
      'negotiating',
      'accepted',
      'rejected'
    )
  );

CREATE INDEX IF NOT EXISTS idx_creator_submissions_submission_status
  ON public.creator_submissions (submission_status);

-- ---------------------------------------------------------------------------
-- submission_status_history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.submission_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.creator_submissions(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submission_status_history_submission_id
  ON public.submission_status_history (submission_id, created_at DESC);

ALTER TABLE public.submission_status_history ENABLE ROW LEVEL SECURITY;

-- Backfill activity history for existing submissions
INSERT INTO public.submission_status_history (submission_id, status, created_at)
SELECT cs.id, cs.submission_status, cs.created_at
FROM public.creator_submissions cs
WHERE NOT EXISTS (
  SELECT 1
  FROM public.submission_status_history h
  WHERE h.submission_id = cs.id
);

-- Log status changes automatically
CREATE OR REPLACE FUNCTION public.log_submission_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.submission_status_history (submission_id, status, created_at)
    VALUES (NEW.id, NEW.submission_status, NEW.created_at);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.submission_status IS DISTINCT FROM NEW.submission_status THEN
    INSERT INTO public.submission_status_history (submission_id, status, created_at)
    VALUES (NEW.id, NEW.submission_status, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS creator_submissions_status_history ON public.creator_submissions;

CREATE TRIGGER creator_submissions_status_history
  AFTER INSERT OR UPDATE OF submission_status ON public.creator_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_submission_status_change();
