-- ============================================================================
-- CHAPTER LISTENS TABLE
-- ============================================================================
-- Chapter-level listening events for content analytics
CREATE TABLE chapter_listens (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  anon_user_id UUID REFERENCES users_anon (id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  session_id UUID REFERENCES sessions (id) ON DELETE CASCADE NOT NULL,
  chapter_id UUID REFERENCES chapters (id) ON DELETE CASCADE NOT NULL,
  language_entity_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  listened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location geometry (point, 4326),
  connectivity connectivity_type DEFAULT 'unknown',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
-- Chapter listens indexes
CREATE INDEX idx_chapter_listens_anon_user_id ON chapter_listens (anon_user_id);


CREATE INDEX idx_chapter_listens_session_id ON chapter_listens (session_id);


CREATE INDEX idx_chapter_listens_chapter_id ON chapter_listens (chapter_id);


CREATE INDEX idx_chapter_listens_language_entity_id ON chapter_listens (language_entity_id);


CREATE INDEX idx_chapter_listens_location ON chapter_listens USING gist (location)
WHERE
  location IS NOT NULL;


-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Enable RLS on chapter_listens table
ALTER TABLE chapter_listens enable ROW level security;


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON TABLE chapter_listens IS 'Chapter-level listening events for granular content analytics and heatmaps';


comment ON COLUMN chapter_listens.location IS 'PostGIS Point geometry for listening location in WGS84 (SRID 4326)';


comment ON COLUMN chapter_listens.listened_at IS 'Timestamp when the chapter listening event was recorded';


comment ON COLUMN chapter_listens.connectivity IS 'Type of network connectivity when the chapter was listened to';
