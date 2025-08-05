-- Add Anonymous User Support to User Tables Migration
-- This migration adds support for anonymous users alongside authenticated users
-- by making user_id nullable and adding anon_user_id foreign key references
-- ============================================================================
-- Step 1: Drop existing RLS policies that will need to be recreated
-- user_saved_versions policies
DROP POLICY if EXISTS "Users can view own saved versions" ON user_saved_versions;


DROP POLICY if EXISTS "Users can insert own saved versions" ON user_saved_versions;


DROP POLICY if EXISTS "Users can update own saved versions" ON user_saved_versions;


DROP POLICY if EXISTS "Users can delete own saved versions" ON user_saved_versions;


-- user_saved_image_sets policies  
DROP POLICY if EXISTS "Users can view their own saved image sets" ON user_saved_image_sets;


DROP POLICY if EXISTS "Users can insert their own saved image sets" ON user_saved_image_sets;


DROP POLICY if EXISTS "Users can delete their own saved image sets" ON user_saved_image_sets;


-- user_bookmark_folders policies
DROP POLICY if EXISTS "Users can view their own bookmark folders" ON user_bookmark_folders;


DROP POLICY if EXISTS "Users can insert their own bookmark folders" ON user_bookmark_folders;


DROP POLICY if EXISTS "Users can update their own bookmark folders" ON user_bookmark_folders;


DROP POLICY if EXISTS "Users can delete their own bookmark folders" ON user_bookmark_folders;


-- user_bookmarks policies
DROP POLICY if EXISTS "Users can view their own bookmarks" ON user_bookmarks;


DROP POLICY if EXISTS "Users can insert their own bookmarks" ON user_bookmarks;


DROP POLICY if EXISTS "Users can update their own bookmarks" ON user_bookmarks;


DROP POLICY if EXISTS "Users can delete their own bookmarks" ON user_bookmarks;


-- user_playlists policies
DROP POLICY if EXISTS "Users can view their own playlists" ON user_playlists;


DROP POLICY if EXISTS "Users can insert their own playlists" ON user_playlists;


DROP POLICY if EXISTS "Users can update their own playlists" ON user_playlists;


DROP POLICY if EXISTS "Users can delete their own playlists" ON user_playlists;


-- user_playlist_groups policies
DROP POLICY if EXISTS "Users can view their own playlist groups" ON user_playlist_groups;


DROP POLICY if EXISTS "Users can insert their own playlist groups" ON user_playlist_groups;


DROP POLICY if EXISTS "Users can update their own playlist groups" ON user_playlist_groups;


DROP POLICY if EXISTS "Users can delete their own playlist groups" ON user_playlist_groups;


-- Step 2: Drop existing unique constraints that involve user_id
-- user_saved_versions constraints
ALTER TABLE user_saved_versions
DROP CONSTRAINT if EXISTS user_saved_versions_user_id_audio_version_id_key;


ALTER TABLE user_saved_versions
DROP CONSTRAINT if EXISTS user_saved_versions_user_id_text_version_id_key;


-- user_saved_image_sets constraints
ALTER TABLE user_saved_image_sets
DROP CONSTRAINT if EXISTS user_saved_image_sets_user_id_set_id_key;


-- user_bookmark_folders constraints
ALTER TABLE user_bookmark_folders
DROP CONSTRAINT if EXISTS user_bookmark_folders_user_id_parent_folder_id_name_key;


-- user_bookmarks constraints
ALTER TABLE user_bookmarks
DROP CONSTRAINT if EXISTS user_bookmarks_user_id_target_type_target_id_key;


-- user_playlist_groups constraints
ALTER TABLE user_playlist_groups
DROP CONSTRAINT if EXISTS user_playlist_groups_user_id_name_key;


-- Note: user_playlists may not have a unique constraint on user_id, but we'll handle it
-- Step 3: Make user_id nullable on all target tables
ALTER TABLE user_saved_versions
ALTER COLUMN user_id
DROP NOT NULL;


ALTER TABLE user_saved_image_sets
ALTER COLUMN user_id
DROP NOT NULL;


