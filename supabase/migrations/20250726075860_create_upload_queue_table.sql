-- Migration: Create upload_queue table for bulk upload background processing
-- This table tracks files that need to be uploaded in background jobs
CREATE TABLE upload_queue (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  queue_id UUID NOT NULL, -- Groups related uploads together
  media_file_id UUID NOT NULL REFERENCES media_files (id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  content_type TEXT NOT NULL,
  upload_request JSONB NOT NULL, -- Full BibleChapterUploadRequest data
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'processing', 'completed', 'failed')
  ),
  file_data bytea, -- Stores the actual file content for processing
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id)
);


-- Indexes for efficient querying
CREATE INDEX idx_upload_queue_status ON upload_queue (status);


CREATE INDEX idx_upload_queue_queue_id ON upload_queue (queue_id);


CREATE INDEX idx_upload_queue_created_at ON upload_queue (created_at);


CREATE INDEX idx_upload_queue_media_file_id ON upload_queue (media_file_id);


-- RLS Policies
ALTER TABLE upload_queue enable ROW level security;


-- Users can only see their own queue items
CREATE POLICY "Users can view own upload queue items" ON upload_queue FOR
SELECT
  USING (created_by = auth.uid ());


-- Users can only insert their own queue items  
CREATE POLICY "Users can insert own upload queue items" ON upload_queue FOR insert
WITH
  CHECK (created_by = auth.uid ());


-- Users can update their own queue items
CREATE POLICY "Users can update own upload queue items" ON upload_queue
FOR UPDATE
  USING (created_by = auth.uid ());


-- Comment
comment ON TABLE upload_queue IS 'Queue table for tracking bulk upload operations and background file processing';


comment ON COLUMN upload_queue.queue_id IS 'Groups related uploads together from the same bulk operation';


comment ON COLUMN upload_queue.upload_request IS 'Full BibleChapterUploadRequest metadata as JSON';


comment ON COLUMN upload_queue.file_data IS 'Actual file content stored for background processing';


comment ON COLUMN upload_queue.status IS 'Current processing status of the upload item';
