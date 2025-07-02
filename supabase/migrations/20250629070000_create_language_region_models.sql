-- Create Language and Region Models
-- This migration creates the complete language and region management system
-- with hierarchical relationships, versioning, and user contributions
-- ============================================================================
-- Enable PostGIS for geometry support (regions.boundary)
CREATE EXTENSION if NOT EXISTS postgis;


-- ============================================================================
-- ENUMS
-- ============================================================================
-- Language entity levels enum
CREATE TYPE language_entity_level AS ENUM('family', 'language', 'dialect', 'mother_tongue');


-- Region levels enum  
CREATE TYPE region_level AS ENUM(
  'continent',
  'world_region',
  'country',
  'state',
  'province',
  'district',
  'town',
  'village'
);


-- Change type enum for versioning
CREATE TYPE change_type AS ENUM('create', 'update', 'delete');


-- Contribution status enum
CREATE TYPE contribution_status AS ENUM('approved', 'not_approved');


-- ============================================================================
-- CORE TABLES
-- ============================================================================
-- Language entities table (hierarchical)
CREATE TABLE language_entities (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  parent_id UUID REFERENCES language_entities (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  level language_entity_level NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);


-- Regions table (hierarchical with PostGIS geometry)
CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  parent_id UUID REFERENCES regions (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  level region_level NOT NULL,
  boundary geometry (multipolygon, 4326), -- PostGIS geometry for boundaries
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);


-- ============================================================================
-- JUNCTION TABLES
-- ============================================================================
-- Language entities to regions relationship
CREATE TABLE language_entities_regions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  language_entity_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  region_id UUID REFERENCES regions (id) ON DELETE CASCADE NOT NULL,
  dominance_level FLOAT CHECK (
    dominance_level >= 0
    AND dominance_level <= 1
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  -- Ensure unique language-region pairs
  UNIQUE (language_entity_id, region_id)
);


-- ============================================================================
-- ALIAS TABLES
-- ============================================================================
-- Language entity aliases
CREATE TABLE language_aliases (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  language_entity_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  alias_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);


-- Region aliases  
CREATE TABLE region_aliases (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  region_id UUID REFERENCES regions (id) ON DELETE CASCADE NOT NULL,
  alias_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);


-- ============================================================================
-- SOURCES TABLES
-- ============================================================================
-- Language entity sources
CREATE TABLE language_entity_sources (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  language_entity_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL,
  version TEXT,
  is_external BOOLEAN NOT NULL DEFAULT FALSE,
  external_id TEXT,
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  -- Constraint: if external, must have external_id; if not external, must have created_by
  CONSTRAINT check_language_source_reference CHECK (
    (
      is_external = TRUE
      AND external_id IS NOT NULL
    )
    OR (
      is_external = FALSE
      AND created_by IS NOT NULL
    )
  )
);


-- Region sources
CREATE TABLE region_sources (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  region_id UUID REFERENCES regions (id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL,
  version TEXT,
  is_external BOOLEAN NOT NULL DEFAULT FALSE,
  external_id TEXT,
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  -- Constraint: if external, must have external_id; if not external, must have created_by
  CONSTRAINT check_region_source_reference CHECK (
    (
      is_external = TRUE
      AND external_id IS NOT NULL
    )
    OR (
      is_external = FALSE
      AND created_by IS NOT NULL
    )
  )
);


-- ============================================================================
-- PROPERTIES TABLES (Key-Value storage)
-- ============================================================================
-- Language entity properties
CREATE TABLE language_properties (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  language_entity_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  -- Ensure unique key per language entity
  UNIQUE (language_entity_id, key)
);


-- Region properties
CREATE TABLE region_properties (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  region_id UUID REFERENCES regions (id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  -- Ensure unique key per region
  UNIQUE (region_id, key)
);


-- ============================================================================
-- USER CONTRIBUTIONS TABLE
-- ============================================================================
-- User contributions tracking
CREATE TABLE user_contributions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  target_table TEXT NOT NULL,
  target_id UUID NOT NULL,
  change_type change_type NOT NULL,
  status contribution_status NOT NULL DEFAULT 'not_approved',
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by UUID REFERENCES public.users (id) ON DELETE SET NULL NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  reviewed_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE
);


-- ============================================================================
-- VERSIONING TABLES
-- ============================================================================
-- Region versions (audit trail)
CREATE TABLE region_versions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  region_id UUID REFERENCES regions (id) ON DELETE CASCADE NOT NULL,
  parent_id UUID, -- Historical parent reference (not constrained)
  name TEXT NOT NULL,
  level region_level NOT NULL,
  change_type change_type NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by UUID REFERENCES public.users (id) ON DELETE SET NULL NOT NULL,
  version INTEGER NOT NULL,
  reviewed_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE
);


-- Language entity versions (audit trail)
CREATE TABLE language_entity_versions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  language_entity_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  parent_id UUID, -- Historical parent reference (not constrained)
  name TEXT NOT NULL,
  level language_entity_level NOT NULL,
  change_type change_type NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by UUID REFERENCES public.users (id) ON DELETE SET NULL NOT NULL,
  version INTEGER NOT NULL,
  reviewed_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE
);


