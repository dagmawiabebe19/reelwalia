-- Deal terms tracking for negotiating and accepted submissions

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS distribution_type TEXT;

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS revenue_share TEXT;

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS license_fee NUMERIC(12, 2);

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS contract_sent BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS contract_signed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS content_delivered BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.creator_submissions
  ADD COLUMN IF NOT EXISTS launch_date DATE;

ALTER TABLE public.creator_submissions
  DROP CONSTRAINT IF EXISTS creator_submissions_distribution_type_check;

ALTER TABLE public.creator_submissions
  ADD CONSTRAINT creator_submissions_distribution_type_check
  CHECK (
    distribution_type IS NULL
    OR distribution_type IN ('non_exclusive', 'exclusive', 'reelwalia_original')
  );

ALTER TABLE public.creator_submissions
  DROP CONSTRAINT IF EXISTS creator_submissions_license_fee_check;

ALTER TABLE public.creator_submissions
  ADD CONSTRAINT creator_submissions_license_fee_check
  CHECK (license_fee IS NULL OR license_fee >= 0);
