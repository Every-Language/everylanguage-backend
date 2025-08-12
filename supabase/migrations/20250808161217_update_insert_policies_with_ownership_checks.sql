-- Update INSERT Policies with Ownership Checks
-- This migration updates all INSERT policies to enforce ownership through created_by = auth.uid()
-- instead of just checking auth.role() = 'authenticated', and updates projects SELECT policy
-- ============================================================================
-- ============================================================================
-- STEP 1: Update projects SELECT policy to show only own projects
-- ============================================================================
DROP POLICY if EXISTS "Users can view projects" ON public.projects;


CREATE POLICY "Users can view own projects" ON public.projects FOR
SELECT
  USING (created_by = auth.uid ());


-- ============================================================================
-- STEP 2: Update INSERT policies to enforce created_by = auth.uid()
-- ============================================================================
-- Update tags INSERT policy
DROP POLICY if EXISTS "Authenticated users can insert tags" ON tags;


CREATE POLICY "Users can insert their own tags" ON tags FOR insert
WITH
  CHECK (created_by = auth.uid ());


-- Update media_files_tags INSERT policy
DROP POLICY if EXISTS "Authenticated users can insert media_files_tags" ON media_files_tags;


CREATE POLICY "Users can insert their own media_files_tags" ON media_files_tags FOR insert
WITH
  CHECK (created_by = auth.uid ());


-- Update media_files INSERT policy
DROP POLICY if EXISTS "Authenticated users can insert media_files" ON media_files;


CREATE POLICY "Users can insert their own media_files" ON media_files FOR insert
WITH
  CHECK (created_by = auth.uid ());


-- Update media_files_targets INSERT policy
DROP POLICY if EXISTS "Authenticated users can insert media_files_targets" ON media_files_targets;


CREATE POLICY "Users can insert their own media_files_targets" ON media_files_targets FOR insert
WITH
  CHECK (created_by = auth.uid ());


-- Update media_files_verses INSERT policy
DROP POLICY if EXISTS "Authenticated users can insert media_files_verses" ON media_files_verses;


CREATE POLICY "Users can insert their own media_files_verses" ON media_files_verses FOR insert
WITH
  CHECK (created_by = auth.uid ());


-- Update verse_texts INSERT policy
DROP POLICY if EXISTS "Authenticated users can insert verse_texts" ON verse_texts;


CREATE POLICY "Users can insert their own verse_texts" ON verse_texts FOR insert
WITH
  CHECK (created_by = auth.uid ());


-- Update text_versions INSERT policy
DROP POLICY if EXISTS "Authenticated users can insert text_versions" ON text_versions;


CREATE POLICY "Users can insert their own text_versions" ON text_versions FOR insert
WITH
  CHECK (created_by = auth.uid ());


DROP POLICY if EXISTS "Authenticated users can insert bible_versions" ON bible_versions;


DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bible_versions' AND column_name = 'created_by'
  ) THEN
    CREATE POLICY "Users can insert their own bible_versions" ON bible_versions FOR INSERT
    WITH CHECK (created_by = auth.uid());
  END IF;
END $$;


DROP POLICY if EXISTS "Authenticated users can insert passages" ON passages;


CREATE POLICY "Users can insert their own passages" ON passages FOR insert
WITH
  CHECK (created_by = auth.uid ());


DROP POLICY if EXISTS "Authenticated users can insert regions" ON regions;


DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'created_by'
  ) THEN
    CREATE POLICY "Users can insert their own regions" ON regions FOR INSERT
    WITH CHECK (created_by = auth.uid());
  END IF;
END $$;


DROP POLICY if EXISTS "Authenticated users can insert region_aliases" ON region_aliases;


DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'region_aliases' AND column_name = 'created_by'
  ) THEN
    CREATE POLICY "Users can insert their own region_aliases" ON region_aliases FOR INSERT
    WITH CHECK (created_by = auth.uid());
  END IF;
END $$;


DROP POLICY if EXISTS "Authenticated users can insert region_sources" ON region_sources;


CREATE POLICY "Users can insert their own region_sources" ON region_sources FOR insert
WITH
  CHECK (created_by = auth.uid ());


DROP POLICY if EXISTS "Authenticated users can insert region_properties" ON region_properties;


DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'region_properties' AND column_name = 'created_by'
  ) THEN
    CREATE POLICY "Users can insert their own region_properties" ON region_properties FOR INSERT
    WITH CHECK (created_by = auth.uid());
  END IF;
END $$;


DROP POLICY if EXISTS "Authenticated users can insert language_entities_regions" ON language_entities_regions;


DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'language_entities_regions' AND column_name = 'created_by'
  ) THEN
    CREATE POLICY "Users can insert their own language_entities_regions" ON language_entities_regions FOR INSERT
    WITH CHECK (created_by = auth.uid());
  END IF;
