-- ---------------------------------------------------------------------------
-- 036 — Correct the admin user id in commercials RLS (fixes upload 403)
--
-- MANUAL APPLY: run in Platform Supabase SQL editor (joqibhmmegycfadipnki)
-- AFTER 035. Do NOT auto-apply. Safe to re-run.
--
-- 035 hardcoded an admin user id that is not a user in
-- this project, so auth.uid() never matched and every admin write (storage
-- uploads included) failed with "new row violates row-level security policy".
--
-- The real admin is 0102934e-8fa3-4b72-b70d-01d1334febaa (same id as
-- ADMIN_USER_ID in lib/admin-id.ts). Policies now call one helper so the id
-- lives in exactly one place in the database.
--
-- The app itself now writes commercials rows and storage objects with the
-- service-role client (signed upload URLs + admin API routes), so these
-- policies are defence in depth for direct authenticated access.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_reelwalia_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT auth.uid() = '0102934e-8fa3-4b72-b70d-01d1334febaa'::uuid
$$;

REVOKE ALL ON FUNCTION public.is_reelwalia_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_reelwalia_admin() TO anon, authenticated, service_role;

-- commercials ---------------------------------------------------------------
DROP POLICY IF EXISTS "commercials_admin_select_all" ON public.commercials;
CREATE POLICY "commercials_admin_select_all"
  ON public.commercials FOR SELECT
  TO authenticated
  USING (public.is_reelwalia_admin());

DROP POLICY IF EXISTS "commercials_admin_insert" ON public.commercials;
CREATE POLICY "commercials_admin_insert"
  ON public.commercials FOR INSERT
  TO authenticated
  WITH CHECK (public.is_reelwalia_admin());

DROP POLICY IF EXISTS "commercials_admin_update" ON public.commercials;
CREATE POLICY "commercials_admin_update"
  ON public.commercials FOR UPDATE
  TO authenticated
  USING (public.is_reelwalia_admin())
  WITH CHECK (public.is_reelwalia_admin());

DROP POLICY IF EXISTS "commercials_admin_delete" ON public.commercials;
CREATE POLICY "commercials_admin_delete"
  ON public.commercials FOR DELETE
  TO authenticated
  USING (public.is_reelwalia_admin());

-- commercial_inquiries --------------------------------------------------------
DROP POLICY IF EXISTS "commercial_inquiries_admin_select" ON public.commercial_inquiries;
CREATE POLICY "commercial_inquiries_admin_select"
  ON public.commercial_inquiries FOR SELECT
  TO authenticated
  USING (public.is_reelwalia_admin());

DROP POLICY IF EXISTS "commercial_inquiries_admin_update" ON public.commercial_inquiries;
CREATE POLICY "commercial_inquiries_admin_update"
  ON public.commercial_inquiries FOR UPDATE
  TO authenticated
  USING (public.is_reelwalia_admin())
  WITH CHECK (public.is_reelwalia_admin());

-- storage: commercials bucket -------------------------------------------------
DROP POLICY IF EXISTS "commercials_storage_admin_insert" ON storage.objects;
CREATE POLICY "commercials_storage_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'commercials' AND public.is_reelwalia_admin());

DROP POLICY IF EXISTS "commercials_storage_admin_update" ON storage.objects;
CREATE POLICY "commercials_storage_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'commercials' AND public.is_reelwalia_admin())
  WITH CHECK (bucket_id = 'commercials' AND public.is_reelwalia_admin());

DROP POLICY IF EXISTS "commercials_storage_admin_delete" ON storage.objects;
CREATE POLICY "commercials_storage_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'commercials' AND public.is_reelwalia_admin());
