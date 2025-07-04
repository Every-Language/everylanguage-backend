-- Create Bible Content and Media Models
-- This migration creates the core content structure for the Bible app including
-- bible versions, books, chapters, verses, media files, and user content organization
-- ============================================================================
-- ============================================================================
-- ENUMS FOR CONTENT MODELS
-- ============================================================================
-- Media type enum
CREATE TYPE media_type AS ENUM('audio', 'video');


-- Upload status enum
CREATE TYPE upload_status AS ENUM('pending', 'uploading', 'completed', 'failed');


-- Publish status enum
CREATE TYPE publish_status AS ENUM('pending', 'published', 'archived');


-- Check status enum
CREATE TYPE check_status AS ENUM(
  'pending',
  'approved',
  'rejected',
  'requires_review'
);


-- Target type enum for flexible references
CREATE TYPE target_type AS ENUM(
  'chapter',
  'book',
  'sermon',
  'passage',
  'verse',
  'podcast',
  'film_segment',
  'audio_segment'
);


-- Verse text source enum
CREATE TYPE text_version_source AS ENUM(
  'official_translation',
  'ai_transcription',
  'user_submitted'
);


-- ============================================================================
-- BIBLE STRUCTURE MODELS
-- ============================================================================
-- Bible versions (e.g., Catholic, Protestant, Septuagint)
CREATE TABLE bible_versions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  name TEXT NOT NULL UNIQUE,
  structure_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Books within bible versions
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  name TEXT NOT NULL,
  book_number INTEGER NOT NULL,
  bible_version_id UUID REFERENCES bible_versions (id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (bible_version_id, book_number),
  UNIQUE (bible_version_id, name)
);


-- Chapters within books
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  chapter_number INTEGER NOT NULL,
  book_id UUID REFERENCES books (id) ON DELETE CASCADE NOT NULL,
  total_verses INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (book_id, chapter_number)
);


-- Verses within chapters
CREATE TABLE verses (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  chapter_id UUID REFERENCES chapters (id) ON DELETE CASCADE NOT NULL,
  verse_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (chapter_id, verse_number)
);


-- ============================================================================
-- TEXT MODELS
-- ============================================================================
-- Text versions (translations like NIV, NLT, ESV)
CREATE TABLE text_versions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  language_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  bible_version_id UUID REFERENCES bible_versions (id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g., NIV, NLT, ESV
  text_version_source text_version_source,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (language_id, name)
);


-- Verse texts (actual text content for verses)
CREATE TABLE verse_texts (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  verse_id UUID REFERENCES verses (id) ON DELETE CASCADE NOT NULL,
  text_version_id UUID REFERENCES text_versions (id) ON DELETE CASCADE NOT NULL,
  verse_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (verse_id, text_version_id)
);


-- ============================================================================
-- MEDIA MODELS
-- ============================================================================
-- Media files (audio/video content)
CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  language_entity_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  project_id UUID, -- References to projects (table to be created later)
  media_type media_type NOT NULL,
  local_path TEXT,
  remote_path TEXT,
  file_size BIGINT CHECK (file_size > 0),
  duration_seconds INTEGER CHECK (duration_seconds > 0),
  upload_status upload_status DEFAULT 'pending',
  publish_status publish_status DEFAULT 'pending',
  check_status check_status DEFAULT 'pending',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);


-- Media file targets (what content the media file represents)
CREATE TABLE media_files_targets (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  media_file_id UUID REFERENCES media_files (id) ON DELETE CASCADE NOT NULL,
  is_bible_audio BOOLEAN DEFAULT FALSE,
  target_type target_type NOT NULL,
  target_id UUID NOT NULL, -- Generic reference to target content
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (media_file_id, target_type, target_id)
);


-- Media file verse mappings (timestamps for verses within media files)
CREATE TABLE media_files_verses (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  media_file_id UUID REFERENCES media_files (id) ON DELETE CASCADE NOT NULL,
  verse_id UUID REFERENCES verses (id) ON DELETE CASCADE NOT NULL,
  start_time_seconds INTEGER NOT NULL CHECK (start_time_seconds >= 0),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  verse_text_id UUID REFERENCES verse_texts (id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (media_file_id, verse_id)
);


-- Tags for flexible metadata
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (key, value)
);


