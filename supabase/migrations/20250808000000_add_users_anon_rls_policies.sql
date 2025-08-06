-- Add RLS Policies for users_anon Table
-- This migration adds RLS policies to allow anonymous users to create, read, and update their own records
-- ============================================================================
-- ============================================================================ 
-- ENABLE RLS ON users_anon TABLE
-- ============================================================================
-- Enable RLS on users_anon table if not already enabled
ALTER TABLE users_anon enable ROW level security;


-- ============================================================================
-- CREATE RLS POLICIES FOR users_anon TABLE
-- ============================================================================
-- Policy for anonymous users to read their own records
CREATE POLICY "Anonymous users can read their own records" ON users_anon FOR
SELECT
  TO authenticated USING (
    auth_uid = (
      SELECT
        auth.uid ()
    )
  );


-- Policy for anonymous users to insert their own records
CREATE POLICY "Anonymous users can insert their own records" ON users_anon FOR insert TO authenticated
WITH
  CHECK (
    auth_uid = (
      SELECT
        auth.uid ()
    )
  );


-- Policy for anonymous users to update their own records
CREATE POLICY "Anonymous users can update their own records" ON users_anon
FOR UPDATE
  TO authenticated USING (
    auth_uid = (
      SELECT
        auth.uid ()
    )
  )
WITH
  CHECK (
    auth_uid = (
      SELECT
        auth.uid ()
    )
  );


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
-- Migration: 20250808000000_add_users_anon_rls_policies
-- Description: Added RLS policies for users_anon table to allow anonymous users 
-- to create, read, and update their own records using auth_uid lookup.
-- Policies are optimized for production with TO authenticated clause and 
-- SELECT auth.uid() wrapper for performance.
