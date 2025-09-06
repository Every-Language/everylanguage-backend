-- Minimal local test for progress coverage views
-- Safe to re-run: uses ON CONFLICT and idempotent inserts
\set ON_ERROR_STOP on
\pset pager off

BEGIN;
SET search_path TO public;

-- Base structure for a tiny bible: 1 book (Genesis), 2 chapters, 3 verses each
INSERT INTO bible_versions (id, name)
VALUES ('BIBLE_TEST', 'Test Bible')
ON CONFLICT DO NOTHING;

INSERT INTO books (id, name, book_number, bible_version_id)
VALUES ('BOOK_GEN', 'Genesis', 1, 'BIBLE_TEST')
ON CONFLICT DO NOTHING;

INSERT INTO chapters (id, chapter_number, book_id, total_verses)
VALUES
  ('CH_GEN_1', 1, 'BOOK_GEN', 3),
  ('CH_GEN_2', 2, 'BOOK_GEN', 3)
ON CONFLICT DO NOTHING;

INSERT INTO verses (id, chapter_id, verse_number)
VALUES
  ('V_GEN_1_1', 'CH_GEN_1', 1),
  ('V_GEN_1_2', 'CH_GEN_1', 2),
  ('V_GEN_1_3', 'CH_GEN_1', 3),
  ('V_GEN_2_1', 'CH_GEN_2', 1),
  ('V_GEN_2_2', 'CH_GEN_2', 2),
  ('V_GEN_2_3', 'CH_GEN_2', 3)
ON CONFLICT DO NOTHING;

-- Create a language entity
INSERT INTO language_entities (name, level)
VALUES ('Test Language', 'language')
ON CONFLICT DO NOTHING;

-- Fetch or create language entity id
WITH le AS (
  SELECT id FROM language_entities WHERE name = 'Test Language' ORDER BY created_at DESC LIMIT 1
)
SELECT id AS le_id FROM le \gset

-- Create/ensure text and audio versions for this language
INSERT INTO text_versions (language_entity_id, bible_version_id, name)
VALUES (:'le_id', 'BIBLE_TEST', 'Test Text')
ON CONFLICT (language_entity_id, name) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO audio_versions (language_entity_id, bible_version_id, name)
VALUES (:'le_id', 'BIBLE_TEST', 'Test Audio')
ON CONFLICT (language_entity_id, bible_version_id, name) DO UPDATE SET name = EXCLUDED.name;

-- Fetch version ids
WITH tv AS (
  SELECT id FROM text_versions WHERE language_entity_id = :'le_id' AND name = 'Test Text' LIMIT 1
), av AS (
  SELECT id FROM audio_versions WHERE language_entity_id = :'le_id' AND name = 'Test Audio' LIMIT 1
)
SELECT (SELECT id FROM tv) AS tv_id, (SELECT id FROM av) AS av_id \gset

-- Add verse_texts: make chapter 1 complete (3/3), chapter 2 partial (2/3)
INSERT INTO verse_texts (verse_id, text_version_id, verse_text)
VALUES
  ('V_GEN_1_1', :'tv_id', 'v1'),
  ('V_GEN_1_2', :'tv_id', 'v2'),
  ('V_GEN_1_3', :'tv_id', 'v3'),
  ('V_GEN_2_1', :'tv_id', 'v4'),
  ('V_GEN_2_2', :'tv_id', 'v5')
ON CONFLICT DO NOTHING;

-- Add audio files: chapter 1 complete via chapter-level file; chapter 2 partial via explicit verse mappings
INSERT INTO media_files (
  language_entity_id, media_type, file_size, duration_seconds,
  upload_status, publish_status, is_bible_audio, audio_version_id, chapter_id
) VALUES (
  :'le_id', 'audio', 100000, 60,
  'completed', 'published', TRUE, :'av_id', 'CH_GEN_1'
) ON CONFLICT DO NOTHING;

INSERT INTO media_files (
  language_entity_id, media_type, file_size, duration_seconds,
  upload_status, publish_status, is_bible_audio, audio_version_id
) VALUES (
  :'le_id', 'audio', 200000, 120,
  'completed', 'published', TRUE, :'av_id'
) RETURNING id AS mf2_id \gset

INSERT INTO media_files_verses (media_file_id, verse_id, start_time_seconds, duration_seconds)
VALUES
  (:'mf2_id', 'V_GEN_2_1', 0, 10),
  (:'mf2_id', 'V_GEN_2_2', 10, 10)
ON CONFLICT DO NOTHING;

COMMIT;

\echo '--- audio_chapter_coverage'
SELECT * FROM audio_chapter_coverage WHERE audio_version_id = :'av_id' ORDER BY chapter_id;

\echo '--- audio_book_coverage'
SELECT * FROM audio_book_coverage WHERE audio_version_id = :'av_id' ORDER BY book_id;

\echo '--- audio_version_progress_summary'
SELECT * FROM audio_version_progress_summary WHERE audio_version_id = :'av_id';

\echo '--- text_chapter_coverage'
SELECT * FROM text_chapter_coverage WHERE text_version_id = :'tv_id' ORDER BY chapter_id;

\echo '--- text_book_coverage'
SELECT * FROM text_book_coverage WHERE text_version_id = :'tv_id' ORDER BY book_id;

\echo '--- text_version_progress_summary'
SELECT * FROM text_version_progress_summary WHERE text_version_id = :'tv_id';

\echo '--- language_entity_best_audio_version'
SELECT * FROM language_entity_best_audio_version WHERE language_entity_id = :'le_id';

\echo '--- language_entity_best_text_version'
SELECT * FROM language_entity_best_text_version WHERE language_entity_id = :'le_id';


