-- ---------------------------------------------------------------------------
-- 032 — Add 'expired' to subscription_status (period-based Chapa passes)
--
-- MANUAL APPLY: run in Platform Supabase SQL editor (joqibhmmegycfadipnki)
-- BEFORE 033. Kept in its own file: a new enum value cannot be used in the
-- same transaction that adds it.
-- ---------------------------------------------------------------------------

ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'expired';
