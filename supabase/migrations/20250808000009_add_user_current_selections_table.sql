-- Create user_current_selections table
-- This table stores the current audio and text version selections for each user
CREATE TABLE user_current_selections (
  id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  selected_audio_version UUID REFERENCES audio_versions (id) ON DELETE SET NULL,
  selected_text_version UUID REFERENCES text_versions (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Ensure only one record per user
  CONSTRAINT unique_user_current_selections UNIQUE (user_id)
);


-- Add RLS policies
ALTER TABLE user_current_selections enable ROW level security;


-- Users can only see and modify their own current selections
CREATE POLICY "Users can view own current selections" ON user_current_selections FOR
SELECT
  USING (
    auth.uid () = user_id
    OR auth.uid () IS NULL
  );


CREATE POLICY "Users can insert own current selections" ON user_current_selections FOR insert
WITH
  CHECK (auth.uid () = user_id);


CREATE POLICY "Users can update own current selections" ON user_current_selections
FOR UPDATE
  USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);


CREATE POLICY "Users can delete own current selections" ON user_current_selections FOR delete USING (auth.uid () = user_id);


-- Create index for efficient lookups by user_id
CREATE INDEX idx_user_current_selections_user_id ON user_current_selections (user_id);


-- Add updated_at trigger
CREATE TRIGGER update_user_current_selections_updated_at before
UPDATE ON user_current_selections FOR each ROW
EXECUTE function update_updated_at_column ();
