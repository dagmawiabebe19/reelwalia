# Supabase migrations — ReelWalia

## Platform vs Studio

Migrations in this folder target the **Platform** Supabase project
(`joqibhmmegycfadipnki` — reelwalia.com / github.com/dagmawiabebe19/reelwalia).
Do **not** run them against the Studio project (`dxtieidijudvekuwljrs` / reelwaliastudio).

Manual-apply migrations to eyeball carefully:
- `024_chat_usage_limits.sql` — chat rate limits / daily caps / global kill-switch counters
- `023_ai_character_chat.sql` — AI character chat tables + RLS (Phase 1)
- `022_featured_order_backfill.sql` — featured_order backfill
- `021_episode_captions.sql` — captions
- `027_series_analytics_events.sql` — episode_events + billing_events (admin analytics)
- `028_paywall_ab_variant.sql` — paywall A/B variant column + assignments (after 027)

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
