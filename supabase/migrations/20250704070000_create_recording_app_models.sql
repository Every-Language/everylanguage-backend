-- Create Recording App Models
-- This migration creates the project and recording management system including
-- projects, sequences, segments, and their relationships
-- ============================================================================
-- ============================================================================
-- ENUMS FOR RECORDING APP MODELS
-- ============================================================================
-- Segment type enum
CREATE TYPE segment_type AS ENUM('source', 'target');


-- ============================================================================
-- RECORDING APP MODELS
-- ============================================================================
-- Projects table for organizing recordings
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  name TEXT NOT NULL,
  description TEXT,
  source_language_entity_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  target_language_entity_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  region_id UUID REFERENCES regions (id) ON DELETE SET NULL,
  location geometry (point, 4326), -- PostGIS point for project location
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (name)
);


-- Sequences within projects that target specific bible content
CREATE TABLE sequences (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  name TEXT NOT NULL,
  description TEXT,
  book_id UUID REFERENCES books (id) ON DELETE CASCADE NOT NULL,
  is_bible_audio BOOLEAN DEFAULT FALSE,
  start_verse_id UUID REFERENCES verses (id) ON DELETE CASCADE,
  end_verse_id UUID REFERENCES verses (id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (project_id, name),
  CONSTRAINT valid_sequence_verse_range CHECK (
    validate_verse_range (start_verse_id, end_verse_id)
  )
);


-- Individual audio/video segments (source or target recordings)
CREATE TABLE segments (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  type segment_type NOT NULL,
  local_path TEXT,
  remote_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);


-- Junction table linking sequences to segments with ordering
CREATE TABLE sequences_segments (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  sequence_id UUID REFERENCES sequences (id) ON DELETE CASCADE NOT NULL,
  segment_id UUID REFERENCES segments (id) ON DELETE CASCADE NOT NULL,
  segment_index INTEGER NOT NULL CHECK (segment_index >= 0),
  segment_color TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_numbered BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (sequence_id, segment_index),
  UNIQUE (sequence_id, segment_id)
);


-- Junction table for sequence tags
CREATE TABLE sequences_tags (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  sequence_id UUID REFERENCES sequences (id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags (id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (sequence_id, tag_id)
);


-- What content the sequence represents
CREATE TABLE sequences_targets (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  sequence_id UUID REFERENCES sequences (id) ON DELETE CASCADE NOT NULL,
  is_bible_audio BOOLEAN DEFAULT FALSE,
  target_type target_type NOT NULL,
  target_id UUID NOT NULL, -- Generic reference to target content
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (sequence_id, target_type, target_id)
);


-- What content the segment represents
CREATE TABLE segments_targets (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  segment_id UUID REFERENCES segments (id) ON DELETE CASCADE NOT NULL,
  is_bible_audio BOOLEAN DEFAULT FALSE,
  target_type target_type NOT NULL,
  target_id UUID NOT NULL, -- Generic reference to target content
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (segment_id, target_type, target_id)
);


-- ============================================================================
-- ADD MISSING FOREIGN KEY CONSTRAINTS TO EXISTING TABLES
-- ============================================================================
-- Link media_files to projects (this was missing)
ALTER TABLE media_files
ADD CONSTRAINT media_files_project_id_fkey FOREIGN key (project_id) REFERENCES projects (id) ON DELETE SET NULL;


-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
-- Projects indexes
CREATE INDEX idx_projects_name ON projects (name);


CREATE INDEX idx_projects_source_language_entity_id ON projects (source_language_entity_id);


CREATE INDEX idx_projects_target_language_entity_id ON projects (target_language_entity_id);


CREATE INDEX idx_projects_region_id ON projects (region_id)
WHERE
  region_id IS NOT NULL;


CREATE INDEX idx_projects_location ON projects USING gist (location)
WHERE
  location IS NOT NULL;


CREATE INDEX idx_projects_created_at ON projects (created_at);


CREATE INDEX idx_projects_deleted_at ON projects (deleted_at)
WHERE
  deleted_at IS NOT NULL;


-- Sequences indexes
CREATE INDEX idx_sequences_name ON sequences (name);


CREATE INDEX idx_sequences_project_id ON sequences (project_id);


CREATE INDEX idx_sequences_book_id ON sequences (book_id);


CREATE INDEX idx_sequences_start_verse_id ON sequences (start_verse_id);


CREATE INDEX idx_sequences_end_verse_id ON sequences (end_verse_id);


CREATE INDEX idx_sequences_created_at ON sequences (created_at);


CREATE INDEX idx_sequences_deleted_at ON sequences (deleted_at)
WHERE
  deleted_at IS NOT NULL;


-- Segments indexes
CREATE INDEX idx_segments_type ON segments (type);


CREATE INDEX idx_segments_created_by ON segments (created_by);


CREATE INDEX idx_segments_created_at ON segments (created_at);


CREATE INDEX idx_segments_deleted_at ON segments (deleted_at)
WHERE
  deleted_at IS NOT NULL;


-- Sequences_segments indexes
CREATE INDEX idx_sequences_segments_sequence_id ON sequences_segments (sequence_id);


CREATE INDEX idx_sequences_segments_segment_id ON sequences_segments (segment_id);


CREATE INDEX idx_sequences_segments_segment_index ON sequences_segments (segment_index);


CREATE INDEX idx_sequences_segments_is_deleted ON sequences_segments (is_deleted);


-- Sequences_tags indexes
CREATE INDEX idx_sequences_tags_sequence_id ON sequences_tags (sequence_id);


CREATE INDEX idx_sequences_tags_tag_id ON sequences_tags (tag_id);


-- Sequences_targets indexes
CREATE INDEX idx_sequences_targets_sequence_id ON sequences_targets (sequence_id);


CREATE INDEX idx_sequences_targets_target_type ON sequences_targets (target_type);


CREATE INDEX idx_sequences_targets_target_id ON sequences_targets (target_id);


CREATE INDEX idx_sequences_targets_is_bible_audio ON sequences_targets (is_bible_audio);


CREATE INDEX idx_sequences_targets_created_by ON sequences_targets (created_by);


CREATE INDEX idx_sequences_targets_deleted_at ON sequences_targets (deleted_at)
WHERE
  deleted_at IS NOT NULL;


-- Segments_targets indexes
CREATE INDEX idx_segments_targets_segment_id ON segments_targets (segment_id);


CREATE INDEX idx_segments_targets_target_type ON segments_targets (target_type);


CREATE INDEX idx_segments_targets_target_id ON segments_targets (target_id);


CREATE INDEX idx_segments_targets_is_bible_audio ON segments_targets (is_bible_audio);


CREATE INDEX idx_segments_targets_created_by ON segments_targets (created_by);


CREATE INDEX idx_segments_targets_deleted_at ON segments_targets (deleted_at)
WHERE
  deleted_at IS NOT NULL;


-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE TRIGGER update_projects_updated_at before
UPDATE ON projects FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_sequences_updated_at before
UPDATE ON sequences FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_segments_updated_at before
UPDATE ON segments FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_sequences_segments_updated_at before
UPDATE ON sequences_segments FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_sequences_tags_updated_at before
UPDATE ON sequences_tags FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_sequences_targets_updated_at before
UPDATE ON sequences_targets FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_segments_targets_updated_at before
UPDATE ON segments_targets FOR each ROW
EXECUTE function update_updated_at_column ();


-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE projects enable ROW level security;


ALTER TABLE sequences enable ROW level security;


ALTER TABLE segments enable ROW level security;


ALTER TABLE sequences_segments enable ROW level security;


ALTER TABLE sequences_tags enable ROW level security;


ALTER TABLE sequences_targets enable ROW level security;


ALTER TABLE segments_targets enable ROW level security;


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON TABLE projects IS 'Recording projects with source and target languages';


comment ON TABLE sequences IS 'Sequences within projects targeting specific bible content';


comment ON TABLE segments IS 'Individual audio/video segments (source or target recordings)';


comment ON TABLE sequences_segments IS 'Junction table linking sequences to segments with ordering';


comment ON TABLE sequences_tags IS 'Junction table for sequence tags';


comment ON TABLE sequences_targets IS 'What content the sequence represents';


comment ON TABLE segments_targets IS 'What content the segment represents';


comment ON COLUMN projects.location IS 'PostGIS Point geometry for project location in WGS84 (SRID 4326)';


comment ON COLUMN sequences.start_verse_id IS 'Starting verse of the sequence (must be <= end_verse_id)';


comment ON COLUMN sequences.end_verse_id IS 'Ending verse of the sequence (must be >= start_verse_id)';


comment ON COLUMN segments.type IS 'Whether this is a source recording or target recording';


comment ON COLUMN sequences_segments.segment_index IS 'Order of segment within sequence (0-based)';


comment ON COLUMN sequences_segments.segment_color IS 'Color coding for segment visualization';


comment ON COLUMN sequences_segments.is_deleted IS 'Soft delete flag for segments within sequences';


comment ON COLUMN sequences_segments.is_numbered IS 'Whether segment should be numbered in UI';


comment ON COLUMN sequences_targets.target_id IS 'Generic UUID reference to target content';


comment ON COLUMN segments_targets.target_id IS 'Generic UUID reference to target content';
