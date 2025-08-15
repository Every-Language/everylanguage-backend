-- Update analytics schema to new structure focusing on session-level IP geolocation
-- IMPORTANT: This migration is idempotent and avoids destructive drops; it renames/adds columns and constraints.
--
-- ENUMS
--
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'location_source_type') THEN
    CREATE TYPE location_source_type AS ENUM ('device', 'ip', 'unknown');
  END IF;
END $$;


--
-- app_downloads
-- Desired columns:
-- id, user_id (FK -> public.users.id), device_id, location, app_version, platform, os, os_version,
-- origin_share_id, downloaded_at
--
-- Align column names and FKs
DO $$
BEGIN
  -- Ensure user_id exists and FK
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'app_downloads' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.app_downloads ADD COLUMN user_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_downloads_user_id_fkey'
  ) THEN
    ALTER TABLE public.app_downloads
      ADD CONSTRAINT app_downloads_user_id_fkey FOREIGN KEY (user_id)
      REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  -- origin_share_id alignment: rename source_share_id -> origin_share_id if present
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'app_downloads' AND column_name = 'source_share_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'app_downloads' AND column_name = 'origin_share_id'
  ) THEN
    ALTER TABLE public.app_downloads RENAME COLUMN source_share_id TO origin_share_id;
  END IF;

  -- Ensure FK to shares
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_downloads_origin_share_id_fkey'
  ) THEN
    -- Drop old FK if exists under previous name
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_downloads_source_share_id_fkey') THEN
      ALTER TABLE public.app_downloads DROP CONSTRAINT app_downloads_source_share_id_fkey;
    END IF;
    ALTER TABLE public.app_downloads
      ADD CONSTRAINT app_downloads_origin_share_id_fkey FOREIGN KEY (origin_share_id)
      REFERENCES public.shares(id) ON DELETE SET NULL;
  END IF;

  -- Rename installed_at -> downloaded_at if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'app_downloads' AND column_name = 'installed_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'app_downloads' AND column_name = 'downloaded_at'
  ) THEN
    ALTER TABLE public.app_downloads RENAME COLUMN installed_at TO downloaded_at;
  END IF;
END $$;


--
-- sessions
-- Desired columns:
-- id, user_id, app_download_id (FK), started_at, ended_at, connectivity, location,
-- location_source, continent_code, country_code, region_code, platform, app_version, os, os_version
--
DO $$
BEGIN
  -- Ensure user_id column and FK exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN user_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_user_id_fkey'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id)
      REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  -- Add app_download_id FK
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'app_download_id'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN app_download_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_app_download_id_fkey'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_app_download_id_fkey FOREIGN KEY (app_download_id)
      REFERENCES public.app_downloads(id) ON DELETE SET NULL;
  END IF;

  -- location_source enum column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'location_source'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN location_source location_source_type DEFAULT 'unknown';
  END IF;

  -- continent_code, country_code, region_code (nullable text)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'continent_code'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN continent_code text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN country_code text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'region_code'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN region_code text;
  END IF;
END $$;


--
-- shares
-- Desired columns:
-- id, user_id, session_id, share_entity_type, share_entity_id, language_entity_id, origin_share_id, shared_at
-- Ensure user_id exists and FK; ensure origin_share_id FK name and session_id FK; remove unused anon columns later
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shares' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.shares ADD COLUMN user_id uuid;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shares_user_id_fkey'
  ) THEN
    ALTER TABLE public.shares
      ADD CONSTRAINT shares_user_id_fkey FOREIGN KEY (user_id)
      REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  -- Ensure origin_share_id FK name standardization
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shares_origin_share_id_fkey'
  ) THEN
    ALTER TABLE public.shares
      ADD CONSTRAINT shares_origin_share_id_fkey FOREIGN KEY (origin_share_id)
      REFERENCES public.shares(id) ON DELETE SET NULL;
  END IF;
END $$;


--
-- share_opens
-- Desired columns:
-- id, share_id, user_id, session_id, language_entity_id, origin_share_id, opened_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'share_opens' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.share_opens ADD COLUMN user_id uuid;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'share_opens_user_id_fkey'
  ) THEN
    ALTER TABLE public.share_opens
      ADD CONSTRAINT share_opens_user_id_fkey FOREIGN KEY (user_id)
      REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  -- Standardize origin_share_id FK name
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'share_opens_origin_share_id_fkey'
  ) THEN
    ALTER TABLE public.share_opens
      ADD CONSTRAINT share_opens_origin_share_id_fkey FOREIGN KEY (origin_share_id)
      REFERENCES public.shares(id) ON DELETE SET NULL;
  END IF;
