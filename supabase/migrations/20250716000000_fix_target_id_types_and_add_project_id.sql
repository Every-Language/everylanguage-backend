-- Fix Target ID Types and Add Project ID to Verse Texts
-- This migration addresses the broader issue of target_id fields being UUID
-- when they should be TEXT to support different ID formats (chapters: 'gen-1', books: 'gen', etc.)
-- Also adds project_id to verse_texts table for project-specific text versions
-- ============================================================================
-- DROP INDEXES THAT REFERENCE target_id COLUMNS
-- ============================================================================
-- Drop indexes for user_positions
DROP INDEX if EXISTS idx_user_positions_target_type_id;


-- Drop indexes for user_bookmarks  
DROP INDEX if EXISTS idx_user_bookmarks_target_type_id;


-- Drop indexes for sequences_targets
DROP INDEX if EXISTS idx_sequences_targets_target_id;


-- Drop indexes for segments_targets
DROP INDEX if EXISTS idx_segments_targets_target_id;


-- Drop indexes for images
DROP INDEX if EXISTS idx_images_target_type_id;


-- Drop indexes for media_files_targets
DROP INDEX if EXISTS idx_media_files_targets_target_id;


-- ============================================================================
-- ALTER COLUMN TYPES FROM UUID TO TEXT
-- ============================================================================
-- Fix user_positions target_id
ALTER TABLE user_positions
ALTER COLUMN target_id type TEXT;


-- Fix user_bookmarks target_id
ALTER TABLE user_bookmarks
ALTER COLUMN target_id type TEXT;


-- Fix sequences_targets target_id
ALTER TABLE sequences_targets
ALTER COLUMN target_id type TEXT;


-- Fix segments_targets target_id
ALTER TABLE segments_targets
ALTER COLUMN target_id type TEXT;


-- Fix images target_id
ALTER TABLE images
ALTER COLUMN target_id type TEXT;


-- Fix media_files_targets target_id
ALTER TABLE media_files_targets
ALTER COLUMN target_id type TEXT;


-- ============================================================================
-- ADD PROJECT_ID TO VERSE_TEXTS TABLE
-- ============================================================================
-- Add project_id column to verse_texts
ALTER TABLE verse_texts
ADD COLUMN project_id UUID REFERENCES projects (id) ON DELETE SET NULL;


-- ============================================================================
-- RECREATE INDEXES
-- ============================================================================
-- Recreate indexes for user_positions
CREATE INDEX idx_user_positions_target_type_id ON user_positions (target_type, target_id);


-- Recreate indexes for user_bookmarks
CREATE INDEX idx_user_bookmarks_target_type_id ON user_bookmarks (target_type, target_id);


-- Recreate indexes for sequences_targets
CREATE INDEX idx_sequences_targets_target_id ON sequences_targets (target_id);


-- Recreate indexes for segments_targets
CREATE INDEX idx_segments_targets_target_id ON segments_targets (target_id);


-- Recreate indexes for images
CREATE INDEX idx_images_target_type_id ON images (target_type, target_id);


-- Recreate indexes for media_files_targets
CREATE INDEX idx_media_files_targets_target_id ON media_files_targets (target_id);


-- Add index for new project_id column in verse_texts
CREATE INDEX idx_verse_texts_project_id ON verse_texts (project_id);


-- ============================================================================
-- UPDATE COMMENTS
-- ============================================================================
-- Update comments to reflect the change from UUID to TEXT
comment ON COLUMN user_positions.target_id IS 'Text reference to target content (chapters: gen-1, books: gen, verses: gen-1-1, etc.)';


comment ON COLUMN user_bookmarks.target_id IS 'Text reference to target content (chapters: gen-1, books: gen, verses: gen-1-1, etc.)';


comment ON COLUMN sequences_targets.target_id IS 'Text reference to target content (chapters: gen-1, books: gen, verses: gen-1-1, etc.)';


comment ON COLUMN segments_targets.target_id IS 'Text reference to target content (chapters: gen-1, books: gen, verses: gen-1-1, etc.)';


comment ON COLUMN images.target_id IS 'Text reference to target content (chapters: gen-1, books: gen, verses: gen-1-1, etc.)';


comment ON COLUMN media_files_targets.target_id IS 'Text reference to target content (chapters: gen-1, books: gen, verses: gen-1-1, etc.)';


comment ON COLUMN verse_texts.project_id IS 'Optional reference to project for project-specific text versions';
