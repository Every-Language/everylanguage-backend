-- Restructure User Saved Versions Tables and Remove Anonymous User Support
-- This migration drops the existing user_saved_versions table, creates separate
-- tables for audio and text versions, plus a user_version_selections table for current preferences
-- AND removes all anonymous user support from user tables
-- ============================================================================
-- ============================================================================
-- STEP 1: Drop ALL RLS policies that reference anon_user_id to prevent dependency errors
-- ============================================================================
-- Drop RLS policies for user_saved_versions (will be recreated later for new tables)
DROP POLICY if EXISTS "Users can view own saved versions" ON user_saved_versions;


DROP POLICY if EXISTS "Users can insert own saved versions" ON user_saved_versions;


DROP POLICY if EXISTS "Users can update own saved versions" ON user_saved_versions;


DROP POLICY if EXISTS "Users can delete own saved versions" ON user_saved_versions;


-- Drop RLS policies for user_saved_image_sets (all possible name variations)
DROP POLICY if EXISTS "Users can view their own saved image sets" ON user_saved_image_sets;


DROP POLICY if EXISTS "Users can insert their own saved image sets" ON user_saved_image_sets;


DROP POLICY if EXISTS "Users can update their own saved image sets" ON user_saved_image_sets;


DROP POLICY if EXISTS "Users can delete their own saved image sets" ON user_saved_image_sets;


DROP POLICY if EXISTS "Users can view user_saved_image_sets" ON user_saved_image_sets;


DROP POLICY if EXISTS "Users can insert user_saved_image_sets" ON user_saved_image_sets;


DROP POLICY if EXISTS "Users can update user_saved_image_sets" ON user_saved_image_sets;


DROP POLICY if EXISTS "Users can delete user_saved_image_sets" ON user_saved_image_sets;


-- Drop RLS policies for user_bookmark_folders (all possible name variations)
DROP POLICY if EXISTS "Users can view their own bookmark folders" ON user_bookmark_folders;


DROP POLICY if EXISTS "Users can insert their own bookmark folders" ON user_bookmark_folders;


DROP POLICY if EXISTS "Users can update their own bookmark folders" ON user_bookmark_folders;


DROP POLICY if EXISTS "Users can delete their own bookmark folders" ON user_bookmark_folders;


DROP POLICY if EXISTS "Users can view user_bookmark_folders" ON user_bookmark_folders;


DROP POLICY if EXISTS "Users can insert user_bookmark_folders" ON user_bookmark_folders;


DROP POLICY if EXISTS "Users can update user_bookmark_folders" ON user_bookmark_folders;


DROP POLICY if EXISTS "Users can delete user_bookmark_folders" ON user_bookmark_folders;


-- Drop RLS policies for user_bookmarks (all possible name variations)
DROP POLICY if EXISTS "Users can view their own bookmarks" ON user_bookmarks;


DROP POLICY if EXISTS "Users can insert their own bookmarks" ON user_bookmarks;


DROP POLICY if EXISTS "Users can update their own bookmarks" ON user_bookmarks;


DROP POLICY if EXISTS "Users can delete their own bookmarks" ON user_bookmarks;


DROP POLICY if EXISTS "Users can view user_bookmarks" ON user_bookmarks;


DROP POLICY if EXISTS "Users can insert user_bookmarks" ON user_bookmarks;


DROP POLICY if EXISTS "Users can update user_bookmarks" ON user_bookmarks;


DROP POLICY if EXISTS "Users can delete user_bookmarks" ON user_bookmarks;


-- Drop RLS policies for user_playlists (all possible name variations)
DROP POLICY if EXISTS "Users can view their own playlists" ON user_playlists;


DROP POLICY if EXISTS "Users can insert their own playlists" ON user_playlists;


DROP POLICY if EXISTS "Users can update their own playlists" ON user_playlists;


DROP POLICY if EXISTS "Users can delete their own playlists" ON user_playlists;


DROP POLICY if EXISTS "Users can view user_playlists" ON user_playlists;


DROP POLICY if EXISTS "Users can insert user_playlists" ON user_playlists;


DROP POLICY if EXISTS "Users can update user_playlists" ON user_playlists;


DROP POLICY if EXISTS "Users can delete user_playlists" ON user_playlists;


-- Drop RLS policies for user_playlist_groups (all possible name variations)
DROP POLICY if EXISTS "Users can view their own playlist groups" ON user_playlist_groups;


