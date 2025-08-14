-- Migration: Refactor bookmarks, playlist_items, and user_playlists per new model
-- - user_bookmarks: drop target_type/target_id; add bookmark_type enum, start_verse_id, end_verse_id (verses.id TEXT)
-- - playlist_items: drop target_type/target_id; add playlist_item_type enum, start_verse_id, end_verse_id (verses.id TEXT), custom_text
-- - drop indexes depending on removed columns; add new indexes
-- - update PowerSync view to reflect new playlist_items structure
-- - user_playlists: drop image_id and name columns; keep user_playlist_group_id
-- ============================================================================
-- Safety: Drop dependent view before altering playlist_items schema
-- ============================================================================
DROP VIEW if EXISTS public.passages_with_playlist_id;


-- ============================================================================
-- Enums
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bookmark_type') THEN
    CREATE TYPE bookmark_type AS ENUM ('passage');
  END IF;
END$$;


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'playlist_item_type') THEN
    CREATE TYPE playlist_item_type AS ENUM ('passage', 'custom_text');
  END IF;
END$$;


-- ============================================================================
-- user_bookmarks refactor
-- ============================================================================
-- 1) Add new columns
ALTER TABLE public.user_bookmarks
ADD COLUMN IF NOT EXISTS bookmark_type bookmark_type,
ADD COLUMN IF NOT EXISTS start_verse_id TEXT,
ADD COLUMN IF NOT EXISTS end_verse_id TEXT;


-- 2) Foreign keys for verse ids (only used when bookmark_type = 'passage')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_bookmarks_start_verse_id_fkey'
  ) THEN
    ALTER TABLE public.user_bookmarks
      ADD CONSTRAINT user_bookmarks_start_verse_id_fkey FOREIGN KEY (start_verse_id)
      REFERENCES public.verses(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_bookmarks_end_verse_id_fkey'
  ) THEN
    ALTER TABLE public.user_bookmarks
      ADD CONSTRAINT user_bookmarks_end_verse_id_fkey FOREIGN KEY (end_verse_id)
      REFERENCES public.verses(id) ON DELETE SET NULL;
  END IF;
END$$;


-- 3) Backfill from legacy passage targets
UPDATE public.user_bookmarks b
SET
  bookmark_type = 'passage',
  start_verse_id = p.start_verse_id,
  end_verse_id = p.end_verse_id
FROM
  public.passages p
WHERE
  b.target_type = 'passage'
  AND p.id::TEXT = b.target_id;


-- 4) Constraints to enforce conditional fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_bookmarks_passage_fields_check'
  ) THEN
    ALTER TABLE public.user_bookmarks
    ADD CONSTRAINT user_bookmarks_passage_fields_check CHECK (
      (
        bookmark_type = 'passage' AND start_verse_id IS NOT NULL AND end_verse_id IS NOT NULL
      ) OR (
        bookmark_type IS DISTINCT FROM 'passage' AND start_verse_id IS NULL AND end_verse_id IS NULL
      )
    );
  END IF;
END$$;


-- 5) Drop legacy unique constraint and indexes referencing removed columns
ALTER TABLE public.user_bookmarks
DROP CONSTRAINT if EXISTS user_bookmarks_user_id_target_type_target_id_key;


DROP INDEX if EXISTS public.idx_user_bookmarks_target_type;


DROP INDEX if EXISTS public.idx_user_bookmarks_target_id;


DROP INDEX if EXISTS public.idx_user_bookmarks_target_type_id;


-- 6) Drop legacy columns
ALTER TABLE public.user_bookmarks
DROP COLUMN IF EXISTS target_type,
DROP COLUMN IF EXISTS target_id;


-- 7) New indexes
CREATE INDEX if NOT EXISTS idx_user_bookmarks_bookmark_type ON public.user_bookmarks (bookmark_type);


CREATE INDEX if NOT EXISTS idx_user_bookmarks_start_verse_id ON public.user_bookmarks (start_verse_id)
WHERE
  bookmark_type = 'passage';


CREATE INDEX if NOT EXISTS idx_user_bookmarks_end_verse_id ON public.user_bookmarks (end_verse_id)
WHERE
  bookmark_type = 'passage';


-- ============================================================================
-- playlist_items refactor
-- ============================================================================
-- 1) Add new columns
ALTER TABLE public.playlist_items
ADD COLUMN IF NOT EXISTS playlist_item_type playlist_item_type,
ADD COLUMN IF NOT EXISTS start_verse_id TEXT,
ADD COLUMN IF NOT EXISTS end_verse_id TEXT,
ADD COLUMN IF NOT EXISTS custom_text TEXT;


