-- RLS policy to allow users to update their own sessions
-- Ensures only the owner (public.users.id = auth.uid()) can update and that
-- the updated row remains owned by the same user
-- Safety: drop existing policy if present (idempotent)
DROP POLICY if EXISTS "Users can update their own sessions" ON sessions;


-- Create UPDATE policy for sessions
CREATE POLICY "Users can update their own sessions" ON sessions
FOR UPDATE
  USING (
    (
      SELECT
        auth.uid ()
    ) = user_id
  )
WITH
  CHECK (
    (
      SELECT
        auth.uid ()
    ) = user_id
  );
