-- Consolidate Users with Anonymous Flag
-- This migration consolidates users_anon into public.users with an is_anonymous flag
-- and updates all analytics tables to reference public.users instead of users_anon
-- ============================================================================
-- ============================================================================
-- STEP 1: Add is_anonymous flag to public.users and remove contact method constraint
-- ============================================================================
-- Add is_anonymous flag to public.users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT FALSE;


-- Remove the users_contact_method_check constraint to allow anonymous users
ALTER TABLE public.users
DROP CONSTRAINT if EXISTS users_contact_method_check;


-- Make email and phone_number nullable for anonymous users
ALTER TABLE public.users
ALTER COLUMN email
DROP NOT NULL;


-- Create new constraint: anonymous users don't need contact methods, authenticated users need at least one
ALTER TABLE public.users
ADD CONSTRAINT users_contact_method_check CHECK (
  (is_anonymous = TRUE)
  OR (
    is_anonymous = FALSE
    AND (
      email IS NOT NULL
      OR phone_number IS NOT NULL
    )
  )
);


-- Note: Removing device_id as it's not needed in the consolidated model
-- ============================================================================
-- STEP 2: Migrate users_anon data to public.users
-- ============================================================================
-- Insert users_anon records into public.users with is_anonymous = true
INSERT INTO
  public.users (id, is_anonymous, created_at, updated_at)
SELECT
  id,
  TRUE,
  created_at,
  updated_at
FROM
  users_anon
ON CONFLICT (id) DO NOTHING;


-- Skip if already exists
-- ============================================================================
-- STEP 3: Update analytics tables to reference public.users instead of users_anon
-- ============================================================================
-- Drop existing foreign key constraints for anon_user_id columns
ALTER TABLE app_downloads
DROP CONSTRAINT if EXISTS app_downloads_anon_user_id_fkey;


ALTER TABLE sessions
DROP CONSTRAINT if EXISTS sessions_anon_user_id_fkey;


ALTER TABLE share_opens
DROP CONSTRAINT if EXISTS share_opens_opened_by_anon_user_id_fkey;


ALTER TABLE shares
DROP CONSTRAINT if EXISTS shares_anon_user_id_fkey;


ALTER TABLE verse_listens
DROP CONSTRAINT if EXISTS verse_listens_anon_user_id_fkey;


ALTER TABLE media_file_listens
DROP CONSTRAINT if EXISTS media_file_listens_anon_user_id_fkey;


ALTER TABLE chapter_listens
DROP CONSTRAINT if EXISTS chapter_listens_anon_user_id_fkey;


-- Rename anon_user_id columns to user_id and update foreign key references
-- app_downloads table
ALTER TABLE app_downloads
RENAME COLUMN anon_user_id TO user_id;


ALTER TABLE app_downloads
ADD CONSTRAINT app_downloads_user_id_fkey FOREIGN key (user_id) REFERENCES public.users (id) ON DELETE SET NULL;


-- sessions table  
ALTER TABLE sessions
RENAME COLUMN anon_user_id TO user_id;


ALTER TABLE sessions
ADD CONSTRAINT sessions_user_id_fkey FOREIGN key (user_id) REFERENCES public.users (id) ON DELETE CASCADE;


-- share_opens table
ALTER TABLE share_opens
RENAME COLUMN opened_by_anon_user_id TO user_id;


ALTER TABLE share_opens
ADD CONSTRAINT share_opens_user_id_fkey FOREIGN key (user_id) REFERENCES public.users (id) ON DELETE SET NULL;


-- shares table
ALTER TABLE shares
RENAME COLUMN anon_user_id TO user_id;


ALTER TABLE shares
ADD CONSTRAINT shares_user_id_fkey FOREIGN key (user_id) REFERENCES public.users (id) ON DELETE CASCADE;


-- verse_listens table
ALTER TABLE verse_listens
RENAME COLUMN anon_user_id TO user_id;


ALTER TABLE verse_listens
ADD CONSTRAINT verse_listens_user_id_fkey FOREIGN key (user_id) REFERENCES public.users (id) ON DELETE CASCADE;


-- media_file_listens table
ALTER TABLE media_file_listens
RENAME COLUMN anon_user_id TO user_id;


ALTER TABLE media_file_listens
ADD CONSTRAINT media_file_listens_user_id_fkey FOREIGN key (user_id) REFERENCES public.users (id) ON DELETE CASCADE;


-- chapter_listens table - Note: anon_user_id was already dropped in previous migration
-- so we need to add a user_id column instead
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chapter_listens') THEN
    -- Add user_id column since anon_user_id was already dropped
    ALTER TABLE chapter_listens 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;


