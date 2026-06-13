-- Phase 2: Stripe subscriptions

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_id
  ON public.profiles (subscription_id)
  WHERE subscription_id IS NOT NULL;

-- Extend plan enum for intro billing periods
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS '1week';
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS '2week';
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS '1month';

-- Lock Stripe-managed profile columns from client updates
REVOKE UPDATE (stripe_customer_id, subscription_id)
  ON public.profiles
  FROM authenticated, anon;

GRANT UPDATE (stripe_customer_id, subscription_id)
  ON public.profiles
  TO service_role;
