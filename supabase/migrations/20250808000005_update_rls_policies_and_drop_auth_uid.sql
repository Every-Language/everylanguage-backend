-- Update RLS Policies and Drop auth_uid Columns (Phase 2)
-- This migration updates all RLS policies to use direct ID relationships instead of auth_uid lookups
-- and then safely drops the auth_uid columns from users and users_anon tables
-- ============================================================================
-- ============================================================================
-- STEP 1: Drop all existing policies that reference auth_uid
-- ============================================================================
-- We'll drop all the policies and recreate them with simplified logic
-- Audio versions policies
DROP POLICY if EXISTS "Consolidated view audio_versions" ON public.audio_versions;


DROP POLICY if EXISTS "audio_versions_update_own" ON public.audio_versions;


-- Image sets policies  
DROP POLICY if EXISTS "Users can insert their own image_sets" ON public.image_sets;


DROP POLICY if EXISTS "Users can delete their own image_sets" ON public.image_sets;


DROP POLICY if EXISTS "Users can update their own image_sets" ON public.image_sets;


DROP POLICY if EXISTS "Users can view their own image_sets" ON public.image_sets;


-- Images policies
DROP POLICY if EXISTS "Users can insert their own images" ON public.images;


DROP POLICY if EXISTS "Users can delete their own images" ON public.images;


DROP POLICY if EXISTS "Users can update their own images" ON public.images;


DROP POLICY if EXISTS "Users can view their own images" ON public.images;


-- Language entity versions policies
DROP POLICY if EXISTS "Users can delete their own language_entity_versions" ON public.language_entity_versions;


DROP POLICY if EXISTS "Users can update their own language_entity_versions" ON public.language_entity_versions;


DROP POLICY if EXISTS "Users can view their own language_entity_versions" ON public.language_entity_versions;


-- Media files policies
DROP POLICY if EXISTS "Consolidated media_files view policy" ON public.media_files;


DROP POLICY if EXISTS "Users can update their own media_files" ON public.media_files;


DROP POLICY if EXISTS "Users can view media_files" ON public.media_files;


-- Media files tags policies
DROP POLICY if EXISTS "Users can delete their own media_files_tags" ON public.media_files_tags;


DROP POLICY if EXISTS "Users can update their own media_files_tags" ON public.media_files_tags;


DROP POLICY if EXISTS "Users can view media_files_tags" ON public.media_files_tags;


-- Media files targets policies
DROP POLICY if EXISTS "Users can update their own media_files_targets" ON public.media_files_targets;


DROP POLICY if EXISTS "Users can view media_files_targets" ON public.media_files_targets;


-- Media files verses policies
DROP POLICY if EXISTS "Users can delete their own media_files_verses" ON public.media_files_verses;


DROP POLICY if EXISTS "Users can update their own media_files_verses" ON public.media_files_verses;


DROP POLICY if EXISTS "Users can view media_files_verses" ON public.media_files_verses;


-- Passages policies
DROP POLICY if EXISTS "Final consolidated view passages" ON public.passages;


DROP POLICY if EXISTS "Users can insert their own passages" ON public.passages;


DROP POLICY if EXISTS "Users can delete their own passages" ON public.passages;


DROP POLICY if EXISTS "Users can update their own passages" ON public.passages;


DROP POLICY if EXISTS "Users can view passages" ON public.passages;


DROP POLICY if EXISTS "Users can view their own passages" ON public.passages;


-- Permissions policies
DROP POLICY if EXISTS "Final consolidated view permissions" ON public.permissions;


-- Playlist items policies
DROP POLICY if EXISTS "Users can insert their own playlist_items" ON public.playlist_items;


DROP POLICY if EXISTS "Users can delete their own playlist_items" ON public.playlist_items;


DROP POLICY if EXISTS "Users can update their own playlist_items" ON public.playlist_items;


DROP POLICY if EXISTS "Users can view their own playlist_items" ON public.playlist_items;


-- Playlists policies
DROP POLICY if EXISTS "Users can insert their own playlists" ON public.playlists;


DROP POLICY if EXISTS "Users can delete their own playlists" ON public.playlists;


DROP POLICY if EXISTS "Users can update their own playlists" ON public.playlists;


DROP POLICY if EXISTS "Users can view their own playlists" ON public.playlists;


-- Projects policies
DROP POLICY if EXISTS "Users can update their own projects" ON public.projects;


