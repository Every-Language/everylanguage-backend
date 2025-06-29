-- Clean up all test schema objects
-- This migration removes everything that was created for testing purposes
-- Drop tables in reverse dependency order
-- Drop analytics_events table and its related objects
DROP POLICY if EXISTS "Users can insert analytics" ON analytics_events;


DROP POLICY if EXISTS "Users can view own analytics" ON analytics_events;


DROP INDEX if EXISTS idx_analytics_events_created_at;


DROP INDEX if EXISTS idx_analytics_events_event_type;


DROP INDEX if EXISTS idx_analytics_events_user_id;


DROP TABLE IF EXISTS analytics_events;


-- Drop translation_segments table and its related objects
DROP POLICY if EXISTS "Users can view segments of own recordings" ON translation_segments;


DROP INDEX if EXISTS idx_translation_segments_recording_id;


DROP TABLE IF EXISTS translation_segments;


-- Drop audio_recordings table and its related objects
DROP POLICY if EXISTS "Users can update own recordings" ON audio_recordings;


DROP POLICY if EXISTS "Users can create recordings" ON audio_recordings;


DROP POLICY if EXISTS "Users can view own recordings" ON audio_recordings;


DROP INDEX if EXISTS idx_audio_recordings_status;


DROP INDEX if EXISTS idx_audio_recordings_user_id;


DROP TABLE IF EXISTS audio_recordings;


-- Drop profiles table and its related objects
DROP POLICY if EXISTS "Users can insert own profile" ON profiles;


DROP POLICY if EXISTS "Users can update own profile" ON profiles;


DROP POLICY if EXISTS "Users can view own profile" ON profiles;


DROP INDEX if EXISTS idx_profiles_user_id;


DROP TABLE IF EXISTS profiles;


-- Drop workflow_test_v2 table and its related objects
DROP POLICY if EXISTS "Allow public read access to workflow tests" ON workflow_test_v2;


DROP INDEX if EXISTS idx_workflow_test_v2_created_at;


DROP INDEX if EXISTS idx_workflow_test_v2_status;


DROP TABLE IF EXISTS workflow_test_v2;


-- Drop npm_test_projects table and its related objects
DROP POLICY if EXISTS "Allow public read access to test projects" ON npm_test_projects;


DROP INDEX if EXISTS idx_npm_test_projects_created_at;


DROP INDEX if EXISTS idx_npm_test_projects_status;


DROP TABLE IF EXISTS npm_test_projects;


-- Clean slate: All test objects have been removed
-- Ready for production schema implementation
