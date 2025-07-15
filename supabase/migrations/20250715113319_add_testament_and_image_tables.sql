-- Add Testament Field and Create Image Tables
-- This migration adds a testament field to the books table and creates
-- image management tables with appropriate RLS policies
-- ============================================================================
-- ============================================================================
-- CREATE ENUMS
-- ============================================================================
-- Testament enum for books
CREATE TYPE testament AS ENUM('old', 'new');


-- ============================================================================
-- ALTER EXISTING TABLES
-- ============================================================================
-- Add testament field to books table
ALTER TABLE books
ADD COLUMN testament testament;


-- ============================================================================
-- CREATE NEW TABLES
-- ============================================================================
-- Image sets table
CREATE TABLE image_sets (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  name TEXT NOT NULL,
  remote_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Images table
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  remote_path TEXT NOT NULL,
  target_type target_type NOT NULL,
  target_id UUID NOT NULL,
  set_id UUID REFERENCES image_sets (id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);


-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE image_sets enable ROW level security;


ALTER TABLE images enable ROW level security;


-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================
-- Image Sets Policies
-- Anyone can read image sets
CREATE POLICY "All users can view image_sets" ON image_sets FOR
SELECT
  USING (TRUE);


-- Authenticated users can insert image sets
CREATE POLICY "Authenticated users can insert image_sets" ON image_sets FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


-- Users can update their own image sets
CREATE POLICY "Users can update their own image_sets" ON image_sets
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
  );


-- Images Policies
-- Anyone can read images (excluding soft deleted)
CREATE POLICY "All users can view images" ON images FOR
SELECT
  USING (deleted_at IS NULL);


-- Authenticated users can insert images
CREATE POLICY "Authenticated users can insert images" ON images FOR insert
WITH
  CHECK (auth.role () = 'authenticated');


-- Users can update their own images
CREATE POLICY "Users can update their own images" ON images
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
  );


-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
-- Trigger for image_sets updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp () returns trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language plpgsql;


CREATE TRIGGER set_image_sets_updated_at before
UPDATE ON image_sets FOR each ROW
EXECUTE function trigger_set_timestamp ();


CREATE TRIGGER set_images_updated_at before
UPDATE ON images FOR each ROW
EXECUTE function trigger_set_timestamp ();


-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
-- Indexes for images table
CREATE INDEX idx_images_target_type_id ON images (target_type, target_id);


CREATE INDEX idx_images_set_id ON images (set_id);


CREATE INDEX idx_images_created_by ON images (created_by);


CREATE INDEX idx_images_deleted_at ON images (deleted_at);


-- Indexes for image_sets table
CREATE INDEX idx_image_sets_created_by ON image_sets (created_by);


CREATE INDEX idx_image_sets_name ON image_sets (name);
