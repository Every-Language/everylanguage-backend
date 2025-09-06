-- Analytics Views: Language-scoped heatmaps and stats (no MVs)
-- ============================================================
-- Creates:
-- 1) vw_language_listens_heatmap
-- 2) vw_language_app_downloads_heatmap
-- 3) vw_language_downloads_count
-- 4) vw_language_listening_time
-- 5) vw_language_popular_chapters
-- Plus: add missing helpful indexes
-- Guard drops (idempotent)
DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_listens_heatmap'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_app_downloads_heatmap'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_downloads_count'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_listening_time'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_popular_chapters'; EXCEPTION WHEN others THEN NULL; END $$;


-- 1) All listens heatmap scoped by language_entity
-- Uses sessions.location as the spatial source via session_id on events
CREATE OR REPLACE VIEW vw_language_listens_heatmap AS
WITH
  all_events AS (
    SELECT
      session_id,
      language_entity_id,
      listened_at AS ts
    FROM
      verse_listens
    UNION ALL
    SELECT
      session_id,
      language_entity_id,
      listened_at AS ts
    FROM
      chapter_listens
    UNION ALL
    SELECT
      session_id,
      language_entity_id,
      listened_at AS ts
    FROM
      media_file_listens
  )
SELECT
  ae.language_entity_id,
  st_snaptogrid (s.location, 0.5, 0.5) AS grid, -- ~0.5° grid
  COUNT(*) AS event_count,
  MAX(ae.ts) AS last_event_at
FROM
  all_events ae
  JOIN sessions s ON s.id = ae.session_id
WHERE
  s.location IS NOT NULL
GROUP BY
  ae.language_entity_id,
  grid;


comment ON view vw_language_listens_heatmap IS 'Heatmap of all listens (verse/chapter/media) snapped to grid, scoped by language_entity via event tables.';


-- 2) App downloads heatmap scoped by language_entity via source_share_id
CREATE OR REPLACE VIEW vw_language_app_downloads_heatmap AS
SELECT
  sh.language_entity_id,
  st_snaptogrid (ad.location, 0.5, 0.5) AS grid,
  COUNT(*) AS download_count,
  MAX(ad.downloaded_at) AS last_download_at
FROM
  app_downloads ad
  JOIN shares sh ON sh.id = ad.origin_share_id
WHERE
  ad.location IS NOT NULL
GROUP BY
  sh.language_entity_id,
  grid;


comment ON view vw_language_app_downloads_heatmap IS 'Heatmap of app downloads snapped to grid, scoped by share.language_entity_id.';


-- 3) Downloads count by language_entity
CREATE OR REPLACE VIEW vw_language_downloads_count AS
SELECT
  sh.language_entity_id,
  COUNT(*) AS downloads
FROM
  app_downloads ad
  JOIN shares sh ON sh.id = ad.origin_share_id
GROUP BY
  sh.language_entity_id;


comment ON view vw_language_downloads_count IS 'Total app downloads scoped by share.language_entity_id.';


-- 4) Listening time by language_entity (sum of duration_seconds)
CREATE OR REPLACE VIEW vw_language_listening_time AS
SELECT
  mfl.language_entity_id,
  SUM(mfl.duration_seconds)::BIGINT AS total_listened_seconds,
  MAX(mfl.listened_at) AS last_listened_at
FROM
  media_file_listens mfl
GROUP BY
  mfl.language_entity_id;


comment ON view vw_language_listening_time IS 'Total listening time (seconds) per language_entity based on media_file_listens.';


-- 5) Popular chapters by language_entity (based on chapter_listens)
CREATE OR REPLACE VIEW vw_language_popular_chapters AS
SELECT
  cl.language_entity_id,
  cl.chapter_id,
  COUNT(*) AS listen_count,
  MAX(cl.listened_at) AS recent_listen_at
FROM
  chapter_listens cl
GROUP BY
  cl.language_entity_id,
  cl.chapter_id;


comment ON view vw_language_popular_chapters IS 'Chapter popularity per language_entity based on chapter_listens.';


-- Helpful index: listened_at on chapter_listens (not always present)
CREATE INDEX if NOT EXISTS idx_chapter_listens_listened_at ON chapter_listens (listened_at);
