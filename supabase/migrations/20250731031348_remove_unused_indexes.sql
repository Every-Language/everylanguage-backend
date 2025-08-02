-- Remove Unused Indexes (Conservative Approach)
-- Remove only obviously unused indexes to reduce maintenance overhead
-- Being conservative since frontend development is not yet complete
-- ============================================================================
-- REMOVE REDUNDANT OR OVERLY SPECIFIC INDEXES
-- ============================================================================
-- Remove some indexes that are very unlikely to be used based on query patterns
-- Media files indexes that are probably redundant
DROP INDEX if EXISTS idx_media_files_is_bible_audio;


-- Very specific boolean flag, unlikely to be queried alone
DROP INDEX if EXISTS idx_media_files_start_verse_id;


-- Probably covered by other verse-related queries
-- User-related indexes that are probably redundant
DROP INDEX if EXISTS idx_users_email;


-- Email lookups usually go through auth system
DROP INDEX if EXISTS idx_users_created_at;


-- Creation date rarely queried directly for users
-- Version and status indexes that might be redundant
DROP INDEX if EXISTS idx_images_version;


-- Version field probably not queried independently
DROP INDEX if EXISTS idx_images_publish_status;


-- Status might be queried, but likely with other filters
-- Analytics indexes that are very specific
DROP INDEX if EXISTS idx_media_listens_duration;


-- Duration alone rarely queried
DROP INDEX if EXISTS idx_media_listens_heatmap;


-- Very specific analytics feature
DROP INDEX if EXISTS idx_verse_listens_heatmap;


-- Very specific analytics feature
-- ============================================================================
-- REMOVE SOME SESSION AND ANALYTICS INDEXES
-- ============================================================================
-- Session-related indexes that might be overly granular
DROP INDEX if EXISTS idx_sessions_platform;


-- Platform alone rarely useful
DROP INDEX if EXISTS idx_sessions_connectivity;


-- Very specific metric
DROP INDEX if EXISTS idx_sessions_timerange;


-- Overly specific
-- App download indexes that are very specific
DROP INDEX if EXISTS idx_app_downloads_platform;


-- Platform alone not often queried
DROP INDEX if EXISTS idx_app_downloads_source_share;


-- Very specific tracking
-- ============================================================================
-- REMOVE SOME GEOLOCATION INDEXES
-- ============================================================================
-- Location-based indexes that might not be used yet
DROP INDEX if EXISTS idx_media_listens_location;


-- Geolocation queries not implemented
DROP INDEX if EXISTS idx_verse_listens_location;


-- Geolocation queries not implemented
DROP INDEX if EXISTS idx_share_opens_location;


-- Geolocation queries not implemented
DROP INDEX if EXISTS idx_shares_location;


-- Geolocation queries not implemented
-- ============================================================================
-- REMOVE SOME ORGANIZATIONAL INDEXES
-- ============================================================================
-- Team and base-related indexes (if these features aren't active)
DROP INDEX if EXISTS idx_teams_type;


-- Team types might not be used
DROP INDEX if EXISTS idx_bases_location;


-- Base locations might be covered by region queries
-- ============================================================================
-- IMPORTANT NOTE
-- ============================================================================
-- This migration removes conservative set of unused indexes
-- If any queries become slow after frontend development, 
-- Supabase's performance monitoring will suggest recreating specific indexes
-- All dropped indexes can be easily recreated if needed
-- Indexes preserved:
-- - All primary key and foreign key indexes (essential)
-- - User ID indexes (essential for RLS)
-- - Entity relationship indexes (likely needed)
-- - Created/updated timestamp indexes (commonly used for sorting)
-- - Name/title indexes (commonly used for search)
