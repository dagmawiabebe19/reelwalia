-- ---------------------------------------------------------------------------
-- 027 — Per-series analytics: watch/paywall events + billing ledger
--
-- MANUAL APPLY: run in Platform Supabase SQL editor (joqibhmmegycfadipnki).
-- Do NOT auto-apply.
--
-- RLS: authenticated/anon cannot read or write. Service role (admin dashboard,
-- webhooks, event ingest) is the only writer/reader.
-- ---------------------------------------------------------------------------

-- Watch / conversion events (append-only)
CREATE TABLE IF NOT EXISTS public.episode_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  series_id UUID NOT NULL REFERENCES public.series (id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.episodes (id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('start', 'progress', 'complete', 'paywall_hit', 'purchase')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_episode_events_series_created
  ON public.episode_events (series_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_episode_events_episode_type
  ON public.episode_events (episode_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_episode_events_user_series
  ON public.episode_events (user_id, series_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.episode_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.episode_events FROM anon, authenticated;
GRANT ALL ON public.episode_events TO service_role;

-- Stripe cash movements for licensor revenue-share math
CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  series_id UUID REFERENCES public.series (id) ON DELETE SET NULL,
  episode_id UUID REFERENCES public.episodes (id) ON DELETE SET NULL,
  stripe_invoice_id TEXT,
  stripe_charge_id TEXT,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('payment', 'refund')),
  amount_gross_cents INT NOT NULL DEFAULT 0,
  processing_fee_cents INT NOT NULL DEFAULT 0,
  tax_cents INT NOT NULL DEFAULT 0,
  app_store_cents INT NOT NULL DEFAULT 0,
  delivery_cents INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stripe_invoice_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_billing_events_created
  ON public.billing_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_series
  ON public.billing_events (series_id, created_at DESC);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.billing_events FROM anon, authenticated;
GRANT ALL ON public.billing_events TO service_role;

COMMENT ON TABLE public.episode_events IS
  'Append-only watch/paywall/purchase events for admin analytics. Service-role only.';
COMMENT ON TABLE public.billing_events IS
  'Stripe payment/refund ledger for per-series Net Revenue. Service-role only.';