-- ============================================================================
-- STEP 4: Update indexes to use the new user_id column names
-- ============================================================================
-- Drop old indexes
DROP INDEX if EXISTS idx_app_downloads_anon_user_id;


DROP INDEX if EXISTS idx_sessions_anon_user_id;


DROP INDEX if EXISTS idx_share_opens_anon_user_id;


DROP INDEX if EXISTS idx_shares_anon_user_id;


DROP INDEX if EXISTS idx_verse_listens_anon_user_id;


DROP INDEX if EXISTS idx_media_listens_anon_user_id;


DROP INDEX if EXISTS idx_chapter_listens_anon_user_id;


-- Create new indexes with user_id column names
CREATE INDEX idx_app_downloads_user_id ON app_downloads (user_id);


CREATE INDEX idx_sessions_user_id ON sessions (user_id);


CREATE INDEX idx_share_opens_user_id ON share_opens (user_id);


CREATE INDEX idx_shares_user_id ON shares (user_id);


CREATE INDEX idx_verse_listens_user_id ON verse_listens (user_id);


CREATE INDEX idx_media_listens_user_id ON media_file_listens (user_id);


-- Create chapter_listens index if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chapter_listens') THEN
    CREATE INDEX idx_chapter_listens_user_id ON chapter_listens(user_id);
  END IF;
END $$;


-- Note: No device_id index needed as column was removed
-- Add index for is_anonymous flag
CREATE INDEX idx_users_is_anonymous ON public.users (is_anonymous);


-- ============================================================================
-- STEP 5: Update the handle_new_auth_user trigger function
-- ============================================================================
-- Update the trigger function to create all users in public.users with is_anonymous flag
CREATE OR REPLACE FUNCTION public.handle_new_auth_user () returns trigger AS $$
DECLARE
    user_metadata JSONB;
BEGIN
    -- Get user metadata
    user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    -- Check if this is an anonymous user using the is_anonymous flag
    IF NEW.is_anonymous = true THEN
        -- Anonymous user: create record in public.users with is_anonymous = true
        INSERT INTO public.users (
            id,                -- Use the same ID as auth.users.id
            is_anonymous,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,            -- Same ID as the auth.users record
            true,              -- is_anonymous = true
            NOW(),
            NOW()
        );
        
        -- Log the creation (optional, for debugging)
        RAISE LOG 'Created anonymous user record with id: %', NEW.id;
        
    ELSE
        -- Authenticated user: create record in public.users with is_anonymous = false
        INSERT INTO public.users (
            id,                -- Use the same ID as auth.users.id
            email,
            first_name,
            last_name,
            phone_number,
            is_anonymous,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,            -- Same ID as the auth.users record
            NEW.email,
            user_metadata->>'first_name',
            user_metadata->>'last_name',
            COALESCE(NEW.phone, user_metadata->>'phone_number'), -- Use auth.users.phone or fallback to metadata
            false,             -- is_anonymous = false
            NOW(),
            NOW()
        );
        
        -- Log the creation (optional, for debugging)
        RAISE LOG 'Created authenticated user record with id: % email: % and phone: %', NEW.id, NEW.email, NEW.phone;
        
    END IF;
    
    RETURN NEW;
END;
$$ language plpgsql security definer;


-- ============================================================================
-- STEP 6: Update RLS policies to work with unified user model
-- ============================================================================
-- Drop existing RLS policies for users_anon table
DROP POLICY if EXISTS "Anonymous users can read their own records" ON users_anon;


DROP POLICY if EXISTS "Anonymous users can insert their own records" ON users_anon;


DROP POLICY if EXISTS "Anonymous users can update their own records" ON users_anon;


-- Update users table policies to handle both anonymous and authenticated users
DROP POLICY if EXISTS "Users can view own profile" ON public.users;


DROP POLICY if EXISTS "Users can update own profile" ON public.users;


DROP POLICY if EXISTS "Users can insert own profile" ON public.users;


-- Create new policies for unified user model
CREATE POLICY "Users can view own profile" ON public.users FOR
SELECT
  USING (auth.uid () = id);


CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE
  USING (auth.uid () = id);


CREATE POLICY "Users can insert own profile" ON public.users FOR insert
WITH
  CHECK (auth.uid () = id);


-- Update analytics table policies to use new user_id references
-- These policies need to be updated to reference the new user_id columns
-- Sessions policies
DROP POLICY if EXISTS "Users can view their own sessions" ON sessions;


