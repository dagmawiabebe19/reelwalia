-- ---------------------------------------------------------------------------
-- 035 — Commercials showcase (/ads) + commercial inquiries (B2B lead form)
--
-- MANUAL APPLY: run in Platform Supabase SQL editor (joqibhmmegycfadipnki)
-- AFTER 034. Do NOT auto-apply.
--
-- Naming: nothing here uses "ad"/"ads" (ad blockers block matching subresource
-- URLs). Bucket, tables, and object paths all use "commercial(s)".
--
-- Admin = auth user aade471f-9614-46b5-8238-53225c78b0f6.
--   commercials: public SELECT of published rows; admin full write.
--   commercial_inquiries: no public access. Inserts come from
--     POST /api/commercial-inquiries via the service-role client (bypasses RLS).
--     Admin may SELECT / UPDATE.
--   storage bucket `commercials`: public read; admin-only insert/update/delete
--     (uploads go browser → Supabase Storage directly as the admin user).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- commercials
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  client_name TEXT,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  aspect_ratio TEXT NOT NULL DEFAULT '9:16'
    CHECK (aspect_ratio IN ('9:16', '16:9', '1:1')),
  duration_seconds INT CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  category TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commercials_published_order_idx
  ON public.commercials (is_published, sort_order, created_at DESC);

ALTER TABLE public.commercials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commercials_public_read_published" ON public.commercials;
CREATE POLICY "commercials_public_read_published"
  ON public.commercials FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "commercials_admin_select_all" ON public.commercials;
CREATE POLICY "commercials_admin_select_all"
  ON public.commercials FOR SELECT
  TO authenticated
  USING (auth.uid() = 'aade471f-9614-46b5-8238-53225c78b0f6'::uuid);

DROP POLICY IF EXISTS "commercials_admin_insert" ON public.commercials;
CREATE POLICY "commercials_admin_insert"
  ON public.commercials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = 'aade471f-9614-46b5-8238-53225c78b0f6'::uuid);

DROP POLICY IF EXISTS "commercials_admin_update" ON public.commercials;
CREATE POLICY "commercials_admin_update"
  ON public.commercials FOR UPDATE
  TO authenticated
  USING (auth.uid() = 'aade471f-9614-46b5-8238-53225c78b0f6'::uuid)
  WITH CHECK (auth.uid() = 'aade471f-9614-46b5-8238-53225c78b0f6'::uuid);

DROP POLICY IF EXISTS "commercials_admin_delete" ON public.commercials;
CREATE POLICY "commercials_admin_delete"
  ON public.commercials FOR DELETE
  TO authenticated
  USING (auth.uid() = 'aade471f-9614-46b5-8238-53225c78b0f6'::uuid);

-- ---------------------------------------------------------------------------
-- commercial_inquiries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  budget_range TEXT CHECK (
    budget_range IS NULL OR budget_range IN (
      'Under $1,000', '$1,000–$3,000', '$3,000–$7,500', '$7,500+', 'Not sure yet'
    )
  ),
  timeline TEXT CHECK (
    timeline IS NULL OR timeline IN ('ASAP', '2–4 weeks', '1–2 months', 'Flexible')
  ),
  platforms TEXT[] NOT NULL DEFAULT '{}' CHECK (
    platforms <@ ARRAY['TikTok', 'Instagram', 'YouTube', 'Facebook', 'TV/Streaming', 'Other']::TEXT[]
  ),
  message TEXT NOT NULL,
  reference_commercial_id UUID REFERENCES public.commercials(id) ON DELETE SET NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'quoted', 'won', 'lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commercial_inquiries_created_idx
  ON public.commercial_inquiries (created_at DESC);

ALTER TABLE public.commercial_inquiries ENABLE ROW LEVEL SECURITY;

-- No anon/public policies: inserts happen server-side with the service role.
DROP POLICY IF EXISTS "commercial_inquiries_admin_select" ON public.commercial_inquiries;
CREATE POLICY "commercial_inquiries_admin_select"
  ON public.commercial_inquiries FOR SELECT
  TO authenticated
  USING (auth.uid() = 'aade471f-9614-46b5-8238-53225c78b0f6'::uuid);

DROP POLICY IF EXISTS "commercial_inquiries_admin_update" ON public.commercial_inquiries;
CREATE POLICY "commercial_inquiries_admin_update"
  ON public.commercial_inquiries FOR UPDATE
  TO authenticated
  USING (auth.uid() = 'aade471f-9614-46b5-8238-53225c78b0f6'::uuid)
  WITH CHECK (auth.uid() = 'aade471f-9614-46b5-8238-53225c78b0f6'::uuid);

-- ---------------------------------------------------------------------------
-- Storage: `commercials` bucket (public read, admin-only write)
-- 500 MB per object; videos + thumbnails only.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'commercials',
  'commercials',
  true,
  524288000,
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "commercials_storage_public_read" ON storage.objects;
CREATE POLICY "commercials_storage_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'commercials');

DROP POLICY IF EXISTS "commercials_storage_admin_insert" ON storage.objects;
CREATE POLICY "commercials_storage_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'commercials'
    AND auth.uid() = 'aade471f-9614-46b5-8238-53225c78b0f6'::uuid
  );

DROP POLICY IF EXISTS "commercials_storage_admin_update" ON storage.objects;
CREATE POLICY "commercials_storage_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'commercials'
    AND auth.uid() = 'aade471f-9614-46b5-8238-53225c78b0f6'::uuid
  );

DROP POLICY IF EXISTS "commercials_storage_admin_delete" ON storage.objects;
CREATE POLICY "commercials_storage_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'commercials'
    AND auth.uid() = 'aade471f-9614-46b5-8238-53225c78b0f6'::uuid
  );
