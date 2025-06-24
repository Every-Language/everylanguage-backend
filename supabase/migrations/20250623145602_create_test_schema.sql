-- Test schema for EL audio translation platform
-- This simulates the schema that would be used in production
-- User profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Audio recordings table
CREATE TABLE audio_recordings (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  original_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  audio_file_url TEXT NOT NULL,
  duration_seconds INTEGER,
  status TEXT CHECK (status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Translation segments table
CREATE TABLE translation_segments (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  recording_id UUID REFERENCES audio_recordings (id) ON DELETE CASCADE,
  speaker_id TEXT,
  start_time_seconds DECIMAL NOT NULL,
  end_time_seconds DECIMAL NOT NULL,
  original_text TEXT,
  translated_text TEXT,
  confidence_score DECIMAL CHECK (
    confidence_score >= 0
    AND confidence_score <= 1
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Analytics events table
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  session_id TEXT,
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Row Level Security (RLS) policies
ALTER TABLE profiles enable ROW level security;


ALTER TABLE audio_recordings enable ROW level security;


ALTER TABLE translation_segments enable ROW level security;


ALTER TABLE analytics_events enable ROW level security;


-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR
SELECT
  USING (auth.uid () = user_id);


CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE
  USING (auth.uid () = user_id);


CREATE POLICY "Users can insert own profile" ON profiles FOR insert
WITH
  CHECK (auth.uid () = user_id);


-- Audio recordings policies
CREATE POLICY "Users can view own recordings" ON audio_recordings FOR
SELECT
  USING (auth.uid () = user_id);


CREATE POLICY "Users can create recordings" ON audio_recordings FOR insert
WITH
  CHECK (auth.uid () = user_id);


CREATE POLICY "Users can update own recordings" ON audio_recordings
FOR UPDATE
  USING (auth.uid () = user_id);


-- Translation segments policies
CREATE POLICY "Users can view segments of own recordings" ON translation_segments FOR
SELECT
  USING (
    recording_id IN (
      SELECT
        id
      FROM
        audio_recordings
      WHERE
        user_id = auth.uid ()
    )
  );


-- Analytics events policies
CREATE POLICY "Users can view own analytics" ON analytics_events FOR
SELECT
  USING (auth.uid () = user_id);


CREATE POLICY "Users can insert analytics" ON analytics_events FOR insert
WITH
  CHECK (auth.uid () = user_id);


-- Indexes for performance
CREATE INDEX idx_profiles_user_id ON profiles (user_id);


CREATE INDEX idx_audio_recordings_user_id ON audio_recordings (user_id);


CREATE INDEX idx_audio_recordings_status ON audio_recordings (status);


CREATE INDEX idx_translation_segments_recording_id ON translation_segments (recording_id);


CREATE INDEX idx_analytics_events_user_id ON analytics_events (user_id);


CREATE INDEX idx_analytics_events_event_type ON analytics_events (event_type);


CREATE INDEX idx_analytics_events_created_at ON analytics_events (created_at);
