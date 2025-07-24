-- Remove Remote Path and Project IDs Migration
-- This migration removes unused columns to simplify the schema:
-- 1. Remove remote_path from image_sets
-- 2. Remove project_id from media_files (and related constraints/indexes)
-- 3. Remove project_id from verse_texts (and related index)
-- ============================================================================
-- ============================================================================
-- 1. REMOVE remote_path FROM image_sets
-- ============================================================================
ALTER TABLE image_sets
DROP COLUMN IF EXISTS remote_path;


-- ============================================================================
-- 2. REMOVE project_id FROM media_files
-- ============================================================================
-- Drop the foreign key constraint first
ALTER TABLE media_files
DROP CONSTRAINT if EXISTS media_files_project_id_fkey;


-- Drop the index
DROP INDEX if EXISTS idx_media_files_project_id;


-- Remove the column
ALTER TABLE media_files
DROP COLUMN IF EXISTS project_id;


-- ============================================================================
-- 3. REMOVE project_id FROM verse_texts
-- ============================================================================
-- Drop the index first  
DROP INDEX if EXISTS idx_verse_texts_project_id;


-- Remove the column
ALTER TABLE verse_texts
DROP COLUMN IF EXISTS project_id;


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
-- No additional comments needed as we're removing columns