-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
-- Language entities indexes
CREATE INDEX idx_language_entities_parent_id ON language_entities (parent_id);


CREATE INDEX idx_language_entities_level ON language_entities (level);


CREATE INDEX idx_language_entities_name ON language_entities (name);


CREATE INDEX idx_language_entities_deleted_at ON language_entities (deleted_at);


-- Regions indexes
CREATE INDEX idx_regions_parent_id ON regions (parent_id);


CREATE INDEX idx_regions_level ON regions (level);


CREATE INDEX idx_regions_name ON regions (name);


CREATE INDEX idx_regions_deleted_at ON regions (deleted_at);


CREATE INDEX idx_regions_boundary ON regions USING gist (boundary);


-- Spatial index
-- Language entities regions indexes
CREATE INDEX idx_language_entities_regions_language_id ON language_entities_regions (language_entity_id);


CREATE INDEX idx_language_entities_regions_region_id ON language_entities_regions (region_id);


CREATE INDEX idx_language_entities_regions_dominance ON language_entities_regions (dominance_level);


CREATE INDEX idx_language_entities_regions_deleted_at ON language_entities_regions (deleted_at);


-- Aliases indexes
CREATE INDEX idx_language_aliases_entity_id ON language_aliases (language_entity_id);


CREATE INDEX idx_language_aliases_name ON language_aliases (alias_name);


CREATE INDEX idx_region_aliases_region_id ON region_aliases (region_id);


CREATE INDEX idx_region_aliases_name ON region_aliases (alias_name);


-- Sources indexes
CREATE INDEX idx_language_entity_sources_entity_id ON language_entity_sources (language_entity_id);


CREATE INDEX idx_language_entity_sources_created_by ON language_entity_sources (created_by);


CREATE INDEX idx_region_sources_region_id ON region_sources (region_id);


CREATE INDEX idx_region_sources_created_by ON region_sources (created_by);


-- Properties indexes
CREATE INDEX idx_language_properties_entity_id ON language_properties (language_entity_id);


CREATE INDEX idx_language_properties_key ON language_properties (key);


CREATE INDEX idx_region_properties_region_id ON region_properties (region_id);


CREATE INDEX idx_region_properties_key ON region_properties (key);


-- User contributions indexes
CREATE INDEX idx_user_contributions_target ON user_contributions (target_table, target_id);


CREATE INDEX idx_user_contributions_changed_by ON user_contributions (changed_by);


CREATE INDEX idx_user_contributions_reviewed_by ON user_contributions (reviewed_by);


CREATE INDEX idx_user_contributions_status ON user_contributions (status);


-- Versioning indexes
CREATE INDEX idx_region_versions_region_id ON region_versions (region_id);


CREATE INDEX idx_region_versions_changed_by ON region_versions (changed_by);


CREATE INDEX idx_region_versions_version ON region_versions (version);


CREATE INDEX idx_language_entity_versions_entity_id ON language_entity_versions (language_entity_id);


CREATE INDEX idx_language_entity_versions_changed_by ON language_entity_versions (changed_by);


CREATE INDEX idx_language_entity_versions_version ON language_entity_versions (version);


