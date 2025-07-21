-- Add Audio Versions Table and Related Foreign Keys
-- This migration creates the audio_versions table and adds foreign key relationships
-- to text_versions and media_files tables
-- ============================================================================
-- ============================================================================
-- CREATE AUDIO_VERSIONS TABLE
-- ============================================================================
CREATE TABLE audio_versions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  language_entity_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  bible_version_id TEXT REFERENCES bible_versions (id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects (id) ON DELETE SET NULL,
  name TEXT NOT NULL, -- e.g., OMT, NIV, NLT, ESV
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (language_entity_id, bible_version_id, name)
);


-- ============================================================================
-- ADD FOREIGN KEY COLUMNS TO EXISTING TABLES
-- ============================================================================
-- Add project_id to text_versions table
ALTER TABLE text_versions
ADD COLUMN project_id UUID REFERENCES projects (id) ON DELETE SET NULL;


-- Add audio_version_id to media_files table
ALTER TABLE media_files
ADD COLUMN audio_version_id UUID REFERENCES audio_versions (id) ON DELETE SET NULL;


-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
-- Audio versions table indexes
CREATE INDEX idx_audio_versions_language_entity_id ON audio_versions (language_entity_id);


CREATE INDEX idx_audio_versions_bible_version_id ON audio_versions (bible_version_id);


CREATE INDEX idx_audio_versions_project_id ON audio_versions (project_id)
WHERE
  project_id IS NOT NULL;


CREATE INDEX idx_audio_versions_name ON audio_versions (name);


CREATE INDEX idx_audio_versions_created_by ON audio_versions (created_by)
WHERE
  created_by IS NOT NULL;


CREATE INDEX idx_audio_versions_created_at ON audio_versions (created_at);


-- Additional indexes for updated tables
CREATE INDEX idx_text_versions_project_id ON text_versions (project_id)
WHERE
  project_id IS NOT NULL;


CREATE INDEX idx_media_files_audio_version_id ON media_files (audio_version_id)
WHERE
  audio_version_id IS NOT NULL;


-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- Enable RLS for audio_versions table
ALTER TABLE audio_versions enable ROW level security;


-- Allow all users (auth and unauth) to read audio_versions
CREATE POLICY "audio_versions_select_all" ON audio_versions FOR
SELECT
  USING (TRUE);


-- Allow authenticated users to insert audio_versions
CREATE POLICY "audio_versions_insert_auth" ON audio_versions FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


-- Allow users to update their own audio_versions
CREATE POLICY "audio_versions_update_own" ON audio_versions
FOR UPDATE
  USING (auth.uid () = created_by);


-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
-- Create trigger for audio_versions updated_at
CREATE TRIGGER update_audio_versions_updated_at before
UPDATE ON audio_versions FOR each ROW
EXECUTE function update_updated_at_column ();


-- ============================================================================
-- COMMENTS
-- ============================================================================
comment ON TABLE audio_versions IS 'Audio versions table for organizing audio content by translation/version (e.g., OMT, NIV, NLT, ESV)';


comment ON COLUMN audio_versions.language_entity_id IS 'Reference to the language entity this audio version belongs to';


comment ON COLUMN audio_versions.bible_version_id IS 'Reference to the bible version structure this audio version follows';


comment ON COLUMN audio_versions.project_id IS 'Optional reference to the project this audio version belongs to';


comment ON COLUMN audio_versions.name IS 'Name/identifier of the audio version (e.g., OMT, NIV, NLT, ESV)';


comment ON COLUMN text_versions.project_id IS 'Optional reference to the project this text version belongs to';


comment ON COLUMN media_files.audio_version_id IS 'Reference to the audio version this media file belongs to';
