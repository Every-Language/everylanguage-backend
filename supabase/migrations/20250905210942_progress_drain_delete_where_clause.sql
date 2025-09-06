-- Redefine drain to delete with an explicit WHERE to satisfy local guardrails
CREATE OR REPLACE FUNCTION drain_progress_refresh_queue () returns TABLE (kind TEXT, version_id UUID) language plpgsql security definer AS $$
DECLARE
  has_rows BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM progress_refresh_queue) INTO has_rows;
  IF has_rows THEN
    PERFORM refresh_progress_materialized_views_safe();
    RETURN QUERY
    WITH to_delete AS (
      SELECT id FROM progress_refresh_queue
    )
    DELETE FROM progress_refresh_queue prq
    USING to_delete td
    WHERE prq.id = td.id
    RETURNING prq.kind, prq.version_id;
  ELSE
    RETURN;
  END IF;
END;
$$;
