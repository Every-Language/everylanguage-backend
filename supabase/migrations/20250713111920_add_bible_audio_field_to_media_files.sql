-- Migration: Add Bible Audio Fields to Media Files
-- This migration moves bible audio tracking from target tables to the main media_files table
-- and adds verse range support for canonical bible audio files
-- ============================================================================
-- ADD NEW COLUMNS TO MEDIA_FILES TABLE
-- ============================================================================
-- Add bible audio tracking and verse range fields to media_files
ALTER TABLE media_files
ADD COLUMN is_bible_audio BOOLEAN DEFAULT FALSE,
ADD COLUMN start_verse_id TEXT REFERENCES verses (id) ON DELETE SET NULL,
ADD COLUMN end_verse_id TEXT REFERENCES verses (id) ON DELETE SET NULL;


-- Add constraint to ensure start_verse_id and end_verse_id are only set if is_bible_audio is true
ALTER TABLE media_files
ADD CONSTRAINT check_bible_audio_verse_range CHECK (
  (
    is_bible_audio = FALSE
    AND start_verse_id IS NULL
    AND end_verse_id IS NULL
  )
  OR (is_bible_audio = TRUE)
);


-- Add constraint to ensure end_verse_id is only set if start_verse_id is also set
ALTER TABLE media_files
ADD CONSTRAINT check_verse_range_order CHECK (
  end_verse_id IS NULL
  OR start_verse_id IS NOT NULL
);


-- ============================================================================
-- REMOVE IS_BIBLE_AUDIO FROM TARGET TABLES
-- ============================================================================
-- Remove is_bible_audio column from media_files_targets
ALTER TABLE media_files_targets
DROP COLUMN IF EXISTS is_bible_audio;


-- Remove is_bible_audio column from sequences_targets  
ALTER TABLE sequences_targets
DROP COLUMN IF EXISTS is_bible_audio;


-- Remove is_bible_audio column from segments_targets
ALTER TABLE segments_targets
DROP COLUMN IF EXISTS is_bible_audio;


-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
-- Index for bible audio filtering
CREATE INDEX idx_media_files_is_bible_audio ON media_files (is_bible_audio);


-- Index for verse range queries
CREATE INDEX idx_media_files_start_verse_id ON media_files (start_verse_id)
WHERE
  start_verse_id IS NOT NULL;


CREATE INDEX idx_media_files_end_verse_id ON media_files (end_verse_id)
WHERE
  end_verse_id IS NOT NULL;


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON COLUMN media_files.is_bible_audio IS 'Indicates if this media file contains canonical bible audio content';


comment ON COLUMN media_files.start_verse_id IS 'Starting verse for bible audio content (optional, used when media represents a specific verse or verse range)';


comment ON COLUMN media_files.end_verse_id IS 'Ending verse for bible audio content (optional, only set if start_verse_id is also set to define a verse range)';
