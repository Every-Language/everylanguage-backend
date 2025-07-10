-- Add comprehensive RLS policies for all tables
-- This migration adds proper RLS policies with specific permissions for authenticated/unauthenticated users
-- ============================================================================
-- POLICIES FOR ALL USERS (AUTH AND UNAUTH) - VIEW ONLY
-- ============================================================================
CREATE POLICY "All users can view tags" ON tags FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view media_files_tags" ON media_files_tags FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view media_files" ON media_files FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view media_files_targets" ON media_files_targets FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view media_files_verses" ON media_files_verses FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view verse_texts" ON verse_texts FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view text_versions" ON text_versions FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view bible_versions" ON bible_versions FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view books" ON books FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view chapters" ON chapters FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view verses" ON verses FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view passages" ON passages FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view regions" ON regions FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view region_aliases" ON region_aliases FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view region_sources" ON region_sources FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view region_properties" ON region_properties FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view language_entities_regions" ON language_entities_regions FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view language_entity_sources" ON language_entity_sources FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view language_aliases" ON language_aliases FOR
SELECT
  USING (TRUE);


CREATE POLICY "All users can view language_properties" ON language_properties FOR
SELECT
  USING (TRUE);


-- ============================================================================
-- POLICIES FOR AUTHENTICATED USERS - INSERT ONLY
-- ============================================================================
CREATE POLICY "Authenticated users can insert tags" ON tags FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert media_files_tags" ON media_files_tags FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert media_files" ON media_files FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert media_files_targets" ON media_files_targets FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert media_files_verses" ON media_files_verses FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert verse_texts" ON verse_texts FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert text_versions" ON text_versions FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert bible_versions" ON bible_versions FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert books" ON books FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert chapters" ON chapters FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert verses" ON verses FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert passages" ON passages FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert regions" ON regions FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert region_aliases" ON region_aliases FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert region_sources" ON region_sources FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert region_properties" ON region_properties FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert language_entities_regions" ON language_entities_regions FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert language_entity_sources" ON language_entity_sources FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert language_aliases" ON language_aliases FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert language_properties" ON language_properties FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert user_custom_texts" ON user_custom_texts FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert user_positions" ON user_positions FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert user_bookmarks" ON user_bookmarks FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert playlist_items" ON playlist_items FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert user_bookmark_folders" ON user_bookmark_folders FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert playlists" ON playlists FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert playlists_playlist_groups" ON playlists_playlist_groups FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert playlist_groups" ON playlist_groups FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert projects" ON projects FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert sequences" ON sequences FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert sequences_tags" ON sequences_tags FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert sequences_targets" ON sequences_targets FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert sequences_segments" ON sequences_segments FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert segments" ON segments FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert segments_targets" ON segments_targets FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert region_versions" ON region_versions FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert language_entity_versions" ON language_entity_versions FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


CREATE POLICY "Authenticated users can insert user_contributions" ON user_contributions FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


-- ============================================================================
-- POLICIES FOR AUTHENTICATED USERS - VIEW AND UPDATE THEIR OWN RECORDS
-- ============================================================================
CREATE POLICY "Users can view their own tags" ON tags FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own tags" ON tags
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own media_files_tags" ON media_files_tags FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own media_files_tags" ON media_files_tags
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own media_files" ON media_files FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own media_files" ON media_files
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own media_files_targets" ON media_files_targets FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own media_files_targets" ON media_files_targets
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own media_files_verses" ON media_files_verses FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own media_files_verses" ON media_files_verses
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own verse_texts" ON verse_texts FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own verse_texts" ON verse_texts
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own text_versions" ON text_versions FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own text_versions" ON text_versions
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own passages" ON passages FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own passages" ON passages
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own user_custom_texts" ON user_custom_texts FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own user_custom_texts" ON user_custom_texts
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own user_positions" ON user_positions FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own user_positions" ON user_positions
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own user_bookmarks" ON user_bookmarks FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own user_bookmarks" ON user_bookmarks
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own playlist_items" ON playlist_items FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own playlist_items" ON playlist_items
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own user_bookmark_folders" ON user_bookmark_folders FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own user_bookmark_folders" ON user_bookmark_folders
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND user_id = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own playlists" ON playlists FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own playlists" ON playlists
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own playlists_playlist_groups" ON playlists_playlist_groups FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own playlists_playlist_groups" ON playlists_playlist_groups
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own playlist_groups" ON playlist_groups FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own playlist_groups" ON playlist_groups
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own projects" ON projects FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own projects" ON projects
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own sequences" ON sequences FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own sequences" ON sequences
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own sequences_tags" ON sequences_tags FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own sequences_tags" ON sequences_tags
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own sequences_targets" ON sequences_targets FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own sequences_targets" ON sequences_targets
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own sequences_segments" ON sequences_segments FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own sequences_segments" ON sequences_segments
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own segments" ON segments FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own segments" ON segments
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own segments_targets" ON segments_targets FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own segments_targets" ON segments_targets
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own region_versions" ON region_versions FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND changed_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own region_versions" ON region_versions
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND changed_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own language_entity_versions" ON language_entity_versions FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND changed_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own language_entity_versions" ON language_entity_versions
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND changed_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can view their own user_contributions" ON user_contributions FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    AND changed_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can update their own user_contributions" ON user_contributions
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND changed_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


