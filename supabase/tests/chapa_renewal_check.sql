-- ---------------------------------------------------------------------------
-- Manual check for grant_chapa_entitlement (migration 033) renewal math.
-- Safe to run in the Supabase SQL editor: everything happens inside a
-- transaction that is ROLLED BACK at the end. Not a migration.
--
-- Asserts:
--   1. Active pass (ends in 10 days) + 7-day plan → ends in 17 days.
--   2. Expired pass (ended 10 days ago)  + 7-day plan → ends in 7 days from now.
--   3. Applying the same payment twice grants once and adds days once.
-- Expect three "PASS" notices; any failure raises an exception.
-- ---------------------------------------------------------------------------
BEGIN;

DO $$
DECLARE
  v_user UUID;
  v_pay1 UUID;
  v_pay2 UUID;
  v_end TIMESTAMPTZ;
  v_granted BOOLEAN;
BEGIN
  SELECT id INTO v_user FROM public.profiles LIMIT 1;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Need at least one profile row to run this check';
  END IF;

  DELETE FROM public.subscriptions WHERE user_id = v_user AND provider = 'chapa';

  -- 1. Active pass stacks forward from its end date.
  INSERT INTO public.subscriptions (user_id, provider, plan, status, current_period_start, current_period_end)
  VALUES (v_user, 'chapa', '1week', 'active', NOW() - INTERVAL '4 days', NOW() + INTERVAL '10 days');

  INSERT INTO public.payments (user_id, provider, provider_tx_ref, plan, amount_minor, currency, period_days, status)
  VALUES (v_user, 'chapa', 'rw-test-renew-active', '1week', 15000, 'ETB', 7, 'pending')
  RETURNING id INTO v_pay1;

  SELECT granted, period_end INTO v_granted, v_end
    FROM public.grant_chapa_entitlement(v_pay1, 'ref-1', NULL);
  IF NOT v_granted OR abs(extract(epoch FROM (v_end - (NOW() + INTERVAL '17 days')))) > 5 THEN
    RAISE EXCEPTION 'FAIL active-extend: granted=%, end=%', v_granted, v_end;
  END IF;
  RAISE NOTICE 'PASS active pass extends from its current end (%)', v_end;

  -- 3. Same payment again: no second grant, no extra days.
  SELECT granted INTO v_granted FROM public.grant_chapa_entitlement(v_pay1, 'ref-1', NULL);
  SELECT current_period_end INTO v_end FROM public.subscriptions
   WHERE user_id = v_user AND provider = 'chapa';
  IF v_granted OR abs(extract(epoch FROM (v_end - (NOW() + INTERVAL '17 days')))) > 5 THEN
    RAISE EXCEPTION 'FAIL grant-once: granted=%, end=%', v_granted, v_end;
  END IF;
  RAISE NOTICE 'PASS replayed payment grants once and adds days once';

  -- 2. Expired pass renews from now.
  UPDATE public.subscriptions
     SET status = 'expired', current_period_end = NOW() - INTERVAL '10 days'
   WHERE user_id = v_user AND provider = 'chapa';

  INSERT INTO public.payments (user_id, provider, provider_tx_ref, plan, amount_minor, currency, period_days, status)
  VALUES (v_user, 'chapa', 'rw-test-renew-expired', '1week', 15000, 'ETB', 7, 'pending')
  RETURNING id INTO v_pay2;

  SELECT granted, period_end INTO v_granted, v_end
    FROM public.grant_chapa_entitlement(v_pay2, 'ref-2', NULL);
  IF NOT v_granted OR abs(extract(epoch FROM (v_end - (NOW() + INTERVAL '7 days')))) > 5 THEN
    RAISE EXCEPTION 'FAIL expired-renew: granted=%, end=%', v_granted, v_end;
  END IF;
  RAISE NOTICE 'PASS expired pass renews from now (%)', v_end;
END
$$;

ROLLBACK;
