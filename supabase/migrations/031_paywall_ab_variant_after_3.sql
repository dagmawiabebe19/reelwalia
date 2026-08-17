-- ---------------------------------------------------------------------------
-- 031 — Paywall A/B Group C (paywall after episode 3)
--
-- MANUAL APPLY: run in Platform Supabase SQL editor (joqibhmmegycfadipnki)
-- AFTER 028_paywall_ab_variant.sql. Do NOT auto-apply.
--
-- Extends existing A/B buckets; does NOT backfill or reassign users.
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_paywall_variant_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_paywall_variant_check
    CHECK (paywall_variant IN ('paywall_after_1', 'paywall_after_2', 'paywall_after_3'));

ALTER TABLE public.episode_events
  DROP CONSTRAINT IF EXISTS episode_events_paywall_variant_check;

ALTER TABLE public.episode_events
  ADD CONSTRAINT episode_events_paywall_variant_check
    CHECK (
      paywall_variant IS NULL
      OR paywall_variant IN ('paywall_after_1', 'paywall_after_2', 'paywall_after_3')
    );

ALTER TABLE public.paywall_assignments
  DROP CONSTRAINT IF EXISTS paywall_assignments_variant_check;

ALTER TABLE public.paywall_assignments
  ADD CONSTRAINT paywall_assignments_variant_check
    CHECK (variant IN ('paywall_after_1', 'paywall_after_2', 'paywall_after_3'));