DROP POLICY if EXISTS "Users can insert their own playlist groups" ON user_playlist_groups;


DROP POLICY if EXISTS "Users can update their own playlist groups" ON user_playlist_groups;


DROP POLICY if EXISTS "Users can delete their own playlist groups" ON user_playlist_groups;


DROP POLICY if EXISTS "Users can view user_playlist_groups" ON user_playlist_groups;


DROP POLICY if EXISTS "Users can insert user_playlist_groups" ON user_playlist_groups;


DROP POLICY if EXISTS "Users can update user_playlist_groups" ON user_playlist_groups;


DROP POLICY if EXISTS "Users can delete user_playlist_groups" ON user_playlist_groups;


-- ============================================================================
-- STEP 2: Drop check constraints that reference anon_user_id before dropping columns
-- ============================================================================
-- Drop constraints from user_saved_versions
ALTER TABLE user_saved_versions
DROP CONSTRAINT if EXISTS check_user_saved_versions_exactly_one_user;


-- Drop constraints from user_saved_image_sets  
ALTER TABLE user_saved_image_sets
DROP CONSTRAINT if EXISTS check_user_saved_image_sets_exactly_one_user;


-- Drop constraints from user_bookmark_folders
ALTER TABLE user_bookmark_folders
DROP CONSTRAINT if EXISTS check_user_bookmark_folders_exactly_one_user;


-- Drop constraints from user_bookmarks
ALTER TABLE user_bookmarks
DROP CONSTRAINT if EXISTS check_user_bookmarks_exactly_one_user;


-- Drop constraints from user_playlists
ALTER TABLE user_playlists
DROP CONSTRAINT if EXISTS check_user_playlists_exactly_one_user;


-- Drop constraints from user_playlist_groups
ALTER TABLE user_playlist_groups
DROP CONSTRAINT if EXISTS check_user_playlist_groups_exactly_one_user;


-- ============================================================================
-- STEP 3: Drop anon_user_id related indexes and constraints from user tables (except user_saved_versions which will be dropped entirely)
-- ============================================================================
-- Drop anon_user_id related indexes
DROP INDEX if EXISTS idx_user_saved_image_sets_anon_user_id;


DROP INDEX if EXISTS idx_user_bookmark_folders_anon_user_id;


DROP INDEX if EXISTS idx_user_bookmarks_anon_user_id;


DROP INDEX if EXISTS idx_user_playlists_anon_user_id;


DROP INDEX if EXISTS idx_user_playlist_groups_anon_user_id;


-- Drop anon_user_id related unique constraints
ALTER TABLE user_saved_image_sets
DROP CONSTRAINT if EXISTS user_saved_image_sets_anon_user_id_image_set_id_key;


ALTER TABLE user_bookmark_folders
DROP CONSTRAINT if EXISTS user_bookmark_folders_anon_user_id_name_key;


ALTER TABLE user_bookmarks
DROP CONSTRAINT if EXISTS user_bookmarks_anon_user_id_target_key;


ALTER TABLE user_playlist_groups
DROP CONSTRAINT if EXISTS user_playlist_groups_anon_user_id_name_key;


-- ============================================================================
-- STEP 4: Drop anon_user_id columns from user tables (except user_saved_versions which will be dropped entirely)
-- ============================================================================
-- Drop anon_user_id columns
ALTER TABLE user_saved_image_sets
DROP COLUMN IF EXISTS anon_user_id;


ALTER TABLE user_bookmark_folders
DROP COLUMN IF EXISTS anon_user_id;


ALTER TABLE user_bookmarks
DROP COLUMN IF EXISTS anon_user_id;


ALTER TABLE user_playlists
DROP COLUMN IF EXISTS anon_user_id;


ALTER TABLE user_playlist_groups
DROP COLUMN IF EXISTS anon_user_id;


-- Drop anon_user_id from chapter_listens (non-user table but should only be for authenticated users)
ALTER TABLE chapter_listens
DROP COLUMN IF EXISTS anon_user_id;


-- Make user_id NOT NULL again for these tables
ALTER TABLE user_saved_image_sets
ALTER COLUMN user_id
SET NOT NULL;


ALTER TABLE user_bookmark_folders
ALTER COLUMN user_id
SET NOT NULL;


ALTER TABLE user_bookmarks
ALTER COLUMN user_id
SET NOT NULL;


