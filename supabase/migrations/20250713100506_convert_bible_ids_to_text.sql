-- Migration: Convert Bible table IDs from UUID to TEXT
-- This enables human-readable, standardized Bible reference IDs
-- Drop dependent foreign key constraints first
ALTER TABLE books
DROP CONSTRAINT if EXISTS books_bible_version_id_fkey;


ALTER TABLE chapters
DROP CONSTRAINT if EXISTS chapters_book_id_fkey;


ALTER TABLE verses
DROP CONSTRAINT if EXISTS verses_chapter_id_fkey;


ALTER TABLE verse_texts
DROP CONSTRAINT if EXISTS verse_texts_verse_id_fkey;


ALTER TABLE media_files_verses
DROP CONSTRAINT if EXISTS media_files_verses_verse_id_fkey;


ALTER TABLE passages
DROP CONSTRAINT if EXISTS passages_book_id_fkey;


ALTER TABLE passages
DROP CONSTRAINT if EXISTS passages_start_verse_id_fkey;


ALTER TABLE passages
DROP CONSTRAINT if EXISTS passages_end_verse_id_fkey;


ALTER TABLE text_versions
DROP CONSTRAINT if EXISTS text_versions_bible_version_id_fkey;


ALTER TABLE chapter_listens
DROP CONSTRAINT if EXISTS chapter_listens_chapter_id_fkey;


ALTER TABLE verse_listens
DROP CONSTRAINT if EXISTS verse_listens_verse_id_fkey;


ALTER TABLE passages
DROP CONSTRAINT if EXISTS valid_verse_range;


ALTER TABLE sequences
DROP CONSTRAINT if EXISTS valid_sequence_verse_range;


ALTER TABLE user_positions
DROP CONSTRAINT if EXISTS user_positions_target_id_check;


ALTER TABLE user_bookmarks
DROP CONSTRAINT if EXISTS user_bookmarks_target_id_check;


ALTER TABLE playlist_items
DROP CONSTRAINT if EXISTS playlist_items_target_id_check;


ALTER TABLE media_files_targets
DROP CONSTRAINT if EXISTS media_files_targets_target_id_check;


ALTER TABLE sequences
DROP CONSTRAINT if EXISTS sequences_book_id_fkey;


ALTER TABLE sequences
DROP CONSTRAINT if EXISTS sequences_start_verse_id_fkey;


ALTER TABLE sequences
DROP CONSTRAINT if EXISTS sequences_end_verse_id_fkey;


ALTER TABLE sequences_targets
DROP CONSTRAINT if EXISTS sequences_targets_target_id_check;


ALTER TABLE segments_targets
DROP CONSTRAINT if EXISTS segments_targets_target_id_check;


-- Step 1: Convert bible_versions table
ALTER TABLE bible_versions
ALTER COLUMN id type TEXT;


-- Step 2: Convert books table
ALTER TABLE books
ALTER COLUMN id type TEXT;


ALTER TABLE books
ALTER COLUMN bible_version_id type TEXT;


-- Step 3: Convert chapters table  
ALTER TABLE chapters
ALTER COLUMN id type TEXT;


ALTER TABLE chapters
ALTER COLUMN book_id type TEXT;


-- Step 4: Convert verses table
ALTER TABLE verses
ALTER COLUMN id type TEXT;


ALTER TABLE verses
ALTER COLUMN chapter_id type TEXT;


-- Step 5: Update related tables that reference these IDs
ALTER TABLE verse_texts
ALTER COLUMN verse_id type TEXT;


ALTER TABLE media_files_verses
ALTER COLUMN verse_id type TEXT;


ALTER TABLE passages
ALTER COLUMN book_id type TEXT;


ALTER TABLE passages
ALTER COLUMN start_verse_id type TEXT;


ALTER TABLE passages
ALTER COLUMN end_verse_id type TEXT;


ALTER TABLE text_versions
ALTER COLUMN bible_version_id type TEXT;


ALTER TABLE chapter_listens
ALTER COLUMN chapter_id type TEXT;


ALTER TABLE verse_listens
ALTER COLUMN verse_id type TEXT;


-- Update sequences table references
ALTER TABLE sequences
ALTER COLUMN book_id type TEXT;


ALTER TABLE sequences
ALTER COLUMN start_verse_id type TEXT;


ALTER TABLE sequences
ALTER COLUMN end_verse_id type TEXT;


-- Note: user_positions, user_bookmarks, playlist_items, media_files_targets, 
-- sequences_targets, segments_targets use target_id as TEXT already for polymorphic references
-- Recreate foreign key constraints
ALTER TABLE books
ADD CONSTRAINT books_bible_version_id_fkey FOREIGN key (bible_version_id) REFERENCES bible_versions (id) ON DELETE CASCADE;