DROP POLICY if EXISTS "Users can view their own projects" ON public.projects;


-- Region versions policies
DROP POLICY if EXISTS "Users can delete their own region_versions" ON public.region_versions;


DROP POLICY if EXISTS "Users can update their own region_versions" ON public.region_versions;


DROP POLICY if EXISTS "Users can view their own region_versions" ON public.region_versions;


-- Segments policies
DROP POLICY if EXISTS "Users can update their own segments" ON public.segments;


DROP POLICY if EXISTS "Users can view their own segments" ON public.segments;


-- Segments targets policies
DROP POLICY if EXISTS "Users can delete their own segments_targets" ON public.segments_targets;


DROP POLICY if EXISTS "Users can update their own segments_targets" ON public.segments_targets;


DROP POLICY if EXISTS "Users can view their own segments_targets" ON public.segments_targets;


-- Sequences policies
DROP POLICY if EXISTS "Users can update their own sequences" ON public.sequences;


DROP POLICY if EXISTS "Users can view their own sequences" ON public.sequences;


-- Sequences segments policies
DROP POLICY if EXISTS "Users can delete their own sequences_segments" ON public.sequences_segments;


DROP POLICY if EXISTS "Users can update their own sequences_segments" ON public.sequences_segments;


DROP POLICY if EXISTS "Users can view their own sequences_segments" ON public.sequences_segments;


-- Sequences tags policies
DROP POLICY if EXISTS "Users can delete their own sequences_tags" ON public.sequences_tags;


DROP POLICY if EXISTS "Users can update their own sequences_tags" ON public.sequences_tags;


DROP POLICY if EXISTS "Users can view their own sequences_tags" ON public.sequences_tags;


-- Sequences targets policies
DROP POLICY if EXISTS "Users can update their own sequences_targets" ON public.sequences_targets;


DROP POLICY if EXISTS "Users can view their own sequences_targets" ON public.sequences_targets;


-- Tags policies
DROP POLICY if EXISTS "Users can delete their own tags" ON public.tags;


DROP POLICY if EXISTS "Users can update their own tags" ON public.tags;


DROP POLICY if EXISTS "Users can view tags" ON public.tags;


-- Text versions policies
DROP POLICY if EXISTS "Consolidated text_versions view policy" ON public.text_versions;


DROP POLICY if EXISTS "Users can update their own text_versions" ON public.text_versions;


DROP POLICY if EXISTS "Users can view text_versions" ON public.text_versions;


-- User bookmark folders policies
DROP POLICY if EXISTS "Users can insert their own bookmark folders" ON public.user_bookmark_folders;


DROP POLICY if EXISTS "Users can delete their own bookmark folders" ON public.user_bookmark_folders;


DROP POLICY if EXISTS "Users can delete their own user_bookmark_folders" ON public.user_bookmark_folders;


DROP POLICY if EXISTS "Users can update their own bookmark folders" ON public.user_bookmark_folders;


DROP POLICY if EXISTS "Users can update their own user_bookmark_folders" ON public.user_bookmark_folders;


DROP POLICY if EXISTS "Users can view their own bookmark folders" ON public.user_bookmark_folders;


DROP POLICY if EXISTS "Users can view their own user_bookmark_folders" ON public.user_bookmark_folders;


-- User bookmarks policies
DROP POLICY if EXISTS "Users can insert their own bookmarks" ON public.user_bookmarks;


DROP POLICY if EXISTS "Users can delete their own bookmarks" ON public.user_bookmarks;


DROP POLICY if EXISTS "Users can delete their own user_bookmarks" ON public.user_bookmarks;


DROP POLICY if EXISTS "Users can update their own bookmarks" ON public.user_bookmarks;


DROP POLICY if EXISTS "Users can update their own user_bookmarks" ON public.user_bookmarks;


DROP POLICY if EXISTS "Users can view their own bookmarks" ON public.user_bookmarks;


DROP POLICY if EXISTS "Users can view their own user_bookmarks" ON public.user_bookmarks;


-- User contributions policies
DROP POLICY if EXISTS "Users can create user_contributions" ON public.user_contributions;


DROP POLICY if EXISTS "Users can insert user_contributions" ON public.user_contributions;


DROP POLICY if EXISTS "Users can delete their own user_contributions" ON public.user_contributions;


DROP POLICY if EXISTS "Users can update their own user_contributions" ON public.user_contributions;


