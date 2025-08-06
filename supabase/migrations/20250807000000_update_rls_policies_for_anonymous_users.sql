-- Update RLS Policies for Anonymous User Support
-- This migration updates RLS policies to allow anonymous users to insert, update, and delete their own records
-- and removes insertion policies for books, chapters, and verses
-- ============================================================================
-- ============================================================================
-- PART 1: ADD AUTH_UID TO USERS_ANON TABLE
-- ============================================================================
-- Add auth_uid column to users_anon table to reference auth.users.id
ALTER TABLE users_anon
ADD COLUMN IF NOT EXISTS auth_uid UUID REFERENCES auth.users (id) ON DELETE CASCADE;


-- Create unique index for performance
CREATE UNIQUE INDEX if NOT EXISTS idx_users_anon_auth_uid ON users_anon (auth_uid);


-- ============================================================================
-- PART 2: DROP INSERTION POLICIES FOR BOOKS, CHAPTERS, VERSES
-- ============================================================================
-- Drop insertion policies for books, chapters, verses (content should be managed differently)
DROP POLICY if EXISTS "Authenticated users can insert books" ON books;


DROP POLICY if EXISTS "Authenticated users can insert chapters" ON chapters;


DROP POLICY if EXISTS "Authenticated users can insert verses" ON verses;


-- ============================================================================
-- PART 3: UPDATE RLS POLICIES FOR USER TABLES TO SUPPORT ANONYMOUS USERS
-- ============================================================================
-- Update policies for user_saved_versions
DROP POLICY if EXISTS "Users can view own saved versions" ON user_saved_versions;


DROP POLICY if EXISTS "Users can insert own saved versions" ON user_saved_versions;


DROP POLICY if EXISTS "Users can update own saved versions" ON user_saved_versions;


DROP POLICY if EXISTS "Users can delete own saved versions" ON user_saved_versions;