-- Media file tags junction table
CREATE TABLE media_files_tags (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  media_file_id UUID REFERENCES media_files (id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags (id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (media_file_id, tag_id)
);


-- ============================================================================
-- CONTENT ORGANIZATION MODELS
-- ============================================================================
-- Passages (verse ranges)
CREATE TABLE passages (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  book_id UUID REFERENCES books (id) ON DELETE CASCADE NOT NULL,
  start_verse_id UUID REFERENCES verses (id) ON DELETE CASCADE NOT NULL,
  end_verse_id UUID REFERENCES verses (id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ============================================================================
-- USER CONTENT MODELS
-- ============================================================================
-- User bookmark folders
CREATE TABLE user_bookmark_folders (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
  parent_folder_id UUID REFERENCES user_bookmark_folders (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, parent_folder_id, name)
);


-- User positions (pick up where you left off)
CREATE TABLE user_positions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
  bookmark_folder_id UUID REFERENCES user_bookmark_folders (id) ON DELETE SET NULL,
  target_type target_type NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id)
);


-- User bookmarks
CREATE TABLE user_bookmarks (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
  bookmark_folder_id UUID REFERENCES user_bookmark_folders (id) ON DELETE SET NULL,
  target_type target_type NOT NULL,
  target_id UUID NOT NULL,
  note TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id)
);


-- User custom texts
CREATE TABLE user_custom_texts (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  TEXT TEXT NOT NULL,
  formatting JSONB,
  created_by UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Playlist groups
CREATE TABLE playlist_groups (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, title)
);


-- Playlists
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, title)
);


-- Playlist items
CREATE TABLE playlist_items (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  playlist_id UUID REFERENCES playlists (id) ON DELETE CASCADE NOT NULL,
  target_type target_type NOT NULL,
  target_id UUID NOT NULL,
  order_index INTEGER NOT NULL,
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (playlist_id, order_index),
  UNIQUE (playlist_id, target_type, target_id)
);


-- Playlists to playlist groups junction table
CREATE TABLE playlists_playlist_groups (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  playlist_id UUID REFERENCES playlists (id) ON DELETE CASCADE NOT NULL,
  playlist_group_id UUID REFERENCES playlist_groups (id) ON DELETE CASCADE NOT NULL,
  index INTEGER NOT NULL,
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (playlist_group_id, index),
  UNIQUE (playlist_id, playlist_group_id)
);


-- ============================================================================
-- GLOBAL ORDERING FUNCTIONS FOR BIBLICAL SEQUENCING
-- ============================================================================
-- Function to get the global order of a verse within its Bible version
-- Uses: (book_number * 1000000) + (chapter_number * 1000) + verse_number
CREATE OR REPLACE FUNCTION get_verse_global_order (verse_uuid UUID) returns BIGINT AS $$
BEGIN
  RETURN (
    SELECT 
      (b.book_number * 1000000) + (c.chapter_number * 1000) + v.verse_number
    FROM verses v
    JOIN chapters c ON v.chapter_id = c.id
    JOIN books b ON c.book_id = b.id
    WHERE v.id = verse_uuid
  );
END;
$$ language plpgsql stable;


-- Function to get the global order of a chapter within its Bible version
-- Uses: (book_number * 1000) + chapter_number
CREATE OR REPLACE FUNCTION get_chapter_global_order (chapter_uuid UUID) returns BIGINT AS $$
BEGIN
  RETURN (
    SELECT 
      (b.book_number * 1000) + c.chapter_number
    FROM chapters c
    JOIN books b ON c.book_id = b.id
    WHERE c.id = chapter_uuid
  );
END;
$$ language plpgsql stable;


-- Function to validate that verse range is in correct order
CREATE OR REPLACE FUNCTION validate_verse_range (start_verse_uuid UUID, end_verse_uuid UUID) returns BOOLEAN AS $$
BEGIN
  RETURN get_verse_global_order(start_verse_uuid) <= get_verse_global_order(end_verse_uuid);
END;
$$ language plpgsql stable;


-- Add constraint to ensure passages have valid verse ranges
ALTER TABLE passages
ADD CONSTRAINT valid_verse_range CHECK (
  validate_verse_range (start_verse_id, end_verse_id)
);


-- Add simple computed columns for efficient ordering and querying
-- Books can use book_number directly
ALTER TABLE books
ADD COLUMN global_order BIGINT generated always AS (book_number) stored;


