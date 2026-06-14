-- Creator submission intake for curated platform onboarding

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.submission_status AS ENUM (
  'new',
  'reviewing',
  'contacted',
  'approved',
  'rejected'
);

CREATE TYPE public.production_status AS ENUM (
  'released',
  'completed',
  'in_post_production',
  'in_production',
  'development'
);

-- ---------------------------------------------------------------------------
-- creator_submissions
-- ---------------------------------------------------------------------------
CREATE TABLE public.creator_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  creator_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  country TEXT,
  instagram TEXT,
  website TEXT,
  imdb TEXT,

  project_title TEXT NOT NULL,
  genre TEXT NOT NULL,
  logline TEXT NOT NULL,
  description TEXT NOT NULL,
  episode_count INT NOT NULL CHECK (episode_count > 0),
  average_episode_length TEXT NOT NULL,
  production_status public.production_status NOT NULL,

  trailer_link TEXT,
  screener_link TEXT,
  youtube_link TEXT,
  vimeo_link TEXT,
  google_drive_link TEXT,
  dropbox_link TEXT,
  project_website_link TEXT,

  poster_link TEXT,
  hero_banner_link TEXT,

  owns_distribution_rights BOOLEAN NOT NULL,
  released_elsewhere BOOLEAN NOT NULL,
  released_elsewhere_where TEXT,

  additional_notes TEXT,

  status public.submission_status NOT NULL DEFAULT 'new',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_creator_submissions_status ON public.creator_submissions (status);
CREATE INDEX idx_creator_submissions_created_at ON public.creator_submissions (created_at DESC);
CREATE INDEX idx_creator_submissions_email ON public.creator_submissions (email);

CREATE TRIGGER creator_submissions_updated_at
  BEFORE UPDATE ON public.creator_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — public insert only; admin reads/writes via service role
-- ---------------------------------------------------------------------------
ALTER TABLE public.creator_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY creator_submissions_insert_public
  ON public.creator_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
