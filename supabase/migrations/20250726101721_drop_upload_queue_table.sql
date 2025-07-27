-- Migration: Drop upload_queue table - no longer needed in improved bulk upload system
-- This table was used to store binary file data in Postgres, which was inefficient
-- The new system uploads directly to B2 storage and tracks progress via media_files table
-- Drop all policies first
DROP POLICY if EXISTS "Users can view own upload queue items" ON upload_queue;


DROP POLICY if EXISTS "Users can insert own upload queue items" ON upload_queue;


DROP POLICY if EXISTS "Users can update own upload queue items" ON upload_queue;


DROP POLICY if EXISTS "Users can delete own upload queue items" ON upload_queue;


-- Drop indexes
DROP INDEX if EXISTS idx_upload_queue_status;


DROP INDEX if EXISTS idx_upload_queue_queue_id;


DROP INDEX if EXISTS idx_upload_queue_created_at;


DROP INDEX if EXISTS idx_upload_queue_media_file_id;


-- Drop the table
DROP TABLE IF EXISTS upload_queue;


-- Add comment documenting the change
comment ON schema public IS 'Removed upload_queue table in favor of direct B2 uploads with progress tracking via media_files table';
