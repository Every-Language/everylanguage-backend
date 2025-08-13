-- Remove legacy analytics columns and ensure required FKs
-- This migration is idempotent and uses IF EXISTS guards throughout.
-- ============================================================================
-- Index cleanups for columns being dropped
-- ============================================================================
-- sessions
DROP INDEX if EXISTS idx_sessions_device_id;


-- share_opens
DROP INDEX if EXISTS idx_share_opens_location;


DROP INDEX if EXISTS idx_share_opens_language_entity_id;


-- shares
DROP INDEX if EXISTS idx_shares_location;


-- verse_listens
DROP INDEX if EXISTS idx_verse_listens_location;


DROP INDEX if EXISTS idx_verse_listens_heatmap;


-- media_file_listens
DROP INDEX if EXISTS idx_media_listens_location;


DROP INDEX if EXISTS idx_media_listens_heatmap;


-- chapter_listens
DROP INDEX if EXISTS idx_chapter_listens_location;


-- ============================================================================
-- Constraints cleanups for columns being dropped
-- ============================================================================
-- share_opens: language_entity_id FK
ALTER TABLE IF EXISTS share_opens
DROP CONSTRAINT if EXISTS share_opens_language_entity_id_fkey;


-- chapter_listens: verse_id FK (optional from newer migration)
ALTER TABLE IF EXISTS chapter_listens
DROP CONSTRAINT if EXISTS chapter_listens_verse_id_fkey;


-- ============================================================================
-- Drop columns as requested
-- ============================================================================
-- app_downloads: drop created_at
ALTER TABLE IF EXISTS app_downloads
DROP COLUMN IF EXISTS created_at;


-- sessions: drop created_at, device_id
ALTER TABLE IF EXISTS sessions
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS device_id;


-- share_opens: drop location, device_id, language_entity_id
ALTER TABLE IF EXISTS share_opens
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS device_id,
DROP COLUMN IF EXISTS language_entity_id;


-- shares: drop device_id, location, created_at
ALTER TABLE IF EXISTS shares
DROP COLUMN IF EXISTS device_id,
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS created_at;


-- verse_listens: drop device_id, location, connectivity, created_at
ALTER TABLE IF EXISTS verse_listens
DROP COLUMN IF EXISTS device_id,
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS connectivity,
DROP COLUMN IF EXISTS created_at;


-- media_file_listens: drop device_id, location, created_at, connectivity
ALTER TABLE IF EXISTS media_file_listens
DROP COLUMN IF EXISTS device_id,
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS connectivity;


-- chapter_listens: drop device_id, location, connectivity, created_at, verse_id
ALTER TABLE IF EXISTS chapter_listens
DROP COLUMN IF EXISTS device_id,
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS connectivity,
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS verse_id;


-- ============================================================================
-- Ensure chapter_listens.user_id FK exists to public.users(id)
-- ============================================================================
-- Add the column if missing
ALTER TABLE IF EXISTS chapter_listens
ADD COLUMN IF NOT EXISTS user_id UUID;


-- Add the FK if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chapter_listens_user_id_fkey'
  ) THEN
    ALTER TABLE chapter_listens
      ADD CONSTRAINT chapter_listens_user_id_fkey FOREIGN KEY (user_id)
      REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;
