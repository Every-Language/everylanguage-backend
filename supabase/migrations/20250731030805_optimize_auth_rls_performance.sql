-- Optimize Auth RLS Performance
-- Fix auth.uid() re-evaluation issue by wrapping with (select auth.uid())
-- This prevents the function from being called for every row
-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================
-- Update users table policies to use (select auth.uid())
DROP POLICY if EXISTS "Users can view own profile" ON users;


CREATE POLICY "Users can view own profile" ON users FOR
SELECT
  USING (
    auth_uid = (
      SELECT
        auth.uid ()
    )
  );


DROP POLICY if EXISTS "Users can update own profile" ON users;


CREATE POLICY "Users can update own profile" ON users
FOR UPDATE
  USING (
    auth_uid = (
      SELECT
        auth.uid ()
    )
  );


DROP POLICY if EXISTS "Users can insert own profile" ON users;


CREATE POLICY "Users can insert own profile" ON users FOR insert
WITH
  CHECK (
    auth_uid = (
      SELECT
        auth.uid ()
    )
  );


-- ============================================================================
-- ROLES AND PERMISSIONS POLICIES  
-- ============================================================================
DROP POLICY if EXISTS "Authenticated users can view roles" ON roles;


CREATE POLICY "Authenticated users can view roles" ON roles FOR
SELECT
  USING (
    (
      SELECT
        auth.uid ()
    ) IS NOT NULL
  );


DROP POLICY if EXISTS "Users can view own roles" ON user_roles;


