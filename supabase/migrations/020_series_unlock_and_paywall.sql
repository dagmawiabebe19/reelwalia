-- ---------------------------------------------------------------------------
-- 020 — One-time series unlock + paywall-at-episode-5 + cliffhanger hooks
--
-- MANUAL APPLY (flagged): review before running against production.
--
-- 1. series_purchases: durable, buyer-scoped record of a one-time "unlock all
--    episodes of this series" purchase. Written ONLY by the Stripe webhook
--    (service_role); readable by the owner. Mirrors the subscriptions table
--    discipline: RLS select-own, no client writes.
-- 2. cliffhanger_hook: optional per-series / per-episode marketing line shown
--    in the paywall modal.
-- 3. Move the default paywall to the end of episode 5 (episodes 1-5 free).
-- ---------------------------------------------------------------------------

-- --- 1. one-time series purchases ------------------------------------------
CREATE TABLE IF NOT EXISTS public.series_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES public.series (id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_total INT,
  currency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, series_id)
);

CREATE INDEX IF NOT EXISTS idx_series_purchases_user
  ON public.series_purchases (user_id);
CREATE INDEX IF NOT EXISTS idx_series_purchases_series
  ON public.series_purchases (series_id);

ALTER TABLE public.series_purchases ENABLE ROW LEVEL SECURITY;

-- Read own purchases; all writes go through service_role (webhook).
DROP POLICY IF EXISTS "series_purchases_select_own" ON public.series_purchases;
CREATE POLICY "series_purchases_select_own"
  ON public.series_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- --- 2. cliffhanger hook copy ----------------------------------------------
ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS cliffhanger_hook TEXT;

ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS cliffhanger_hook TEXT;

-- --- 3. paywall at end of episode 5 ----------------------------------------
-- New product default: first 5 episodes free for every published series.
UPDATE public.series
SET free_episode_count = 5
WHERE free_episode_count IS DISTINCT FROM 5;

-- Keep episodes.is_free in sync with the new free window.
UPDATE public.episodes AS e
SET is_free = (e.episode_number <= s.free_episode_count)
FROM public.series AS s
WHERE e.series_id = s.id;
