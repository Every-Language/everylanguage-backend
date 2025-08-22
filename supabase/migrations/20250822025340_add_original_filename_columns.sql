-- Add original_filename and file_type columns to media_files and images tables
-- This migration adds metadata columns for better file management and user experience
-- ============================================================================
BEGIN;


-- ============================================================================
-- ADD COLUMNS TO MEDIA_FILES TABLE
-- ============================================================================
ALTER TABLE public.media_files
ADD COLUMN IF NOT EXISTS original_filename TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT;


-- ============================================================================
-- ADD COLUMNS TO IMAGES TABLE  
-- ============================================================================
ALTER TABLE public.images
ADD COLUMN IF NOT EXISTS original_filename TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT;


-- ============================================================================
-- BACKFILL EXISTING DATA
-- ============================================================================
-- Backfill media_files: extract original_filename and file_type from object_key
-- Format: timestamp-originalfilename.extension -> originalfilename.extension
UPDATE public.media_files
SET
  original_filename = CASE
    WHEN object_key IS NOT NULL
    AND object_key ~ '^\d+-.*\.' THEN
    -- Extract everything after "timestamp-" 
    REGEXP_REPLACE(object_key, '^\d+-', '')
    ELSE object_key
  END,
  file_type = CASE
    WHEN object_key IS NOT NULL
    AND object_key ~ '\.' THEN
    -- Extract file extension (everything after last dot)
    LOWER(REGEXP_REPLACE(object_key, '.*\.', ''))
    ELSE NULL
  END
WHERE
  original_filename IS NULL
  AND object_key IS NOT NULL;


-- Backfill images: extract original_filename and file_type from object_key  
UPDATE public.images
SET
  original_filename = CASE
    WHEN object_key IS NOT NULL
    AND object_key ~ '^\d+-.*\.' THEN
    -- Extract everything after "timestamp-"
    REGEXP_REPLACE(object_key, '^\d+-', '')
    ELSE object_key
  END,
  file_type = CASE
    WHEN object_key IS NOT NULL
    AND object_key ~ '\.' THEN
    -- Extract file extension (everything after last dot)
    LOWER(REGEXP_REPLACE(object_key, '.*\.', ''))
    ELSE NULL
  END
WHERE
  original_filename IS NULL
  AND object_key IS NOT NULL;


-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX if NOT EXISTS idx_media_files_file_type ON public.media_files (file_type);


CREATE INDEX if NOT EXISTS idx_images_file_type ON public.images (file_type);


-- ============================================================================
-- ADD COMMENTS
-- ============================================================================
comment ON COLUMN public.media_files.original_filename IS 'Original filename as uploaded by user';


comment ON COLUMN public.media_files.file_type IS 'File extension/type (e.g., mp3, wav, mp4)';


comment ON COLUMN public.images.original_filename IS 'Original filename as uploaded by user';


comment ON COLUMN public.images.file_type IS 'File extension/type (e.g., jpg, png, svg)';


COMMIT;
