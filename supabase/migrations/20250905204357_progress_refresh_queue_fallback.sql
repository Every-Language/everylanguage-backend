-- Fallback: if concurrent refresh fails (e.g., initially unpopulated), run full refresh once
CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_safe () returns void language plpgsql security definer AS $$
BEGIN
  BEGIN
    PERFORM refresh_progress_materialized_views_concurrently();
  EXCEPTION WHEN OTHERS THEN
    -- Attempt full refresh as fallback
    PERFORM refresh_progress_materialized_views_full();
  END;
END;
$$;


-- Use safe refresh in drain
CREATE OR REPLACE FUNCTION drain_progress_refresh_queue () returns TABLE (kind TEXT, version_id UUID) language plpgsql security definer AS $$
DECLARE
  has_rows BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM progress_refresh_queue) INTO has_rows;
  IF has_rows THEN
    PERFORM refresh_progress_materialized_views_safe();
    RETURN QUERY DELETE FROM progress_refresh_queue RETURNING progress_refresh_queue.kind, progress_refresh_queue.version_id;
  ELSE
    RETURN;
  END IF;
END;
$$;