DROP POLICY if EXISTS "Users can insert their own sessions" ON sessions;


CREATE POLICY "Users can view their own sessions" ON sessions FOR
SELECT
  USING (auth.uid () = user_id);


CREATE POLICY "Users can insert their own sessions" ON sessions FOR insert
WITH
  CHECK (auth.uid () = user_id);


-- Similar updates for other analytics tables
DROP POLICY if EXISTS "Users can view their own app downloads" ON app_downloads;


DROP POLICY if EXISTS "Users can insert their own app downloads" ON app_downloads;


CREATE POLICY "Users can view their own app downloads" ON app_downloads FOR
SELECT
  USING (auth.uid () = user_id);


CREATE POLICY "Users can insert their own app downloads" ON app_downloads FOR insert
WITH
  CHECK (auth.uid () = user_id);


-- Update other analytics table policies as needed
DROP POLICY if EXISTS "Users can view their own shares" ON shares;


DROP POLICY if EXISTS "Users can insert their own shares" ON shares;


CREATE POLICY "Users can view their own shares" ON shares FOR
SELECT
  USING (auth.uid () = user_id);


CREATE POLICY "Users can insert their own shares" ON shares FOR insert
WITH
  CHECK (auth.uid () = user_id);


-- Media file listens policies
DROP POLICY if EXISTS "Users can view their own media file listens" ON media_file_listens;


DROP POLICY if EXISTS "Users can insert their own media file listens" ON media_file_listens;


CREATE POLICY "Users can view their own media file listens" ON media_file_listens FOR
SELECT
  USING (auth.uid () = user_id);


CREATE POLICY "Users can insert their own media file listens" ON media_file_listens FOR insert
WITH
  CHECK (auth.uid () = user_id);


-- Verse listens policies
DROP POLICY if EXISTS "Users can view their own verse listens" ON verse_listens;


DROP POLICY if EXISTS "Users can insert their own verse listens" ON verse_listens;


CREATE POLICY "Users can view their own verse listens" ON verse_listens FOR
SELECT
  USING (auth.uid () = user_id);


CREATE POLICY "Users can insert their own verse listens" ON verse_listens FOR insert
WITH
  CHECK (auth.uid () = user_id);


-- Chapter listens policies (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chapter_listens') THEN
    DROP POLICY IF EXISTS "Users can view their own chapter listens" ON chapter_listens;
    DROP POLICY IF EXISTS "Users can insert their own chapter listens" ON chapter_listens;
    
    CREATE POLICY "Users can view their own chapter listens" ON chapter_listens 
    FOR SELECT 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert their own chapter listens" ON chapter_listens 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================================
-- STEP 7: Drop the users_anon table and related objects
-- ============================================================================
-- Drop any remaining constraints that reference users_anon
ALTER TABLE users_anon
DROP CONSTRAINT if EXISTS users_anon_id_fkey;


-- Drop triggers
DROP TRIGGER if EXISTS update_users_anon_updated_at ON users_anon;


-- Drop remaining indexes
DROP INDEX if EXISTS idx_users_anon_device_id;


DROP INDEX if EXISTS idx_users_anon_user_id;


DROP INDEX if EXISTS idx_users_anon_created_at;


DROP INDEX if EXISTS idx_users_anon_auth_uid;


-- Drop the users_anon table
DROP TABLE IF EXISTS users_anon;


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON COLUMN public.users.is_anonymous IS 'Flag indicating if this is an anonymous user (true) or authenticated user (false)';


-- Note: device_id column removed as it's not needed
comment ON CONSTRAINT users_contact_method_check ON public.users IS 'Anonymous users do not require contact methods, authenticated users need at least email or phone';


-- ============================================================================
-- ADDITIONAL NOTES
-- ============================================================================
-- Migration: 20250808095608_consolidate_users_with_anonymous_flag
-- 
-- Changes made:
-- 1. Added is_anonymous flag to public.users
-- 2. Migrated all users_anon data to public.users (excluding device_id)
-- 3. Renamed anon_user_id columns to user_id in analytics tables
-- 4. Updated all foreign key constraints to reference public.users
-- 5. Updated indexes to use new column names
-- 6. Updated trigger function to create all users in public.users
-- 7. Updated RLS policies for unified user model
-- 8. Dropped users_anon table
-- 
-- Benefits:
-- - Simplified PowerSync sync rules (no need for duplicate buckets)
-- - Cleaner foreign key relationships
-- - Easier queries and analytics
-- - Better support for anonymous to authenticated user conversion
-- - Consistent user model across the application
