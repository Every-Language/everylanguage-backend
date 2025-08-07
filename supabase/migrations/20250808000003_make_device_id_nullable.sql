-- Make Device ID Nullable in users_anon Table
-- This migration fixes the unique constraint issue by making device_id nullable
-- and updating the trigger function to set NULL when no device_id is provided
-- ============================================================================
-- ============================================================================
-- STEP 1: Remove unique constraint on device_id
-- ============================================================================
-- Drop the unique constraint that was causing issues
ALTER TABLE public.users_anon
DROP CONSTRAINT if EXISTS users_anon_device_id_key;


-- ============================================================================
-- STEP 2: Make device_id nullable
-- ============================================================================
-- Allow device_id to be NULL
ALTER TABLE public.users_anon
ALTER COLUMN device_id
DROP NOT NULL;


-- ============================================================================
-- STEP 3: Update the trigger function to use NULL instead of 'unknown'
-- ============================================================================
-- Update the trigger function to set device_id to NULL when not provided
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
        -- Anonymous user: create record in users_anon table
        INSERT INTO public.users_anon (
            auth_uid,
            device_id,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            device_id_value, -- Will be NULL if not provided in metadata
            NOW(),
            NOW()
        );
        
        -- Log the creation (optional, for debugging)
        RAISE LOG 'Created anonymous user record for auth_uid: % with device_id: %', NEW.id, COALESCE(device_id_value, 'NULL');
        
    ELSE
        -- Authenticated user: create record in public.users table
        INSERT INTO public.users (
            auth_uid,
            email,
            first_name,
            last_name,
            phone_number,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            NEW.email,
            user_metadata->>'first_name',
            user_metadata->>'last_name',
            COALESCE(NEW.phone, user_metadata->>'phone_number'), -- Use auth.users.phone or fallback to metadata
            NOW(),
            NOW()
        );
        
        -- Log the creation (optional, for debugging)
        RAISE LOG 'Created authenticated user record for auth_uid: % with email: % and phone: %', NEW.id, NEW.email, NEW.phone;
        
    END IF;
    
    RETURN NEW;
END;
$$ language plpgsql security definer;


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON function public.handle_new_auth_user () IS 'Automatically creates user records in either users_anon or public.users table based on the auth.users.is_anonymous flag. Uses SECURITY DEFINER to ensure proper permissions. Device ID is set to NULL if not provided.';


-- ============================================================================
-- ADDITIONAL NOTES
-- ============================================================================
-- Migration: 20250807051112_make_device_id_nullable
-- 
-- Changes made:
-- 1. Removed unique constraint on device_id to allow multiple NULL values
-- 2. Made device_id column nullable in users_anon table
-- 3. Updated trigger function to set device_id to NULL when not provided in metadata
-- 
-- This fixes the issue where anonymous users without device_id in metadata
-- would fail due to unique constraint violations when multiple users had 'unknown' device_id.