ALTER TABLE user_playlists
ALTER COLUMN user_id
SET NOT NULL;


ALTER TABLE user_playlist_groups
ALTER COLUMN user_id
SET NOT NULL;


-- ============================================================================
-- STEP 5: Create backup of existing user_saved_versions data before dropping table
-- ============================================================================
-- Create temporary backup table to preserve existing data
CREATE TEMP TABLE user_saved_versions_backup AS
SELECT
  *
FROM
  user_saved_versions;


-- Log the data we're backing up
DO $$
DECLARE
    backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM user_saved_versions_backup;
    RAISE NOTICE 'Backed up % records from user_saved_versions table', backup_count;
END $$;


-- ============================================================================
-- STEP 6: Drop the existing user_saved_versions table and related objects
-- ============================================================================
-- Drop indexes (policies already dropped in Step 1)
DROP INDEX if EXISTS idx_user_saved_versions_user_id;


DROP INDEX if EXISTS idx_user_saved_versions_audio_version_id;


DROP INDEX if EXISTS idx_user_saved_versions_text_version_id;


DROP INDEX if EXISTS idx_user_saved_versions_anon_user_id;


DROP INDEX if EXISTS idx_user_saved_versions_created_at;


-- Drop triggers
DROP TRIGGER if EXISTS update_user_saved_versions_updated_at ON user_saved_versions;


-- Drop the table itself (this will also drop all constraints)
DROP TABLE IF EXISTS user_saved_versions;


-- ============================================================================
-- STEP 7: Create user_saved_audio_versions table
-- ============================================================================
CREATE TABLE user_saved_audio_versions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
  audio_version_id UUID REFERENCES audio_versions (id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure user can only save each audio version once
  UNIQUE (user_id, audio_version_id)
);


-- ============================================================================
-- STEP 8: Create user_saved_text_versions table  
-- ============================================================================
CREATE TABLE user_saved_text_versions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
  text_version_id UUID REFERENCES text_versions (id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure user can only save each text version once
  UNIQUE (user_id, text_version_id)
);


