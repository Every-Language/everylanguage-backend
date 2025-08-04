-- Consolidate Multiple Permissive Policies
-- Merge overlapping policies for same role/action to improve query performance
-- Multiple permissive policies cause all policies to be evaluated for each query
-- ============================================================================
-- MEDIA FILES POLICIES CONSOLIDATION
-- ============================================================================
-- Consolidate media_files SELECT policies
DROP POLICY if EXISTS "All users can view media_files" ON media_files;


DROP POLICY if EXISTS "Users can view their own media_files" ON media_files;


CREATE POLICY "Users can view media_files" ON media_files FOR
SELECT
  USING (
    TRUE
    OR created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  );


-- Consolidate media_files_tags SELECT policies  
DROP POLICY if EXISTS "All users can view media_files_tags" ON media_files_tags;


DROP POLICY if EXISTS "Users can view their own media_files_tags" ON media_files_tags;


CREATE POLICY "Users can view media_files_tags" ON media_files_tags FOR
SELECT
  USING (
    TRUE
    OR created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  );


-- Consolidate media_files_targets SELECT policies
DROP POLICY if EXISTS "All users can view media_files_targets" ON media_files_targets;


DROP POLICY if EXISTS "Users can view their own media_files_targets" ON media_files_targets;


CREATE POLICY "Users can view media_files_targets" ON media_files_targets FOR
SELECT
  USING (
    TRUE
    OR created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  );


-- Consolidate media_files_verses SELECT policies
DROP POLICY if EXISTS "All users can view media_files_verses" ON media_files_verses;


DROP POLICY if EXISTS "Users can view their own media_files_verses" ON media_files_verses;


CREATE POLICY "Users can view media_files_verses" ON media_files_verses FOR
SELECT
  USING (
    TRUE
    OR created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  );


-- ============================================================================
-- TEXT AND CONTENT POLICIES CONSOLIDATION
-- ============================================================================
-- Consolidate verse_texts SELECT policies
DROP POLICY if EXISTS "All users can view verse_texts" ON verse_texts;


DROP POLICY if EXISTS "Users can view their own verse_texts" ON verse_texts;


CREATE POLICY "Users can view verse_texts" ON verse_texts FOR
SELECT
  USING (
    TRUE
    OR created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  );


-- Consolidate text_versions SELECT policies
DROP POLICY if EXISTS "All users can view text_versions" ON text_versions;


DROP POLICY if EXISTS "Users can view their own text_versions" ON text_versions;


CREATE POLICY "Users can view text_versions" ON text_versions FOR
SELECT
  USING (
    TRUE
    OR created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  );


-- Consolidate passages SELECT policies
DROP POLICY if EXISTS "All users can view passages" ON passages;


DROP POLICY if EXISTS "Users can view their own passages" ON passages;


CREATE POLICY "Users can view passages" ON passages FOR
SELECT
  USING (
    TRUE
    OR created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  );


-- ============================================================================
-- TAGS POLICIES CONSOLIDATION
-- ============================================================================
-- Consolidate tags SELECT policies
DROP POLICY if EXISTS "All users can view tags" ON tags;


DROP POLICY if EXISTS "Users can view their own tags" ON tags;


CREATE POLICY "Users can view tags" ON tags FOR
SELECT
  USING (
    TRUE
    OR created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  );


-- ============================================================================
-- LANGUAGE AND REGION POLICIES CONSOLIDATION
-- ============================================================================
-- Consolidate regions SELECT policies
DROP POLICY if EXISTS "All users can view regions" ON regions;


DROP POLICY if EXISTS "Allow read access to regions" ON regions;


CREATE POLICY "Users can view regions" ON regions FOR
SELECT
  USING (deleted_at IS NULL);


-- Consolidate language_entities_regions SELECT policies
DROP POLICY if EXISTS "All users can view language_entities_regions" ON language_entities_regions;


DROP POLICY if EXISTS "Allow read access to language entities regions" ON language_entities_regions;


CREATE POLICY "Users can view language_entities_regions" ON language_entities_regions FOR
SELECT
  USING (deleted_at IS NULL);


-- ============================================================================
-- USER CONTRIBUTIONS POLICIES CONSOLIDATION
-- ============================================================================
-- Consolidate user_contributions INSERT policies
DROP POLICY if EXISTS "Authenticated users can insert user_contributions" ON user_contributions;


DROP POLICY if EXISTS "Users can create contributions" ON user_contributions;


CREATE POLICY "Users can create user_contributions" ON user_contributions FOR insert
WITH
  CHECK (
    changed_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  );


-- Consolidate user_contributions SELECT policies  
DROP POLICY if EXISTS "Users can view their own contributions" ON user_contributions;


DROP POLICY if EXISTS "Users can view their own user_contributions" ON user_contributions;


CREATE POLICY "Users can view user_contributions" ON user_contributions FOR
SELECT
  USING (
    changed_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  );


-- Note: This consolidation reduces the number of policy evaluations per query
-- by combining multiple permissive policies into single optimized policies