ALTER TABLE user_bookmark_folders
ALTER COLUMN user_id
DROP NOT NULL;


ALTER TABLE user_bookmarks
ALTER COLUMN user_id
DROP NOT NULL;


ALTER TABLE user_playlists
ALTER COLUMN user_id
DROP NOT NULL;


ALTER TABLE user_playlist_groups
ALTER COLUMN user_id
DROP NOT NULL;


-- Step 4: Add anon_user_id columns
ALTER TABLE user_saved_versions
ADD COLUMN anon_user_id UUID REFERENCES users_anon (id) ON DELETE CASCADE;


ALTER TABLE user_saved_image_sets
ADD COLUMN anon_user_id UUID REFERENCES users_anon (id) ON DELETE CASCADE;


ALTER TABLE user_bookmark_folders
ADD COLUMN anon_user_id UUID REFERENCES users_anon (id) ON DELETE CASCADE;


ALTER TABLE user_bookmarks
ADD COLUMN anon_user_id UUID REFERENCES users_anon (id) ON DELETE CASCADE;


ALTER TABLE user_playlists
ADD COLUMN anon_user_id UUID REFERENCES users_anon (id) ON DELETE CASCADE;


ALTER TABLE user_playlist_groups
ADD COLUMN anon_user_id UUID REFERENCES users_anon (id) ON DELETE CASCADE;


-- Step 5: Add check constraints to ensure exactly one of user_id or anon_user_id is set
ALTER TABLE user_saved_versions
ADD CONSTRAINT check_user_saved_versions_exactly_one_user CHECK (
  (
    user_id IS NOT NULL
    AND anon_user_id IS NULL
  )
  OR (
    user_id IS NULL
    AND anon_user_id IS NOT NULL
  )
);


ALTER TABLE user_saved_image_sets
ADD CONSTRAINT check_user_saved_image_sets_exactly_one_user CHECK (
  (
    user_id IS NOT NULL
    AND anon_user_id IS NULL
  )
  OR (
    user_id IS NULL
    AND anon_user_id IS NOT NULL
  )
);


ALTER TABLE user_bookmark_folders
ADD CONSTRAINT check_user_bookmark_folders_exactly_one_user CHECK (
  (
    user_id IS NOT NULL
    AND anon_user_id IS NULL
  )
  OR (
    user_id IS NULL
    AND anon_user_id IS NOT NULL
  )
);


ALTER TABLE user_bookmarks
ADD CONSTRAINT check_user_bookmarks_exactly_one_user CHECK (
  (
    user_id IS NOT NULL
    AND anon_user_id IS NULL
  )
  OR (
    user_id IS NULL
    AND anon_user_id IS NOT NULL
  )
);


ALTER TABLE user_playlists
ADD CONSTRAINT check_user_playlists_exactly_one_user CHECK (
  (
    user_id IS NOT NULL
    AND anon_user_id IS NULL
  )
  OR (
    user_id IS NULL
    AND anon_user_id IS NOT NULL
  )
);


ALTER TABLE user_playlist_groups
ADD CONSTRAINT check_user_playlist_groups_exactly_one_user CHECK (
  (
    user_id IS NOT NULL
    AND anon_user_id IS NULL
  )
  OR (
    user_id IS NULL
    AND anon_user_id IS NOT NULL
  )
);


-- Step 6: Add updated unique constraints that handle both user types
-- user_saved_versions - unique constraints for authenticated users
ALTER TABLE user_saved_versions
ADD CONSTRAINT user_saved_versions_user_id_audio_version_id_key UNIQUE (user_id, audio_version_id);


ALTER TABLE user_saved_versions
ADD CONSTRAINT user_saved_versions_user_id_text_version_id_key UNIQUE (user_id, text_version_id);


-- user_saved_versions - unique constraints for anonymous users  
ALTER TABLE user_saved_versions
ADD CONSTRAINT user_saved_versions_anon_user_id_audio_version_id_key UNIQUE (anon_user_id, audio_version_id);


