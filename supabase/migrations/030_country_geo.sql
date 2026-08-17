-- ---------------------------------------------------------------------------
-- 030 — Country/geo attribution (ISO country code, first-touch)
--
-- MANUAL APPLY: run in Platform Supabase SQL editor (joqibhmmegycfadipnki)
-- AFTER 029_traffic_source.sql. Do NOT auto-apply.
--
-- Country only — no city, IP, age, or gender. NULL / unknown = legacy, never guessed.
-- RLS: users cannot write their own country. Service role only.
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country TEXT
    CHECK (
      country IS NULL
      OR country = 'unknown'
      OR country ~ '^[A-Z]{2}$'
    );

COMMENT ON COLUMN public.profiles.country IS
  'Sticky first-touch ISO 3166-1 alpha-2 country. NULL/unknown = legacy. Server/service-role only.';

REVOKE INSERT (country) ON public.profiles FROM anon, authenticated;
REVOKE UPDATE (country) ON public.profiles FROM anon, authenticated;
GRANT INSERT (country) ON public.profiles TO service_role;
GRANT UPDATE (country) ON public.profiles TO service_role;

ALTER TABLE public.episode_events
  ADD COLUMN IF NOT EXISTS country TEXT
    CHECK (
      country IS NULL
      OR country = 'unknown'
      OR country ~ '^[A-Z]{2}$'
    );

ALTER TABLE public.billing_events
  ADD COLUMN IF NOT EXISTS country TEXT
    CHECK (
      country IS NULL
      OR country = 'unknown'
      OR country ~ '^[A-Z]{2}$'
    );

CREATE INDEX IF NOT EXISTS idx_episode_events_country_type
  ON public.episode_events (country, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_events_country_created
  ON public.billing_events (country, created_at DESC);

CREATE TABLE IF NOT EXISTS public.country_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL UNIQUE,
  user_id UUID UNIQUE REFERENCES public.profiles (id) ON DELETE SET NULL,
  country TEXT NOT NULL
    CHECK (country ~ '^[A-Z]{2}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_country_assignments_country_created
  ON public.country_assignments (country, created_at DESC);

ALTER TABLE public.country_assignments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.country_assignments FROM anon, authenticated;
GRANT ALL ON public.country_assignments TO service_role;

COMMENT ON TABLE public.country_assignments IS
  'Sticky first-touch country from Vercel geo header. Service-role only.';
