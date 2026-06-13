-- Public poster / banner storage for ReelWalia admin uploads

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'posters',
  'posters',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "posters_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'posters');

CREATE POLICY "posters_service_upload"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'posters');

CREATE POLICY "posters_service_update"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'posters');

CREATE POLICY "posters_service_delete"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'posters');
