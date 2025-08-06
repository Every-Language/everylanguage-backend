-- Fix Users Email Nullable for Phone Authentication
-- This migration makes the email field nullable in public.users table to support phone authentication
-- where users sign up with phone numbers but no email addresses
-- ============================================================================
-- ============================================================================
-- ALTER TABLE: Make email field nullable in public.users
-- ============================================================================
-- Make email nullable to support phone-only authentication
ALTER TABLE public.users
ALTER COLUMN email
DROP NOT NULL;


-- ============================================================================
-- UPDATE CONSTRAINTS: Add check constraint to ensure either email or phone exists
-- ============================================================================
-- Add constraint to ensure at least one contact method exists
ALTER TABLE public.users
ADD CONSTRAINT users_contact_method_check CHECK (
  email IS NOT NULL
  OR phone_number IS NOT NULL
);


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON TABLE public.users IS 'User profiles for authenticated users. Supports both email and phone authentication. At least one contact method (email or phone_number) must be provided.';


-- ============================================================================
-- ADDITIONAL NOTES
-- ============================================================================
-- Migration: 20250806131609_fix_users_email_nullable_for_phone_auth
-- 
-- Changes made:
-- 1. Made email field nullable to support phone-only authentication
-- 2. Added check constraint to ensure at least one contact method exists
-- 
-- This allows the auth trigger to work properly for:
-- - Email users (email provided, phone optional)
-- - Phone users (phone provided, email null)
-- - Users with both email and phone