-- For chapters and verses, we'll use triggers to maintain the computed values
-- since PostgreSQL doesn't allow subqueries in generated columns
ALTER TABLE chapters
ADD COLUMN global_order BIGINT;


ALTER TABLE verses
ADD COLUMN global_order BIGINT;


-- Function to update chapter global order
CREATE OR REPLACE FUNCTION update_chapter_global_order () returns trigger AS $$
BEGIN
  NEW.global_order = (
    SELECT book_number * 1000 + NEW.chapter_number
    FROM books 
    WHERE id = NEW.book_id
  );
  RETURN NEW;
END;
$$ language plpgsql;


-- Function to update verse global order
CREATE OR REPLACE FUNCTION update_verse_global_order () returns trigger AS $$
BEGIN
  NEW.global_order = (
    SELECT (b.book_number * 1000000) + (c.chapter_number * 1000) + NEW.verse_number
    FROM chapters c
    JOIN books b ON c.book_id = b.id
    WHERE c.id = NEW.chapter_id
  );
  RETURN NEW;
END;
$$ language plpgsql;


-- Triggers to maintain global order
CREATE TRIGGER chapter_global_order_trigger before insert
OR
UPDATE ON chapters FOR each ROW
EXECUTE function update_chapter_global_order ();


CREATE TRIGGER verse_global_order_trigger before insert
OR
UPDATE ON verses FOR each ROW
EXECUTE function update_verse_global_order ();


-- Function to update all existing records (run after initial data load)
CREATE OR REPLACE FUNCTION refresh_all_global_orders () returns void AS $$
BEGIN
  -- Update chapters
  UPDATE chapters SET global_order = (
    SELECT book_number * 1000 + chapter_number
    FROM books
    WHERE id = book_id
  );
  
  -- Update verses  
  UPDATE verses SET global_order = (
    SELECT (b.book_number * 1000000) + (c.chapter_number * 1000) + verse_number
    FROM chapters c
    JOIN books b ON c.book_id = b.id
    WHERE c.id = chapter_id
  );
END;
$$ language plpgsql;


-- ============================================================================
-- ADD MISSING FOREIGN KEY CONSTRAINTS TO EXISTING ANALYTICS TABLES
-- ============================================================================
-- Add foreign key constraints that reference the new tables
ALTER TABLE media_file_listens
ADD CONSTRAINT media_file_listens_media_file_id_fkey FOREIGN key (media_file_id) REFERENCES media_files (id) ON DELETE CASCADE;


ALTER TABLE verse_listens
ADD CONSTRAINT verse_listens_verse_id_fkey FOREIGN key (verse_id) REFERENCES verses (id) ON DELETE CASCADE;


-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
-- Bible structure indexes
CREATE INDEX idx_bible_versions_name ON bible_versions (name);


CREATE INDEX idx_books_bible_version_id ON books (bible_version_id);


CREATE INDEX idx_books_book_number ON books (book_number);


CREATE INDEX idx_books_global_order ON books (global_order);


CREATE INDEX idx_chapters_book_id ON chapters (book_id);


CREATE INDEX idx_chapters_chapter_number ON chapters (chapter_number);


CREATE INDEX idx_chapters_global_order ON chapters (global_order);


CREATE INDEX idx_verses_chapter_id ON verses (chapter_id);


CREATE INDEX idx_verses_verse_number ON verses (verse_number);


CREATE INDEX idx_verses_global_order ON verses (global_order);


-- Text model indexes
CREATE INDEX idx_text_versions_language_id ON text_versions (language_id);


CREATE INDEX idx_text_versions_name ON text_versions (name);


CREATE INDEX idx_verse_texts_verse_id ON verse_texts (verse_id);


CREATE INDEX idx_verse_texts_text_version_id ON verse_texts (text_version_id);


CREATE INDEX idx_text_versions_source ON text_versions (text_version_source);


-- Media file indexes
CREATE INDEX idx_media_files_language_entity_id ON media_files (language_entity_id);


CREATE INDEX idx_media_files_project_id ON media_files (project_id)
WHERE
  project_id IS NOT NULL;


CREATE INDEX idx_media_files_media_type ON media_files (media_type);


CREATE INDEX idx_media_files_upload_status ON media_files (upload_status);


CREATE INDEX idx_media_files_publish_status ON media_files (publish_status);


CREATE INDEX idx_media_files_check_status ON media_files (check_status);


