-- ============================================================================
-- ENUMS
-- ============================================================================
-- Feedback type enum for verse feedback
CREATE TYPE feedback_type AS ENUM('approved', 'change_required');


-- Action status enum for verse feedback  
CREATE TYPE feedback_actioned AS ENUM('pending', 'actioned', 'rejected');


-- ============================================================================
-- TABLES
-- ============================================================================
-- Verse feedback table for tracking feedback on media_files_verses
CREATE TABLE verse_feedback (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  media_files_verses_id UUID REFERENCES media_files_verses (id) ON DELETE CASCADE NOT NULL,
  feedback_type feedback_type NOT NULL,
  feedback_text TEXT CHECK (
    (
      feedback_type = 'approved'
      AND feedback_text IS NULL
    )
    OR (
      feedback_type = 'change_required'
      AND feedback_text IS NOT NULL
    )
  ),
  actioned feedback_actioned NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (media_files_verses_id, version)
);


-- ============================================================================
-- INDEXES
-- ============================================================================
-- Index for finding feedback by media_files_verses
CREATE INDEX idx_verse_feedback_media_files_verses_id ON verse_feedback (media_files_verses_id);


-- Index for filtering by feedback type
CREATE INDEX idx_verse_feedback_type ON verse_feedback (feedback_type);


-- Index for filtering by action status
CREATE INDEX idx_verse_feedback_actioned ON verse_feedback (actioned);


-- Index for finding feedback by creator
CREATE INDEX idx_verse_feedback_created_by ON verse_feedback (created_by);


-- Index for ordering by creation date
CREATE INDEX idx_verse_feedback_created_at ON verse_feedback (created_at);


-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Auto-update updated_at timestamp
CREATE TRIGGER update_verse_feedback_updated_at before
UPDATE ON verse_feedback FOR each ROW
EXECUTE function update_updated_at_column ();


-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Enable RLS
ALTER TABLE verse_feedback enable ROW level security;


-- All users can view verse feedback
CREATE POLICY "All users can view verse_feedback" ON verse_feedback FOR
SELECT
  USING (TRUE);


-- Authenticated users can insert verse feedback
CREATE POLICY "Authenticated users can insert verse_feedback" ON verse_feedback FOR insert
WITH
  CHECK (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


-- Users can update their own verse feedback
CREATE POLICY "Users can update their own verse_feedback" ON verse_feedback
FOR UPDATE
  USING (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  )
WITH
  CHECK (
    auth.role () = 'authenticated'
    AND created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


-- Users can delete their own verse feedback
CREATE POLICY "Users can delete their own verse_feedback" ON verse_feedback FOR delete USING (
  auth.role () = 'authenticated'
  AND created_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON TABLE verse_feedback IS 'Feedback tracking for media_files_verses with approval/change workflows';


comment ON COLUMN verse_feedback.media_files_verses_id IS 'Foreign key to the media_files_verses record being reviewed';


comment ON COLUMN verse_feedback.feedback_type IS 'Type of feedback: approved or change_required';


comment ON COLUMN verse_feedback.feedback_text IS 'Required detailed feedback text when change_required, null when approved';


comment ON COLUMN verse_feedback.actioned IS 'Status of whether feedback has been acted upon: pending, actioned, or rejected';


comment ON COLUMN verse_feedback.version IS 'Version number for tracking feedback iterations, starts at 1';


comment ON COLUMN verse_feedback.created_by IS 'User who created this feedback record';


comment ON COLUMN verse_feedback.updated_by IS 'User who last updated this feedback record';


comment ON policy "All users can view verse_feedback" ON verse_feedback IS 'Allows all users to view verse feedback for transparency';


comment ON policy "Authenticated users can insert verse_feedback" ON verse_feedback IS 'Allows authenticated users to create new feedback records';


comment ON policy "Users can update their own verse_feedback" ON verse_feedback IS 'Allows users to update only their own feedback records';


comment ON policy "Users can delete their own verse_feedback" ON verse_feedback IS 'Allows users to delete only their own feedback records';