ALTER TABLE user_saved_versions
ADD CONSTRAINT user_saved_versions_anon_user_id_text_version_id_key UNIQUE (anon_user_id, text_version_id);


-- user_saved_image_sets - unique constraints
ALTER TABLE user_saved_image_sets
ADD CONSTRAINT user_saved_image_sets_user_id_set_id_key UNIQUE (user_id, set_id);


ALTER TABLE user_saved_image_sets
ADD CONSTRAINT user_saved_image_sets_anon_user_id_set_id_key UNIQUE (anon_user_id, set_id);


-- user_bookmark_folders - unique constraints  
ALTER TABLE user_bookmark_folders
ADD CONSTRAINT user_bookmark_folders_user_id_parent_name_key UNIQUE (user_id, parent_folder_id, name);


ALTER TABLE user_bookmark_folders
ADD CONSTRAINT user_bookmark_folders_anon_user_id_parent_name_key UNIQUE (anon_user_id, parent_folder_id, name);


-- user_bookmarks - unique constraints
ALTER TABLE user_bookmarks
ADD CONSTRAINT user_bookmarks_user_id_target_key UNIQUE (user_id, target_type, target_id);


ALTER TABLE user_bookmarks
ADD CONSTRAINT user_bookmarks_anon_user_id_target_key UNIQUE (anon_user_id, target_type, target_id);


-- user_playlist_groups - unique constraints (assuming there was a name uniqueness requirement)
ALTER TABLE user_playlist_groups
ADD CONSTRAINT user_playlist_groups_user_id_name_key UNIQUE (user_id, name);


ALTER TABLE user_playlist_groups
ADD CONSTRAINT user_playlist_groups_anon_user_id_name_key UNIQUE (anon_user_id, name);


-- Step 7: Add indexes for performance on anon_user_id columns
CREATE INDEX idx_user_saved_versions_anon_user_id ON user_saved_versions (anon_user_id)
WHERE
  anon_user_id IS NOT NULL;


CREATE INDEX idx_user_saved_image_sets_anon_user_id ON user_saved_image_sets (anon_user_id)
WHERE
  anon_user_id IS NOT NULL;


CREATE INDEX idx_user_bookmark_folders_anon_user_id ON user_bookmark_folders (anon_user_id)
WHERE
  anon_user_id IS NOT NULL;


CREATE INDEX idx_user_bookmarks_anon_user_id ON user_bookmarks (anon_user_id)
WHERE
  anon_user_id IS NOT NULL;


CREATE INDEX idx_user_playlists_anon_user_id ON user_playlists (anon_user_id)
WHERE
  anon_user_id IS NOT NULL;


CREATE INDEX idx_user_playlist_groups_anon_user_id ON user_playlist_groups (anon_user_id)
WHERE
  anon_user_id IS NOT NULL;


