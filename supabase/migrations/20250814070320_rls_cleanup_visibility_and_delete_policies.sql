-- RLS cleanup: enforce immutability of bible structure tables, tighten user visibility,
-- drop legacy/duplicate policies, add missing delete-owner policies, and standardize checks
-- ============================================================================
-- 1) Immutable bible structure tables: drop any non-SELECT policies
-- ============================================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, schemaname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('bible_versions','books','chapters','verses')
      AND cmd <> 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END$$;


-- Guard: remove older explicit policy names if they still exist
DROP POLICY if EXISTS "Authenticated users can insert bible_versions" ON public.bible_versions;


DROP POLICY if EXISTS "Users can insert their own bible_versions" ON public.bible_versions;


DROP POLICY if EXISTS "Authenticated users can insert books" ON public.books;


DROP POLICY if EXISTS "Authenticated users can insert chapters" ON public.chapters;


DROP POLICY if EXISTS "Authenticated users can insert verses" ON public.verses;


-- ============================================================================
-- 2) user_current_selections: owner-only read
-- ============================================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_current_selections' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_current_selections', r.policyname);
  END LOOP;
END$$;


CREATE POLICY "Users can view own current selections" ON public.user_current_selections FOR
SELECT
  USING (auth.uid () = user_id);


-- ============================================================================
-- 3) Drop user_custom_texts table (and its policies/trigger if present)
-- ============================================================================
-- Drop any policies first to avoid name collisions
DO $$
DECLARE r RECORD;
BEGIN
  IF to_regclass('public.user_custom_texts') IS NOT NULL THEN
    FOR r IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'user_custom_texts'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_custom_texts', r.policyname);
    END LOOP;

    -- Drop trigger if exists
    IF EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'user_custom_texts' AND t.tgname = 'update_user_custom_texts_updated_at'
    ) THEN
      DROP TRIGGER IF EXISTS update_user_custom_texts_updated_at ON public.user_custom_texts;
    END IF;

    -- Finally drop the table
    DROP TABLE public.user_custom_texts;
  END IF;
END$$;


-- ============================================================================
-- 4) Add owner-can-delete policies for public contributions WITHOUT soft-delete
--    Only add where a delete policy is missing
-- ============================================================================
-- media_files_targets (no deleted_at) – enforce owner-only delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'media_files_targets' AND cmd = 'DELETE'
  ) THEN
    CREATE POLICY "Users can delete own media_files_targets" ON public.media_files_targets FOR DELETE
    USING (created_by = auth.uid());
  END IF;
END$$;


-- playlists (no deleted_at) – ensure owner-only delete exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'playlists' AND cmd = 'DELETE'
  ) THEN
    CREATE POLICY "Users can delete own playlists" ON public.playlists FOR DELETE
    USING (created_by = auth.uid());
  END IF;
END$$;


-- playlists_playlist_groups (legacy table may not exist anymore); only attempt if present
DO $$
BEGIN
  IF to_regclass('public.playlists_playlist_groups') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'playlists_playlist_groups' AND column_name = 'created_by'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'playlists_playlist_groups' AND cmd = 'DELETE'
      ) THEN
        CREATE POLICY "Users can delete own playlists_playlist_groups" ON public.playlists_playlist_groups FOR DELETE
        USING (created_by = auth.uid());
      END IF;
    END IF;
  END IF;
END$$;


-- image_sets (no deleted_at) – ensure owner-only delete exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'image_sets' AND cmd = 'DELETE'
  ) THEN
    CREATE POLICY "Users can delete own image_sets" ON public.image_sets FOR DELETE
    USING (created_by = auth.uid());
  END IF;
END$$;


-- media_files_tags (no deleted_at) – ensure owner-only delete exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'media_files_tags' AND cmd = 'DELETE'
  ) THEN
    CREATE POLICY "Users can delete own media_files_tags" ON public.media_files_tags FOR DELETE
    USING (created_by = auth.uid());
  END IF;
END$$;


-- tags (no deleted_at) – ensure owner-only delete exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tags' AND cmd = 'DELETE'
  ) THEN
    CREATE POLICY "Users can delete own tags" ON public.tags FOR DELETE
    USING (created_by = auth.uid());
  END IF;
END$$;


-- passages (no deleted_at) – ensure owner-only delete exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'passages' AND cmd = 'DELETE'
  ) THEN
    CREATE POLICY "Users can delete own passages" ON public.passages FOR DELETE
    USING (created_by = auth.uid());
  END IF;
END$$;


-- sequences_segments (no deleted_at) – ensure owner-only delete exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sequences_segments' AND cmd = 'DELETE'
  ) THEN
    CREATE POLICY "Users can delete own sequences_segments" ON public.sequences_segments FOR DELETE
    USING (created_by = auth.uid());
  END IF;
END$$;


-- sequences_tags (no deleted_at) – ensure owner-only delete exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sequences_tags' AND cmd = 'DELETE'
  ) THEN
    CREATE POLICY "Users can delete own sequences_tags" ON public.sequences_tags FOR DELETE
    USING (created_by = auth.uid());
  END IF;
END$$;


-- ============================================================================
-- 5) Make projects visible to everyone (public SELECT)
-- ============================================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', r.policyname);
  END LOOP;
END$$;


CREATE POLICY "All users can view projects" ON public.projects FOR
SELECT
  USING (TRUE);


-- ============================================================================
-- 6) Remove redundant/duplicated insert policies (keep owner-checked ones)
--    Drop generic "Users can insert <table>" variants where "their own" exists
-- ============================================================================
-- Media tables
DROP POLICY if EXISTS "Users can insert media_files" ON public.media_files;


