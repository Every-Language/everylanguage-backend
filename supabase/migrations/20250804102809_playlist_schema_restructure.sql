-- Playlist Schema Restructure Migration
-- This migration reorganizes the playlist system to be user-centric
-- Step 1: Drop existing tables (in correct order to handle foreign key dependencies)
DROP TABLE IF EXISTS playlists_playlist_groups cascade;


DROP TABLE IF EXISTS playlist_groups cascade;


DROP TABLE IF EXISTS user_positions cascade;


-- Step 2: Modify playlists table
-- First drop existing RLS policies that depend on user_id column
DROP POLICY if EXISTS "Users can view their own playlists" ON playlists;


DROP POLICY if EXISTS "Users can insert their own playlists" ON playlists;


DROP POLICY if EXISTS "Users can update their own playlists" ON playlists;


DROP POLICY if EXISTS "Users can delete their own playlists" ON playlists;


-- Remove user_id column
ALTER TABLE playlists
DROP COLUMN IF EXISTS user_id;


-- Add image_id column (nullable foreign key to images.id)
ALTER TABLE playlists
ADD COLUMN image_id UUID REFERENCES images (id);


-- Step 3: Create user_playlist_groups table
CREATE TABLE user_playlist_groups (
  id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Step 4: Create user_playlists table
CREATE TABLE user_playlists (
  id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
  user_playlist_group_id UUID REFERENCES user_playlist_groups (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  image_id UUID REFERENCES images (id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Step 5: Create user_saved_image_sets table
CREATE TABLE user_saved_image_sets (
  id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  set_id UUID NOT NULL REFERENCES image_sets (id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Unique constraint to prevent duplicate saves
  UNIQUE (user_id, set_id)
);


-- Step 6: Add indexes for performance
CREATE INDEX idx_user_playlist_groups_user_id ON user_playlist_groups (user_id);


CREATE INDEX idx_user_playlist_groups_created_at ON user_playlist_groups (created_at);


CREATE INDEX idx_user_playlists_user_id ON user_playlists (user_id);


CREATE INDEX idx_user_playlists_playlist_id ON user_playlists (playlist_id);


CREATE INDEX idx_user_playlists_user_playlist_group_id ON user_playlists (user_playlist_group_id);


CREATE INDEX idx_user_playlists_image_id ON user_playlists (image_id);


CREATE INDEX idx_user_playlists_created_at ON user_playlists (created_at);


CREATE INDEX idx_user_saved_image_sets_user_id ON user_saved_image_sets (user_id);


CREATE INDEX idx_user_saved_image_sets_set_id ON user_saved_image_sets (set_id);


CREATE INDEX idx_user_saved_image_sets_created_at ON user_saved_image_sets (created_at);


CREATE INDEX idx_playlists_image_id ON playlists (image_id);


-- Step 7: Enable Row Level Security (RLS)
ALTER TABLE user_playlist_groups enable ROW level security;


ALTER TABLE user_playlists enable ROW level security;


ALTER TABLE user_saved_image_sets enable ROW level security;


-- Step 8: Create RLS policies
-- user_playlist_groups policies
CREATE POLICY "Users can view their own playlist groups" ON user_playlist_groups FOR
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


CREATE POLICY "Users can insert their own playlist groups" ON user_playlist_groups FOR insert
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


CREATE POLICY "Users can update their own playlist groups" ON user_playlist_groups
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
  )
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


CREATE POLICY "Users can delete their own playlist groups" ON user_playlist_groups FOR delete USING (
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


-- user_playlists policies
CREATE POLICY "Users can view their own playlists" ON user_playlists FOR
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


CREATE POLICY "Users can insert their own playlists" ON user_playlists FOR insert
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


CREATE POLICY "Users can update their own playlists" ON user_playlists
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
  )
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


CREATE POLICY "Users can delete their own playlists" ON user_playlists FOR delete USING (
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


-- user_saved_image_sets policies
CREATE POLICY "Users can view their own saved image sets" ON user_saved_image_sets FOR
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


CREATE POLICY "Users can insert their own saved image sets" ON user_saved_image_sets FOR insert
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


CREATE POLICY "Users can delete their own saved image sets" ON user_saved_image_sets FOR delete USING (
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


-- Step 9: Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION trigger_set_timestamp () returns trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;


CREATE TRIGGER set_timestamp_user_playlist_groups before
UPDATE ON user_playlist_groups FOR each ROW
EXECUTE function trigger_set_timestamp ();


CREATE TRIGGER set_timestamp_user_playlists before
UPDATE ON user_playlists FOR each ROW
EXECUTE function trigger_set_timestamp ();
