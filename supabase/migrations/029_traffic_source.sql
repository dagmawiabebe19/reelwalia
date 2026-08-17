-- ---------------------------------------------------------------------------
-- 029 — Traffic source attribution (ad vs organic, first-touch)
--
-- MANUAL APPLY: run in Platform Supabase SQL editor (joqibhmmegycfadipnki)
-- AFTER 028_paywall_ab_variant.sql. Do NOT auto-apply.
--
-- Does NOT backfill. NULL traffic_source on existing rows = unknown (legacy).
-- New visitors after deploy get sticky ad / organic from UTM + referrer capture.
--
-- RLS: users cannot write their own source. Service role only.
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS traffic_source TEXT
    CHECK (traffic_source IS NULL OR traffic_source IN ('ad', 'organic', 'unknown'));

COMMENT ON COLUMN public.profiles.traffic_source IS
  'Sticky first-touch traffic source. NULL = legacy (unknown). Server/service-role only.';

REVOKE INSERT (traffic_source) ON public.profiles FROM anon, authenticated;
REVOKE UPDATE (traffic_source) ON public.profiles FROM anon, authenticated;
GRANT INSERT (traffic_source) ON public.profiles TO service_role;
GRANT UPDATE (traffic_source) ON public.profiles TO service_role;

ALTER TABLE public.episode_events
  ADD COLUMN IF NOT EXISTS traffic_source TEXT
    CHECK (traffic_source IS NULL OR traffic_source IN ('ad', 'organic', 'unknown'));

ALTER TABLE public.billing_events
  ADD COLUMN IF NOT EXISTS traffic_source TEXT
    CHECK (traffic_source IS NULL OR traffic_source IN ('ad', 'organic', 'unknown'));

CREATE INDEX IF NOT EXISTS idx_episode_events_traffic_type
  ON public.episode_events (traffic_source, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_events_traffic_created
  ON public.billing_events (traffic_source, created_at DESC);

CREATE TABLE IF NOT EXISTS public.traffic_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL UNIQUE,
  user_id UUID UNIQUE REFERENCES public.profiles (id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('ad', 'organic')),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_traffic_assignments_source_created
  ON public.traffic_assignments (source, created_at DESC);

ALTER TABLE public.traffic_assignments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.traffic_assignments FROM anon, authenticated;
GRANT ALL ON public.traffic_assignments TO service_role;

COMMENT ON TABLE public.traffic_assignments IS
  'Sticky first-touch traffic assignments. Service-role only; source is never user-writable.';
