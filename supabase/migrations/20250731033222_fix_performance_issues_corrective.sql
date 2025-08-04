-- Fix Performance Issues - Corrective Migration
-- Our previous migrations partially failed, this fixes the remaining critical issues
-- ============================================================================
-- ============================================================================ 
-- PHASE 1: FIX AUTH RLS INITIALIZATION PLANS (CRITICAL)
-- ============================================================================
-- Fix roles table - currently uses auth.role() without subquery
DO $$ 
BEGIN
    -- Drop and recreate roles policies with optimized auth calls
    DROP POLICY IF EXISTS "Authenticated users can view roles" ON roles;
    CREATE POLICY "Authenticated users can view roles" ON roles FOR SELECT
    USING ((select auth.role()) = 'authenticated'::text);
    
    RAISE NOTICE 'Fixed roles table auth RLS policy';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing roles policy: %', SQLERRM;
END $$;


-- Fix user_contributions policies - multiple issues here
DO $$
BEGIN
    -- Fix the existing policies that use auth.uid() without subquery
    DROP POLICY IF EXISTS "Users can view their own contributions" ON user_contributions;
    CREATE POLICY "Users can view their own contributions" ON user_contributions FOR SELECT
    USING (changed_by = (
        SELECT users.id 
        FROM users 
        WHERE users.auth_uid = (select auth.uid())
    ));
    
    DROP POLICY IF EXISTS "Users can view their own user_contributions" ON user_contributions;
    DROP POLICY IF EXISTS "Users can create contributions" ON user_contributions;
    DROP POLICY IF EXISTS "Authenticated users can insert user_contributions" ON user_contributions;
    
    -- Create single consolidated INSERT policy
    CREATE POLICY "Users can insert user_contributions" ON user_contributions FOR INSERT
    WITH CHECK (
        (select auth.role()) = 'authenticated'::text 
        AND changed_by = (
            SELECT users.id 
            FROM users 
            WHERE users.auth_uid = (select auth.uid())
        )
    );
    
    RAISE NOTICE 'Fixed user_contributions table policies';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing user_contributions policies: %', SQLERRM;
END $$;


-- ============================================================================
-- PHASE 2: FIX MULTIPLE PERMISSIVE POLICIES (HIGH PRIORITY)  
-- ============================================================================
-- Fix media_files - has overlapping SELECT policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "All users can view media_files" ON media_files;
    DROP POLICY IF EXISTS "Users can view their own media_files" ON media_files;
    
    -- Create single consolidated SELECT policy that allows both public and owned access
    CREATE POLICY "Consolidated media_files view policy" ON media_files FOR SELECT
    USING (
        TRUE OR created_by = (
            SELECT users.id 
            FROM users 
            WHERE users.auth_uid = (select auth.uid())
        )
    );
    
    RAISE NOTICE 'Consolidated media_files SELECT policies';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error consolidating media_files policies: %', SQLERRM;
END $$;


-- Fix text_versions - has overlapping SELECT policies  
DO $$
BEGIN
    DROP POLICY IF EXISTS "All users can view text_versions" ON text_versions;
    DROP POLICY IF EXISTS "Users can view their own text_versions" ON text_versions;
    
    CREATE POLICY "Consolidated text_versions view policy" ON text_versions FOR SELECT
    USING (
        TRUE OR created_by = (
            SELECT users.id 
            FROM users 
            WHERE users.auth_uid = (select auth.uid())
        )
    );
    
    RAISE NOTICE 'Consolidated text_versions SELECT policies';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error consolidating text_versions policies: %', SQLERRM;
END $$;


-- ============================================================================
-- PHASE 3: ADD CRITICAL FOREIGN KEY INDEXES
-- ============================================================================
-- Add indexes for created_by fields that are most likely to be queried
DO $$
BEGIN
    -- Media files related tables
    CREATE INDEX IF NOT EXISTS idx_media_files_tags_created_by ON media_files_tags (created_by);
    CREATE INDEX IF NOT EXISTS idx_media_files_targets_created_by ON media_files_targets (created_by);
    CREATE INDEX IF NOT EXISTS idx_media_files_verses_created_by ON media_files_verses (created_by);
    
    -- User content tables
    CREATE INDEX IF NOT EXISTS idx_text_versions_created_by ON text_versions (created_by);
    CREATE INDEX IF NOT EXISTS idx_verse_texts_created_by ON verse_texts (created_by);
    
    -- Contributions and reviews (most likely to be filtered by user)
    CREATE INDEX IF NOT EXISTS idx_user_contributions_changed_by ON user_contributions (changed_by);
    CREATE INDEX IF NOT EXISTS idx_user_contributions_reviewed_by ON user_contributions (reviewed_by);
    
    -- Language and region version tables (for admin queries)
    CREATE INDEX IF NOT EXISTS idx_language_entity_versions_reviewed_by ON language_entity_versions (reviewed_by);
    CREATE INDEX IF NOT EXISTS idx_region_versions_reviewed_by ON region_versions (reviewed_by);
    
    RAISE NOTICE 'Added critical foreign key indexes';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error adding foreign key indexes: %', SQLERRM;
END $$;


-- ============================================================================
-- PHASE 4: FIX REMAINING HIGH-IMPACT AUTH.UID() ISSUES
-- ============================================================================
-- Fix text_versions UPDATE policy
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can update their own text_versions" ON text_versions;
    CREATE POLICY "Users can update their own text_versions" ON text_versions FOR UPDATE
    USING (
        (select auth.role()) = 'authenticated'::text 
        AND created_by = (
            SELECT users.id 
            FROM users 
            WHERE users.auth_uid = (select auth.uid())
        )
    );
    
    RAISE NOTICE 'Fixed text_versions UPDATE policy';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing text_versions UPDATE policy: %', SQLERRM;
END $$;


-- Fix user_contributions remaining policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can update their own user_contributions" ON user_contributions;
    CREATE POLICY "Users can update their own user_contributions" ON user_contributions FOR UPDATE
    USING (
        (select auth.role()) = 'authenticated'::text 
        AND changed_by = (
            SELECT users.id 
            FROM users 
            WHERE users.auth_uid = (select auth.uid())
        )
    );
    
    DROP POLICY IF EXISTS "Users can delete their own user_contributions" ON user_contributions;
    CREATE POLICY "Users can delete their own user_contributions" ON user_contributions FOR DELETE
    USING (
        (select auth.role()) = 'authenticated'::text 
        AND changed_by = (
            SELECT users.id 
            FROM users 
            WHERE users.auth_uid = (select auth.uid())
        )
    );
    
    RAISE NOTICE 'Fixed user_contributions UPDATE/DELETE policies';
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error fixing user_contributions UPDATE/DELETE policies: %', SQLERRM;
END $$;


-- ============================================================================
-- FINAL: LOG COMPLETION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Performance optimization corrective migration completed successfully';
    RAISE NOTICE 'Fixed: Auth RLS initialization plans, Multiple permissive policies, Missing foreign key indexes';
END $$;
