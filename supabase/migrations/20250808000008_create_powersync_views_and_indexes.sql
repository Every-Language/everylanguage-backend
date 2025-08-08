-- Create PowerSync views for efficient syncing
-- View 1: Media files verses with audio version ID
-- This allows syncing media_files_verses filtered by audio_version_id
CREATE VIEW media_files_verses_with_audio_version AS
SELECT
  mfv.*,
  mf.audio_version_id
FROM
  media_files_verses mfv
  JOIN media_files mf ON mfv.media_file_id = mf.id
WHERE
  mf.audio_version_id IS NOT NULL;


-- View 2: User playlist passages 
-- This allows syncing passages that belong to user playlists (where target_type = 'passage')
CREATE VIEW passages_with_playlist_id AS
SELECT
  p.*,
  pi.playlist_id
FROM
  passages p
  JOIN playlist_items pi ON p.id = pi.target_id
WHERE
  pi.target_type = 'passage';


-- Indexes for optimal view performance
-- Indexes for media_files_verses_with_audio_version view
CREATE INDEX if NOT EXISTS idx_media_files_verses_media_file_id ON media_files_verses (media_file_id);


CREATE INDEX if NOT EXISTS idx_media_files_audio_version_id ON media_files (audio_version_id)
WHERE
  audio_version_id IS NOT NULL;


-- Indexes for user_playlist_passages_view
CREATE INDEX if NOT EXISTS idx_playlist_items_target_id_type ON playlist_items (target_id, target_type);


CREATE INDEX if NOT EXISTS idx_playlist_items_playlist_id ON playlist_items (playlist_id);


-- Additional indexes for PowerSync sync rule performance
CREATE INDEX if NOT EXISTS idx_user_playlists_user_id_playlist_id ON user_playlists (user_id, playlist_id);


CREATE INDEX if NOT EXISTS idx_user_saved_audio_versions_user_id_audio_version_id ON user_saved_audio_versions (user_id, audio_version_id);
