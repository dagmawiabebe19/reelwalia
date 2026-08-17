-- ---------------------------------------------------------------------------
-- 028 — Paywall position A/B test (after episode 1 vs after episode 2)
--
-- MANUAL APPLY: run in Platform Supabase SQL editor (joqibhmmegycfadipnki)
-- AFTER 027_series_analytics_events.sql. Do NOT auto-apply.
--
-- Does NOT backfill existing users. NULL paywall_variant = not in the test
-- (keep current default: episodes 1–2 free).
--
-- RLS: users cannot write their own bucket. Service role only.
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paywall_variant TEXT
    CHECK (paywall_variant IN ('paywall_after_1', 'paywall_after_2'));

COMMENT ON COLUMN public.profiles.paywall_variant IS
  'Sticky paywall A/B bucket. NULL = not in test (default free window). Server/service-role only.';

REVOKE INSERT (paywall_variant) ON public.profiles FROM anon, authenticated;
REVOKE UPDATE (paywall_variant) ON public.profiles FROM anon, authenticated;
GRANT INSERT (paywall_variant) ON public.profiles TO service_role;
GRANT UPDATE (paywall_variant) ON public.profiles TO service_role;

-- Stamp events so analytics can split by bucket (027 table)
ALTER TABLE public.episode_events
  ADD COLUMN IF NOT EXISTS paywall_variant TEXT
    CHECK (paywall_variant IS NULL OR paywall_variant IN ('paywall_after_1', 'paywall_after_2'));

ALTER TABLE public.episode_events
  ADD COLUMN IF NOT EXISTS visitor_id TEXT;

CREATE INDEX IF NOT EXISTS idx_episode_events_variant_type
  ON public.episode_events (paywall_variant, event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.paywall_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL UNIQUE,
  user_id UUID UNIQUE REFERENCES public.profiles (id) ON DELETE SET NULL,
  variant TEXT NOT NULL
    CHECK (variant IN ('paywall_after_1', 'paywall_after_2')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paywall_assignments_variant_created
  ON public.paywall_assignments (variant, created_at DESC);

ALTER TABLE public.paywall_assignments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.paywall_assignments FROM anon, authenticated;
GRANT ALL ON public.paywall_assignments TO service_role;

COMMENT ON TABLE public.paywall_assignments IS
  'Sticky paywall A/B assignments. Service-role only; variant is never user-writable.';
