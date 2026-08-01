-- ---------------------------------------------------------------------------
-- 024 — Chat usage counters (rate limits + daily caps)
--
-- ⚠️ MANUAL APPLY (flagged): run this in the PLATFORM Supabase SQL Editor.
-- Platform project ref: joqibhmmegycfadipnki (reelwalia.com / github.com/dagmawiabebe19/reelwalia)
-- Do NOT run against the Studio project (dxtieidijudvekuwljrs / reelwaliastudio).
--
-- Tables: chat_usage (per-user day + short windows), chat_usage_global (platform day)
-- RLS: enabled; no anon/authenticated access. Service role only (via SECURITY DEFINER RPC).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.chat_usage (
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  message_count INT NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  minute_window_start TIMESTAMPTZ,
  minute_count INT NOT NULL DEFAULT 0 CHECK (minute_count >= 0),
  hour_window_start TIMESTAMPTZ,
  hour_count INT NOT NULL DEFAULT 0 CHECK (hour_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_chat_usage_date
  ON public.chat_usage (usage_date);

CREATE TABLE IF NOT EXISTS public.chat_usage_global (
  usage_date DATE PRIMARY KEY,
  message_count INT NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_usage_global ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.chat_usage FROM anon, authenticated;
REVOKE ALL ON TABLE public.chat_usage_global FROM anon, authenticated;

-- No SELECT/INSERT/UPDATE policies for anon/authenticated — service_role bypasses RLS;
-- app code uses the SECURITY DEFINER RPC below (EXECUTE granted to service_role only).

CREATE OR REPLACE FUNCTION public.chat_try_consume_quota(
  p_user_id UUID,
  p_minute_limit INT,
  p_hour_limit INT,
  p_day_limit INT,
  p_global_day_limit INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := timezone('utc', now());
  v_date DATE := (v_now)::date;
  v_minute_start TIMESTAMPTZ := date_trunc('minute', v_now);
  v_hour_start TIMESTAMPTZ := date_trunc('hour', v_now);
  v_minute_count INT;
  v_hour_count INT;
  v_day_count INT;
  v_minute_window TIMESTAMPTZ;
  v_hour_window TIMESTAMPTZ;
  v_global INT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_user');
  END IF;

  INSERT INTO public.chat_usage (
    user_id,
    usage_date,
    message_count,
    minute_window_start,
    minute_count,
    hour_window_start,
    hour_count
  )
  VALUES (
    p_user_id,
    v_date,
    0,
    v_minute_start,
    0,
    v_hour_start,
    0
  )
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  INSERT INTO public.chat_usage_global (usage_date, message_count)
  VALUES (v_date, 0)
  ON CONFLICT (usage_date) DO NOTHING;

  SELECT
    message_count,
    minute_window_start,
    minute_count,
    hour_window_start,
    hour_count
  INTO
    v_day_count,
    v_minute_window,
    v_minute_count,
    v_hour_window,
    v_hour_count
  FROM public.chat_usage
  WHERE user_id = p_user_id AND usage_date = v_date
  FOR UPDATE;

  SELECT message_count
  INTO v_global
  FROM public.chat_usage_global
  WHERE usage_date = v_date
  FOR UPDATE;

  IF v_minute_window IS DISTINCT FROM v_minute_start THEN
    v_minute_window := v_minute_start;
    v_minute_count := 0;
  END IF;

  IF v_hour_window IS DISTINCT FROM v_hour_start THEN
    v_hour_window := v_hour_start;
    v_hour_count := 0;
  END IF;

  -- Global kill-switch (p_global_day_limit <= 0 means disabled)
  IF p_global_day_limit > 0 AND v_global >= p_global_day_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'global_daily',
      'day_count', v_day_count,
      'global_count', v_global
    );
  END IF;

  IF p_minute_limit > 0 AND v_minute_count >= p_minute_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'per_minute',
      'minute_count', v_minute_count
    );
  END IF;

  IF p_hour_limit > 0 AND v_hour_count >= p_hour_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'per_hour',
      'hour_count', v_hour_count
    );
  END IF;

  IF p_day_limit > 0 AND v_day_count >= p_day_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily',
      'day_count', v_day_count
    );
  END IF;

  UPDATE public.chat_usage
  SET
    message_count = v_day_count + 1,
    minute_window_start = v_minute_window,
    minute_count = v_minute_count + 1,
    hour_window_start = v_hour_window,
    hour_count = v_hour_count + 1,
    updated_at = v_now
  WHERE user_id = p_user_id AND usage_date = v_date;

  UPDATE public.chat_usage_global
  SET
    message_count = v_global + 1,
    updated_at = v_now
  WHERE usage_date = v_date;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', NULL,
    'day_count', v_day_count + 1,
    'global_count', v_global + 1,
    'minute_count', v_minute_count + 1,
    'hour_count', v_hour_count + 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.chat_try_consume_quota(UUID, INT, INT, INT, INT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_try_consume_quota(UUID, INT, INT, INT, INT)
  TO service_role;
