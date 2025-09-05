-- Test script for materialized views
\set ON_ERROR_STOP on
\pset pager off

BEGIN;
SET search_path TO public;

-- Seed baseline using existing logical views test
\i scripts/db_tests/progress_views_test.sql

-- Refresh MVs in dependency order
-- First populate without CONCURRENTLY (initial load for all MVs)
REFRESH MATERIALIZED VIEW mv_audio_verse_coverage;
REFRESH MATERIALIZED VIEW mv_audio_chapter_coverage;
REFRESH MATERIALIZED VIEW mv_audio_book_coverage;
REFRESH MATERIALIZED VIEW mv_audio_version_progress_summary;

REFRESH MATERIALIZED VIEW mv_text_verse_coverage;
REFRESH MATERIALIZED VIEW mv_text_chapter_coverage;
REFRESH MATERIALIZED VIEW mv_text_book_coverage;
REFRESH MATERIALIZED VIEW mv_text_version_progress_summary;

COMMIT;

-- Validate parity between views and MVs
\echo '--- Compare audio_verse_coverage vs mv_audio_verse_coverage (counts)'
SELECT (
  SELECT count(*) FROM audio_verse_coverage
) AS view_count, (
  SELECT count(*) FROM mv_audio_verse_coverage
) AS mv_count;

\echo '--- Compare text_verse_coverage vs mv_text_verse_coverage (counts)'
SELECT (
  SELECT count(*) FROM text_verse_coverage
) AS view_count, (
  SELECT count(*) FROM mv_text_verse_coverage
) AS mv_count;

\echo '--- mv_audio_chapter_coverage'
TABLE mv_audio_chapter_coverage;

\echo '--- mv_audio_book_coverage'
TABLE mv_audio_book_coverage;

\echo '--- mv_audio_version_progress_summary'
TABLE mv_audio_version_progress_summary;

\echo '--- mv_text_chapter_coverage'
TABLE mv_text_chapter_coverage;

\echo '--- mv_text_book_coverage'
TABLE mv_text_book_coverage;

\echo '--- mv_text_version_progress_summary'
TABLE mv_text_version_progress_summary;

\echo '--- extra seeding and MV refresh (to test updates)'
\i scripts/db_tests/progress_views_extra_seed.sql

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_verse_coverage;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_chapter_coverage;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_book_coverage;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_version_progress_summary;

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_text_verse_coverage;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_text_chapter_coverage;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_text_book_coverage;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_text_version_progress_summary;

\echo '--- After extra seed: mv_audio_version_progress_summary'
TABLE mv_audio_version_progress_summary;

\echo '--- After extra seed: mv_text_version_progress_summary'
TABLE mv_text_version_progress_summary;


