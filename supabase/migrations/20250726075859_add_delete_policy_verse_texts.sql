-- Add DELETE policy for verse_texts table
-- Allow users to delete only their own verse text records
CREATE POLICY "Users can delete their own verse_texts" ON verse_texts FOR delete USING (
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
comment ON policy "Users can delete their own verse_texts" ON verse_texts IS 'Allows authenticated users to delete only the verse text records they created';