-- 2) Foreign keys for verse ids (only used when playlist_item_type = 'passage')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'playlist_items_start_verse_id_fkey'
  ) THEN
    ALTER TABLE public.playlist_items
      ADD CONSTRAINT playlist_items_start_verse_id_fkey FOREIGN KEY (start_verse_id)
      REFERENCES public.verses(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'playlist_items_end_verse_id_fkey'
  ) THEN
    ALTER TABLE public.playlist_items
      ADD CONSTRAINT playlist_items_end_verse_id_fkey FOREIGN KEY (end_verse_id)
      REFERENCES public.verses(id) ON DELETE SET NULL;
  END IF;
END$$;


-- 3) Backfill from legacy passage targets
UPDATE public.playlist_items pi
SET
  playlist_item_type = 'passage',
  start_verse_id = p.start_verse_id,
  end_verse_id = p.end_verse_id
FROM
  public.passages p
WHERE
  pi.target_type = 'passage'
  AND p.id::TEXT = pi.target_id::TEXT;


-- 4) Constraints to enforce conditional fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'playlist_items_type_fields_check'
  ) THEN
    ALTER TABLE public.playlist_items
    ADD CONSTRAINT playlist_items_type_fields_check CHECK (
      (
        playlist_item_type = 'passage' AND start_verse_id IS NOT NULL AND end_verse_id IS NOT NULL AND custom_text IS NULL
      ) OR (
        playlist_item_type = 'custom_text' AND custom_text IS NOT NULL AND start_verse_id IS NULL AND end_verse_id IS NULL
      ) OR (
        playlist_item_type IS NULL AND custom_text IS NULL AND start_verse_id IS NULL AND end_verse_id IS NULL
      )
    );
  END IF;
END$$;


-- 5) Drop legacy unique constraint and indexes referencing removed columns
ALTER TABLE public.playlist_items
DROP CONSTRAINT if EXISTS playlist_items_playlist_id_target_type_target_id_key;


DROP INDEX if EXISTS public.idx_playlist_items_target_type;


DROP INDEX if EXISTS public.idx_playlist_items_target_id;


DROP INDEX if EXISTS public.idx_playlist_items_target_id_type;


-- 6) Drop legacy columns
ALTER TABLE public.playlist_items
DROP COLUMN IF EXISTS target_type,
DROP COLUMN IF EXISTS target_id;


-- 7) New indexes
CREATE INDEX if NOT EXISTS idx_playlist_items_type ON public.playlist_items (playlist_item_type);


CREATE INDEX if NOT EXISTS idx_playlist_items_start_verse_id ON public.playlist_items (start_verse_id)
WHERE
  playlist_item_type = 'passage';


CREATE INDEX if NOT EXISTS idx_playlist_items_end_verse_id ON public.playlist_items (end_verse_id)
WHERE
  playlist_item_type = 'passage';


-- ============================================================================
-- Recreate PowerSync-compatible view based on new playlist_items schema
-- ============================================================================
-- The original view joined by playlist_items.target_id/target_type.
-- We now derive passages by matching start/end verse IDs on the passages table.
CREATE VIEW public.passages_with_playlist_id AS
SELECT
  p.*,
  pi.playlist_id
FROM
  public.passages p
  JOIN public.playlist_items pi ON p.start_verse_id = pi.start_verse_id
  AND p.end_verse_id = pi.end_verse_id
WHERE
  pi.playlist_item_type = 'passage';


-- Helpful indexes for the recreated view
CREATE INDEX if NOT EXISTS idx_playlist_items_playlist_id ON public.playlist_items (playlist_id);


-- ============================================================================
-- user_playlists clean-up
-- ============================================================================
-- Drop columns no longer needed
ALTER TABLE public.user_playlists
DROP COLUMN IF EXISTS image_id,
DROP COLUMN IF EXISTS name;


-- Drop indexes that referenced removed columns
DROP INDEX if EXISTS public.idx_user_playlists_image_id;


-- Ensure user_playlist_group_id column exists (already present in initial schema)
-- Keeping existing nullability and FK behavior as-is per current design.
-- ============================================================================
-- Remove user_custom_texts table if still present
-- ============================================================================
DROP TABLE IF EXISTS public.user_custom_texts;