-- ============================================================================
-- STEP 9: Create user_version_selections table
-- ============================================================================
CREATE TABLE user_version_selections (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
  current_audio_version_id UUID REFERENCES audio_versions (id) ON DELETE SET NULL,
  current_text_version_id UUID REFERENCES text_versions (id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure each user can only have one selection record
  UNIQUE (user_id)
);


-- ============================================================================
-- STEP 10: Create indexes for performance
-- ============================================================================
-- user_saved_audio_versions indexes
CREATE INDEX idx_user_saved_audio_versions_user_id ON user_saved_audio_versions (user_id);


CREATE INDEX idx_user_saved_audio_versions_audio_version_id ON user_saved_audio_versions (audio_version_id);


CREATE INDEX idx_user_saved_audio_versions_created_at ON user_saved_audio_versions (created_at);


-- user_saved_text_versions indexes
CREATE INDEX idx_user_saved_text_versions_user_id ON user_saved_text_versions (user_id);


CREATE INDEX idx_user_saved_text_versions_text_version_id ON user_saved_text_versions (text_version_id);


CREATE INDEX idx_user_saved_text_versions_created_at ON user_saved_text_versions (created_at);


-- user_version_selections indexes
CREATE INDEX idx_user_version_selections_user_id ON user_version_selections (user_id);


CREATE INDEX idx_user_version_selections_current_audio_version_id ON user_version_selections (current_audio_version_id)
WHERE
  current_audio_version_id IS NOT NULL;


CREATE INDEX idx_user_version_selections_current_text_version_id ON user_version_selections (current_text_version_id)
WHERE
  current_text_version_id IS NOT NULL;


-- ============================================================================
-- STEP 11: Create triggers for updated_at columns
-- ============================================================================
CREATE TRIGGER update_user_saved_audio_versions_updated_at before
UPDATE ON user_saved_audio_versions FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_user_saved_text_versions_updated_at before
UPDATE ON user_saved_text_versions FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_user_version_selections_updated_at before
UPDATE ON user_version_selections FOR each ROW
EXECUTE function update_updated_at_column ();


-- ============================================================================
-- STEP 12: Enable Row Level Security
-- ============================================================================
ALTER TABLE user_saved_audio_versions enable ROW level security;


ALTER TABLE user_saved_text_versions enable ROW level security;


ALTER TABLE user_version_selections enable ROW level security;


-- ============================================================================
-- STEP 13: Create RLS policies for user_saved_audio_versions
-- ============================================================================
-- SELECT policy
CREATE POLICY "Users can view own saved audio versions" ON user_saved_audio_versions FOR
SELECT
  USING (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


-- INSERT policy
CREATE POLICY "Users can insert own saved audio versions" ON user_saved_audio_versions FOR insert
WITH
  CHECK (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


-- UPDATE policy
CREATE POLICY "Users can update own saved audio versions" ON user_saved_audio_versions
FOR UPDATE
  USING (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


-- DELETE policy
CREATE POLICY "Users can delete own saved audio versions" ON user_saved_audio_versions FOR delete USING (
  user_id = (
    SELECT
      id
    FROM
      public.users
    WHERE
      id = auth.uid ()
  )
);


-- ============================================================================
-- STEP 14: Create RLS policies for user_saved_text_versions
-- ============================================================================
-- SELECT policy
CREATE POLICY "Users can view own saved text versions" ON user_saved_text_versions FOR
SELECT
  USING (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


-- INSERT policy
CREATE POLICY "Users can insert own saved text versions" ON user_saved_text_versions FOR insert
WITH
  CHECK (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


-- UPDATE policy
CREATE POLICY "Users can update own saved text versions" ON user_saved_text_versions
FOR UPDATE
  USING (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


-- DELETE policy
CREATE POLICY "Users can delete own saved text versions" ON user_saved_text_versions FOR delete USING (
  user_id = (
    SELECT
      id
    FROM
      public.users
    WHERE
      id = auth.uid ()
  )
);


-- ============================================================================
-- STEP 15: Create RLS policies for user_version_selections
-- ============================================================================
-- SELECT policy
CREATE POLICY "Users can view own version selections" ON user_version_selections FOR
SELECT
  USING (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


-- INSERT policy
CREATE POLICY "Users can insert own version selections" ON user_version_selections FOR insert
WITH
  CHECK (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


-- UPDATE policy
CREATE POLICY "Users can update own version selections" ON user_version_selections
FOR UPDATE
  USING (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


-- DELETE policy
CREATE POLICY "Users can delete own version selections" ON user_version_selections FOR delete USING (
  user_id = (
    SELECT
      id
    FROM
      public.users
    WHERE
      id = auth.uid ()
  )
);


-- ============================================================================
-- STEP 16: Migrate existing data from backup table
-- ============================================================================
-- Migrate audio version saved records
INSERT INTO
  user_saved_audio_versions (user_id, audio_version_id, created_at, updated_at)
SELECT
  user_id,
  audio_version_id,
  created_at,
  updated_at
FROM
  user_saved_versions_backup
WHERE
  audio_version_id IS NOT NULL
  AND user_id IS NOT NULL;


-- Migrate text version saved records  
INSERT INTO
  user_saved_text_versions (user_id, text_version_id, created_at, updated_at)
SELECT
  user_id,
  text_version_id,
  created_at,
  updated_at
FROM
  user_saved_versions_backup
WHERE
  text_version_id IS NOT NULL
  AND user_id IS NOT NULL;


-- Log migration results
DO $$
DECLARE
    audio_migrated_count INTEGER;
    text_migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO audio_migrated_count FROM user_saved_audio_versions;
    SELECT COUNT(*) INTO text_migrated_count FROM user_saved_text_versions;
    
    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE '  - Migrated % audio version records', audio_migrated_count;
    RAISE NOTICE '  - Migrated % text version records', text_migrated_count;
END $$;


-- ============================================================================
-- STEP 17: Recreate simplified RLS policies for other user tables (authenticated users only)
-- ============================================================================
-- Recreate RLS policies for user_saved_image_sets
CREATE POLICY "Users can view their own saved image sets" ON user_saved_image_sets FOR
SELECT
  USING (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


CREATE POLICY "Users can insert their own saved image sets" ON user_saved_image_sets FOR insert
WITH
  CHECK (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


CREATE POLICY "Users can delete their own saved image sets" ON user_saved_image_sets FOR delete USING (
  user_id = (
    SELECT
      id
    FROM
      public.users
    WHERE
      id = auth.uid ()
  )
);


-- Recreate RLS policies for user_bookmark_folders
CREATE POLICY "Users can view their own bookmark folders" ON user_bookmark_folders FOR
SELECT
  USING (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


CREATE POLICY "Users can insert their own bookmark folders" ON user_bookmark_folders FOR insert
WITH
  CHECK (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own bookmark folders" ON user_bookmark_folders
FOR UPDATE
  USING (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


CREATE POLICY "Users can delete their own bookmark folders" ON user_bookmark_folders FOR delete USING (
  user_id = (
    SELECT
      id
    FROM
      public.users
    WHERE
      id = auth.uid ()
  )
);


-- Recreate RLS policies for user_bookmarks
CREATE POLICY "Users can view their own bookmarks" ON user_bookmarks FOR
SELECT
  USING (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


CREATE POLICY "Users can insert their own bookmarks" ON user_bookmarks FOR insert
WITH
  CHECK (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own bookmarks" ON user_bookmarks
FOR UPDATE
  USING (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


CREATE POLICY "Users can delete their own bookmarks" ON user_bookmarks FOR delete USING (
  user_id = (
    SELECT
      id
    FROM
      public.users
    WHERE
      id = auth.uid ()
  )
);


-- Recreate RLS policies for user_playlists
CREATE POLICY "Users can view their own playlists" ON user_playlists FOR
SELECT
  USING (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


CREATE POLICY "Users can insert their own playlists" ON user_playlists FOR insert
WITH
  CHECK (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own playlists" ON user_playlists
FOR UPDATE
  USING (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


CREATE POLICY "Users can delete their own playlists" ON user_playlists FOR delete USING (
  user_id = (
    SELECT
      id
    FROM
      public.users
    WHERE
      id = auth.uid ()
  )
);


-- Recreate RLS policies for user_playlist_groups
CREATE POLICY "Users can view their own playlist groups" ON user_playlist_groups FOR
SELECT
  USING (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


CREATE POLICY "Users can insert their own playlist groups" ON user_playlist_groups FOR insert
WITH
  CHECK (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own playlist groups" ON user_playlist_groups
FOR UPDATE
  USING (
    user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        id = auth.uid ()
    )
  );


CREATE POLICY "Users can delete their own playlist groups" ON user_playlist_groups FOR delete USING (
  user_id = (
    SELECT
      id
    FROM
      public.users
    WHERE
      id = auth.uid ()
  )
);


-- ============================================================================
-- STEP 18: Add table comments for documentation
-- ============================================================================
comment ON TABLE user_saved_audio_versions IS 'User-saved audio versions for quick access and organization';


comment ON COLUMN user_saved_audio_versions.user_id IS 'Reference to authenticated user';


comment ON COLUMN user_saved_audio_versions.audio_version_id IS 'Reference to the saved audio version';


comment ON TABLE user_saved_text_versions IS 'User-saved text versions for quick access and organization';


comment ON COLUMN user_saved_text_versions.user_id IS 'Reference to authenticated user';


comment ON COLUMN user_saved_text_versions.text_version_id IS 'Reference to the saved text version';


comment ON TABLE user_version_selections IS 'Current version selections per user for quick access to preferred audio and text versions';


comment ON COLUMN user_version_selections.user_id IS 'Reference to authenticated user';


comment ON COLUMN user_version_selections.current_audio_version_id IS 'Currently selected audio version for this user';


comment ON COLUMN user_version_selections.current_text_version_id IS 'Currently selected text version for this user';


-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- Migration: 20250808000007_restructure_user_saved_versions_tables
-- 
-- Changes made:
-- 1. Dropped ALL RLS policies that referenced anon_user_id to prevent dependency errors
-- 2. Dropped anon_user_id columns and related constraints from all user tables
-- 3. Dropped the combined user_saved_versions table
-- 4. Created separate user_saved_audio_versions and user_saved_text_versions tables
-- 5. Created user_version_selections table for current user preferences
-- 6. Migrated existing data to the appropriate new tables (authenticated users only)
-- 7. Set up simplified RLS policies for authenticated users only
-- 8. Added performance indexes and triggers
-- 
-- Benefits:
-- - Clear separation of audio and text version saves
-- - Dedicated table for current user selections/preferences
-- - Simplified security model (authenticated users only for user tables)
-- - Better query performance with targeted indexes
-- - Cleaner RLS policies without complex anonymous user logic
-- - Analytics tables still support anonymous users as intended