DROP POLICY if EXISTS "Users can view their own contributions" ON public.user_contributions;


DROP POLICY if EXISTS "Users can view user_contributions" ON public.user_contributions;


-- User custom texts policies
DROP POLICY if EXISTS "Users can insert their own user_custom_texts" ON public.user_custom_texts;


DROP POLICY if EXISTS "Users can delete their own user_custom_texts" ON public.user_custom_texts;


DROP POLICY if EXISTS "Users can update their own user_custom_texts" ON public.user_custom_texts;


DROP POLICY if EXISTS "Users can view their own user_custom_texts" ON public.user_custom_texts;


-- User playlist groups policies
DROP POLICY if EXISTS "Users can insert their own playlist groups" ON public.user_playlist_groups;


DROP POLICY if EXISTS "Users can delete their own playlist groups" ON public.user_playlist_groups;


DROP POLICY if EXISTS "Users can update their own playlist groups" ON public.user_playlist_groups;


DROP POLICY if EXISTS "Users can view their own playlist groups" ON public.user_playlist_groups;


-- User playlists policies
DROP POLICY if EXISTS "Users can insert their own playlists" ON public.user_playlists;


DROP POLICY if EXISTS "Users can delete their own playlists" ON public.user_playlists;


DROP POLICY if EXISTS "Users can update their own playlists" ON public.user_playlists;


DROP POLICY if EXISTS "Users can view their own playlists" ON public.user_playlists;


-- User roles policies
DROP POLICY if EXISTS "Users can view own roles" ON public.user_roles;


-- User saved image sets policies
DROP POLICY if EXISTS "Users can insert their own saved image sets" ON public.user_saved_image_sets;


DROP POLICY if EXISTS "Users can delete their own saved image sets" ON public.user_saved_image_sets;


DROP POLICY if EXISTS "Users can view their own saved image sets" ON public.user_saved_image_sets;


-- User saved versions policies
DROP POLICY if EXISTS "Final consolidated view user_saved_versions" ON public.user_saved_versions;


DROP POLICY if EXISTS "Users can insert own saved versions" ON public.user_saved_versions;


DROP POLICY if EXISTS "Users can delete own saved versions" ON public.user_saved_versions;


DROP POLICY if EXISTS "Users can update own saved versions" ON public.user_saved_versions;


DROP POLICY if EXISTS "Users can view own saved versions" ON public.user_saved_versions;


-- Users policies
DROP POLICY if EXISTS "Users can insert own profile" ON public.users;


DROP POLICY if EXISTS "Users can update own profile" ON public.users;


DROP POLICY if EXISTS "Users can view own profile" ON public.users;


-- Users anon policies
DROP POLICY if EXISTS "Anonymous users can insert their own records" ON public.users_anon;


DROP POLICY if EXISTS "Anonymous users can read their own records" ON public.users_anon;


DROP POLICY if EXISTS "Anonymous users can update their own records" ON public.users_anon;


-- Verse feedback policies
DROP POLICY if EXISTS "Users can delete their own verse_feedback" ON public.verse_feedback;


DROP POLICY if EXISTS "Users can update their own verse_feedback" ON public.verse_feedback;


-- Verse texts policies
DROP POLICY if EXISTS "Final consolidated view verse_texts" ON public.verse_texts;


DROP POLICY if EXISTS "Users can delete their own verse_texts" ON public.verse_texts;


DROP POLICY if EXISTS "Users can update their own verse_texts" ON public.verse_texts;


DROP POLICY if EXISTS "Users can view verse_texts" ON public.verse_texts;


-- ============================================================================
-- STEP 2: Create new simplified policies using direct ID relationships
-- ============================================================================
-- Now we can use auth.uid() directly since users.id = auth.users.id
-- Audio versions policies
CREATE POLICY "Users can view audio_versions" ON public.audio_versions FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert audio_versions" ON public.audio_versions FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own audio_versions" ON public.audio_versions
FOR UPDATE
  USING (created_by = auth.uid ());


-- Image sets policies
CREATE POLICY "Users can view image_sets" ON public.image_sets FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert image_sets" ON public.image_sets FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own image_sets" ON public.image_sets
FOR UPDATE
  USING (created_by = auth.uid ());


CREATE POLICY "Users can delete own image_sets" ON public.image_sets FOR delete USING (created_by = auth.uid ());