-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
-- Updated at triggers for tables that need them
CREATE TRIGGER update_language_entities_updated_at before
UPDATE ON language_entities FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_regions_updated_at before
UPDATE ON regions FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_language_entities_regions_updated_at before
UPDATE ON language_entities_regions FOR each ROW
EXECUTE function update_updated_at_column ();


-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE language_entities enable ROW level security;


ALTER TABLE regions enable ROW level security;


ALTER TABLE language_entities_regions enable ROW level security;


ALTER TABLE language_aliases enable ROW level security;


ALTER TABLE region_aliases enable ROW level security;


ALTER TABLE language_entity_sources enable ROW level security;


ALTER TABLE region_sources enable ROW level security;


ALTER TABLE language_properties enable ROW level security;


ALTER TABLE region_properties enable ROW level security;


ALTER TABLE user_contributions enable ROW level security;


ALTER TABLE region_versions enable ROW level security;


ALTER TABLE language_entity_versions enable ROW level security;


-- Basic read policies (can be customized based on your needs)
CREATE POLICY "Allow read access to language entities" ON language_entities FOR
SELECT
  USING (deleted_at IS NULL);


CREATE POLICY "Allow read access to regions" ON regions FOR
SELECT
  USING (deleted_at IS NULL);


CREATE POLICY "Allow read access to language entities regions" ON language_entities_regions FOR
SELECT
  USING (deleted_at IS NULL);


-- More restrictive policies for modifications (users can only edit their own contributions)
CREATE POLICY "Users can view their own contributions" ON user_contributions FOR
SELECT
  USING (
    changed_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


CREATE POLICY "Users can create contributions" ON user_contributions FOR insert
WITH
  CHECK (
    changed_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================
-- Function to get language entity hierarchy path
CREATE OR REPLACE FUNCTION get_language_entity_path (entity_id UUID) returns TEXT AS $$
DECLARE
  path TEXT := '';
  current_id UUID := entity_id;
  current_name TEXT;
  current_parent UUID;
BEGIN
  WHILE current_id IS NOT NULL LOOP
    SELECT name, parent_id INTO current_name, current_parent
    FROM language_entities 
    WHERE id = current_id AND deleted_at IS NULL;
    
    IF current_name IS NULL THEN
      EXIT;
    END IF;
    
    IF path = '' THEN
      path := current_name;
    ELSE
      path := current_name || ' > ' || path;
    END IF;
    
    current_id := current_parent;
  END LOOP;
  
  RETURN path;
END;
$$ language plpgsql;


-- Function to get region hierarchy path
CREATE OR REPLACE FUNCTION get_region_path (region_id UUID) returns TEXT AS $$
DECLARE
  path TEXT := '';
  current_id UUID := region_id;
  current_name TEXT;
  current_parent UUID;
BEGIN
  WHILE current_id IS NOT NULL LOOP
    SELECT name, parent_id INTO current_name, current_parent
    FROM regions 
    WHERE id = current_id AND deleted_at IS NULL;
    
    IF current_name IS NULL THEN
      EXIT;
    END IF;
    
    IF path = '' THEN
      path := current_name;
    ELSE
      path := current_name || ' > ' || path;
    END IF;
    
    current_id := current_parent;
  END LOOP;
  
  RETURN path;
END;
$$ language plpgsql;


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON TABLE language_entities IS 'Hierarchical storage of language families, languages, dialects, and mother tongues';


comment ON TABLE regions IS 'Hierarchical storage of geographical regions from continents to villages';


comment ON TABLE language_entities_regions IS 'Many-to-many relationship between language entities and regions with dominance levels';


comment ON TABLE user_contributions IS 'Tracks all user contributions for moderation and version control';


comment ON COLUMN regions.boundary IS 'PostGIS MultiPolygon geometry for region boundaries in WGS84 (SRID 4326)';


comment ON COLUMN language_entities_regions.dominance_level IS 'Float 0-1 indicating how dominant this language is in this region';


comment ON type language_entity_level IS 'Hierarchy: family > language > dialect > mother_tongue';


comment ON type region_level IS 'Hierarchy: continent > world_region > country > state > province > district > town > village';
