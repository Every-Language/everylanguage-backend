-- Drop non-summary progress materialized views and update refresh functions
-- ============================================================
-- This migration removes coverage-level MVs (verse/chapter/book)
-- and updates refresh functions to only refresh summary MVs.
-- Safe drops (idempotent)
DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_audio_verse_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_audio_chapter_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_audio_book_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_text_verse_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_text_chapter_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_text_book_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


-- Update refresh functions to only refresh summary materialized views
CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_full () returns void language plpgsql security definer AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_audio_version_progress_summary;
  REFRESH MATERIALIZED VIEW mv_text_version_progress_summary;
END;
$$;


CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_concurrently () returns void language plpgsql security definer AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_version_progress_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_text_version_progress_summary;
END;
$$;
