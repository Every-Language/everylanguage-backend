-- Fix Critical Performance Issues - Comprehensive Corrective Migration
-- Addresses remaining Auth RLS and Multiple Permissive Policy issues
-- ============================================================================
-- ============================================================================
-- PHASE 1: FIX REMAINING AUTH RLS INITIALIZATION PLANS
-- ============================================================================
-- Fix policies still using auth.uid() without subquery optimization
DO $$ 
BEGIN
    -- Fix user_roles policies
    DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
    CREATE POLICY "Users can view own roles" ON user_roles FOR SELECT
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix permissions policies 
    DROP POLICY IF EXISTS "Users can view permissions for their roles" ON permissions;
    CREATE POLICY "Users can view permissions for their roles" ON permissions FOR SELECT
    USING (role_id IN (
        SELECT ur.role_id FROM user_roles ur
        JOIN public.users u ON ur.user_id = u.id 
        WHERE u.auth_uid = (select auth.uid())
    ));

    -- Fix passages policies
    DROP POLICY IF EXISTS "Users can view their own passages" ON passages;
    CREATE POLICY "Users can view their own passages" ON passages FOR SELECT
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix regions policies 
    DROP POLICY IF EXISTS "Authenticated users can insert regions" ON regions;
    CREATE POLICY "Authenticated users can insert regions" ON regions FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    -- Fix user_saved_versions policies
    DROP POLICY IF EXISTS "Users can view their own saved versions" ON user_saved_versions;
    CREATE POLICY "Users can view their own saved versions" ON user_saved_versions FOR SELECT
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix verse_texts policies
    DROP POLICY IF EXISTS "Users can view their own verse texts" ON verse_texts;
    CREATE POLICY "Users can view their own verse texts" ON verse_texts FOR SELECT
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix audio_versions policies
    DROP POLICY IF EXISTS "Users can view their own audio versions" ON audio_versions;
    CREATE POLICY "Users can view their own audio versions" ON audio_versions FOR SELECT
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix language/region insert policies that still use direct auth.uid()
    DROP POLICY IF EXISTS "Authenticated users can insert region_aliases" ON region_aliases;
    CREATE POLICY "Authenticated users can insert region_aliases" ON region_aliases FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Authenticated users can insert region_sources" ON region_sources;
    CREATE POLICY "Authenticated users can insert region_sources" ON region_sources FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Authenticated users can insert region_properties" ON region_properties;
    CREATE POLICY "Authenticated users can insert region_properties" ON region_properties FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Authenticated users can insert language_entity_sources" ON language_entity_sources;
    CREATE POLICY "Authenticated users can insert language_entity_sources" ON language_entity_sources FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Authenticated users can insert language_aliases" ON language_aliases;
    CREATE POLICY "Authenticated users can insert language_aliases" ON language_aliases FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Authenticated users can insert language_properties" ON language_properties;
    CREATE POLICY "Authenticated users can insert language_properties" ON language_properties FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    -- Fix user content policies
    DROP POLICY IF EXISTS "Authenticated users can insert user_custom_texts" ON user_custom_texts;
    CREATE POLICY "Authenticated users can insert user_custom_texts" ON user_custom_texts FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own user_custom_texts" ON user_custom_texts;
    CREATE POLICY "Users can view their own user_custom_texts" ON user_custom_texts FOR SELECT
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own user_custom_texts" ON user_custom_texts;
    CREATE POLICY "Users can update their own user_custom_texts" ON user_custom_texts FOR UPDATE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can delete their own user_custom_texts" ON user_custom_texts;
    CREATE POLICY "Users can delete their own user_custom_texts" ON user_custom_texts FOR DELETE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix user_positions policies
    DROP POLICY IF EXISTS "Authenticated users can insert user_positions" ON user_positions;
    CREATE POLICY "Authenticated users can insert user_positions" ON user_positions FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own user_positions" ON user_positions;
    CREATE POLICY "Users can view their own user_positions" ON user_positions FOR SELECT
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own user_positions" ON user_positions;
    CREATE POLICY "Users can update their own user_positions" ON user_positions FOR UPDATE
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can delete their own user_positions" ON user_positions;
    CREATE POLICY "Users can delete their own user_positions" ON user_positions FOR DELETE
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix user_bookmarks policies
    DROP POLICY IF EXISTS "Authenticated users can insert user_bookmarks" ON user_bookmarks;
    CREATE POLICY "Authenticated users can insert user_bookmarks" ON user_bookmarks FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own user_bookmarks" ON user_bookmarks;
    CREATE POLICY "Users can view their own user_bookmarks" ON user_bookmarks FOR SELECT
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own user_bookmarks" ON user_bookmarks;
    CREATE POLICY "Users can update their own user_bookmarks" ON user_bookmarks FOR UPDATE
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can delete their own user_bookmarks" ON user_bookmarks;
    CREATE POLICY "Users can delete their own user_bookmarks" ON user_bookmarks FOR DELETE
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix playlist-related policies
    DROP POLICY IF EXISTS "Authenticated users can insert playlist_items" ON playlist_items;
    CREATE POLICY "Authenticated users can insert playlist_items" ON playlist_items FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own playlist_items" ON playlist_items;
    CREATE POLICY "Users can view their own playlist_items" ON playlist_items FOR SELECT
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own playlist_items" ON playlist_items;
    CREATE POLICY "Users can update their own playlist_items" ON playlist_items FOR UPDATE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can delete their own playlist_items" ON playlist_items;
    CREATE POLICY "Users can delete their own playlist_items" ON playlist_items FOR DELETE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix user_bookmark_folders policies
    DROP POLICY IF EXISTS "Authenticated users can insert user_bookmark_folders" ON user_bookmark_folders;
    CREATE POLICY "Authenticated users can insert user_bookmark_folders" ON user_bookmark_folders FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own user_bookmark_folders" ON user_bookmark_folders;
    CREATE POLICY "Users can view their own user_bookmark_folders" ON user_bookmark_folders FOR SELECT
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own user_bookmark_folders" ON user_bookmark_folders;
    CREATE POLICY "Users can update their own user_bookmark_folders" ON user_bookmark_folders FOR UPDATE
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can delete their own user_bookmark_folders" ON user_bookmark_folders;
    CREATE POLICY "Users can delete their own user_bookmark_folders" ON user_bookmark_folders FOR DELETE
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix playlists policies
    DROP POLICY IF EXISTS "Authenticated users can insert playlists" ON playlists;
    CREATE POLICY "Authenticated users can insert playlists" ON playlists FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own playlists" ON playlists;
    CREATE POLICY "Users can view their own playlists" ON playlists FOR SELECT
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own playlists" ON playlists;
    CREATE POLICY "Users can update their own playlists" ON playlists FOR UPDATE
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can delete their own playlists" ON playlists;
    CREATE POLICY "Users can delete their own playlists" ON playlists FOR DELETE
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix playlist_groups policies
    DROP POLICY IF EXISTS "Authenticated users can insert playlist_groups" ON playlist_groups;
    CREATE POLICY "Authenticated users can insert playlist_groups" ON playlist_groups FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own playlist_groups" ON playlist_groups;
    CREATE POLICY "Users can view their own playlist_groups" ON playlist_groups FOR SELECT
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own playlist_groups" ON playlist_groups;
    CREATE POLICY "Users can update their own playlist_groups" ON playlist_groups FOR UPDATE
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can delete their own playlist_groups" ON playlist_groups;
    CREATE POLICY "Users can delete their own playlist_groups" ON playlist_groups FOR DELETE
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix projects policies
    DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
    CREATE POLICY "Authenticated users can insert projects" ON projects FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
    CREATE POLICY "Users can view their own projects" ON projects FOR SELECT
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
    CREATE POLICY "Users can update their own projects" ON projects FOR UPDATE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix sequences policies
    DROP POLICY IF EXISTS "Authenticated users can insert sequences" ON sequences;
    CREATE POLICY "Authenticated users can insert sequences" ON sequences FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own sequences" ON sequences;
    CREATE POLICY "Users can view their own sequences" ON sequences FOR SELECT
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own sequences" ON sequences;
    CREATE POLICY "Users can update their own sequences" ON sequences FOR UPDATE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix verse_feedback policies
    DROP POLICY IF EXISTS "Authenticated users can insert verse_feedback" ON verse_feedback;
    CREATE POLICY "Authenticated users can insert verse_feedback" ON verse_feedback FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can update their own verse_feedback" ON verse_feedback;
    CREATE POLICY "Users can update their own verse_feedback" ON verse_feedback FOR UPDATE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can delete their own verse_feedback" ON verse_feedback;
    CREATE POLICY "Users can delete their own verse_feedback" ON verse_feedback FOR DELETE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in Auth RLS fixes: %', SQLERRM;
