-- Create Analytics System for Bible App Usage Tracking
-- This migration creates comprehensive analytics tables for tracking user behavior,
-- app usage, and geographical distribution of content consumption
-- ============================================================================
-- ============================================================================
-- ENUMS FOR ANALYTICS
-- ============================================================================
-- Connectivity type enum
CREATE TYPE connectivity_type AS ENUM('wifi', 'cellular', 'offline', 'unknown');


-- Platform enum  
CREATE TYPE platform_type AS ENUM('ios', 'android', 'web', 'desktop');


-- Share entity type enum
CREATE TYPE share_entity_type AS ENUM('app', 'chapter', 'playlist', 'verse', 'passage');


-- ============================================================================
-- CORE ANALYTICS TABLES
-- ============================================================================
-- Anonymous users table for privacy-preserving analytics
CREATE TABLE users_anon (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  device_id TEXT NOT NULL UNIQUE, -- Generated and stored on device
  user_id UUID REFERENCES public.users (id) ON DELETE SET NULL, -- Optional link to authenticated user
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- User sessions for tracking app usage periods
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  anon_user_id UUID REFERENCES users_anon (id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  connectivity connectivity_type DEFAULT 'unknown',
  location geometry (point, 4326), -- PostGIS point for geographic location
  platform platform_type NOT NULL,
  app_version TEXT NOT NULL,
  os TEXT,
  os_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- App download tracking with attribution
CREATE TABLE app_downloads (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  source_share_id UUID, -- Will reference shares table (added as FK later)
  anon_user_id UUID REFERENCES users_anon (id) ON DELETE SET NULL,
  device_id TEXT NOT NULL,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location geometry (point, 4326),
  app_version TEXT NOT NULL,
  platform platform_type NOT NULL,
  os TEXT,
  os_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Media file listening events with detailed analytics
CREATE TABLE media_file_listens (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  anon_user_id UUID REFERENCES users_anon (id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  session_id UUID REFERENCES sessions (id) ON DELETE CASCADE NOT NULL,
  media_file_id UUID NOT NULL, -- References to media files (table to be created later)
  language_entity_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  position_seconds INTEGER NOT NULL CHECK (position_seconds >= 0),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  listened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location geometry (point, 4326),
  connectivity connectivity_type DEFAULT 'unknown',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Verse-level listening events for detailed content analytics
CREATE TABLE verse_listens (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  anon_user_id UUID REFERENCES users_anon (id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  session_id UUID REFERENCES sessions (id) ON DELETE CASCADE NOT NULL,
  verse_id UUID NOT NULL, -- References to verses (table to be created later)
  language_entity_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  listened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location geometry (point, 4326),
  connectivity connectivity_type DEFAULT 'unknown',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Content sharing tracking
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  anon_user_id UUID REFERENCES users_anon (id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  session_id UUID REFERENCES sessions (id) ON DELETE CASCADE NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  share_entity_type share_entity_type NOT NULL,
  share_entity_id UUID NOT NULL, -- Generic reference to shared content
  language_entity_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  location geometry (point, 4326),
  origin_share_id UUID REFERENCES shares (id) ON DELETE SET NULL, -- For tracking share chains
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Share conversion tracking
CREATE TABLE share_opens (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  share_id UUID REFERENCES shares (id) ON DELETE CASCADE NOT NULL,
  opened_by_anon_user_id UUID REFERENCES users_anon (id) ON DELETE SET NULL,
  device_id TEXT,
  session_id UUID REFERENCES sessions (id) ON DELETE SET NULL,
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  language_entity_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  location geometry (point, 4326),
  origin_share_id UUID REFERENCES shares (id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Add foreign key constraint for app_downloads source_share_id
ALTER TABLE app_downloads
ADD CONSTRAINT app_downloads_source_share_id_fkey FOREIGN key (source_share_id) REFERENCES shares (id) ON DELETE SET NULL;


-- ============================================================================
-- INDEXES FOR PERFORMANCE (Critical for heatmap queries)
-- ============================================================================
-- Users_anon indexes
CREATE INDEX idx_users_anon_device_id ON users_anon (device_id);


CREATE INDEX idx_users_anon_user_id ON users_anon (user_id)
WHERE
  user_id IS NOT NULL;


CREATE INDEX idx_users_anon_created_at ON users_anon (created_at);


-- Sessions indexes
CREATE INDEX idx_sessions_anon_user_id ON sessions (anon_user_id);


CREATE INDEX idx_sessions_device_id ON sessions (device_id);


CREATE INDEX idx_sessions_started_at ON sessions (started_at);


CREATE INDEX idx_sessions_platform ON sessions (platform);


CREATE INDEX idx_sessions_location ON sessions USING gist (location)
WHERE
  location IS NOT NULL;


CREATE INDEX idx_sessions_connectivity ON sessions (connectivity);


CREATE INDEX idx_sessions_timerange ON sessions (started_at, ended_at);


-- App downloads indexes
CREATE INDEX idx_app_downloads_anon_user_id ON app_downloads (anon_user_id);


CREATE INDEX idx_app_downloads_device_id ON app_downloads (device_id);


CREATE INDEX idx_app_downloads_installed_at ON app_downloads (installed_at);


CREATE INDEX idx_app_downloads_platform ON app_downloads (platform);


CREATE INDEX idx_app_downloads_location ON app_downloads USING gist (location)
WHERE
  location IS NOT NULL;


CREATE INDEX idx_app_downloads_source_share ON app_downloads (source_share_id)
WHERE
  source_share_id IS NOT NULL;


-- Media file listens indexes (Critical for heatmap performance)
CREATE INDEX idx_media_listens_anon_user_id ON media_file_listens (anon_user_id);


CREATE INDEX idx_media_listens_session_id ON media_file_listens (session_id);


CREATE INDEX idx_media_listens_media_file_id ON media_file_listens (media_file_id);


CREATE INDEX idx_media_listens_language_entity_id ON media_file_listens (language_entity_id);


CREATE INDEX idx_media_listens_listened_at ON media_file_listens (listened_at);


CREATE INDEX idx_media_listens_location ON media_file_listens USING gist (location)
WHERE
  location IS NOT NULL;


CREATE INDEX idx_media_listens_duration ON media_file_listens (duration_seconds);


-- Composite index for heatmap queries (language + location + time)
CREATE INDEX idx_media_listens_heatmap ON media_file_listens (language_entity_id, listened_at)
WHERE
  location IS NOT NULL;


-- Spatial-temporal index for advanced heatmap queries
CREATE INDEX idx_media_listens_geo_temporal ON media_file_listens USING gist (location, listened_at)
WHERE
  location IS NOT NULL;


-- Verse listens indexes
CREATE INDEX idx_verse_listens_anon_user_id ON verse_listens (anon_user_id);


CREATE INDEX idx_verse_listens_session_id ON verse_listens (session_id);


CREATE INDEX idx_verse_listens_verse_id ON verse_listens (verse_id);


CREATE INDEX idx_verse_listens_language_entity_id ON verse_listens (language_entity_id);


CREATE INDEX idx_verse_listens_listened_at ON verse_listens (listened_at);


CREATE INDEX idx_verse_listens_location ON verse_listens USING gist (location)
WHERE
  location IS NOT NULL;


-- Composite index for verse-level heatmaps
CREATE INDEX idx_verse_listens_heatmap ON verse_listens (language_entity_id, listened_at)
WHERE
  location IS NOT NULL;


-- Shares indexes
CREATE INDEX idx_shares_anon_user_id ON shares (anon_user_id);


CREATE INDEX idx_shares_session_id ON shares (session_id);


CREATE INDEX idx_shares_shared_at ON shares (shared_at);


CREATE INDEX idx_shares_entity_type ON shares (share_entity_type);


CREATE INDEX idx_shares_entity_id ON shares (share_entity_id);


CREATE INDEX idx_shares_language_entity_id ON shares (language_entity_id);


CREATE INDEX idx_shares_location ON shares USING gist (location)
WHERE
  location IS NOT NULL;


CREATE INDEX idx_shares_origin ON shares (origin_share_id)
WHERE
  origin_share_id IS NOT NULL;


-- Share opens indexes
CREATE INDEX idx_share_opens_share_id ON share_opens (share_id);


CREATE INDEX idx_share_opens_anon_user_id ON share_opens (opened_by_anon_user_id);


CREATE INDEX idx_share_opens_opened_at ON share_opens (opened_at);


CREATE INDEX idx_share_opens_language_entity_id ON share_opens (language_entity_id);


CREATE INDEX idx_share_opens_location ON share_opens USING gist (location)
WHERE
  location IS NOT NULL;


-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE TRIGGER update_users_anon_updated_at before
UPDATE ON users_anon FOR each ROW
EXECUTE function update_updated_at_column ();


-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- Enable RLS on all analytics tables
ALTER TABLE users_anon enable ROW level security;


ALTER TABLE sessions enable ROW level security;


ALTER TABLE app_downloads enable ROW level security;


ALTER TABLE media_file_listens enable ROW level security;


ALTER TABLE verse_listens enable ROW level security;


ALTER TABLE shares enable ROW level security;


ALTER TABLE share_opens enable ROW level security;


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON TABLE users_anon IS 'Privacy-preserving anonymous user tracking for analytics';


comment ON TABLE sessions IS 'User session tracking with location and device information';


comment ON TABLE app_downloads IS 'App installation tracking with attribution data';


comment ON TABLE media_file_listens IS 'Detailed media file listening events for analytics and heatmaps';


comment ON TABLE verse_listens IS 'Verse-level listening events for granular content analytics';


comment ON TABLE shares IS 'Content sharing tracking with viral attribution';


comment ON TABLE share_opens IS 'Share conversion tracking and analytics';


comment ON COLUMN sessions.location IS 'PostGIS Point geometry for session location in WGS84 (SRID 4326)';


comment ON COLUMN media_file_listens.location IS 'PostGIS Point geometry for listening location in WGS84 (SRID 4326)';


comment ON COLUMN media_file_listens.position_seconds IS 'Playback position when event was recorded';


comment ON COLUMN media_file_listens.duration_seconds IS 'Duration of listening session in seconds';


comment ON function get_listening_heatmap IS 'Generate heatmap data for language listening patterns with geographic clustering';


comment ON function get_language_distribution_by_region IS 'Get language listening distribution across geographic regions';


comment ON function get_clustered_listening_data IS 'Get clustered listening data for efficient heatmap visualization';
