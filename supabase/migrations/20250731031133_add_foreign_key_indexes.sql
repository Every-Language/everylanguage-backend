-- Add Foreign Key Indexes
-- Add indexes for unindexed foreign keys that are likely to be used
-- This improves JOIN performance and foreign key constraint checking
-- ============================================================================
-- CREATED_BY FIELD INDEXES
-- ============================================================================
-- Add indexes for created_by foreign keys (commonly used for user-owned content queries)
CREATE INDEX if NOT EXISTS idx_media_files_tags_created_by ON media_files_tags (created_by);


CREATE INDEX if NOT EXISTS idx_media_files_targets_created_by ON media_files_targets (created_by);


CREATE INDEX if NOT EXISTS idx_media_files_verses_created_by ON media_files_verses (created_by);


CREATE INDEX if NOT EXISTS idx_playlist_groups_created_by ON playlist_groups (created_by);


CREATE INDEX if NOT EXISTS idx_playlist_items_created_by ON playlist_items (created_by);


CREATE INDEX if NOT EXISTS idx_playlists_playlist_groups_created_by ON playlists_playlist_groups (created_by);


CREATE INDEX if NOT EXISTS idx_projects_created_by ON projects (created_by);


CREATE INDEX if NOT EXISTS idx_sequences_created_by ON sequences (created_by);


CREATE INDEX if NOT EXISTS idx_sequences_segments_created_by ON sequences_segments (created_by);


CREATE INDEX if NOT EXISTS idx_sequences_tags_created_by ON sequences_tags (created_by);


CREATE INDEX if NOT EXISTS idx_tags_created_by ON tags (created_by);


CREATE INDEX if NOT EXISTS idx_text_versions_created_by ON text_versions (created_by);


CREATE INDEX if NOT EXISTS idx_verse_texts_created_by ON verse_texts (created_by);


-- ============================================================================
-- REVIEWED_BY FIELD INDEXES  
-- ============================================================================
-- Add indexes for reviewed_by foreign keys (used in approval workflows)
CREATE INDEX if NOT EXISTS idx_language_entity_versions_reviewed_by ON language_entity_versions (reviewed_by);


CREATE INDEX if NOT EXISTS idx_region_versions_reviewed_by ON region_versions (reviewed_by);


-- ============================================================================
-- UPDATED_BY FIELD INDEXES
-- ============================================================================
-- Add indexes for updated_by foreign keys (used in audit trails)
CREATE INDEX if NOT EXISTS idx_verse_feedback_updated_by ON verse_feedback (updated_by);


-- ============================================================================
-- RELATIONSHIP INDEXES
-- ============================================================================
-- Add indexes for important relationship foreign keys
CREATE INDEX if NOT EXISTS idx_text_versions_bible_version_id ON text_versions (bible_version_id);


CREATE INDEX if NOT EXISTS idx_user_positions_bookmark_folder_id ON user_positions (bookmark_folder_id);


-- ============================================================================
-- SHARING AND SESSION INDEXES
-- ============================================================================
-- Add indexes for sharing system foreign keys (likely to be used for analytics)
CREATE INDEX if NOT EXISTS idx_share_opens_origin_share_id ON share_opens (origin_share_id);


CREATE INDEX if NOT EXISTS idx_share_opens_session_id ON share_opens (session_id);


-- Note: These indexes improve JOIN performance and foreign key constraint checking
-- They are created with IF NOT EXISTS to avoid conflicts with existing indexes
