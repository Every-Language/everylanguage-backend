-- Make text_version_id nullable on verse_texts table
-- This allows verse_texts to exist without being tied to a specific text version
-- which can be useful for temporary/draft content or AI-generated transcriptions
-- ============================================================================
-- ============================================================================
-- ALTER COLUMN TO MAKE IT NULLABLE
-- ============================================================================
-- Make text_version_id nullable on verse_texts table
ALTER TABLE verse_texts
ALTER COLUMN text_version_id
DROP NOT NULL;


-- ============================================================================
-- UPDATE UNIQUE CONSTRAINT
-- ============================================================================
-- Drop the existing unique constraint since it doesn't handle nulls properly
ALTER TABLE verse_texts
DROP CONSTRAINT if EXISTS verse_texts_verse_id_text_version_id_key;


-- Recreate the unique constraint with a partial index to handle nulls correctly
-- This ensures that for non-null text_version_id, we still maintain uniqueness per verse
CREATE UNIQUE INDEX idx_verse_texts_verse_text_version_unique ON verse_texts (verse_id, text_version_id)
WHERE
  text_version_id IS NOT NULL;


-- ============================================================================
-- UPDATE COMMENTS
-- ============================================================================
-- Update column comment to reflect the nullable nature
comment ON COLUMN verse_texts.text_version_id IS 'Optional reference to text version - null for draft/temporary content or AI-generated transcriptions';