CREATE INDEX idx_media_files_created_by ON media_files (created_by);


CREATE INDEX idx_media_files_duration ON media_files (duration_seconds);


-- Media file targets indexes
CREATE INDEX idx_media_files_targets_media_file_id ON media_files_targets (media_file_id);


CREATE INDEX idx_media_files_targets_target_type ON media_files_targets (target_type);


CREATE INDEX idx_media_files_targets_target_id ON media_files_targets (target_id);


CREATE INDEX idx_media_files_targets_is_bible_audio ON media_files_targets (is_bible_audio);


-- Media file verses indexes
CREATE INDEX idx_media_files_verses_media_file_id ON media_files_verses (media_file_id);


CREATE INDEX idx_media_files_verses_verse_id ON media_files_verses (verse_id);


CREATE INDEX idx_media_files_verses_start_time ON media_files_verses (start_time_seconds);


CREATE INDEX idx_media_files_verses_verse_text_id ON media_files_verses (verse_text_id);


-- Tags indexes
CREATE INDEX idx_tags_key ON tags (key);


CREATE INDEX idx_tags_value ON tags (value);


CREATE INDEX idx_media_files_tags_media_file_id ON media_files_tags (media_file_id);


CREATE INDEX idx_media_files_tags_tag_id ON media_files_tags (tag_id);


-- Passages indexes
CREATE INDEX idx_passages_book_id ON passages (book_id);


CREATE INDEX idx_passages_start_verse_id ON passages (start_verse_id);


CREATE INDEX idx_passages_end_verse_id ON passages (end_verse_id);


CREATE INDEX idx_passages_created_by ON passages (created_by);


-- User content indexes
CREATE INDEX idx_user_bookmark_folders_user_id ON user_bookmark_folders (user_id);


CREATE INDEX idx_user_bookmark_folders_parent_folder_id ON user_bookmark_folders (parent_folder_id);


CREATE INDEX idx_user_positions_user_id ON user_positions (user_id);


CREATE INDEX idx_user_positions_target_type ON user_positions (target_type);


CREATE INDEX idx_user_positions_target_id ON user_positions (target_id);


CREATE INDEX idx_user_bookmarks_user_id ON user_bookmarks (user_id);


CREATE INDEX idx_user_bookmarks_bookmark_folder_id ON user_bookmarks (bookmark_folder_id);


CREATE INDEX idx_user_bookmarks_target_type ON user_bookmarks (target_type);


CREATE INDEX idx_user_bookmarks_target_id ON user_bookmarks (target_id);


CREATE INDEX idx_user_custom_texts_created_by ON user_custom_texts (created_by);


-- Playlist indexes
CREATE INDEX idx_playlist_groups_user_id ON playlist_groups (user_id);


CREATE INDEX idx_playlists_user_id ON playlists (user_id);


CREATE INDEX idx_playlists_created_by ON playlists (created_by);


CREATE INDEX idx_playlist_items_playlist_id ON playlist_items (playlist_id);


CREATE INDEX idx_playlist_items_target_type ON playlist_items (target_type);


CREATE INDEX idx_playlist_items_target_id ON playlist_items (target_id);


CREATE INDEX idx_playlist_items_order ON playlist_items (order_index);


CREATE INDEX idx_playlists_playlist_groups_playlist_id ON playlists_playlist_groups (playlist_id);


CREATE INDEX idx_playlists_playlist_groups_playlist_group_id ON playlists_playlist_groups (playlist_group_id);


-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE TRIGGER update_bible_versions_updated_at before
UPDATE ON bible_versions FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_books_updated_at before
UPDATE ON books FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_chapters_updated_at before
UPDATE ON chapters FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_verses_updated_at before
UPDATE ON verses FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_text_versions_updated_at before
UPDATE ON text_versions FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_verse_texts_updated_at before
UPDATE ON verse_texts FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_media_files_updated_at before
UPDATE ON media_files FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_media_files_targets_updated_at before
UPDATE ON media_files_targets FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_media_files_verses_updated_at before
UPDATE ON media_files_verses FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_tags_updated_at before
UPDATE ON tags FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_media_files_tags_updated_at before
UPDATE ON media_files_tags FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_passages_updated_at before
UPDATE ON passages FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_user_bookmark_folders_updated_at before
UPDATE ON user_bookmark_folders FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_user_positions_updated_at before
UPDATE ON user_positions FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_user_bookmarks_updated_at before
UPDATE ON user_bookmarks FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_user_custom_texts_updated_at before
UPDATE ON user_custom_texts FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_playlist_groups_updated_at before
UPDATE ON playlist_groups FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_playlists_updated_at before
UPDATE ON playlists FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_playlist_items_updated_at before
UPDATE ON playlist_items FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_playlists_playlist_groups_updated_at before
UPDATE ON playlists_playlist_groups FOR each ROW
EXECUTE function update_updated_at_column ();


