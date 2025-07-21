-- Create User Saved Versions Table
-- This migration creates a table for users to save their preferred audio and text versions
-- with proper foreign key constraints for data integrity
-- ============================================================================
-- ============================================================================
-- USER SAVED VERSIONS TABLE
-- ============================================================================
-- Table for users to save their preferred versions with separate FK-constrained columns
CREATE TABLE user_saved_versions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
  audio_project_id UUID REFERENCES projects (id) ON DELETE CASCADE,
  text_version_id UUID REFERENCES text_versions (id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure exactly one version type is set
  CONSTRAINT check_exactly_one_version CHECK (
    (
      audio_project_id IS NOT NULL
      AND text_version_id IS NULL
    )
    OR (
      audio_project_id IS NULL
      AND text_version_id IS NOT NULL
    )
  ),
  -- Ensure user can only save each version once
  UNIQUE (user_id, audio_project_id),
  UNIQUE (user_id, text_version_id)
);


-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_user_saved_versions_user_id ON user_saved_versions (user_id);


CREATE INDEX idx_user_saved_versions_audio_project_id ON user_saved_versions (audio_project_id)
WHERE
  audio_project_id IS NOT NULL;


CREATE INDEX idx_user_saved_versions_text_version_id ON user_saved_versions (text_version_id)
WHERE
  text_version_id IS NOT NULL;


CREATE INDEX idx_user_saved_versions_created_at ON user_saved_versions (created_at);


-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE TRIGGER update_user_saved_versions_updated_at before
UPDATE ON user_saved_versions FOR each ROW
EXECUTE function update_updated_at_column ();


-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- Enable RLS on the table
ALTER TABLE user_saved_versions enable ROW level security;


-- Users can only view their own saved versions
CREATE POLICY "Users can view own saved versions" ON user_saved_versions FOR
SELECT
  USING (
    user_id IN (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


-- Users can insert their own saved versions
CREATE POLICY "Users can insert own saved versions" ON user_saved_versions FOR insert
WITH
  CHECK (
    user_id IN (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


-- Users can update their own saved versions
CREATE POLICY "Users can update own saved versions" ON user_saved_versions
FOR UPDATE
  USING (
    user_id IN (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


-- Users can delete their own saved versions
CREATE POLICY "Users can delete own saved versions" ON user_saved_versions FOR delete USING (
  user_id IN (
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
comment ON TABLE user_saved_versions IS 'User-saved preferred audio and text versions with proper FK constraints';


comment ON COLUMN user_saved_versions.audio_project_id IS 'Reference to saved audio project (mutually exclusive with text_version_id)';


comment ON COLUMN user_saved_versions.text_version_id IS 'Reference to saved text version (mutually exclusive with audio_project_id)';


comment ON COLUMN user_saved_versions.user_id IS 'Reference to the user who saved this version';
