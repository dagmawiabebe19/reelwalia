-- Extend series status for content slate + seed Coming Soon series

ALTER TYPE public.series_status ADD VALUE IF NOT EXISTS 'coming_soon';
ALTER TYPE public.series_status ADD VALUE IF NOT EXISTS 'in_development';

-- Ensure REDBIRD stays published
UPDATE public.series
SET status = 'published'
WHERE slug = 'redbird'
   OR lower(title) = 'redbird';

-- Coming Soon slate (no episodes; poster_url null — UI renders placeholder art)
INSERT INTO public.series (
  title,
  slug,
  description,
  genre,
  status,
  total_episodes,
  is_featured,
  view_count
)
VALUES
  (
    'ECHOES OF ADDIS',
    'echoes-of-addis',
    'An Ethiopian-American woman returns to Addis Ababa after twenty years to claim a family inheritance, only to discover the truth about her father was hidden for a reason.',
    ARRAY['Drama'],
    'coming_soon',
    0,
    false,
    0
  ),
  (
    'CROWN OF ASHES',
    'crown-of-ashes',
    'When a successful attorney discovers her mother''s death wasn''t an accident, she risks her career to expose the family that destroyed her.',
    ARRAY['Thriller', 'Drama'],
    'coming_soon',
    0,
    false,
    0
  ),
  (
    'MIDNIGHT CONTRACT',
    'midnight-contract',
    'She signed away her freedom for one year of his protection. Now she''s falling for the man who owns her contract — and the people he runs from want her gone.',
    ARRAY['Romance', 'Thriller'],
    'coming_soon',
    0,
    false,
    0
  ),
  (
    'SHEBA RISING',
    'sheba-rising',
    'Before she was queen, she was a refugee. The origin story of Sheba, told for the first time.',
    ARRAY['Historical Drama'],
    'coming_soon',
    0,
    false,
    0
  ),
  (
    'DESSIE NIGHTS',
    'dessie-nights',
    'Two strangers from the diaspora meet in Dessie for one summer. Neither expects to leave changed.',
    ARRAY['Romance'],
    'coming_soon',
    0,
    false,
    0
  ),
  (
    'HARLEM CROWN',
    'harlem-crown',
    'Three generations of a Harlem family confront the legacy of a secret that''s tearing them apart.',
    ARRAY['Drama'],
    'coming_soon',
    0,
    false,
    0
  )
ON CONFLICT (slug) DO NOTHING;
