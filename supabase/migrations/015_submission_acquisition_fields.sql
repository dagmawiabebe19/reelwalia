-- Acquisition fields + admin review scores for creator submissions

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS project_stage TEXT;

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS target_audience TEXT;

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS trailer_available BOOLEAN;

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS submission_rights_confirmed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS concept_score SMALLINT;

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS marketability_score SMALLINT;

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS production_quality_score SMALLINT;

UPDATE public.creator_submissions
SET project_stage = 'idea_concept'
WHERE project_stage IS NULL;

ALTER TABLE public.creator_submissions
  ALTER COLUMN project_stage SET NOT NULL;

ALTER TABLE public.creator_submissions
  DROP CONSTRAINT IF EXISTS creator_submissions_project_stage_check;

ALTER TABLE public.creator_submissions
  ADD CONSTRAINT creator_submissions_project_stage_check
  CHECK (
    project_stage IN (
      'idea_concept',
      'script_complete',
      'in_production',
      'post_production',
      'completed_ready'
    )
  );

ALTER TABLE public.creator_submissions
  DROP CONSTRAINT IF EXISTS creator_submissions_concept_score_check;

ALTER TABLE public.creator_submissions
  ADD CONSTRAINT creator_submissions_concept_score_check
  CHECK (concept_score IS NULL OR (concept_score >= 1 AND concept_score <= 10));

ALTER TABLE public.creator_submissions
  DROP CONSTRAINT IF EXISTS creator_submissions_marketability_score_check;

ALTER TABLE public.creator_submissions
  ADD CONSTRAINT creator_submissions_marketability_score_check
  CHECK (marketability_score IS NULL OR (marketability_score >= 1 AND marketability_score <= 10));

ALTER TABLE public.creator_submissions
  DROP CONSTRAINT IF EXISTS creator_submissions_production_quality_score_check;

ALTER TABLE public.creator_submissions
  ADD CONSTRAINT creator_submissions_production_quality_score_check
  CHECK (
    production_quality_score IS NULL
    OR (production_quality_score >= 1 AND production_quality_score <= 10)
  );
