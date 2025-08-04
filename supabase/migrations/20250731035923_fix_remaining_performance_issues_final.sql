-- Fix Remaining Performance Issues - Final Migration
-- Targets the remaining ~32 Auth RLS policies and multiple permissive policies
-- ============================================================================
-- ============================================================================
-- PHASE 1: FIX REMAINING AUTH RLS INITIALIZATION PLANS (~32 policies)
-- ============================================================================
DO $$
BEGIN
    -- Fix playlists_playlist_groups policies
    DROP POLICY IF EXISTS "Authenticated users can insert playlists_playlist_groups" ON playlists_playlist_groups;
    CREATE POLICY "Authenticated users can insert playlists_playlist_groups" ON playlists_playlist_groups FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own playlists_playlist_groups" ON playlists_playlist_groups;
    CREATE POLICY "Users can view their own playlists_playlist_groups" ON playlists_playlist_groups FOR SELECT
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own playlists_playlist_groups" ON playlists_playlist_groups;
    CREATE POLICY "Users can update their own playlists_playlist_groups" ON playlists_playlist_groups FOR UPDATE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can delete their own playlists_playlist_groups" ON playlists_playlist_groups;
    CREATE POLICY "Users can delete their own playlists_playlist_groups" ON playlists_playlist_groups FOR DELETE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix sequences_tags policies
    DROP POLICY IF EXISTS "Authenticated users can insert sequences_tags" ON sequences_tags;
    CREATE POLICY "Authenticated users can insert sequences_tags" ON sequences_tags FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own sequences_tags" ON sequences_tags;
    CREATE POLICY "Users can view their own sequences_tags" ON sequences_tags FOR SELECT
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own sequences_tags" ON sequences_tags;
    CREATE POLICY "Users can update their own sequences_tags" ON sequences_tags FOR UPDATE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can delete their own sequences_tags" ON sequences_tags;
    CREATE POLICY "Users can delete their own sequences_tags" ON sequences_tags FOR DELETE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix sequences_targets policies
    DROP POLICY IF EXISTS "Authenticated users can insert sequences_targets" ON sequences_targets;
    CREATE POLICY "Authenticated users can insert sequences_targets" ON sequences_targets FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own sequences_targets" ON sequences_targets;
    CREATE POLICY "Users can view their own sequences_targets" ON sequences_targets FOR SELECT
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own sequences_targets" ON sequences_targets;
    CREATE POLICY "Users can update their own sequences_targets" ON sequences_targets FOR UPDATE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix sequences_segments policies
    DROP POLICY IF EXISTS "Authenticated users can insert sequences_segments" ON sequences_segments;
    CREATE POLICY "Authenticated users can insert sequences_segments" ON sequences_segments FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own sequences_segments" ON sequences_segments;
    CREATE POLICY "Users can view their own sequences_segments" ON sequences_segments FOR SELECT
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own sequences_segments" ON sequences_segments;
    CREATE POLICY "Users can update their own sequences_segments" ON sequences_segments FOR UPDATE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can delete their own sequences_segments" ON sequences_segments;
    CREATE POLICY "Users can delete their own sequences_segments" ON sequences_segments FOR DELETE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix segments policies
    DROP POLICY IF EXISTS "Authenticated users can insert segments" ON segments;
    CREATE POLICY "Authenticated users can insert segments" ON segments FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own segments" ON segments;
    CREATE POLICY "Users can view their own segments" ON segments FOR SELECT
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own segments" ON segments;
    CREATE POLICY "Users can update their own segments" ON segments FOR UPDATE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix segments_targets policies
    DROP POLICY IF EXISTS "Authenticated users can insert segments_targets" ON segments_targets;
    CREATE POLICY "Authenticated users can insert segments_targets" ON segments_targets FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own segments_targets" ON segments_targets;
    CREATE POLICY "Users can view their own segments_targets" ON segments_targets FOR SELECT
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own segments_targets" ON segments_targets;
    CREATE POLICY "Users can update their own segments_targets" ON segments_targets FOR UPDATE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can delete their own segments_targets" ON segments_targets;
    CREATE POLICY "Users can delete their own segments_targets" ON segments_targets FOR DELETE
    USING (created_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix region_versions policies
    DROP POLICY IF EXISTS "Authenticated users can insert region_versions" ON region_versions;
    CREATE POLICY "Authenticated users can insert region_versions" ON region_versions FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own region_versions" ON region_versions;
    CREATE POLICY "Users can view their own region_versions" ON region_versions FOR SELECT
    USING (changed_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own region_versions" ON region_versions;
    CREATE POLICY "Users can update their own region_versions" ON region_versions FOR UPDATE
    USING (changed_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can delete their own region_versions" ON region_versions;
    CREATE POLICY "Users can delete their own region_versions" ON region_versions FOR DELETE
    USING (changed_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix language_entity_versions policies
    DROP POLICY IF EXISTS "Authenticated users can insert language_entity_versions" ON language_entity_versions;
    CREATE POLICY "Authenticated users can insert language_entity_versions" ON language_entity_versions FOR INSERT
    WITH CHECK ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS "Users can view their own language_entity_versions" ON language_entity_versions;
    CREATE POLICY "Users can view their own language_entity_versions" ON language_entity_versions FOR SELECT
    USING (changed_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can update their own language_entity_versions" ON language_entity_versions;
    CREATE POLICY "Users can update their own language_entity_versions" ON language_entity_versions FOR UPDATE
    USING (changed_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    DROP POLICY IF EXISTS "Users can delete their own language_entity_versions" ON language_entity_versions;
    CREATE POLICY "Users can delete their own language_entity_versions" ON language_entity_versions FOR DELETE
    USING (changed_by = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in final Auth RLS fixes: %', SQLERRM;
END $$;


-- ============================================================================
-- PHASE 2: CONSOLIDATE REMAINING MULTIPLE PERMISSIVE POLICIES
-- ============================================================================
DO $$
BEGIN
    -- Fix audio_versions overlapping policies
    DROP POLICY IF EXISTS "Users can view their own audio versions" ON audio_versions;
    DROP POLICY IF EXISTS "audio_versions_select_all" ON audio_versions;
    CREATE POLICY "Consolidated view audio_versions" ON audio_versions FOR SELECT
    USING (
        TRUE OR created_by = (
            SELECT id FROM public.users 
            WHERE auth_uid = (select auth.uid())
        )
    );

    -- Fix passages overlapping policies
    DROP POLICY IF EXISTS "Consolidated view passages" ON passages;
    DROP POLICY IF EXISTS "Users can view their own passages" ON passages;
    CREATE POLICY "Final consolidated view passages" ON passages FOR SELECT
    USING (
        TRUE OR created_by = (
            SELECT id FROM public.users 
            WHERE auth_uid = (select auth.uid())
        )
    );

    -- Fix permissions overlapping policies
    DROP POLICY IF EXISTS "Authenticated users can view permissions" ON permissions;
    DROP POLICY IF EXISTS "Users can view permissions for their roles" ON permissions;
    CREATE POLICY "Final consolidated view permissions" ON permissions FOR SELECT
    USING (
        (select auth.role()) = 'authenticated' OR 
        role_id IN (
            SELECT ur.role_id FROM user_roles ur
            JOIN public.users u ON ur.user_id = u.id 
            WHERE u.auth_uid = (select auth.uid())
        )
    );

    -- Fix user_saved_versions overlapping policies
    DROP POLICY IF EXISTS "Users can view own saved versions" ON user_saved_versions;
    DROP POLICY IF EXISTS "Users can view their own saved versions" ON user_saved_versions;
    CREATE POLICY "Final consolidated view user_saved_versions" ON user_saved_versions FOR SELECT
    USING (user_id = (
        SELECT id FROM public.users 
        WHERE auth_uid = (select auth.uid())
    ));

    -- Fix verse_texts overlapping policies
    DROP POLICY IF EXISTS "Consolidated view verse_texts" ON verse_texts;
    DROP POLICY IF EXISTS "Users can view their own verse texts" ON verse_texts;
    CREATE POLICY "Final consolidated view verse_texts" ON verse_texts FOR SELECT
    USING (
        TRUE OR created_by = (
            SELECT id FROM public.users 
            WHERE auth_uid = (select auth.uid())
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in final policy consolidation: %', SQLERRM;
END $$;