END $$;


--
-- verse_listens
-- Desired columns:
-- id, user_id, session_id, verse_id, language_entity_id, origin_share_id, listened_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'verse_listens' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.verse_listens ADD COLUMN user_id uuid;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'verse_listens_user_id_fkey'
  ) THEN
    ALTER TABLE public.verse_listens
      ADD CONSTRAINT verse_listens_user_id_fkey FOREIGN KEY (user_id)
      REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  -- Add origin_share_id if missing, then FK
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'verse_listens' AND column_name = 'origin_share_id'
  ) THEN
    ALTER TABLE public.verse_listens ADD COLUMN origin_share_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'verse_listens_origin_share_id_fkey'
  ) THEN
    ALTER TABLE public.verse_listens
      ADD CONSTRAINT verse_listens_origin_share_id_fkey FOREIGN KEY (origin_share_id)
      REFERENCES public.shares(id) ON DELETE SET NULL;
  END IF;
END $$;


--
-- media_file_listens
-- Desired columns:
-- id, user_id, session_id, media_file_id, language_entity_id, position_seconds, duration_seconds, origin_share_id, listened_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'media_file_listens' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.media_file_listens ADD COLUMN user_id uuid;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_file_listens_user_id_fkey'
  ) THEN
    ALTER TABLE public.media_file_listens
      ADD CONSTRAINT media_file_listens_user_id_fkey FOREIGN KEY (user_id)
      REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  -- Add origin_share_id if missing, then FK
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'media_file_listens' AND column_name = 'origin_share_id'
  ) THEN
    ALTER TABLE public.media_file_listens ADD COLUMN origin_share_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_file_listens_origin_share_id_fkey'
  ) THEN
    ALTER TABLE public.media_file_listens
      ADD CONSTRAINT media_file_listens_origin_share_id_fkey FOREIGN KEY (origin_share_id)
      REFERENCES public.shares(id) ON DELETE SET NULL;
  END IF;
END $$;


--
-- chapter_listens
-- Desired columns:
-- id, user_id, device_id, session_id, verse_id, language_entity_id, origin_share_id, listened_at
-- Note: current schema uses chapter_id; adding verse_id as requested without dropping chapter_id yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chapter_listens' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.chapter_listens ADD COLUMN user_id uuid;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chapter_listens_user_id_fkey'
  ) THEN
    ALTER TABLE public.chapter_listens
      ADD CONSTRAINT chapter_listens_user_id_fkey FOREIGN KEY (user_id)
      REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  -- Add verse_id if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chapter_listens' AND column_name = 'verse_id'
  ) THEN
    ALTER TABLE public.chapter_listens ADD COLUMN verse_id uuid;
  END IF;

  -- Optional FK for verse_id only if public.verses(id) is UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'verses' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chapter_listens_verse_id_fkey') THEN
      ALTER TABLE public.chapter_listens
        ADD CONSTRAINT chapter_listens_verse_id_fkey FOREIGN KEY (verse_id)
        REFERENCES public.verses(id) ON DELETE SET NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chapter_listens_origin_share_id_fkey'
  ) THEN
    -- Add origin_share_id if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chapter_listens' AND column_name = 'origin_share_id'
    ) THEN
      ALTER TABLE public.chapter_listens ADD COLUMN origin_share_id uuid;
    END IF;
    ALTER TABLE public.chapter_listens
      ADD CONSTRAINT chapter_listens_origin_share_id_fkey FOREIGN KEY (origin_share_id)
      REFERENCES public.shares(id) ON DELETE SET NULL;
  END IF;
END $$;


--
-- Indexes for new columns (lightweight additions)
--
CREATE INDEX if NOT EXISTS idx_sessions_app_download_id ON public.sessions (app_download_id);


CREATE INDEX if NOT EXISTS idx_sessions_location_source ON public.sessions (location_source);


CREATE INDEX if NOT EXISTS idx_sessions_country_code ON public.sessions (country_code);


CREATE INDEX if NOT EXISTS idx_sessions_region_code ON public.sessions (region_code);