END $$;


-- ============================================================================
-- PHASE 2: CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- ============================================================================
DO $$
BEGIN
    -- Fix language_entities_regions overlapping policies
    DROP POLICY IF EXISTS "All users can view language_entities_regions" ON language_entities_regions;
    DROP POLICY IF EXISTS "Users can view their own language_entities_regions" ON language_entities_regions;
    CREATE POLICY "Consolidated view language_entities_regions" ON language_entities_regions FOR SELECT
    USING (
        deleted_at IS NULL OR 
        created_by = (
            SELECT id FROM public.users 
            WHERE auth_uid = (select auth.uid())
        )
    );

    -- Fix regions overlapping policies
    DROP POLICY IF EXISTS "All users can view regions" ON regions;
    DROP POLICY IF EXISTS "Users can view their own regions" ON regions;
    CREATE POLICY "Consolidated view regions" ON regions FOR SELECT
    USING (
        deleted_at IS NULL OR 
        created_by = (
            SELECT id FROM public.users 
            WHERE auth_uid = (select auth.uid())
        )
    );

    -- Fix media overlapping policies if they exist
    DROP POLICY IF EXISTS "All users can view media_files" ON media_files;
    DROP POLICY IF EXISTS "Users can view their own media_files" ON media_files;
    CREATE POLICY "Consolidated view media_files" ON media_files FOR SELECT
    USING (
        TRUE OR created_by = (
            SELECT id FROM public.users 
            WHERE auth_uid = (select auth.uid())
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in policy consolidation: %', SQLERRM;
END $$;


-- ============================================================================
-- PHASE 3: ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================
DO $$
BEGIN
    -- Add created_by indexes for tables that are missing them
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_playlist_groups_created_by ON playlist_groups (created_by);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_created_by ON projects (created_by);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sequences_created_by ON sequences (created_by);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_segments_created_by ON segments (created_by);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sequences_segments_created_by ON sequences_segments (created_by);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sequences_tags_created_by ON sequences_tags (created_by);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sequences_targets_created_by ON sequences_targets (created_by);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_segments_targets_created_by ON segments_targets (created_by);

    -- Add user_id indexes for user-related tables
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_custom_texts_created_by ON user_custom_texts (created_by);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_positions_user_id ON user_positions (user_id);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_bookmarks_user_id ON user_bookmarks (user_id);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_bookmark_folders_user_id ON user_bookmark_folders (user_id);

    -- Add other commonly queried foreign keys
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_verse_feedback_created_by ON verse_feedback (created_by);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_playlists_user_id ON playlists (user_id);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_playlist_items_created_by ON playlist_items (created_by);

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in index creation: %', SQLERRM;
END $$;
