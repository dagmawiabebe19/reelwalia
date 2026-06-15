-- Allow public read of Coming Soon series on the homepage catalog

DROP POLICY IF EXISTS "series_public_read" ON public.series;

CREATE POLICY "series_public_read"
  ON public.series FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'coming_soon'));
