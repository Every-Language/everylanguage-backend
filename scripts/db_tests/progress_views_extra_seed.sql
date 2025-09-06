-- Additional seed scenarios for coverage tests
\set ON_ERROR_STOP on
\pset pager off

BEGIN;
SET search_path TO public;

-- Ensure variables from prior script exist: :le_id, :tv_id, :av_id

-- 1) Text: complete chapter 2 by adding the last verse
INSERT INTO verse_texts (verse_id, text_version_id, verse_text)
VALUES ('V_GEN_2_3', :'tv_id', 'v6')
ON CONFLICT DO NOTHING;

-- 2) Audio: add a range-based file covering all of chapter 2
INSERT INTO media_files (
  language_entity_id, media_type, file_size, duration_seconds,
  upload_status, publish_status, is_bible_audio, audio_version_id,
  start_verse_id, end_verse_id
) VALUES (
  :'le_id', 'audio', 150000, 90,
  'completed', 'published', TRUE, :'av_id',
  'V_GEN_2_1', 'V_GEN_2_3'
) ON CONFLICT DO NOTHING;

-- 3) Negative control: an unpublished audio file (should be ignored)
INSERT INTO media_files (
  language_entity_id, media_type, file_size, duration_seconds,
  upload_status, publish_status, is_bible_audio, audio_version_id,
  chapter_id
) VALUES (
  :'le_id', 'audio', 120000, 80,
  'completed', 'pending', TRUE, :'av_id',
  'CH_GEN_1'
) ON CONFLICT DO NOTHING;

-- 4) Negative control: a deleted mapping (should be ignored)
-- Reuse mf2_id from previous script if present; otherwise skip insert
-- Attempt a safe insert; if variable missing, this will fail; so guard by selecting an existing media_file id
WITH any_mf AS (
  SELECT id FROM media_files WHERE audio_version_id = :'av_id' LIMIT 1
)
INSERT INTO media_files_verses (media_file_id, verse_id, start_time_seconds, duration_seconds, deleted_at)
SELECT id, 'V_GEN_1_1', 0, 5, now() FROM any_mf
ON CONFLICT DO NOTHING;

COMMIT;


