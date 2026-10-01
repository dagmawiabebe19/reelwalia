-- ---------------------------------------------------------------------------
-- 034: Hide raw video locations from client-readable selects.
--
-- episodes.video_url (Bunny playlist URL) and episodes.bunny_video_id are no
-- longer readable by anon/authenticated. Playable URLs are issued server-side
-- only, as short-lived Bunny-signed URLs (GET /api/episodes/[id]/stream and
-- server-rendered pages), after the free-episode / active-access check.
--
-- Row visibility is unchanged (episodes_public_read: published series only).
-- Every other column stays readable so the catalog, feed and paywall UI work.
-- service_role keeps full access (it bypasses RLS and keeps its table grant).
--
-- NOTE: column-level grants do not cover columns added later. If you add a
-- column to episodes that the app reads with the anon/user key, also run:
--   GRANT SELECT (new_column) ON public.episodes TO anon, authenticated;
-- PostgREST `select=*` on episodes with the anon/user key will now fail —
-- always list columns explicitly.
-- ---------------------------------------------------------------------------

REVOKE SELECT ON public.episodes FROM anon, authenticated;

DO $$
DECLARE
  cols TEXT;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'episodes'
     AND column_name NOT IN ('video_url', 'bunny_video_id');

  EXECUTE format('GRANT SELECT (%s) ON public.episodes TO anon, authenticated', cols);
END
$$;

GRANT ALL ON public.episodes TO service_role;

-- Verify (should list every column except video_url and bunny_video_id):
--   SELECT column_name FROM information_schema.column_privileges
--    WHERE table_schema = 'public' AND table_name = 'episodes'
--      AND grantee = 'anon' AND privilege_type = 'SELECT';
