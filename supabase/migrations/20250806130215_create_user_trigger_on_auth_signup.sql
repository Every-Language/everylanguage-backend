-- Create User Trigger on Auth Signup
-- This migration creates a trigger that fires every time a new auth.users record is created
-- It automatically creates either a users_anon record (for anonymous users) or a public.users record (for authenticated users)
-- ============================================================================
-- ============================================================================
-- FUNCTION: handle_new_auth_user
-- ============================================================================
-- Function to handle new user creation based on user type
CREATE OR REPLACE FUNCTION public.handle_new_auth_user () returns trigger AS $$
DECLARE
    user_metadata JSONB;
BEGIN
    -- Get user metadata
    user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
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
            COALESCE(user_metadata->>'device_id', 'unknown'), -- Extract device_id from metadata or default
            NOW(),
            NOW()
        );
        
        -- Log the creation (optional, for debugging)
        RAISE LOG 'Created anonymous user record for auth_uid: %', NEW.id;
        
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
-- TRIGGER: on_auth_user_created
-- ============================================================================
-- Create trigger that fires after insert on auth.users
DROP TRIGGER if EXISTS on_auth_user_created ON auth.users;


CREATE TRIGGER on_auth_user_created
AFTER insert ON auth.users FOR each ROW
EXECUTE function public.handle_new_auth_user ();


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON function public.handle_new_auth_user () IS 'Automatically creates user records in either users_anon or public.users table based on the auth.users.is_anonymous flag. Uses SECURITY DEFINER to ensure proper permissions.';


-- ============================================================================
-- ADDITIONAL NOTES
-- ============================================================================
-- Migration: 20250806130215_create_user_trigger_on_auth_signup
-- 
-- This trigger handles:
-- 1. Anonymous users (is_anonymous=true) -> creates users_anon record with device_id from metadata
-- 2. Authenticated users (is_anonymous=false) -> creates public.users record with profile data
-- 
-- The function uses SECURITY DEFINER to run with the privileges of the user who created it (postgres),
-- allowing the auth schema operations to successfully insert into public schema tables.
-- 
-- Device ID for anonymous users is extracted from raw_user_meta_data->>'device_id'
-- Profile data for authenticated users includes:
--   - email from auth.users.email
--   - phone from auth.users.phone (with fallback to metadata)
--   - first_name, last_name from raw_user_meta_data
