-- Progress Refresh Queue, Triggers, and RPC
-- ============================================================
-- 1) Queue table to record which versions need MV refresh
-- 2) Enqueue triggers on relevant tables
-- 3) RPC functions to refresh MVs (full or targeted by version sets)
-- 1) Queue table
CREATE TABLE IF NOT EXISTS progress_refresh_queue (
  id bigserial PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('audio', 'text')),
  version_id UUID NOT NULL,
  enqueued_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (kind, version_id)
);


comment ON TABLE progress_refresh_queue IS 'Queue of audio/text version IDs requiring MV refresh.';


-- 2) Enqueue helpers and triggers
CREATE OR REPLACE FUNCTION enqueue_progress_refresh (kind_in TEXT, version_in UUID) returns void language plpgsql AS $$
BEGIN
  INSERT INTO progress_refresh_queue (kind, version_id)
  VALUES (kind_in, version_in)
  ON CONFLICT (kind, version_id) DO NOTHING;
END;
$$;


-- Enqueue on media_files inserts/updates/deletes that affect bible audio eligibility
CREATE OR REPLACE FUNCTION trg_enqueue_media_files () returns trigger language plpgsql AS $$
DECLARE
  old_ok BOOLEAN;
  new_ok BOOLEAN;
  target_version UUID;
BEGIN
  old_ok := (TG_OP IN ('UPDATE','DELETE')) AND OLD.media_type = 'audio' AND OLD.is_bible_audio IS TRUE AND OLD.upload_status = 'completed' AND OLD.publish_status = 'published' AND OLD.audio_version_id IS NOT NULL AND OLD.deleted_at IS NULL;
  new_ok := (TG_OP IN ('INSERT','UPDATE')) AND NEW.media_type = 'audio' AND NEW.is_bible_audio IS TRUE AND NEW.upload_status = 'completed' AND NEW.publish_status = 'published' AND NEW.audio_version_id IS NOT NULL AND NEW.deleted_at IS NULL;

  IF old_ok THEN
    target_version := OLD.audio_version_id;
    PERFORM enqueue_progress_refresh('audio', target_version);
  END IF;
  IF new_ok THEN
    target_version := NEW.audio_version_id;
    PERFORM enqueue_progress_refresh('audio', target_version);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


DROP TRIGGER if EXISTS enqueue_media_files ON media_files;


CREATE TRIGGER enqueue_media_files
AFTER insert
OR
UPDATE
OR delete ON media_files FOR each ROW
EXECUTE function trg_enqueue_media_files ();


-- Enqueue on media_files_verses changes (by looking up the parent media_file)
CREATE OR REPLACE FUNCTION trg_enqueue_media_files_verses () returns trigger language plpgsql AS $$
DECLARE
  mf record;
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    SELECT * INTO mf FROM media_files WHERE id = NEW.media_file_id;
  ELSE
    SELECT * INTO mf FROM media_files WHERE id = OLD.media_file_id;
  END IF;
  IF mf.media_type = 'audio' AND mf.is_bible_audio IS TRUE AND mf.upload_status = 'completed' AND mf.publish_status = 'published' AND mf.audio_version_id IS NOT NULL AND mf.deleted_at IS NULL THEN
    PERFORM enqueue_progress_refresh('audio', mf.audio_version_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


DROP TRIGGER if EXISTS enqueue_media_files_verses ON media_files_verses;


CREATE TRIGGER enqueue_media_files_verses
AFTER insert
OR
UPDATE
OR delete ON media_files_verses FOR each ROW
EXECUTE function trg_enqueue_media_files_verses ();


-- Enqueue on verse_texts changes
CREATE OR REPLACE FUNCTION trg_enqueue_verse_texts () returns trigger language plpgsql AS $$
DECLARE
  target_text_version UUID;
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    target_text_version := NEW.text_version_id;
  ELSE
    target_text_version := OLD.text_version_id;
  END IF;
  -- Only enqueue when record participates (non-deleted)
  IF target_text_version IS NOT NULL THEN
    -- Soft-delete filter must be considered; enqueue regardless and let refresh recompute
    PERFORM enqueue_progress_refresh('text', target_text_version);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


DROP TRIGGER if EXISTS enqueue_verse_texts ON verse_texts;


CREATE TRIGGER enqueue_verse_texts
AFTER insert
OR
UPDATE
OR delete ON verse_texts FOR each ROW
EXECUTE function trg_enqueue_verse_texts ();


-- 3) RPC functions to refresh MVs
-- Initial full populate (non-concurrent) — to be used sparingly
CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_full () returns void language plpgsql security definer AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_audio_verse_coverage;
  REFRESH MATERIALIZED VIEW mv_audio_chapter_coverage;
  REFRESH MATERIALIZED VIEW mv_audio_book_coverage;
  REFRESH MATERIALIZED VIEW mv_audio_version_progress_summary;

  REFRESH MATERIALIZED VIEW mv_text_verse_coverage;
  REFRESH MATERIALIZED VIEW mv_text_chapter_coverage;
  REFRESH MATERIALIZED VIEW mv_text_book_coverage;
  REFRESH MATERIALIZED VIEW mv_text_version_progress_summary;
END;
$$;


-- Concurrent refresh (once initially populated)
CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_concurrently () returns void language plpgsql security definer AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_verse_coverage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_chapter_coverage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_book_coverage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_version_progress_summary;

  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_text_verse_coverage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_text_chapter_coverage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_text_book_coverage;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_text_version_progress_summary;
END;
$$;


-- Drain queue and run a concurrent refresh (simple: refresh all MVs if queue non-empty)
-- For per-version optimization, we still refresh entire MVs due to Postgres MV limitations
CREATE OR REPLACE FUNCTION drain_progress_refresh_queue () returns TABLE (kind TEXT, version_id UUID) language plpgsql security definer AS $$
DECLARE
  has_rows BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM progress_refresh_queue) INTO has_rows;
  IF has_rows THEN
    PERFORM refresh_progress_materialized_views_concurrently();
    RETURN QUERY DELETE FROM progress_refresh_queue RETURNING kind, version_id;
  ELSE
    RETURN;
  END IF;
END;
$$;
