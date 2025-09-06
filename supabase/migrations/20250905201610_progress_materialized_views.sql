-- Materialized Views for Progress Coverage
-- ============================================================
-- Creates MVs mirroring logical views and adds unique indexes
-- to support CONCURRENTLY refresh.
-- Drop MVs if they exist (safe re-run)
DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_audio_version_progress_summary'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_audio_book_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_audio_chapter_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_audio_verse_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_text_version_progress_summary'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_text_book_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_text_chapter_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_text_verse_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


-- ============================================================
-- Audio MVs
-- ============================================================
CREATE MATERIALIZED VIEW mv_audio_verse_coverage AS
SELECT
  audio_version_id,
  verse_id
FROM
  audio_verse_coverage
WITH
  no data;


CREATE UNIQUE INDEX mv_audio_verse_coverage_pkey ON mv_audio_verse_coverage (audio_version_id, verse_id);


comment ON materialized view mv_audio_verse_coverage IS 'Materialized audio verse coverage.';


CREATE MATERIALIZED VIEW mv_audio_chapter_coverage AS
SELECT
  audio_version_id,
  chapter_id,
  covered_verses,
  total_verses,
  has_any,
  is_complete
FROM
  audio_chapter_coverage
WITH
  no data;


CREATE UNIQUE INDEX mv_audio_chapter_coverage_pkey ON mv_audio_chapter_coverage (audio_version_id, chapter_id);


comment ON materialized view mv_audio_chapter_coverage IS 'Materialized audio chapter coverage.';


CREATE MATERIALIZED VIEW mv_audio_book_coverage AS
SELECT
  book_id,
  audio_version_id,
  complete_chapters,
  total_chapters,
  is_complete
FROM
  audio_book_coverage
WITH
  no data;


CREATE UNIQUE INDEX mv_audio_book_coverage_pkey ON mv_audio_book_coverage (audio_version_id, book_id);


comment ON materialized view mv_audio_book_coverage IS 'Materialized audio book coverage.';


CREATE MATERIALIZED VIEW mv_audio_version_progress_summary AS
SELECT
  audio_version_id,
  covered_verses,
  total_verses,
  verse_fraction,
  chapters_with_audio,
  total_chapters,
  chapter_fraction,
  books_complete,
  total_books,
  book_fraction
FROM
  audio_version_progress_summary
WITH
  no data;


CREATE UNIQUE INDEX mv_audio_version_progress_summary_pkey ON mv_audio_version_progress_summary (audio_version_id);


comment ON materialized view mv_audio_version_progress_summary IS 'Materialized summary metrics for audio versions.';


-- ============================================================
-- Text MVs
-- ============================================================
CREATE MATERIALIZED VIEW mv_text_verse_coverage AS
SELECT
  text_version_id,
  verse_id
FROM
  text_verse_coverage
WITH
  no data;


CREATE UNIQUE INDEX mv_text_verse_coverage_pkey ON mv_text_verse_coverage (text_version_id, verse_id);


comment ON materialized view mv_text_verse_coverage IS 'Materialized text verse coverage.';


CREATE MATERIALIZED VIEW mv_text_chapter_coverage AS
SELECT
  text_version_id,
  chapter_id,
  verses_with_text,
  total_verses,
  is_complete
FROM
  text_chapter_coverage
WITH
  no data;


CREATE UNIQUE INDEX mv_text_chapter_coverage_pkey ON mv_text_chapter_coverage (text_version_id, chapter_id);


comment ON materialized view mv_text_chapter_coverage IS 'Materialized text chapter coverage.';


CREATE MATERIALIZED VIEW mv_text_book_coverage AS
SELECT
  book_id,
  text_version_id,
  complete_chapters,
  total_chapters,
  is_complete
FROM
  text_book_coverage
WITH
  no data;


CREATE UNIQUE INDEX mv_text_book_coverage_pkey ON mv_text_book_coverage (text_version_id, book_id);


comment ON materialized view mv_text_book_coverage IS 'Materialized text book coverage.';


CREATE MATERIALIZED VIEW mv_text_version_progress_summary AS
SELECT
  text_version_id,
  covered_verses,
  total_verses,
  verse_fraction,
  complete_chapters,
  total_chapters,
  chapter_fraction,
  books_complete,
  total_books,
  book_fraction
FROM
  text_version_progress_summary
WITH
  no data;


CREATE UNIQUE INDEX mv_text_version_progress_summary_pkey ON mv_text_version_progress_summary (text_version_id);


comment ON materialized view mv_text_version_progress_summary IS 'Materialized summary metrics for text versions.';