-- ============================================================================
-- POLICIES FOR AUTHENTICATED USERS - DELETE THEIR OWN RECORDS
-- ============================================================================
CREATE POLICY "Users can delete their own tags" ON tags FOR delete USING (
  auth.role () = 'authenticated'
  AND created_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


CREATE POLICY "Users can delete their own media_files_tags" ON media_files_tags FOR delete USING (
  auth.role () = 'authenticated'
  AND created_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


CREATE POLICY "Users can delete their own passages" ON passages FOR delete USING (
  auth.role () = 'authenticated'
  AND created_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


CREATE POLICY "Users can delete their own user_custom_texts" ON user_custom_texts FOR delete USING (
  auth.role () = 'authenticated'
  AND created_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


CREATE POLICY "Users can delete their own user_positions" ON user_positions FOR delete USING (
  auth.role () = 'authenticated'
  AND user_id = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


CREATE POLICY "Users can delete their own user_bookmarks" ON user_bookmarks FOR delete USING (
  auth.role () = 'authenticated'
  AND user_id = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


CREATE POLICY "Users can delete their own playlist_items" ON playlist_items FOR delete USING (
  auth.role () = 'authenticated'
  AND created_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


CREATE POLICY "Users can delete their own user_bookmark_folders" ON user_bookmark_folders FOR delete USING (
  auth.role () = 'authenticated'
  AND user_id = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


CREATE POLICY "Users can delete their own playlists" ON playlists FOR delete USING (
  auth.role () = 'authenticated'
  AND created_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


CREATE POLICY "Users can delete their own playlists_playlist_groups" ON playlists_playlist_groups FOR delete USING (
  auth.role () = 'authenticated'
  AND created_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


CREATE POLICY "Users can delete their own playlist_groups" ON playlist_groups FOR delete USING (
  auth.role () = 'authenticated'
  AND created_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


CREATE POLICY "Users can delete their own sequences_tags" ON sequences_tags FOR delete USING (
  auth.role () = 'authenticated'
  AND created_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


CREATE POLICY "Users can delete their own sequences_segments" ON sequences_segments FOR delete USING (
  auth.role () = 'authenticated'
  AND created_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


CREATE POLICY "Users can delete their own segments_targets" ON segments_targets FOR delete USING (
  auth.role () = 'authenticated'
  AND created_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


CREATE POLICY "Users can delete their own region_versions" ON region_versions FOR delete USING (
  auth.role () = 'authenticated'
  AND changed_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


CREATE POLICY "Users can delete their own language_entity_versions" ON language_entity_versions FOR delete USING (
  auth.role () = 'authenticated'
  AND changed_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


CREATE POLICY "Users can delete their own user_contributions" ON user_contributions FOR delete USING (
  auth.role () = 'authenticated'
  AND changed_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON TABLE media_files IS 'Audio/video files with metadata and status tracking - RLS policies allow all users to view, authenticated users to create, and users to manage their own files';


comment ON TABLE media_files_targets IS 'Links media files to their content targets - RLS policies allow all users to view, authenticated users to create, and users to manage their own associations';


comment ON TABLE media_files_verses IS 'Timestamp mappings for verses within media files - RLS policies allow all users to view, authenticated users to create, and users to manage their own mappings';
