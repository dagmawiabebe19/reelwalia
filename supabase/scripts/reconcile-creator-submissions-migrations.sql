-- =============================================================================
-- PRODUCTION: Run this in Supabase Dashboard → SQL Editor
-- =============================================================================
-- creator_submissions was created manually via a consolidated script.
-- This marks migrations 005 and 013–018 as applied so `supabase db push`
-- will not re-run them.
--
-- Run ONCE on production, then run `supabase db push` (019 will apply safely).
-- =============================================================================

INSERT INTO supabase_migrations.schema_migrations (version)
VALUES
  ('005_creator_submissions'),
  ('013_creator_submission_project_type'),
  ('014_creator_submission_runtime_minutes'),
  ('015_submission_acquisition_fields'),
  ('016_creator_submission_custom_genre'),
  ('017_acquisition_workflow'),
  ('018_deal_terms')
ON CONFLICT (version) DO NOTHING;

-- Verify:
-- SELECT version FROM supabase_migrations.schema_migrations
-- WHERE version LIKE '005_%' OR version LIKE '01%'
-- ORDER BY version;
