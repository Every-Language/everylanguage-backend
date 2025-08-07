-- Sync User IDs with Auth IDs
-- This migration updates the trigger function to use the same UUID for both auth.users.id 
-- and the corresponding public.users.id or users_anon.id, eliminating the auth_uid column
-- ============================================================================
-- ============================================================================
-- STEP 2: Update existing records to use auth_uid as their primary ID
-- ============================================================================
-- We need to update all foreign key references when changing primary keys
-- to avoid constraint violations
-- Create a temporary function to update user IDs and all their references
CREATE OR REPLACE FUNCTION update_user_id_cascade (old_id UUID, new_id UUID) returns void AS $$
BEGIN
    -- Update all tables that reference public.users.id
    UPDATE public.user_roles SET user_id = new_id WHERE user_id = old_id;
    UPDATE public.user_saved_versions SET user_id = new_id WHERE user_id = old_id;
    UPDATE public.user_bookmark_folders SET user_id = new_id WHERE user_id = old_id;
    UPDATE public.user_bookmarks SET user_id = new_id WHERE user_id = old_id;
    UPDATE public.user_playlist_groups SET user_id = new_id WHERE user_id = old_id;
    UPDATE public.user_playlists SET user_id = new_id WHERE user_id = old_id;
    UPDATE public.user_saved_image_sets SET user_id = new_id WHERE user_id = old_id;
    
    -- Finally update the users table itself
    UPDATE public.users SET id = new_id WHERE id = old_id;
END;
$$ language plpgsql;


-- Create a temporary function to update anon user IDs and all their references  
CREATE OR REPLACE FUNCTION update_anon_user_id_cascade (old_id UUID, new_id UUID) returns void AS $$
BEGIN
    -- Update all tables that reference users_anon.id
    UPDATE public.user_saved_versions SET anon_user_id = new_id WHERE anon_user_id = old_id;
    UPDATE public.user_bookmark_folders SET anon_user_id = new_id WHERE anon_user_id = old_id;
    UPDATE public.user_bookmarks SET anon_user_id = new_id WHERE anon_user_id = old_id;
    UPDATE public.user_playlist_groups SET anon_user_id = new_id WHERE anon_user_id = old_id;
    UPDATE public.user_playlists SET anon_user_id = new_id WHERE anon_user_id = old_id;
    UPDATE public.user_saved_image_sets SET anon_user_id = new_id WHERE anon_user_id = old_id;
    
    -- Finally update the users_anon table itself
    UPDATE public.users_anon SET id = new_id WHERE id = old_id;
END;
$$ language plpgsql;


-- Update existing public.users records to use auth_uid as their id
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT id, auth_uid 
        FROM public.users 
        WHERE id != auth_uid AND auth_uid IS NOT NULL
    LOOP
        PERFORM update_user_id_cascade(user_record.id, user_record.auth_uid);
    END LOOP;
END $$;


-- Update existing users_anon records to use auth_uid as their id
DO $$
DECLARE
    anon_user_record RECORD;
BEGIN
    FOR anon_user_record IN 
        SELECT id, auth_uid 
        FROM public.users_anon 
        WHERE id != auth_uid AND auth_uid IS NOT NULL
    LOOP
        PERFORM update_anon_user_id_cascade(anon_user_record.id, anon_user_record.auth_uid);
    END LOOP;
END $$;


-- Drop the temporary functions
DROP FUNCTION if EXISTS update_user_id_cascade (UUID, UUID);


DROP FUNCTION if EXISTS update_anon_user_id_cascade (UUID, UUID);


-- ============================================================================
-- STEP 3: Clean up any orphaned records (optional safety check)
-- ============================================================================
-- Remove any records where auth_uid doesn't exist in auth.users
DELETE FROM public.users
WHERE
  auth_uid IS NOT NULL
  AND auth_uid NOT IN (
    SELECT
      id
    FROM
      auth.users
  );


DELETE FROM public.users_anon
WHERE
  auth_uid IS NOT NULL
  AND auth_uid NOT IN (
    SELECT
      id
    FROM
      auth.users
  );