-- Images policies
CREATE POLICY "Users can view images" ON public.images FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert images" ON public.images FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own images" ON public.images
FOR UPDATE
  USING (created_by = auth.uid ());


CREATE POLICY "Users can delete own images" ON public.images FOR delete USING (created_by = auth.uid ());


-- Language entity versions policies
CREATE POLICY "Users can view language_entity_versions" ON public.language_entity_versions FOR
SELECT
  USING (
    TRUE
    OR changed_by = auth.uid ()
  );


CREATE POLICY "Users can insert language_entity_versions" ON public.language_entity_versions FOR insert
WITH
  CHECK (changed_by = auth.uid ());


CREATE POLICY "Users can update own language_entity_versions" ON public.language_entity_versions
FOR UPDATE
  USING (changed_by = auth.uid ());


CREATE POLICY "Users can delete own language_entity_versions" ON public.language_entity_versions FOR delete USING (changed_by = auth.uid ());


-- Media files policies
CREATE POLICY "Users can view media_files" ON public.media_files FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert media_files" ON public.media_files FOR insert
WITH
  CHECK (
    auth.role () = 'authenticated'
    AND created_by = auth.uid ()
  );


CREATE POLICY "Users can update own media_files" ON public.media_files
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = auth.uid ()
  );


-- Media files tags policies
CREATE POLICY "Users can view media_files_tags" ON public.media_files_tags FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert media_files_tags" ON public.media_files_tags FOR insert
WITH
  CHECK (
    auth.role () = 'authenticated'
    AND created_by = auth.uid ()
  );


CREATE POLICY "Users can update own media_files_tags" ON public.media_files_tags
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = auth.uid ()
  );


CREATE POLICY "Users can delete own media_files_tags" ON public.media_files_tags FOR delete USING (
  auth.role () = 'authenticated'
  AND created_by = auth.uid ()
);


-- Media files targets policies
CREATE POLICY "Users can view media_files_targets" ON public.media_files_targets FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert media_files_targets" ON public.media_files_targets FOR insert
WITH
  CHECK (
    auth.role () = 'authenticated'
    AND created_by = auth.uid ()
  );


CREATE POLICY "Users can update own media_files_targets" ON public.media_files_targets
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = auth.uid ()
  );


-- Media files verses policies
CREATE POLICY "Users can view media_files_verses" ON public.media_files_verses FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert media_files_verses" ON public.media_files_verses FOR insert
WITH
  CHECK (
    auth.role () = 'authenticated'
    AND created_by = auth.uid ()
  );


CREATE POLICY "Users can update own media_files_verses" ON public.media_files_verses
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = auth.uid ()
  );


CREATE POLICY "Users can delete own media_files_verses" ON public.media_files_verses FOR delete USING (
  auth.role () = 'authenticated'
  AND created_by = auth.uid ()
);


-- Passages policies
CREATE POLICY "Users can view passages" ON public.passages FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert passages" ON public.passages FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own passages" ON public.passages
FOR UPDATE
  USING (created_by = auth.uid ());


CREATE POLICY "Users can delete own passages" ON public.passages FOR delete USING (created_by = auth.uid ());


-- Permissions policies
CREATE POLICY "Users can view permissions" ON public.permissions FOR
SELECT
  USING (
    auth.role () = 'authenticated'
    OR role_id IN (
      SELECT
        ur.role_id
      FROM
        user_roles ur
      WHERE
        ur.user_id = auth.uid ()
    )
  );


-- Playlist items policies
CREATE POLICY "Users can view playlist_items" ON public.playlist_items FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert playlist_items" ON public.playlist_items FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own playlist_items" ON public.playlist_items
FOR UPDATE
  USING (created_by = auth.uid ());


CREATE POLICY "Users can delete own playlist_items" ON public.playlist_items FOR delete USING (created_by = auth.uid ());


-- Playlists policies
CREATE POLICY "Users can view playlists" ON public.playlists FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert playlists" ON public.playlists FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own playlists" ON public.playlists
FOR UPDATE
  USING (created_by = auth.uid ());


CREATE POLICY "Users can delete own playlists" ON public.playlists FOR delete USING (created_by = auth.uid ());


-- Projects policies
CREATE POLICY "Users can view projects" ON public.projects FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert projects" ON public.projects FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own projects" ON public.projects
FOR UPDATE
  USING (created_by = auth.uid ());


