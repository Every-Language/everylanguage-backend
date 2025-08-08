-- Fix Redundant RLS User Lookups
-- Replace redundant public.users lookups with direct auth.uid() comparisons
-- Since public.users.id = auth.uid() directly, the subqueries are unnecessary
-- ============================================================================
-- ============================================================================
-- STEP 1: Fix user_saved_audio_versions policies
-- ============================================================================
DROP POLICY if EXISTS "Users can view own saved audio versions" ON user_saved_audio_versions;


CREATE POLICY "Users can view own saved audio versions" ON user_saved_audio_versions FOR
SELECT
  USING (user_id = auth.uid ());


DROP POLICY if EXISTS "Users can insert own saved audio versions" ON user_saved_audio_versions;


CREATE POLICY "Users can insert own saved audio versions" ON user_saved_audio_versions FOR insert
WITH
  CHECK (user_id = auth.uid ());


DROP POLICY if EXISTS "Users can update own saved audio versions" ON user_saved_audio_versions;


CREATE POLICY "Users can update own saved audio versions" ON user_saved_audio_versions
FOR UPDATE
  USING (user_id = auth.uid ());


DROP POLICY if EXISTS "Users can delete own saved audio versions" ON user_saved_audio_versions;


CREATE POLICY "Users can delete own saved audio versions" ON user_saved_audio_versions FOR delete USING (user_id = auth.uid ());


-- ============================================================================
-- STEP 2: Fix user_saved_text_versions policies
-- ============================================================================
DROP POLICY if EXISTS "Users can view own saved text versions" ON user_saved_text_versions;


CREATE POLICY "Users can view own saved text versions" ON user_saved_text_versions FOR
SELECT
  USING (user_id = auth.uid ());


DROP POLICY if EXISTS "Users can insert own saved text versions" ON user_saved_text_versions;


CREATE POLICY "Users can insert own saved text versions" ON user_saved_text_versions FOR insert
WITH
  CHECK (user_id = auth.uid ());


DROP POLICY if EXISTS "Users can update own saved text versions" ON user_saved_text_versions;


CREATE POLICY "Users can update own saved text versions" ON user_saved_text_versions
FOR UPDATE
  USING (user_id = auth.uid ());


DROP POLICY if EXISTS "Users can delete own saved text versions" ON user_saved_text_versions;


CREATE POLICY "Users can delete own saved text versions" ON user_saved_text_versions FOR delete USING (user_id = auth.uid ());


-- ============================================================================
-- STEP 3: Fix user_version_selections policies  
-- ============================================================================
DROP POLICY if EXISTS "Users can view own version selections" ON user_version_selections;


CREATE POLICY "Users can view own version selections" ON user_version_selections FOR
SELECT
  USING (user_id = auth.uid ());


DROP POLICY if EXISTS "Users can insert own version selections" ON user_version_selections;


CREATE POLICY "Users can insert own version selections" ON user_version_selections FOR insert
WITH
  CHECK (user_id = auth.uid ());


DROP POLICY if EXISTS "Users can update own version selections" ON user_version_selections;


CREATE POLICY "Users can update own version selections" ON user_version_selections
FOR UPDATE
  USING (user_id = auth.uid ());


DROP POLICY if EXISTS "Users can delete own version selections" ON user_version_selections;


CREATE POLICY "Users can delete own version selections" ON user_version_selections FOR delete USING (user_id = auth.uid ());


-- ============================================================================
-- COMMENTS
-- ============================================================================
comment ON policy "Users can view own saved audio versions" ON user_saved_audio_versions IS 'Optimized policy using direct auth.uid() comparison since public.users.id = auth.uid()';


comment ON policy "Users can view own saved text versions" ON user_saved_text_versions IS 'Optimized policy using direct auth.uid() comparison since public.users.id = auth.uid()';


comment ON policy "Users can view own version selections" ON user_version_selections IS 'Optimized policy using direct auth.uid() comparison since public.users.id = auth.uid()';


-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- 
-- This migration fixes redundant RLS policies that were performing unnecessary
-- subqueries to public.users table. Since the schema was migrated to make
-- public.users.id = auth.uid() directly, these subqueries are redundant and
-- hurt performance.
--
-- Changed pattern:
-- FROM: user_id = (SELECT id FROM public.users WHERE id = auth.uid())
-- TO:   user_id = auth.uid()
--
-- Benefits:
-- - Improved query performance (no subqueries)
-- - Simpler, more readable policies  
-- - Consistent with the current schema design
-- - Follows Supabase best practices
--