CREATE POLICY "Users can view own saved versions" ON user_saved_versions FOR
SELECT
  TO authenticated USING (
    (
      user_id IS NOT NULL
      AND user_id IN (
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
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can insert own saved versions" ON user_saved_versions FOR insert TO authenticated
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
          auth_uid = (
            SELECT
              auth.uid ()
          )
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
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can update own saved versions" ON user_saved_versions
FOR UPDATE
  TO authenticated USING (
    (
      user_id IS NOT NULL
      AND user_id IN (
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
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can delete own saved versions" ON user_saved_versions FOR delete TO authenticated USING (
  (
    user_id IS NOT NULL
    AND user_id IN (
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
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  )
);


-- Update policies for user_saved_image_sets
DROP POLICY if EXISTS "Users can view their own saved image sets" ON user_saved_image_sets;


DROP POLICY if EXISTS "Users can insert their own saved image sets" ON user_saved_image_sets;


DROP POLICY if EXISTS "Users can update their own saved image sets" ON user_saved_image_sets;


DROP POLICY if EXISTS "Users can delete their own saved image sets" ON user_saved_image_sets;


CREATE POLICY "Users can view their own saved image sets" ON user_saved_image_sets FOR
SELECT
  TO authenticated USING (
    (
      user_id IS NOT NULL
      AND user_id IN (
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
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can insert their own saved image sets" ON user_saved_image_sets FOR insert TO authenticated
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
          auth_uid = (
            SELECT
              auth.uid ()
          )
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
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can delete their own saved image sets" ON user_saved_image_sets FOR delete TO authenticated USING (
  (
    user_id IS NOT NULL
    AND user_id IN (
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
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  )
);


-- Update policies for user_bookmark_folders
DROP POLICY if EXISTS "Users can view their own bookmark folders" ON user_bookmark_folders;


DROP POLICY if EXISTS "Users can insert their own bookmark folders" ON user_bookmark_folders;


DROP POLICY if EXISTS "Users can update their own bookmark folders" ON user_bookmark_folders;


DROP POLICY if EXISTS "Users can delete their own bookmark folders" ON user_bookmark_folders;


CREATE POLICY "Users can view their own bookmark folders" ON user_bookmark_folders FOR
SELECT
  TO authenticated USING (
    (
      user_id IS NOT NULL
      AND user_id IN (
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
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can insert their own bookmark folders" ON user_bookmark_folders FOR insert TO authenticated
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
          auth_uid = (
            SELECT
              auth.uid ()
          )
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
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can update their own bookmark folders" ON user_bookmark_folders
FOR UPDATE
  TO authenticated USING (
    (
      user_id IS NOT NULL
      AND user_id IN (
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
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can delete their own bookmark folders" ON user_bookmark_folders FOR delete TO authenticated USING (
  (
    user_id IS NOT NULL
    AND user_id IN (
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
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  )
);


-- Update policies for user_bookmarks
DROP POLICY if EXISTS "Users can view their own bookmarks" ON user_bookmarks;


DROP POLICY if EXISTS "Users can insert their own bookmarks" ON user_bookmarks;


DROP POLICY if EXISTS "Users can update their own bookmarks" ON user_bookmarks;


DROP POLICY if EXISTS "Users can delete their own bookmarks" ON user_bookmarks;


CREATE POLICY "Users can view their own bookmarks" ON user_bookmarks FOR
SELECT
  TO authenticated USING (
    (
      user_id IS NOT NULL
      AND user_id IN (
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
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can insert their own bookmarks" ON user_bookmarks FOR insert TO authenticated
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
          auth_uid = (
            SELECT
              auth.uid ()
          )
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
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can update their own bookmarks" ON user_bookmarks
FOR UPDATE
  TO authenticated USING (
    (
      user_id IS NOT NULL
      AND user_id IN (
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
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can delete their own bookmarks" ON user_bookmarks FOR delete TO authenticated USING (
  (
    user_id IS NOT NULL
    AND user_id IN (
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
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  )
);


-- Update policies for user_playlist_groups
DROP POLICY if EXISTS "Users can view their own playlist groups" ON user_playlist_groups;


DROP POLICY if EXISTS "Users can insert their own playlist groups" ON user_playlist_groups;


DROP POLICY if EXISTS "Users can update their own playlist groups" ON user_playlist_groups;


DROP POLICY if EXISTS "Users can delete their own playlist groups" ON user_playlist_groups;


CREATE POLICY "Users can view their own playlist groups" ON user_playlist_groups FOR
SELECT
  TO authenticated USING (
    (
      user_id IS NOT NULL
      AND user_id IN (
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
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can insert their own playlist groups" ON user_playlist_groups FOR insert TO authenticated
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
          auth_uid = (
            SELECT
              auth.uid ()
          )
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
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can update their own playlist groups" ON user_playlist_groups
FOR UPDATE
  TO authenticated USING (
    (
      user_id IS NOT NULL
      AND user_id IN (
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
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can delete their own playlist groups" ON user_playlist_groups FOR delete TO authenticated USING (
  (
    user_id IS NOT NULL
    AND user_id IN (
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
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  )
);


-- Update policies for user_playlists
DROP POLICY if EXISTS "Users can view their own playlists" ON user_playlists;


DROP POLICY if EXISTS "Users can insert their own playlists" ON user_playlists;


DROP POLICY if EXISTS "Users can update their own playlists" ON user_playlists;


DROP POLICY if EXISTS "Users can delete their own playlists" ON user_playlists;


CREATE POLICY "Users can view their own playlists" ON user_playlists FOR
SELECT
  TO authenticated USING (
    (
      user_id IS NOT NULL
      AND user_id IN (
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
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can insert their own playlists" ON user_playlists FOR insert TO authenticated
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
          auth_uid = (
            SELECT
              auth.uid ()
          )
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
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can update their own playlists" ON user_playlists
FOR UPDATE
  TO authenticated USING (
    (
      user_id IS NOT NULL
      AND user_id IN (
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
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can delete their own playlists" ON user_playlists FOR delete TO authenticated USING (
  (
    user_id IS NOT NULL
    AND user_id IN (
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
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  )
);


-- ============================================================================
-- PART 4: UPDATE POLICIES FOR PLAYLISTS (CONTENT TABLES)
-- ============================================================================
-- playlists table - update to support anonymous users
DROP POLICY if EXISTS "Users can view their own playlists" ON playlists;


DROP POLICY if EXISTS "Users can insert their own playlists" ON playlists;


DROP POLICY if EXISTS "Users can update their own playlists" ON playlists;


DROP POLICY if EXISTS "Users can delete their own playlists" ON playlists;


DROP POLICY if EXISTS "Authenticated users can insert playlists" ON playlists;


-- Create new policies for playlists that support both authenticated and anonymous users
CREATE POLICY "Users can view their own playlists" ON playlists FOR
SELECT
  TO authenticated USING (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can insert their own playlists" ON playlists FOR insert TO authenticated
WITH
  CHECK (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can update their own playlists" ON playlists
FOR UPDATE
  TO authenticated USING (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can delete their own playlists" ON playlists FOR delete TO authenticated USING (
  (
    created_by IN (
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
  )
  OR (
    created_by IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  )
);


-- ============================================================================
-- PART 5: UPDATE POLICIES FOR PLAYLIST_ITEMS
-- ============================================================================
-- playlist_items table - update to support anonymous users
DROP POLICY if EXISTS "Users can view their own playlist_items" ON playlist_items;


DROP POLICY if EXISTS "Users can insert their own playlist_items" ON playlist_items;


DROP POLICY if EXISTS "Users can update their own playlist_items" ON playlist_items;


DROP POLICY if EXISTS "Users can delete their own playlist_items" ON playlist_items;


DROP POLICY if EXISTS "Authenticated users can insert playlist_items" ON playlist_items;


-- Create new policies for playlist_items that support both authenticated and anonymous users
CREATE POLICY "Users can view their own playlist_items" ON playlist_items FOR
SELECT
  TO authenticated USING (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can insert their own playlist_items" ON playlist_items FOR insert TO authenticated
WITH
  CHECK (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can update their own playlist_items" ON playlist_items
FOR UPDATE
  TO authenticated USING (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can delete their own playlist_items" ON playlist_items FOR delete TO authenticated USING (
  (
    created_by IN (
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
  )
  OR (
    created_by IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  )
);


-- ============================================================================
-- PART 6: UPDATE POLICIES FOR USER_CUSTOM_TEXTS
-- ============================================================================
-- user_custom_texts table - update to support anonymous users
DROP POLICY if EXISTS "Users can view their own user_custom_texts" ON user_custom_texts;


DROP POLICY if EXISTS "Users can insert their own user_custom_texts" ON user_custom_texts;


DROP POLICY if EXISTS "Users can update their own user_custom_texts" ON user_custom_texts;


DROP POLICY if EXISTS "Users can delete their own user_custom_texts" ON user_custom_texts;


DROP POLICY if EXISTS "Authenticated users can insert user_custom_texts" ON user_custom_texts;


-- Create new policies for user_custom_texts that support both authenticated and anonymous users
CREATE POLICY "Users can view their own user_custom_texts" ON user_custom_texts FOR
SELECT
  TO authenticated USING (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can insert their own user_custom_texts" ON user_custom_texts FOR insert TO authenticated
WITH
  CHECK (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can update their own user_custom_texts" ON user_custom_texts
FOR UPDATE
  TO authenticated USING (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can delete their own user_custom_texts" ON user_custom_texts FOR delete TO authenticated USING (
  (
    created_by IN (
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
  )
  OR (
    created_by IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  )
);


-- ============================================================================
-- PART 7: UPDATE POLICIES FOR PASSAGES
-- ============================================================================
-- passages table - update to support anonymous users
DROP POLICY if EXISTS "Users can view their own passages" ON passages;


DROP POLICY if EXISTS "Users can insert their own passages" ON passages;


DROP POLICY if EXISTS "Users can update their own passages" ON passages;


DROP POLICY if EXISTS "Users can delete their own passages" ON passages;


DROP POLICY if EXISTS "Authenticated users can insert passages" ON passages;


-- Create new policies for passages that support both authenticated and anonymous users
CREATE POLICY "Users can view their own passages" ON passages FOR
SELECT
  TO authenticated USING (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can insert their own passages" ON passages FOR insert TO authenticated
WITH
  CHECK (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can update their own passages" ON passages
FOR UPDATE
  TO authenticated USING (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can delete their own passages" ON passages FOR delete TO authenticated USING (
  (
    created_by IN (
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
  )
  OR (
    created_by IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  )
);


-- ============================================================================
-- PART 8: UPDATE POLICIES FOR IMAGES
-- ============================================================================
-- images table - update to support anonymous users
DROP POLICY if EXISTS "All users can view images" ON images;


DROP POLICY if EXISTS "Users can view their own images" ON images;


DROP POLICY if EXISTS "Users can update their own images" ON images;


DROP POLICY if EXISTS "Users can insert their own images" ON images;


DROP POLICY if EXISTS "Users can delete their own images" ON images;


DROP POLICY if EXISTS "Authenticated users can insert images" ON images;


-- Create new policies for images that support both authenticated and anonymous users
CREATE POLICY "Users can view their own images" ON images FOR
SELECT
  TO authenticated USING (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can insert their own images" ON images FOR insert TO authenticated
WITH
  CHECK (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can update their own images" ON images
FOR UPDATE
  TO authenticated USING (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can delete their own images" ON images FOR delete TO authenticated USING (
  (
    created_by IN (
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
  )
  OR (
    created_by IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  )
);


-- ============================================================================
-- PART 9: UPDATE POLICIES FOR IMAGE_SETS
-- ============================================================================
-- image_sets table - update to support anonymous users
DROP POLICY if EXISTS "All users can view image_sets" ON image_sets;


DROP POLICY if EXISTS "Users can view their own image_sets" ON image_sets;


DROP POLICY if EXISTS "Users can update their own image_sets" ON image_sets;


DROP POLICY if EXISTS "Users can insert their own image_sets" ON image_sets;


DROP POLICY if EXISTS "Users can delete their own image_sets" ON image_sets;


DROP POLICY if EXISTS "Authenticated users can insert image_sets" ON image_sets;


-- Create new policies for image_sets that support both authenticated and anonymous users
CREATE POLICY "Users can view their own image_sets" ON image_sets FOR
SELECT
  TO authenticated USING (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can insert their own image_sets" ON image_sets FOR insert TO authenticated
WITH
  CHECK (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can update their own image_sets" ON image_sets
FOR UPDATE
  TO authenticated USING (
    (
      created_by IN (
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
    )
    OR (
      created_by IN (
        SELECT
          id
        FROM
          users_anon
        WHERE
          auth_uid = (
            SELECT
              auth.uid ()
          )
      )
    )
  );


CREATE POLICY "Users can delete their own image_sets" ON image_sets FOR delete TO authenticated USING (
  (
    created_by IN (
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
  )
  OR (
    created_by IN (
      SELECT
        id
      FROM
        users_anon
      WHERE
        auth_uid = (
          SELECT
            auth.uid ()
        )
    )
  )
);


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
-- Migration: 20250807000000_update_rls_policies_for_anonymous_users
-- Description: Updated RLS policies to support anonymous users via auth_uid lookup, 
-- added auth_uid column to users_anon table, removed insertion policies for 
-- books/chapters/verses, and applied production-ready RLS optimizations