-- Region versions policies
CREATE POLICY "Users can view region_versions" ON public.region_versions FOR
SELECT
  USING (
    TRUE
    OR changed_by = auth.uid ()
  );


CREATE POLICY "Users can insert region_versions" ON public.region_versions FOR insert
WITH
  CHECK (changed_by = auth.uid ());


CREATE POLICY "Users can update own region_versions" ON public.region_versions
FOR UPDATE
  USING (changed_by = auth.uid ());


CREATE POLICY "Users can delete own region_versions" ON public.region_versions FOR delete USING (changed_by = auth.uid ());


-- Segments policies
CREATE POLICY "Users can view segments" ON public.segments FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert segments" ON public.segments FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own segments" ON public.segments
FOR UPDATE
  USING (created_by = auth.uid ());


-- Segments targets policies
CREATE POLICY "Users can view segments_targets" ON public.segments_targets FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert segments_targets" ON public.segments_targets FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own segments_targets" ON public.segments_targets
FOR UPDATE
  USING (created_by = auth.uid ());


CREATE POLICY "Users can delete own segments_targets" ON public.segments_targets FOR delete USING (created_by = auth.uid ());


-- Sequences policies
CREATE POLICY "Users can view sequences" ON public.sequences FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert sequences" ON public.sequences FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own sequences" ON public.sequences
FOR UPDATE
  USING (created_by = auth.uid ());


-- Sequences segments policies
CREATE POLICY "Users can view sequences_segments" ON public.sequences_segments FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert sequences_segments" ON public.sequences_segments FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own sequences_segments" ON public.sequences_segments
FOR UPDATE
  USING (created_by = auth.uid ());


CREATE POLICY "Users can delete own sequences_segments" ON public.sequences_segments FOR delete USING (created_by = auth.uid ());


-- Sequences tags policies
CREATE POLICY "Users can view sequences_tags" ON public.sequences_tags FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert sequences_tags" ON public.sequences_tags FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own sequences_tags" ON public.sequences_tags
FOR UPDATE
  USING (created_by = auth.uid ());


CREATE POLICY "Users can delete own sequences_tags" ON public.sequences_tags FOR delete USING (created_by = auth.uid ());


-- Sequences targets policies
CREATE POLICY "Users can view sequences_targets" ON public.sequences_targets FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert sequences_targets" ON public.sequences_targets FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own sequences_targets" ON public.sequences_targets
FOR UPDATE
  USING (created_by = auth.uid ());


-- Tags policies
CREATE POLICY "Users can view tags" ON public.tags FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert tags" ON public.tags FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own tags" ON public.tags
FOR UPDATE
  USING (created_by = auth.uid ());


CREATE POLICY "Users can delete own tags" ON public.tags FOR delete USING (created_by = auth.uid ());


-- Text versions policies
CREATE POLICY "Users can view text_versions" ON public.text_versions FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert text_versions" ON public.text_versions FOR insert
WITH
  CHECK (
    auth.role () = 'authenticated'
    AND created_by = auth.uid ()
  );


CREATE POLICY "Users can update own text_versions" ON public.text_versions
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = auth.uid ()
  );


