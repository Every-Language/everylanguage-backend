-- Analytics language-scoped heatmaps/stats test
\set ON_ERROR_STOP on
\pset pager off

BEGIN;
SET search_path TO public;

-- Ensure a language_entity exists and capture its id
WITH upsert AS (
  INSERT INTO language_entities (name, level)
  VALUES ('Test Language', 'language')
  RETURNING id
)
SELECT COALESCE((SELECT id FROM upsert), (SELECT id FROM language_entities WHERE name = 'Test Language' LIMIT 1)) AS le_id \gset

-- Ensure minimal bible structure exists for FK-friendly test data
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM bible_versions WHERE id = 'BIBLE_TEST') THEN
    INSERT INTO bible_versions (id, name) VALUES ('BIBLE_TEST', 'Test Bible');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM books WHERE id = 'BOOK_GEN') THEN
    INSERT INTO books (id, name, book_number, bible_version_id) VALUES ('BOOK_GEN', 'Genesis', 1, 'BIBLE_TEST');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM chapters WHERE id = 'CH_GEN_1') THEN
    INSERT INTO chapters (id, chapter_number, book_id, total_verses) VALUES ('CH_GEN_1', 1, 'BOOK_GEN', 3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM verses WHERE id = 'V_GEN_1_1') THEN
    INSERT INTO verses (id, chapter_id, verse_number) VALUES
      ('V_GEN_1_1', 'CH_GEN_1', 1),
      ('V_GEN_1_2', 'CH_GEN_1', 2),
      ('V_GEN_1_3', 'CH_GEN_1', 3);
  END IF;
END $$;

-- Create 3 sessions at different locations (nullable user_id)
INSERT INTO sessions (started_at, platform, app_version, location)
VALUES
  (now(), 'ios', '1.0.0', ST_SetSRID(ST_MakePoint(103.8198, 1.3521), 4326)),  -- Singapore
  (now(), 'android', '1.0.0', ST_SetSRID(ST_MakePoint(101.6869, 3.1390), 4326)), -- Kuala Lumpur
  (now(), 'web', '1.0.0', ST_SetSRID(ST_MakePoint(100.5018, 13.7563), 4326))    -- Bangkok
ON CONFLICT DO NOTHING;

-- Create a share (for downloads attribution)
WITH sess AS (
  SELECT id FROM sessions ORDER BY started_at ASC LIMIT 1
), ins AS (
  INSERT INTO shares (session_id, shared_at, share_entity_type, share_entity_id, language_entity_id)
  SELECT id, now(), 'app', '00000000-0000-0000-0000-000000000000', :'le_id' FROM sess
  RETURNING id
)
SELECT id AS share_id FROM ins \gset

-- App downloads at various points attributed to SHARE_1
INSERT INTO app_downloads (origin_share_id, device_id, downloaded_at, location, app_version, platform, os)
VALUES
  (:'share_id', 'D_A', now(), ST_SetSRID(ST_MakePoint(103.85, 1.29), 4326), '1.0.0', 'ios', 'iOS'),
  (:'share_id', 'D_B', now(), ST_SetSRID(ST_MakePoint(101.70, 3.15), 4326), '1.0.0', 'android', 'Android')
ON CONFLICT DO NOTHING;

-- Listens: insert into verse_listens and media_file_listens (use generated UUIDs for IDs)

-- Verse listens
WITH s AS (
  SELECT id FROM sessions ORDER BY started_at ASC LIMIT 3
)
INSERT INTO verse_listens (session_id, verse_id, language_entity_id, listened_at)
VALUES
  ((SELECT id FROM sessions ORDER BY started_at ASC LIMIT 1 OFFSET 0), 'V_GEN_1_1', :'le_id', now()),
  ((SELECT id FROM sessions ORDER BY started_at ASC LIMIT 1 OFFSET 1), 'V_GEN_1_2', :'le_id', now()),
  ((SELECT id FROM sessions ORDER BY started_at ASC LIMIT 1 OFFSET 2), 'V_GEN_1_3', :'le_id', now())
ON CONFLICT DO NOTHING;

-- Media file listens
INSERT INTO media_files (id, language_entity_id, media_type)
VALUES
  ('00000000-0000-0000-0000-000000000001', :'le_id', 'audio'),
  ('00000000-0000-0000-0000-000000000002', :'le_id', 'audio')
ON CONFLICT (id) DO NOTHING;

INSERT INTO media_file_listens (session_id, media_file_id, language_entity_id, position_seconds, duration_seconds, listened_at)
VALUES
  ((SELECT id FROM sessions ORDER BY started_at ASC LIMIT 1 OFFSET 0), '00000000-0000-0000-0000-000000000001', :'le_id', 10, 60, now()),
  ((SELECT id FROM sessions ORDER BY started_at ASC LIMIT 1 OFFSET 1), '00000000-0000-0000-0000-000000000002', :'le_id', 15, 120, now())
ON CONFLICT DO NOTHING;

-- Chapter listens for popularity view
INSERT INTO chapter_listens (session_id, chapter_id, language_entity_id, listened_at)
VALUES
  ((SELECT id FROM sessions ORDER BY started_at ASC LIMIT 1 OFFSET 0), 'CH_GEN_1', :'le_id', now()),
  ((SELECT id FROM sessions ORDER BY started_at ASC LIMIT 1 OFFSET 1), 'CH_GEN_1', :'le_id', now())
ON CONFLICT DO NOTHING;

COMMIT;

\echo '--- vw_language_listens_heatmap (sample)'
SELECT language_entity_id, ST_AsText(grid) AS grid_wkt, event_count, last_event_at
FROM vw_language_listens_heatmap
WHERE language_entity_id = :'le_id'
ORDER BY event_count DESC
LIMIT 10;

\echo '--- vw_language_app_downloads_heatmap (sample)'
SELECT language_entity_id, ST_AsText(grid) AS grid_wkt, download_count, last_download_at
FROM vw_language_app_downloads_heatmap
WHERE language_entity_id = :'le_id'
ORDER BY download_count DESC
LIMIT 10;

\echo '--- vw_language_downloads_count'
SELECT * FROM vw_language_downloads_count WHERE language_entity_id = :'le_id';

\echo '--- vw_language_listening_time'
SELECT * FROM vw_language_listening_time WHERE language_entity_id = :'le_id';

\echo '--- vw_language_popular_chapters (top)'
SELECT * FROM vw_language_popular_chapters WHERE language_entity_id = :'le_id' ORDER BY listen_count DESC LIMIT 10;