CREATE POLICY "Users can view own roles" ON user_roles FOR
SELECT
  USING (
    user_id = (
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


DROP POLICY if EXISTS "Authenticated users can view permissions" ON permissions;


CREATE POLICY "Authenticated users can view permissions" ON permissions FOR
SELECT
  USING (
    (
      SELECT
        auth.uid ()
    ) IS NOT NULL
  );


-- ============================================================================
-- USER CONTRIBUTIONS POLICIES
-- ============================================================================
DROP POLICY if EXISTS "Users can view their own contributions" ON user_contributions;


CREATE POLICY "Users can view their own contributions" ON user_contributions FOR
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


DROP POLICY if EXISTS "Users can create contributions" ON user_contributions;


CREATE POLICY "Users can create contributions" ON user_contributions FOR insert
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


-- ============================================================================
-- USER-OWNED CONTENT POLICIES
-- ============================================================================
-- Update all user-owned content policies to use (select auth.uid())
DROP POLICY if EXISTS "Users can view their own tags" ON tags;


CREATE POLICY "Users can view their own tags" ON tags FOR
SELECT
  USING (
    created_by = (
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


DROP POLICY if EXISTS "Users can update their own tags" ON tags;


CREATE POLICY "Users can update their own tags" ON tags
FOR UPDATE
  USING (
    created_by = (
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


DROP POLICY if EXISTS "Users can delete their own tags" ON tags;


CREATE POLICY "Users can delete their own tags" ON tags FOR delete USING (
  created_by = (
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
-- AUTHENTICATED INSERT POLICIES
-- ============================================================================
-- Update authenticated insert policies to use (select auth.uid())
DROP POLICY if EXISTS "Authenticated users can insert tags" ON tags;


CREATE POLICY "Authenticated users can insert tags" ON tags FOR insert
WITH
  CHECK (
    (
      SELECT
        auth.uid ()
    ) IS NOT NULL
  );


DROP POLICY if EXISTS "Authenticated users can insert media_files" ON media_files;


CREATE POLICY "Authenticated users can insert media_files" ON media_files FOR insert
WITH
  CHECK (
    (
      SELECT
        auth.uid ()
    ) IS NOT NULL
  );


DROP POLICY if EXISTS "Authenticated users can insert media_files_tags" ON media_files_tags;


CREATE POLICY "Authenticated users can insert media_files_tags" ON media_files_tags FOR insert
WITH
  CHECK (
    (
      SELECT
        auth.uid ()
    ) IS NOT NULL
  );


DROP POLICY if EXISTS "Authenticated users can insert media_files_targets" ON media_files_targets;


CREATE POLICY "Authenticated users can insert media_files_targets" ON media_files_targets FOR insert
WITH
  CHECK (
    (
      SELECT
        auth.uid ()
    ) IS NOT NULL
  );


DROP POLICY if EXISTS "Authenticated users can insert media_files_verses" ON media_files_verses;


CREATE POLICY "Authenticated users can insert media_files_verses" ON media_files_verses FOR insert
WITH
  CHECK (
    (
      SELECT
        auth.uid ()
    ) IS NOT NULL
  );


DROP POLICY if EXISTS "Authenticated users can insert verse_texts" ON verse_texts;


CREATE POLICY "Authenticated users can insert verse_texts" ON verse_texts FOR insert
WITH
  CHECK (
    (
      SELECT
        auth.uid ()
    ) IS NOT NULL
  );


DROP POLICY if EXISTS "Authenticated users can insert text_versions" ON text_versions;


CREATE POLICY "Authenticated users can insert text_versions" ON text_versions FOR insert
WITH
  CHECK (
    (
      SELECT
        auth.uid ()
    ) IS NOT NULL
  );


DROP POLICY if EXISTS "Authenticated users can insert bible_versions" ON bible_versions;


CREATE POLICY "Authenticated users can insert bible_versions" ON bible_versions FOR insert
WITH
  CHECK (
    (
      SELECT
        auth.uid ()
    ) IS NOT NULL
  );


DROP POLICY if EXISTS "Authenticated users can insert books" ON books;


CREATE POLICY "Authenticated users can insert books" ON books FOR insert
WITH
  CHECK (
    (
      SELECT
        auth.uid ()
    ) IS NOT NULL
  );


DROP POLICY if EXISTS "Authenticated users can insert chapters" ON chapters;


CREATE POLICY "Authenticated users can insert chapters" ON chapters FOR insert
WITH
  CHECK (
    (
      SELECT
        auth.uid ()
    ) IS NOT NULL
  );


DROP POLICY if EXISTS "Authenticated users can insert verses" ON verses;


CREATE POLICY "Authenticated users can insert verses" ON verses FOR insert
WITH
  CHECK (
    (
      SELECT
        auth.uid ()
    ) IS NOT NULL
  );


DROP POLICY if EXISTS "Authenticated users can insert passages" ON passages;


CREATE POLICY "Authenticated users can insert passages" ON passages FOR insert
WITH
  CHECK (
    (
      SELECT
        auth.uid ()
    ) IS NOT NULL
  );


-- ============================================================================
-- USER SAVED VERSIONS POLICIES
-- ============================================================================
DROP POLICY if EXISTS "Users can view own saved versions" ON user_saved_versions;


CREATE POLICY "Users can view own saved versions" ON user_saved_versions FOR
SELECT
  USING (
    user_id = (
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


DROP POLICY if EXISTS "Users can insert own saved versions" ON user_saved_versions;


CREATE POLICY "Users can insert own saved versions" ON user_saved_versions FOR insert
WITH
  CHECK (
    user_id = (
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


DROP POLICY if EXISTS "Users can update own saved versions" ON user_saved_versions;


CREATE POLICY "Users can update own saved versions" ON user_saved_versions
FOR UPDATE
  USING (
    user_id = (
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


DROP POLICY if EXISTS "Users can delete own saved versions" ON user_saved_versions;


CREATE POLICY "Users can delete own saved versions" ON user_saved_versions FOR delete USING (
  user_id = (
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
-- AUDIO VERSIONS POLICIES
-- ============================================================================
DROP POLICY if EXISTS "audio_versions_insert_auth" ON audio_versions;


CREATE POLICY "audio_versions_insert_auth" ON audio_versions FOR insert
WITH
  CHECK (
    (
      SELECT
        auth.uid ()
    ) IS NOT NULL
  );


DROP POLICY if EXISTS "audio_versions_update_own" ON audio_versions;


CREATE POLICY "audio_versions_update_own" ON audio_versions
FOR UPDATE
  USING (
    created_by = (
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


-- Note: This migration optimizes the most critical auth.uid() performance issues
-- Additional policies may need similar optimization based on usage patterns
