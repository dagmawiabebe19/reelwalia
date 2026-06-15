-- Ensure Coming Soon slate is not mixed into published catalog rows

UPDATE public.series
SET
  status = 'coming_soon',
  is_featured = false,
  total_episodes = 0
WHERE slug IN (
  'echoes-of-addis',
  'crown-of-ashes',
  'midnight-contract',
  'sheba-rising',
  'dessie-nights',
  'harlem-crown'
);