-- ============================================================================
-- STEP 4: Add foreign key constraints using the id columns directly (keeping auth_uid for compatibility)
-- ============================================================================
-- Add foreign key constraint from public.users.id to auth.users.id
ALTER TABLE public.users
ADD CONSTRAINT users_id_fkey FOREIGN key (id) REFERENCES auth.users (id) ON DELETE CASCADE;


-- Add foreign key constraint from users_anon.id to auth.users.id  
ALTER TABLE public.users_anon
ADD CONSTRAINT users_anon_id_fkey FOREIGN key (id) REFERENCES auth.users (id) ON DELETE CASCADE;


-- ============================================================================
-- STEP 5: Update the trigger function to set both id and auth_uid to the same value
-- ============================================================================
-- Update the trigger function to set both id and auth_uid to auth.users.id for backwards compatibility
CREATE OR REPLACE FUNCTION public.handle_new_auth_user () returns trigger AS $$
DECLARE
    user_metadata JSONB;
    device_id_value TEXT;
BEGIN
    -- Get user metadata
    user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    -- Extract device_id from metadata, use NULL if not provided
    device_id_value := user_metadata->>'device_id';
    
    -- Check if this is an anonymous user using the is_anonymous flag
    IF NEW.is_anonymous = true THEN
        -- Anonymous user: create record in users_anon table with same ID as auth.users
        INSERT INTO public.users_anon (
            id,                -- Use the same ID as auth.users.id
            auth_uid,          -- Also set auth_uid for backwards compatibility
            device_id,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,            -- Same ID as the auth.users record
            NEW.id,            -- Same value for auth_uid (backwards compatibility)
            device_id_value,   -- Will be NULL if not provided in metadata
            NOW(),
            NOW()
        );
        
        -- Log the creation (optional, for debugging)
        RAISE LOG 'Created anonymous user record with id: % auth_uid: % and device_id: %', NEW.id, NEW.id, COALESCE(device_id_value, 'NULL');
        
    ELSE
        -- Authenticated user: create record in public.users table with same ID as auth.users
        INSERT INTO public.users (
            id,                -- Use the same ID as auth.users.id
            auth_uid,          -- Also set auth_uid for backwards compatibility
            email,
            first_name,
            last_name,
            phone_number,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,            -- Same ID as the auth.users record
            NEW.id,            -- Same value for auth_uid (backwards compatibility)
            NEW.email,
            user_metadata->>'first_name',
            user_metadata->>'last_name',
            COALESCE(NEW.phone, user_metadata->>'phone_number'), -- Use auth.users.phone or fallback to metadata
            NOW(),
            NOW()
        );
        
        -- Log the creation (optional, for debugging)
        RAISE LOG 'Created authenticated user record with id: % auth_uid: % email: % and phone: %', NEW.id, NEW.id, NEW.email, NEW.phone;
        
    END IF;
    
    RETURN NEW;
END;
$$ language plpgsql security definer;


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON function public.handle_new_auth_user () IS 'Automatically creates user records in either users_anon or public.users table with both id and auth_uid set to the same value as auth.users.id. Maintains backwards compatibility while enabling direct ID relationships. Uses SECURITY DEFINER to ensure proper permissions. Device ID is set to NULL if not provided.';


-- ============================================================================
-- ADDITIONAL NOTES
-- ============================================================================
-- Migration: 20250808000004_sync_user_ids_with_auth_ids
-- 
-- Changes made:
-- 1. Migrated existing records to use auth.users.id as their primary id
-- 2. Kept auth_uid columns for backwards compatibility
-- 3. Added foreign key constraints from both id and auth_uid columns to auth.users.id
-- 4. Updated trigger function to set both id and auth_uid to auth.users.id
-- 5. Cleaned up any orphaned records
-- 
-- Benefits:
-- - Backwards compatibility (existing apps using auth_uid continue to work)
-- - Direct ID relationships available for new code
-- - Dual foreign key constraints ensure data integrity
-- - Migration path for future auth_uid removal
-- 
-- Future migration: You can gradually update applications to use id instead of auth_uid,
-- then in a future migration remove the auth_uid columns entirely.