ALTER TABLE text_versions
ADD CONSTRAINT text_versions_bible_version_id_fkey FOREIGN key (bible_version_id) REFERENCES bible_versions (id) ON DELETE CASCADE;


ALTER TABLE chapters
ADD CONSTRAINT chapters_book_id_fkey FOREIGN key (book_id) REFERENCES books (id) ON DELETE CASCADE;


ALTER TABLE verses
ADD CONSTRAINT verses_chapter_id_fkey FOREIGN key (chapter_id) REFERENCES chapters (id) ON DELETE CASCADE;


ALTER TABLE verse_texts
ADD CONSTRAINT verse_texts_verse_id_fkey FOREIGN key (verse_id) REFERENCES verses (id) ON DELETE CASCADE;


ALTER TABLE media_files_verses
ADD CONSTRAINT media_files_verses_verse_id_fkey FOREIGN key (verse_id) REFERENCES verses (id) ON DELETE CASCADE;


ALTER TABLE passages
ADD CONSTRAINT passages_book_id_fkey FOREIGN key (book_id) REFERENCES books (id) ON DELETE CASCADE;


ALTER TABLE passages
ADD CONSTRAINT passages_start_verse_id_fkey FOREIGN key (start_verse_id) REFERENCES verses (id) ON DELETE CASCADE;


ALTER TABLE passages
ADD CONSTRAINT passages_end_verse_id_fkey FOREIGN key (end_verse_id) REFERENCES verses (id) ON DELETE CASCADE;


ALTER TABLE sequences
ADD CONSTRAINT sequences_book_id_fkey FOREIGN key (book_id) REFERENCES books (id) ON DELETE SET NULL;


ALTER TABLE sequences
ADD CONSTRAINT sequences_start_verse_id_fkey FOREIGN key (start_verse_id) REFERENCES verses (id) ON DELETE SET NULL;


ALTER TABLE sequences
ADD CONSTRAINT sequences_end_verse_id_fkey FOREIGN key (end_verse_id) REFERENCES verses (id) ON DELETE SET NULL;


ALTER TABLE chapter_listens
ADD CONSTRAINT chapter_listens_chapter_id_fkey FOREIGN key (chapter_id) REFERENCES chapters (id) ON DELETE CASCADE;


ALTER TABLE verse_listens
ADD CONSTRAINT verse_listens_verse_id_fkey FOREIGN key (verse_id) REFERENCES verses (id) ON DELETE CASCADE;


-- Update functions that reference these UUID columns to handle TEXT
-- Note: The functions get_verse_global_order and get_chapter_global_order need updating
CREATE OR REPLACE FUNCTION get_verse_global_order (verse_text_id TEXT) returns BIGINT AS $$
DECLARE
  global_order BIGINT;
BEGIN
  SELECT v.global_order INTO global_order
  FROM verses v
  WHERE v.id = verse_text_id;
  
  RETURN COALESCE(global_order, 0);
END;
$$ language plpgsql;


CREATE OR REPLACE FUNCTION get_chapter_global_order (chapter_text_id TEXT) returns BIGINT AS $$
DECLARE
  global_order BIGINT;
BEGIN
  SELECT c.global_order INTO global_order
  FROM chapters c
  WHERE c.id = chapter_text_id;
  
  RETURN COALESCE(global_order, 0);
END;
$$ language plpgsql;


CREATE OR REPLACE FUNCTION validate_verse_range (start_verse_text_id TEXT, end_verse_text_id TEXT) returns BOOLEAN AS $$
DECLARE
  start_order BIGINT;
  end_order BIGINT;
BEGIN
  SELECT global_order INTO start_order FROM verses WHERE id = start_verse_text_id;
  SELECT global_order INTO end_order FROM verses WHERE id = end_verse_text_id;
  
  RETURN start_order <= end_order;
END;
$$ language plpgsql;


-- Remove the DEFAULT GEN_RANDOM_UUID() since we'll use text IDs
ALTER TABLE bible_versions
ALTER COLUMN id
DROP DEFAULT;


ALTER TABLE books
ALTER COLUMN id
DROP DEFAULT;


ALTER TABLE chapters
ALTER COLUMN id
DROP DEFAULT;


ALTER TABLE verses
ALTER COLUMN id
DROP DEFAULT;


-- Recreate the CHECK constraints now that function signatures match
ALTER TABLE passages
ADD CONSTRAINT valid_verse_range CHECK (
  validate_verse_range (start_verse_id, end_verse_id)
);


ALTER TABLE sequences
ADD CONSTRAINT valid_sequence_verse_range CHECK (
  validate_verse_range (start_verse_id, end_verse_id)
);
