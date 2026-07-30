-- ---------------------------------------------------------------------------
-- 023 — AI Character Chat (Phase 1)
--
-- ⚠️ MANUAL APPLY (flagged): run this in the PLATFORM Supabase SQL Editor.
-- Platform project ref: joqibhmmegycfadipnki (reelwalia.com / github.com/dagmawiabebe19/reelwalia)
-- Do NOT run against the Studio project (dxtieidijudvekuwljrs / reelwaliastudio).
--
-- Tables: characters, character_bible, world_bible, chat_conversations,
--         chat_messages, relationship_scores
-- RLS: enabled on EVERY table. Anon has no access. Authenticated may read
--      character/world content; chat tables are own-row only via auth.uid().
-- ---------------------------------------------------------------------------

-- --- helpers ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- --- characters ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES public.series (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INT,
  role TEXT,
  short_bio TEXT,
  personality_summary TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_characters_series
  ON public.characters (series_id)
  WHERE is_active = TRUE;

-- --- character_bible (1:1) -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.character_bible (
  character_id UUID PRIMARY KEY REFERENCES public.characters (id) ON DELETE CASCADE,
  biography JSONB NOT NULL DEFAULT '{}'::jsonb,
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  family JSONB NOT NULL DEFAULT '[]'::jsonb,
  enemies JSONB NOT NULL DEFAULT '[]'::jsonb,
  allies JSONB NOT NULL DEFAULT '[]'::jsonb,
  past_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_motivations JSONB NOT NULL DEFAULT '[]'::jsonb,
  speech_examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  catchphrases JSONB NOT NULL DEFAULT '[]'::jsonb,
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  fears JSONB NOT NULL DEFAULT '[]'::jsonb,
  secrets JSONB NOT NULL DEFAULT '[]'::jsonb,
  emotional_tendencies JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Keys are episode numbers as strings: { "1": "...", "2": "..." }
  episode_knowledge JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- --- world_bible (1:1 per series) ------------------------------------------
CREATE TABLE IF NOT EXISTS public.world_bible (
  series_id UUID PRIMARY KEY REFERENCES public.series (id) ON DELETE CASCADE,
  world_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  locations JSONB NOT NULL DEFAULT '[]'::jsonb,
  important_objects JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- --- chat_conversations ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters (id) ON DELETE CASCADE,
  unlocked_through_episode INT NOT NULL DEFAULT 0,
  memory_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user
  ON public.chat_conversations (user_id, updated_at DESC);

DROP TRIGGER IF EXISTS chat_conversations_updated_at ON public.chat_conversations;
CREATE TRIGGER chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --- chat_messages ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'character')),
  content TEXT NOT NULL,
  bubble_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON public.chat_messages (conversation_id, created_at ASC);

-- --- relationship_scores (1:1) ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.relationship_scores (
  conversation_id UUID PRIMARY KEY REFERENCES public.chat_conversations (id) ON DELETE CASCADE,
  trust INT NOT NULL DEFAULT 0,
  friendship INT NOT NULL DEFAULT 0,
  romance INT NOT NULL DEFAULT 0,
  suspicion INT NOT NULL DEFAULT 0,
  respect INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS relationship_scores_updated_at ON public.relationship_scores;
CREATE TRIGGER relationship_scores_updated_at
  BEFORE UPDATE ON public.relationship_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===========================================================================
-- RLS — enable on EVERY table; revoke broad access; grant narrowly
-- ===========================================================================

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_bible ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_bible ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_scores ENABLE ROW LEVEL SECURITY;

-- Lock down defaults: no anon access; authenticated only what we grant below.
-- (service_role bypasses RLS and remains the only writer for bible/world.)
REVOKE ALL ON TABLE public.characters FROM anon, authenticated;
REVOKE ALL ON TABLE public.character_bible FROM anon, authenticated;
REVOKE ALL ON TABLE public.world_bible FROM anon, authenticated;
REVOKE ALL ON TABLE public.chat_conversations FROM anon, authenticated;
REVOKE ALL ON TABLE public.chat_messages FROM anon, authenticated;
REVOKE ALL ON TABLE public.relationship_scores FROM anon, authenticated;

GRANT SELECT ON TABLE public.characters TO authenticated;
GRANT SELECT ON TABLE public.character_bible TO authenticated;
GRANT SELECT ON TABLE public.world_bible TO authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.chat_conversations TO authenticated;
GRANT SELECT, INSERT ON TABLE public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.relationship_scores TO authenticated;

-- --- characters: authenticated read (active or any — filter is_active in app)
DROP POLICY IF EXISTS "characters_select_authenticated" ON public.characters;
CREATE POLICY "characters_select_authenticated"
  ON public.characters FOR SELECT
  TO authenticated
  USING (true);
-- No INSERT/UPDATE/DELETE policies → authenticated cannot write.
-- service_role writes via RLS bypass.

-- --- character_bible: authenticated read only
DROP POLICY IF EXISTS "character_bible_select_authenticated" ON public.character_bible;
CREATE POLICY "character_bible_select_authenticated"
  ON public.character_bible FOR SELECT
  TO authenticated
  USING (true);

-- --- world_bible: authenticated read only
DROP POLICY IF EXISTS "world_bible_select_authenticated" ON public.world_bible;
CREATE POLICY "world_bible_select_authenticated"
  ON public.world_bible FOR SELECT
  TO authenticated
  USING (true);

-- --- chat_conversations: own rows only
DROP POLICY IF EXISTS "chat_conversations_select_own" ON public.chat_conversations;
CREATE POLICY "chat_conversations_select_own"
  ON public.chat_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_conversations_insert_own" ON public.chat_conversations;
CREATE POLICY "chat_conversations_insert_own"
  ON public.chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_conversations_update_own" ON public.chat_conversations;
CREATE POLICY "chat_conversations_update_own"
  ON public.chat_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- --- chat_messages: via owned conversation
DROP POLICY IF EXISTS "chat_messages_select_own" ON public.chat_messages;
CREATE POLICY "chat_messages_select_own"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_messages_insert_own" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_own"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

-- --- relationship_scores: via owned conversation
DROP POLICY IF EXISTS "relationship_scores_select_own" ON public.relationship_scores;
CREATE POLICY "relationship_scores_select_own"
  ON public.relationship_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = relationship_scores.conversation_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "relationship_scores_insert_own" ON public.relationship_scores;
CREATE POLICY "relationship_scores_insert_own"
  ON public.relationship_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = relationship_scores.conversation_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "relationship_scores_update_own" ON public.relationship_scores;
CREATE POLICY "relationship_scores_update_own"
  ON public.relationship_scores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = relationship_scores.conversation_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = relationship_scores.conversation_id
        AND c.user_id = auth.uid()
    )
  );
