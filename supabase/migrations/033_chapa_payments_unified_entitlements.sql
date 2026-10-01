-- ---------------------------------------------------------------------------
-- 033 — Chapa (Telebirr / Ethiopian payments) + unified entitlements
--
-- MANUAL APPLY: run in Platform Supabase SQL editor (joqibhmmegycfadipnki)
-- AFTER 032. Do NOT auto-apply.
--
-- Model:
--   subscriptions = unified entitlement table for both providers.
--     provider = 'stripe' → driven by Stripe subscription lifecycle (unchanged).
--     provider = 'chapa'  → one row per user; period-based pass, extended on
--                           each verified payment. No automatic recurring charge.
--   payments = provider-agnostic transaction ledger (pending → success/failed).
--   processed_webhook_events = webhook replay dedupe.
--
-- RLS: users may read their own subscriptions (existing policy). payments and
-- processed_webhook_events are service-role only. All writes are service-role.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- subscriptions: provider column + Chapa reference
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS chapa_tx_ref TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_provider_check'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_provider_check
      CHECK (provider IN ('stripe', 'chapa'));
  END IF;
END $$;

-- One Chapa pass row per user (extended on renewal).
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_chapa_user
  ON public.subscriptions (user_id)
  WHERE provider = 'chapa';

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_provider
  ON public.subscriptions (user_id, provider);

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON public.subscriptions (current_period_end);

-- Users must never write entitlements (RLS has no write policies; belt + braces).
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- payments ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'chapa')),
  -- Chapa: our tx_ref. Stripe: invoice id.
  provider_tx_ref TEXT NOT NULL,
  -- Chapa: Chapa reference (ref_id). Stripe: payment_intent / charge id.
  provider_payment_id TEXT,
  plan TEXT NOT NULL,
  -- Minor units (ETB santim / USD cents). Expected amount at creation.
  amount_minor INT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL,
  period_days INT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'canceled', 'refunded', 'reversed')),
  episode_id UUID REFERENCES public.episodes (id) ON DELETE SET NULL,
  failure_reason TEXT,
  raw_event JSONB,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_payments_provider_tx_ref UNIQUE (provider, provider_tx_ref)
);

CREATE INDEX IF NOT EXISTS idx_payments_user
  ON public.payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_tx_ref
  ON public.payments (provider_tx_ref);
CREATE INDEX IF NOT EXISTS idx_payments_status_created
  ON public.payments (status, created_at DESC);

DROP TRIGGER IF EXISTS payments_updated_at ON public.payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payments FROM anon, authenticated;
GRANT ALL ON public.payments TO service_role;

-- ---------------------------------------------------------------------------
-- webhook replay dedupe
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'chapa')),
  event_id TEXT NOT NULL,
  event_type TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_processed_webhook_events UNIQUE (provider, event_id)
);

ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.processed_webhook_events FROM anon, authenticated;
GRANT ALL ON public.processed_webhook_events TO service_role;

-- ---------------------------------------------------------------------------
-- Atomic verify-then-grant for Chapa.
-- Flips the payment pending → success exactly once, then upserts the user's
-- Chapa pass: new end = max(now, current active end) + period_days.
-- Returns granted=false when the payment was already processed (idempotent).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_chapa_entitlement(
  p_payment_id UUID,
  p_provider_payment_id TEXT,
  p_raw_event JSONB
)
RETURNS TABLE (granted BOOLEAN, period_end TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_end TIMESTAMPTZ;
BEGIN
  UPDATE public.payments
     SET status = 'success',
         provider_payment_id = COALESCE(p_provider_payment_id, provider_payment_id),
         raw_event = COALESCE(p_raw_event, raw_event),
         verified_at = NOW(),
         failure_reason = NULL
   WHERE id = p_payment_id
     AND provider = 'chapa'
     AND status IN ('pending', 'failed', 'canceled')
  RETURNING * INTO v_payment;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_payment.user_id IS NULL OR v_payment.period_days IS NULL OR v_payment.period_days <= 0 THEN
    RAISE EXCEPTION 'grant_chapa_entitlement: payment % missing user or period', p_payment_id;
  END IF;

  INSERT INTO public.subscriptions (
    user_id, provider, plan, status,
    current_period_start, current_period_end, chapa_tx_ref, cancel_at_period_end
  )
  VALUES (
    v_payment.user_id, 'chapa', v_payment.plan::public.subscription_plan, 'active',
    NOW(), NOW() + make_interval(days => v_payment.period_days),
    v_payment.provider_tx_ref, TRUE
  )
  ON CONFLICT (user_id) WHERE provider = 'chapa'
  DO UPDATE SET
    plan = EXCLUDED.plan,
    status = 'active',
    current_period_start = CASE
      WHEN public.subscriptions.status = 'active'
        AND public.subscriptions.current_period_end > NOW()
      THEN public.subscriptions.current_period_start
      ELSE NOW()
    END,
    current_period_end = GREATEST(
      NOW(),
      CASE WHEN public.subscriptions.status = 'active'
        THEN public.subscriptions.current_period_end END
    ) + make_interval(days => v_payment.period_days),
    chapa_tx_ref = EXCLUDED.chapa_tx_ref,
    cancel_at_period_end = TRUE
  RETURNING current_period_end INTO v_end;

  RETURN QUERY SELECT TRUE, v_end;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_chapa_entitlement(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_chapa_entitlement(UUID, TEXT, JSONB) TO service_role;

COMMENT ON TABLE public.payments IS
  'Provider-agnostic payment ledger (Stripe + Chapa). Service-role only.';
COMMENT ON TABLE public.processed_webhook_events IS
  'Webhook replay dedupe. Service-role only.';
COMMENT ON COLUMN public.subscriptions.provider IS
  'stripe = recurring Stripe subscription; chapa = period-based pass (no auto-renew).';
