-- Schema Improvements Migration
-- This migration implements several schema improvements:
-- 1. Remove local_path column from media_files
-- 2. Add chapter_id to media_files (optional FK to chapters)
-- 3. Remove verse_text_id from media_files_verses
-- 4. Rename audio_project_id to audio_version_id in user_saved_versions and update FK
-- 5. Unique constraint on media_files_verses already exists, so no action needed
-- ============================================================================
-- ============================================================================
-- 1. REMOVE local_path COLUMN FROM media_files
-- ============================================================================
ALTER TABLE media_files
DROP COLUMN IF EXISTS local_path;


-- ============================================================================
-- 2. ADD chapter_id TO media_files (OPTIONAL FK TO chapters)
-- ============================================================================
ALTER TABLE media_files
ADD COLUMN chapter_id TEXT REFERENCES chapters (id) ON DELETE SET NULL;


-- Create index for performance
CREATE INDEX idx_media_files_chapter_id ON media_files (chapter_id)
WHERE
  chapter_id IS NOT NULL;


-- ============================================================================
-- 3. REMOVE verse_text_id FROM media_files_verses
-- ============================================================================
ALTER TABLE media_files_verses
DROP COLUMN IF EXISTS verse_text_id;


-- ============================================================================
-- 4. UPDATE user_saved_versions: RENAME audio_project_id TO audio_version_id AND UPDATE FK
-- ============================================================================
-- First, drop the existing foreign key constraint
ALTER TABLE user_saved_versions
DROP CONSTRAINT if EXISTS user_saved_versions_audio_project_id_fkey;


-- Drop the existing unique constraint
ALTER TABLE user_saved_versions
DROP CONSTRAINT if EXISTS user_saved_versions_user_id_audio_project_id_key;


-- Drop the existing index
DROP INDEX if EXISTS idx_user_saved_versions_audio_project_id;


-- Rename the column
ALTER TABLE user_saved_versions
RENAME COLUMN audio_project_id TO audio_version_id;


-- Add the new foreign key constraint to audio_versions
ALTER TABLE user_saved_versions
ADD CONSTRAINT user_saved_versions_audio_version_id_fkey FOREIGN key (audio_version_id) REFERENCES audio_versions (id) ON DELETE CASCADE;


-- Add the new unique constraint
ALTER TABLE user_saved_versions
ADD CONSTRAINT user_saved_versions_user_id_audio_version_id_key UNIQUE (user_id, audio_version_id);


-- Create new index for performance
CREATE INDEX idx_user_saved_versions_audio_version_id ON user_saved_versions (audio_version_id)
WHERE
  audio_version_id IS NOT NULL;


-- Update the check constraint to use the new column name
ALTER TABLE user_saved_versions
DROP CONSTRAINT if EXISTS check_exactly_one_version;


ALTER TABLE user_saved_versions
ADD CONSTRAINT check_exactly_one_version CHECK (
  (
    audio_version_id IS NOT NULL
    AND text_version_id IS NULL
  )
  OR (
    audio_version_id IS NULL
    AND text_version_id IS NOT NULL
  )
);


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON COLUMN media_files.chapter_id IS 'Optional reference to the chapter this media file represents (for chapter-level audio)';


comment ON COLUMN user_saved_versions.audio_version_id IS 'Reference to saved audio version (mutually exclusive with text_version_id)';
