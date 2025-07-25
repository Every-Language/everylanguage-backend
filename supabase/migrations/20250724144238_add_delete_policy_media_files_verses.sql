-- Add DELETE policy for media_files_verses table
-- Allow users to delete only their own verse timing records
CREATE POLICY "Users can delete their own media_files_verses" ON media_files_verses FOR delete USING (
  auth.role () = 'authenticated'
  AND created_by = (
    SELECT
      id
    FROM
      public.users
    WHERE
      auth_uid = auth.uid ()
  )
);


-- Add comment for documentation
comment ON policy "Users can delete their own media_files_verses" ON media_files_verses IS 'Allows authenticated users to delete only the verse timing records they created';
