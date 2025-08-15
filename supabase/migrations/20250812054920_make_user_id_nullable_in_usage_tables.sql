-- Make user_id nullable across usage/analytics tables while retaining FKs to public.users(id)
-- Tables: app_downloads, chapter_listens, verse_listens, shares, share_opens, media_file_listens, sessions
-- sessions.user_id -> DROP NOT NULL if set; ensure FK exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sessions'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.sessions ALTER COLUMN user_id DROP NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sessions_user_id_fkey'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;


-- shares.user_id -> DROP NOT NULL if set; ensure FK exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shares'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.shares ALTER COLUMN user_id DROP NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shares_user_id_fkey'
  ) THEN
    ALTER TABLE public.shares
      ADD CONSTRAINT shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;


-- verse_listens.user_id -> DROP NOT NULL if set; ensure FK exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'verse_listens'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.verse_listens ALTER COLUMN user_id DROP NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'verse_listens_user_id_fkey'
  ) THEN
    ALTER TABLE public.verse_listens
      ADD CONSTRAINT verse_listens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;


-- media_file_listens.user_id -> DROP NOT NULL if set; ensure FK exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'media_file_listens'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.media_file_listens ALTER COLUMN user_id DROP NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'media_file_listens_user_id_fkey'
  ) THEN
    ALTER TABLE public.media_file_listens
      ADD CONSTRAINT media_file_listens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;


-- app_downloads.user_id -> ensure nullable (historically already nullable); ensure FK exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_downloads'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.app_downloads ALTER COLUMN user_id DROP NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_downloads_user_id_fkey'
  ) THEN
    ALTER TABLE public.app_downloads
      ADD CONSTRAINT app_downloads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;


-- share_opens.user_id -> ensure nullable; ensure FK exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'share_opens'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.share_opens ALTER COLUMN user_id DROP NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'share_opens_user_id_fkey'
  ) THEN
    ALTER TABLE public.share_opens
      ADD CONSTRAINT share_opens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;


-- chapter_listens.user_id -> ensure nullable; ensure FK exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chapter_listens'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.chapter_listens ALTER COLUMN user_id DROP NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chapter_listens_user_id_fkey'
  ) THEN
    ALTER TABLE public.chapter_listens
      ADD CONSTRAINT chapter_listens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;
