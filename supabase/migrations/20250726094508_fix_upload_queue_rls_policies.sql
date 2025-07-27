-- Migration: Fix RLS policies for upload_queue table
-- The existing policies incorrectly use auth.uid() directly instead of referencing public.users table
-- Drop existing incorrect policies
DROP POLICY if EXISTS "Users can view own upload queue items" ON upload_queue;


DROP POLICY if EXISTS "Users can insert own upload queue items" ON upload_queue;


DROP POLICY if EXISTS "Users can update own upload queue items" ON upload_queue;


-- Create correct policies that reference public.users table
-- Users can only see their own queue items
CREATE POLICY "Users can view own upload queue items" ON upload_queue FOR
SELECT
  USING (
    created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


-- Users can only insert their own queue items  
CREATE POLICY "Users can insert own upload queue items" ON upload_queue FOR insert
WITH
  CHECK (
    created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


-- Users can update their own queue items
CREATE POLICY "Users can update own upload queue items" ON upload_queue
FOR UPDATE
  USING (
    created_by = (
      SELECT
        id
      FROM
        public.users
      WHERE
        auth_uid = auth.uid ()
    )
  );


-- Add delete policy for completeness
CREATE POLICY "Users can delete own upload queue items" ON upload_queue FOR delete USING (
  created_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


-- Add comment for documentation
comment ON policy "Users can view own upload queue items" ON upload_queue IS 'Allows users to view only their own upload queue items via public.users table reference';


comment ON policy "Users can insert own upload queue items" ON upload_queue IS 'Allows users to insert only their own upload queue items via public.users table reference';


comment ON policy "Users can update own upload queue items" ON upload_queue IS 'Allows users to update only their own upload queue items via public.users table reference';


comment ON policy "Users can delete own upload queue items" ON upload_queue IS 'Allows users to delete only their own upload queue items via public.users table reference';