-- Step 8: Recreate RLS policies to handle both authenticated and anonymous users
-- user_saved_versions policies
CREATE POLICY "Users can view own saved versions" ON user_saved_versions FOR
SELECT
  USING (
    (
      user_id IS NOT NULL
      AND user_id IN (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can insert own saved versions" ON user_saved_versions FOR insert
WITH
  CHECK (
    (
      user_id IS NOT NULL
      AND user_id IN (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can update own saved versions" ON user_saved_versions
FOR UPDATE
  USING (
    (
      user_id IS NOT NULL
      AND user_id IN (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can delete own saved versions" ON user_saved_versions FOR delete USING (
  (
    user_id IS NOT NULL
    AND user_id IN (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        device_id = CURRENT_SETTING('app.current_device_id', TRUE)
    )
  )
);


-- user_saved_image_sets policies
CREATE POLICY "Users can view their own saved image sets" ON user_saved_image_sets FOR
SELECT
  USING (
    (
      user_id IS NOT NULL
      AND user_id = (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can insert their own saved image sets" ON user_saved_image_sets FOR insert
WITH
  CHECK (
    (
      user_id IS NOT NULL
      AND user_id = (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can delete their own saved image sets" ON user_saved_image_sets FOR delete USING (
  (
    user_id IS NOT NULL
    AND user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        device_id = CURRENT_SETTING('app.current_device_id', TRUE)
    )
  )
);


-- user_bookmark_folders policies
CREATE POLICY "Users can view their own bookmark folders" ON user_bookmark_folders FOR
SELECT
  USING (
    (
      user_id IS NOT NULL
      AND user_id = (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can insert their own bookmark folders" ON user_bookmark_folders FOR insert
WITH
  CHECK (
    (
      user_id IS NOT NULL
      AND user_id = (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can update their own bookmark folders" ON user_bookmark_folders
FOR UPDATE
  USING (
    (
      user_id IS NOT NULL
      AND user_id = (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can delete their own bookmark folders" ON user_bookmark_folders FOR delete USING (
  (
    user_id IS NOT NULL
    AND user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        device_id = CURRENT_SETTING('app.current_device_id', TRUE)
    )
  )
);


-- user_bookmarks policies
CREATE POLICY "Users can view their own bookmarks" ON user_bookmarks FOR
SELECT
  USING (
    (
      user_id IS NOT NULL
      AND user_id = (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can insert their own bookmarks" ON user_bookmarks FOR insert
WITH
  CHECK (
    (
      user_id IS NOT NULL
      AND user_id = (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can update their own bookmarks" ON user_bookmarks
FOR UPDATE
  USING (
    (
      user_id IS NOT NULL
      AND user_id = (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can delete their own bookmarks" ON user_bookmarks FOR delete USING (
  (
    user_id IS NOT NULL
    AND user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        device_id = CURRENT_SETTING('app.current_device_id', TRUE)
    )
  )
);


-- user_playlists policies
CREATE POLICY "Users can view their own playlists" ON user_playlists FOR
SELECT
  USING (
    (
      user_id IS NOT NULL
      AND user_id = (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can insert their own playlists" ON user_playlists FOR insert
WITH
  CHECK (
    (
      user_id IS NOT NULL
      AND user_id = (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can update their own playlists" ON user_playlists
FOR UPDATE
  USING (
    (
      user_id IS NOT NULL
      AND user_id = (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can delete their own playlists" ON user_playlists FOR delete USING (
  (
    user_id IS NOT NULL
    AND user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        device_id = CURRENT_SETTING('app.current_device_id', TRUE)
    )
  )
);


-- user_playlist_groups policies
CREATE POLICY "Users can view their own playlist groups" ON user_playlist_groups FOR
SELECT
  USING (
    (
      user_id IS NOT NULL
      AND user_id = (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can insert their own playlist groups" ON user_playlist_groups FOR insert
WITH
  CHECK (
    (
      user_id IS NOT NULL
      AND user_id = (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can update their own playlist groups" ON user_playlist_groups
FOR UPDATE
  USING (
    (
      user_id IS NOT NULL
      AND user_id = (
        SELECT
          id
        FROM
          public.users
        WHERE
          auth_uid = auth.uid ()
      )
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          device_id = CURRENT_SETTING('app.current_device_id', TRUE)
      )
    )
  );


CREATE POLICY "Users can delete their own playlist groups" ON user_playlist_groups FOR delete USING (
  (
    user_id IS NOT NULL
    AND user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        device_id = CURRENT_SETTING('app.current_device_id', TRUE)
    )
  )
);


-- Step 9: Add comments for documentation
comment ON COLUMN user_saved_versions.anon_user_id IS 'Reference to anonymous user (mutually exclusive with user_id)';


comment ON COLUMN user_saved_image_sets.anon_user_id IS 'Reference to anonymous user (mutually exclusive with user_id)';


comment ON COLUMN user_bookmark_folders.anon_user_id IS 'Reference to anonymous user (mutually exclusive with user_id)';


comment ON COLUMN user_bookmarks.anon_user_id IS 'Reference to anonymous user (mutually exclusive with user_id)';


comment ON COLUMN user_playlists.anon_user_id IS 'Reference to anonymous user (mutually exclusive with user_id)';


comment ON COLUMN user_playlist_groups.anon_user_id IS 'Reference to anonymous user (mutually exclusive with user_id)';
