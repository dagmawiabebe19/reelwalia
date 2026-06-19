# Supabase migrations — ReelWalia

## Production workflow (required)

This project applies schema changes to **production manually** via the Supabase Dashboard **SQL Editor**.

After adding or changing any file in `supabase/migrations/`:

1. Copy the migration SQL (or a consolidated script) into the **SQL Editor** and run it on production.
2. Record the migration in history so `supabase db push` does not re-run it:
   - Run `supabase/scripts/reconcile-*.sql` if provided, **or**
   - `supabase migration repair <version> --status applied --linked` (version = filename without `.sql`, e.g. `019_reconcile_creator_submissions_migration_history`)

**Skipping the SQL Editor step is the most common cause of production failures** (e.g. `/submit` failing because `creator_submissions` does not exist).

## Local / CLI

- Migration version = filename without extension (e.g. `005_creator_submissions`).
- Applied versions are stored in `supabase_migrations.schema_migrations`.
- `019_reconcile_creator_submissions_migration_history.sql` marks 005 and 013–018 as applied after manual prod setup.
