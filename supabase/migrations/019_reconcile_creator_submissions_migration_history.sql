-- Reconcile migration history for creator_submissions (applied manually in production).
-- Idempotent: safe on any environment. Does not run DDL.

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

-- PRODUCTION REMINDER: Every new migration file must also be applied manually
-- in Supabase Dashboard → SQL Editor before relying on it in prod. After manual
-- apply, either run this pattern for that version or use:
--   supabase migration repair <version> --status applied --linked