-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE bible_versions enable ROW level security;


ALTER TABLE books enable ROW level security;


ALTER TABLE chapters enable ROW level security;


ALTER TABLE verses enable ROW level security;


ALTER TABLE text_versions enable ROW level security;


ALTER TABLE verse_texts enable ROW level security;


ALTER TABLE media_files enable ROW level security;


ALTER TABLE media_files_targets enable ROW level security;


ALTER TABLE media_files_verses enable ROW level security;


ALTER TABLE tags enable ROW level security;


ALTER TABLE media_files_tags enable ROW level security;


ALTER TABLE passages enable ROW level security;


ALTER TABLE user_bookmark_folders enable ROW level security;


ALTER TABLE user_positions enable ROW level security;


ALTER TABLE user_bookmarks enable ROW level security;


ALTER TABLE user_custom_texts enable ROW level security;


ALTER TABLE playlist_groups enable ROW level security;


ALTER TABLE playlists enable ROW level security;


ALTER TABLE playlist_items enable ROW level security;


ALTER TABLE playlists_playlist_groups enable ROW level security;


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON TABLE bible_versions IS 'Different structural versions of the Bible (Catholic, Protestant, etc.)';


comment ON TABLE books IS 'Books within Bible versions with ordering';


comment ON TABLE chapters IS 'Chapters within books with ordering';


comment ON TABLE verses IS 'Individual verses within chapters with global ordering';


comment ON TABLE text_versions IS 'Bible translations (NIV, ESV, etc.) for different languages';


comment ON TABLE verse_texts IS 'Actual text content for verses in specific translations';


comment ON TABLE media_files IS 'Audio/video files with metadata and status tracking';


comment ON TABLE media_files_targets IS 'Links media files to their content targets';


comment ON TABLE media_files_verses IS 'Timestamp mappings for verses within media files';


comment ON TABLE tags IS 'Flexible key-value metadata tags';


comment ON TABLE media_files_tags IS 'Junction table for media file tags';


comment ON TABLE passages IS 'Verse ranges for grouping related content';


comment ON TABLE user_bookmark_folders IS 'Hierarchical folders for organizing user bookmarks';


comment ON TABLE user_positions IS 'User progress tracking for resumable content';


comment ON TABLE user_bookmarks IS 'User-saved bookmarks with notes and colors';


comment ON TABLE user_custom_texts IS 'User-created text content for playlists';


comment ON TABLE playlist_groups IS 'Groups for organizing playlists';


comment ON TABLE playlists IS 'User-created content playlists';


comment ON TABLE playlist_items IS 'Ordered items within playlists';


comment ON TABLE playlists_playlist_groups IS 'Junction table for playlist group membership';


comment ON COLUMN verses.id IS 'Globally ordered UUID for all verses across all Bible versions';


comment ON COLUMN verses.global_order IS 'Computed biblical order: (book_number * 1000000) + (chapter_number * 1000) + verse_number';


comment ON COLUMN chapters.id IS 'Globally ordered UUID for all chapters across all Bible versions';


comment ON COLUMN chapters.global_order IS 'Computed biblical order: (book_number * 1000) + chapter_number';


comment ON COLUMN books.id IS 'Globally ordered UUID for all books across all Bible versions';


comment ON COLUMN books.global_order IS 'Computed biblical order: book_number';


comment ON COLUMN media_files.duration_seconds IS 'Duration of the media file in seconds';


comment ON COLUMN media_files_verses.start_time_seconds IS 'Start timestamp of verse within media file';


comment ON COLUMN media_files_verses.duration_seconds IS 'Duration of verse within media file';


comment ON COLUMN playlist_items.order_index IS 'Order of item within playlist (0-based)';


comment ON COLUMN playlists_playlist_groups.index IS 'Order of playlist within group (0-based)';