END $$;


DROP POLICY if EXISTS "Authenticated users can insert language_entity_sources" ON language_entity_sources;


CREATE POLICY "Users can insert their own language_entity_sources" ON language_entity_sources FOR insert
WITH
  CHECK (created_by = auth.uid ());


DROP POLICY if EXISTS "Authenticated users can insert language_aliases" ON language_aliases;


DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'language_aliases' AND column_name = 'created_by'
  ) THEN
    CREATE POLICY "Users can insert their own language_aliases" ON language_aliases FOR INSERT
    WITH CHECK (created_by = auth.uid());
  END IF;
END $$;


DROP POLICY if EXISTS "Authenticated users can insert language_properties" ON language_properties;


DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'language_properties' AND column_name = 'created_by'
  ) THEN
    CREATE POLICY "Users can insert their own language_properties" ON language_properties FOR INSERT
    WITH CHECK (created_by = auth.uid());
  END IF;
END $$;


DROP POLICY if EXISTS "Authenticated users can insert user_custom_texts" ON user_custom_texts;


CREATE POLICY "Users can insert their own user_custom_texts" ON user_custom_texts FOR insert
WITH
  CHECK (created_by = auth.uid ());


DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_positions'
  ) THEN
    DROP POLICY IF EXISTS "Authenticated users can insert user_positions" ON user_positions;
    CREATE POLICY "Users can insert their own user_positions" ON user_positions FOR INSERT
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;


DROP POLICY if EXISTS "Authenticated users can insert user_bookmarks" ON user_bookmarks;


CREATE POLICY "Users can insert their own user_bookmarks" ON user_bookmarks FOR insert
WITH
  CHECK (user_id = auth.uid ());


DROP POLICY if EXISTS "Authenticated users can insert playlist_items" ON playlist_items;


CREATE POLICY "Users can insert their own playlist_items" ON playlist_items FOR insert
WITH
  CHECK (created_by = auth.uid ());


DROP POLICY if EXISTS "Authenticated users can insert user_bookmark_folders" ON user_bookmark_folders;


CREATE POLICY "Users can insert their own user_bookmark_folders" ON user_bookmark_folders FOR insert
WITH
  CHECK (user_id = auth.uid ());


DROP POLICY if EXISTS "Authenticated users can insert playlists" ON playlists;


CREATE POLICY "Users can insert their own playlists" ON playlists FOR insert
WITH
  CHECK (created_by = auth.uid ());


DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'playlists_playlist_groups'
  ) THEN
    DROP POLICY IF EXISTS "Authenticated users can insert playlists_playlist_groups" ON playlists_playlist_groups;
    CREATE POLICY "Users can insert their own playlists_playlist_groups" ON playlists_playlist_groups FOR INSERT
    WITH CHECK (created_by = auth.uid());
  END IF;
END $$;


DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'playlist_groups'
  ) THEN
    DROP POLICY IF EXISTS "Authenticated users can insert playlist_groups" ON playlist_groups;
    CREATE POLICY "Users can insert their own playlist_groups" ON playlist_groups FOR INSERT
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;


-- Note: projects INSERT policy is already correct (created_by = auth.uid())
-- Update sequences INSERT policy
DROP POLICY if EXISTS "Authenticated users can insert sequences" ON sequences;


CREATE POLICY "Users can insert their own sequences" ON sequences FOR insert
WITH
  CHECK (created_by = auth.uid ());


DROP POLICY if EXISTS "Authenticated users can insert sequences_tags" ON sequences_tags;


DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sequences_tags' AND column_name = 'created_by'
  ) THEN
    CREATE POLICY "Users can insert their own sequences_tags" ON sequences_tags FOR INSERT
    WITH CHECK (created_by = auth.uid());
  END IF;
END $$;


DROP POLICY if EXISTS "Authenticated users can insert sequences_targets" ON sequences_targets;


CREATE POLICY "Users can insert their own sequences_targets" ON sequences_targets FOR insert
WITH
  CHECK (created_by = auth.uid ());


DROP POLICY if EXISTS "Authenticated users can insert sequences_segments" ON sequences_segments;


DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sequences_segments' AND column_name = 'created_by'
  ) THEN
    CREATE POLICY "Users can insert their own sequences_segments" ON sequences_segments FOR INSERT
    WITH CHECK (created_by = auth.uid());
  END IF;
END $$;


DROP POLICY if EXISTS "Authenticated users can insert segments" ON segments;


CREATE POLICY "Users can insert their own segments" ON segments FOR insert
WITH
  CHECK (created_by = auth.uid ());