-- User bookmark folders policies
CREATE POLICY "Users can view user_bookmark_folders" ON public.user_bookmark_folders FOR
SELECT
  USING (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can insert user_bookmark_folders" ON public.user_bookmark_folders FOR insert
WITH
  CHECK (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can update user_bookmark_folders" ON public.user_bookmark_folders
FOR UPDATE
  USING (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can delete user_bookmark_folders" ON public.user_bookmark_folders FOR delete USING (
  (
    user_id IS NOT NULL
    AND user_id = auth.uid ()
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id = auth.uid ()
  )
);


-- User bookmarks policies
CREATE POLICY "Users can view user_bookmarks" ON public.user_bookmarks FOR
SELECT
  USING (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can insert user_bookmarks" ON public.user_bookmarks FOR insert
WITH
  CHECK (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can update user_bookmarks" ON public.user_bookmarks
FOR UPDATE
  USING (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can delete user_bookmarks" ON public.user_bookmarks FOR delete USING (
  (
    user_id IS NOT NULL
    AND user_id = auth.uid ()
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id = auth.uid ()
  )
);


-- User contributions policies
CREATE POLICY "Users can view user_contributions" ON public.user_contributions FOR
SELECT
  USING (
    TRUE
    OR changed_by = auth.uid ()
  );


CREATE POLICY "Users can insert user_contributions" ON public.user_contributions FOR insert
WITH
  CHECK (
    auth.role () = 'authenticated'
    AND changed_by = auth.uid ()
  );


CREATE POLICY "Users can update own user_contributions" ON public.user_contributions
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND changed_by = auth.uid ()
  );


CREATE POLICY "Users can delete own user_contributions" ON public.user_contributions FOR delete USING (
  auth.role () = 'authenticated'
  AND changed_by = auth.uid ()
);


-- User custom texts policies
CREATE POLICY "Users can view user_custom_texts" ON public.user_custom_texts FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert user_custom_texts" ON public.user_custom_texts FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own user_custom_texts" ON public.user_custom_texts
FOR UPDATE
  USING (created_by = auth.uid ());


CREATE POLICY "Users can delete own user_custom_texts" ON public.user_custom_texts FOR delete USING (created_by = auth.uid ());


-- User playlist groups policies
CREATE POLICY "Users can view user_playlist_groups" ON public.user_playlist_groups FOR
SELECT
  USING (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can insert user_playlist_groups" ON public.user_playlist_groups FOR insert
WITH
  CHECK (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can update user_playlist_groups" ON public.user_playlist_groups
FOR UPDATE
  USING (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can delete user_playlist_groups" ON public.user_playlist_groups FOR delete USING (
  (
    user_id IS NOT NULL
    AND user_id = auth.uid ()
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id = auth.uid ()
  )
);


-- User playlists policies
CREATE POLICY "Users can view user_playlists" ON public.user_playlists FOR
SELECT
  USING (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can insert user_playlists" ON public.user_playlists FOR insert
WITH
  CHECK (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can update user_playlists" ON public.user_playlists
FOR UPDATE
  USING (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can delete user_playlists" ON public.user_playlists FOR delete USING (
  (
    user_id IS NOT NULL
    AND user_id = auth.uid ()
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id = auth.uid ()
  )
);


-- User roles policies
CREATE POLICY "Users can view user_roles" ON public.user_roles FOR
SELECT
  USING (user_id = auth.uid ());


-- User saved image sets policies
CREATE POLICY "Users can view user_saved_image_sets" ON public.user_saved_image_sets FOR
SELECT
  USING (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can insert user_saved_image_sets" ON public.user_saved_image_sets FOR insert
WITH
  CHECK (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can delete user_saved_image_sets" ON public.user_saved_image_sets FOR delete USING (
  (
    user_id IS NOT NULL
    AND user_id = auth.uid ()
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id = auth.uid ()
  )
);


-- User saved versions policies
CREATE POLICY "Users can view user_saved_versions" ON public.user_saved_versions FOR
SELECT
  USING (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can insert user_saved_versions" ON public.user_saved_versions FOR insert
WITH
  CHECK (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can update user_saved_versions" ON public.user_saved_versions
FOR UPDATE
  USING (
    (
      user_id IS NOT NULL
      AND user_id = auth.uid ()
    )
    OR (
      anon_user_id IS NOT NULL
      AND anon_user_id = auth.uid ()
    )
  );


CREATE POLICY "Users can delete user_saved_versions" ON public.user_saved_versions FOR delete USING (
  (
    user_id IS NOT NULL
    AND user_id = auth.uid ()
  )
  OR (
    anon_user_id IS NOT NULL
    AND anon_user_id = auth.uid ()
  )
);


-- Users policies (simplified)
CREATE POLICY "Users can view own profile" ON public.users FOR
SELECT
  USING (id = auth.uid ());


CREATE POLICY "Users can insert own profile" ON public.users FOR insert
WITH
  CHECK (id = auth.uid ());


CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE
  USING (id = auth.uid ());


-- Users anon policies (simplified)
CREATE POLICY "Anonymous users can view own record" ON public.users_anon FOR
SELECT
  USING (id = auth.uid ());


CREATE POLICY "Anonymous users can insert own record" ON public.users_anon FOR insert
WITH
  CHECK (id = auth.uid ());


CREATE POLICY "Anonymous users can update own record" ON public.users_anon
FOR UPDATE
  USING (id = auth.uid ());


-- Verse feedback policies
CREATE POLICY "Users can view verse_feedback" ON public.verse_feedback FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert verse_feedback" ON public.verse_feedback FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own verse_feedback" ON public.verse_feedback
FOR UPDATE
  USING (created_by = auth.uid ());


CREATE POLICY "Users can delete own verse_feedback" ON public.verse_feedback FOR delete USING (created_by = auth.uid ());


-- Verse texts policies
CREATE POLICY "Users can view verse_texts" ON public.verse_texts FOR
SELECT
  USING (
    TRUE
    OR created_by = auth.uid ()
  );


CREATE POLICY "Users can insert verse_texts" ON public.verse_texts FOR insert
WITH
  CHECK (created_by = auth.uid ());


CREATE POLICY "Users can update own verse_texts" ON public.verse_texts
FOR UPDATE
  USING (created_by = auth.uid ());


CREATE POLICY "Users can delete own verse_texts" ON public.verse_texts FOR delete USING (created_by = auth.uid ());


-- ============================================================================
-- STEP 3: Update the trigger function to remove auth_uid references
-- ============================================================================
-- Update the trigger function to only set the id field
CREATE OR REPLACE FUNCTION public.handle_new_auth_user () returns trigger AS $$
DECLARE
    user_metadata JSONB;
    device_id_value TEXT;
BEGIN
    -- Get user metadata
    user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    -- Extract device_id from metadata, use NULL if not provided
    device_id_value := user_metadata->>'device_id';
    
    -- Check if this is an anonymous user using the is_anonymous flag
    IF NEW.is_anonymous = true THEN
        -- Anonymous user: create record in users_anon table with same ID as auth.users
        INSERT INTO public.users_anon (
            id,                -- Use the same ID as auth.users.id
            device_id,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,            -- Same ID as the auth.users record
            device_id_value,   -- Will be NULL if not provided in metadata
            NOW(),
            NOW()
        );
        
        -- Log the creation (optional, for debugging)
        RAISE LOG 'Created anonymous user record with id: % and device_id: %', NEW.id, COALESCE(device_id_value, 'NULL');
        
    ELSE
        -- Authenticated user: create record in public.users table with same ID as auth.users
        INSERT INTO public.users (
            id,                -- Use the same ID as auth.users.id
            email,
            first_name,
            last_name,
            phone_number,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,            -- Same ID as the auth.users record
            NEW.email,
            user_metadata->>'first_name',
            user_metadata->>'last_name',
            COALESCE(NEW.phone, user_metadata->>'phone_number'), -- Use auth.users.phone or fallback to metadata
            NOW(),
            NOW()
        );
        
        -- Log the creation (optional, for debugging)
        RAISE LOG 'Created authenticated user record with id: % email: % and phone: %', NEW.id, NEW.email, NEW.phone;
        
    END IF;
    
    RETURN NEW;
END;
$$ language plpgsql security definer;


-- ============================================================================
-- STEP 4: Drop auth_uid foreign key constraints and columns
-- ============================================================================
-- Drop foreign key constraints first
ALTER TABLE public.users
DROP CONSTRAINT if EXISTS users_auth_uid_fkey;


ALTER TABLE public.users_anon
DROP CONSTRAINT if EXISTS users_anon_auth_uid_fkey;


-- Drop the auth_uid columns
ALTER TABLE public.users
DROP COLUMN IF EXISTS auth_uid;


ALTER TABLE public.users_anon
DROP COLUMN IF EXISTS auth_uid;


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON function public.handle_new_auth_user () IS 'Automatically creates user records in either users_anon or public.users table with id set to the same value as auth.users.id. Uses direct ID relationships for optimal performance. Uses SECURITY DEFINER to ensure proper permissions. Device ID is set to NULL if not provided.';


-- ============================================================================
-- ADDITIONAL NOTES
-- ============================================================================
-- Migration: 20250807112733_update_rls_policies_and_drop_auth_uid
-- 
-- Changes made:
-- 1. Updated all RLS policies to use direct auth.uid() comparisons instead of auth_uid lookups
-- 2. Simplified policies by removing complex subqueries
-- 3. Updated trigger function to only set id field (no more auth_uid)
-- 4. Dropped auth_uid columns completely
-- 
-- Benefits:
-- - Massively improved performance (no more expensive subqueries)
-- - Simplified policy logic (direct ID comparisons)
-- - Clean data model with direct relationships
-- - Follows Supabase best practices
-- 
-- IMPORTANT: This migration completes the transition to the new ID system.
-- All applications must be using the id field instead of auth_uid before running this migration.