DROP POLICY if EXISTS "Users can insert media_files_tags" ON public.media_files_tags;


DROP POLICY if EXISTS "Users can insert media_files_targets" ON public.media_files_targets;


DROP POLICY if EXISTS "Users can insert media_files_verses" ON public.media_files_verses;


-- Text/Passages
DROP POLICY if EXISTS "Users can insert text_versions" ON public.text_versions;


DROP POLICY if EXISTS "Users can insert passages" ON public.passages;


-- Sequences/Segments
DROP POLICY if EXISTS "Users can insert sequences" ON public.sequences;


DROP POLICY if EXISTS "Users can insert sequences_segments" ON public.sequences_segments;


DROP POLICY if EXISTS "Users can insert sequences_tags" ON public.sequences_tags;


DROP POLICY if EXISTS "Users can insert sequences_targets" ON public.sequences_targets;


DROP POLICY if EXISTS "Users can insert segments" ON public.segments;


DROP POLICY if EXISTS "Users can insert segments_targets" ON public.segments_targets;


-- Playlists
DROP POLICY if EXISTS "Users can insert playlists" ON public.playlists;


DROP POLICY if EXISTS "Users can insert playlist_items" ON public.playlist_items;


-- Images
DROP POLICY if EXISTS "Users can insert images" ON public.images;


DROP POLICY if EXISTS "Users can insert image_sets" ON public.image_sets;


-- Versions (regions/languages)
DROP POLICY if EXISTS "Users can insert region_versions" ON public.region_versions;


DROP POLICY if EXISTS "Users can insert language_entity_versions" ON public.language_entity_versions;


-- ============================================================================
-- 7) Remove legacy authenticated role checks (replace with ownership checks)
-- ============================================================================
DROP POLICY if EXISTS "audio_versions_insert_auth" ON public.audio_versions;


DROP POLICY if EXISTS "Authenticated users can insert image_sets" ON public.image_sets;


DROP POLICY if EXISTS "Authenticated users can insert images" ON public.images;


DROP POLICY if EXISTS "Authenticated users can insert projects" ON public.projects;


DROP POLICY if EXISTS "Authenticated users can insert playlists" ON public.playlists;


DO $$
BEGIN
  IF to_regclass('public.playlists_playlist_groups') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Authenticated users can insert playlists_playlist_groups" ON public.playlists_playlist_groups;
  END IF;
END $$;


DO $$
BEGIN
  IF to_regclass('public.playlist_groups') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Authenticated users can insert playlist_groups" ON public.playlist_groups;
  END IF;
END $$;


DROP POLICY if EXISTS "Authenticated users can insert media_files" ON public.media_files;


DROP POLICY if EXISTS "Authenticated users can insert media_files_tags" ON public.media_files_tags;


DROP POLICY if EXISTS "Authenticated users can insert media_files_targets" ON public.media_files_targets;


DROP POLICY if EXISTS "Authenticated users can insert media_files_verses" ON public.media_files_verses;


DROP POLICY if EXISTS "Authenticated users can insert text_versions" ON public.text_versions;


DROP POLICY if EXISTS "Authenticated users can insert passages" ON public.passages;


DROP POLICY if EXISTS "Authenticated users can insert sequences" ON public.sequences;


DROP POLICY if EXISTS "Authenticated users can insert sequences_segments" ON public.sequences_segments;


DROP POLICY if EXISTS "Authenticated users can insert sequences_tags" ON public.sequences_tags;


DROP POLICY if EXISTS "Authenticated users can insert sequences_targets" ON public.sequences_targets;


DROP POLICY if EXISTS "Authenticated users can insert segments" ON public.segments;


DROP POLICY if EXISTS "Authenticated users can insert segments_targets" ON public.segments_targets;


-- ============================================================================
-- 8) Simplify consolidated SELECT policies that use "TRUE OR created_by = auth.uid()"
--    by replacing them with simple public read policies
-- ============================================================================
-- media_files
DROP POLICY if EXISTS "Consolidated view media_files" ON public.media_files;


DROP POLICY if EXISTS "Consolidated media_files view policy" ON public.media_files;


CREATE POLICY "All users can view media_files" ON public.media_files FOR
SELECT
  USING (TRUE);


-- media_files_tags
DROP POLICY if EXISTS "Consolidated view media_files_tags" ON public.media_files_tags;


CREATE POLICY "All users can view media_files_tags" ON public.media_files_tags FOR
SELECT
  USING (TRUE);


-- media_files_targets
DROP POLICY if EXISTS "Consolidated view media_files_targets" ON public.media_files_targets;


CREATE POLICY "All users can view media_files_targets" ON public.media_files_targets FOR
SELECT
  USING (TRUE);


-- media_files_verses
DROP POLICY if EXISTS "Consolidated view media_files_verses" ON public.media_files_verses;


CREATE POLICY "All users can view media_files_verses" ON public.media_files_verses FOR
SELECT
  USING (TRUE);


-- tags
DROP POLICY if EXISTS "Consolidated view tags" ON public.tags;


CREATE POLICY "All users can view tags" ON public.tags FOR
SELECT
  USING (TRUE);


-- passages
DROP POLICY if EXISTS "Consolidated view passages" ON public.passages;


DROP POLICY if EXISTS "Final consolidated view passages" ON public.passages;


CREATE POLICY "All users can view passages" ON public.passages FOR
SELECT
  USING (TRUE);


-- text_versions
DROP POLICY if EXISTS "Consolidated text_versions view policy" ON public.text_versions;


CREATE POLICY "All users can view text_versions" ON public.text_versions FOR
SELECT
  USING (TRUE);


-- NOTE: user_contributions remains public/readable as an audit log – no changes here