DROP POLICY if EXISTS "Authenticated users can insert segments_targets" ON segments_targets;


CREATE POLICY "Users can insert their own segments_targets" ON segments_targets FOR insert
WITH
  CHECK (created_by = auth.uid ());


DROP POLICY if EXISTS "Authenticated users can insert region_versions" ON region_versions;


CREATE POLICY "Users can insert their own region_versions" ON region_versions FOR insert
WITH
  CHECK (changed_by = auth.uid ());


DROP POLICY if EXISTS "Authenticated users can insert language_entity_versions" ON language_entity_versions;


CREATE POLICY "Users can insert their own language_entity_versions" ON language_entity_versions FOR insert
WITH
  CHECK (changed_by = auth.uid ());


DROP POLICY if EXISTS "Authenticated users can insert user_contributions" ON user_contributions;


CREATE POLICY "Users can insert their own user_contributions" ON user_contributions FOR insert
WITH
  CHECK (changed_by = auth.uid ());


-- Update verse_feedback INSERT policy
DROP POLICY if EXISTS "Authenticated users can insert verse_feedback" ON verse_feedback;


CREATE POLICY "Users can insert their own verse_feedback" ON verse_feedback FOR insert
WITH
  CHECK (created_by = auth.uid ());


-- ============================================================================
-- STEP 3: Update analytics table INSERT policies for user_id fields
-- ============================================================================
-- Update sessions INSERT policy (uses user_id instead of created_by)
DROP POLICY if EXISTS "Users can insert their own sessions" ON sessions;


CREATE POLICY "Users can insert their own sessions" ON sessions FOR insert
WITH
  CHECK (user_id = auth.uid ());


-- Update app_downloads INSERT policy (uses user_id instead of created_by)
DROP POLICY if EXISTS "Users can insert their own app downloads" ON app_downloads;


CREATE POLICY "Users can insert their own app downloads" ON app_downloads FOR insert
WITH
  CHECK (user_id = auth.uid ());


-- Update shares INSERT policy (uses user_id instead of created_by)
DROP POLICY if EXISTS "Users can insert their own shares" ON shares;


CREATE POLICY "Users can insert their own shares" ON shares FOR insert
WITH
  CHECK (user_id = auth.uid ());


-- Update share_opens INSERT policy (uses user_id instead of created_by)
DROP POLICY if EXISTS "Users can insert their own share_opens" ON share_opens;


CREATE POLICY "Users can insert their own share_opens" ON share_opens FOR insert
WITH
  CHECK (user_id = auth.uid ());


-- Update media_file_listens INSERT policy (uses user_id instead of created_by)
DROP POLICY if EXISTS "Users can insert their own media file listens" ON media_file_listens;


CREATE POLICY "Users can insert their own media file listens" ON media_file_listens FOR insert
WITH
  CHECK (user_id = auth.uid ());


-- Update verse_listens INSERT policy (uses user_id instead of created_by)
DROP POLICY if EXISTS "Users can insert their own verse listens" ON verse_listens;


CREATE POLICY "Users can insert their own verse listens" ON verse_listens FOR insert
WITH
  CHECK (user_id = auth.uid ());


-- Update chapter_listens INSERT policy (uses user_id instead of created_by)
-- Only create if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chapter_listens') THEN
    DROP POLICY IF EXISTS "Users can insert their own chapter listens" ON chapter_listens;
    CREATE POLICY "Users can insert their own chapter listens" ON chapter_listens FOR INSERT
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;


-- ============================================================================
-- STEP 4: Keep certain tables that don't have created_by columns unchanged
-- ============================================================================
-- Note: The following tables do not have created_by columns and should remain
-- with auth.role() = 'authenticated' checks if they need INSERT policies:
-- - books (Bible structure data)
-- - chapters (Bible structure data)  
-- - verses (Bible structure data)
-- - bible_versions (Bible structure data)
-- These are typically populated by admins/seeds, not regular users
-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON policy "Users can view own projects" ON public.projects IS 'Users can only view projects they created';


-- ============================================================================
-- ADDITIONAL NOTES
-- ============================================================================
-- Migration: 20250808161217_update_insert_policies_with_ownership_checks
-- 
-- Changes made:
-- 1. Updated projects SELECT policy to only show user's own projects
-- 2. Updated all INSERT policies that had auth.role() = 'authenticated' to use created_by = auth.uid()
-- 3. Updated analytics table INSERT policies to use user_id = auth.uid()
-- 4. Preserved Bible structure tables (books, chapters, verses) as admin-managed
-- 
-- Benefits:
-- - Enforces proper data ownership at the database level
-- - Prevents users from creating records on behalf of other users
-- - Maintains data isolation between users
-- - Improves security posture of the application
