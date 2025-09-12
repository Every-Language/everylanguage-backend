-- Language analytics by country: downloads, listening time, popular chapters
-- Also drops the legacy downloads heatmap view.
-- Idempotent drops are used so the migration can be re-run safely.
-- ============================================================
-- Drop deprecated/legacy views
-- ============================================================
DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_app_downloads_heatmap'; EXCEPTION WHEN others THEN NULL; END $$;


-- Also drop our new views if re-running this migration
DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_app_downloads_by_country'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_listening_time_by_country'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_popular_chapters_by_country'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_country_metrics_summary'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_metrics_summary'; EXCEPTION WHEN others THEN NULL; END $$;


-- ============================================================
-- Helpers
-- ============================================================
-- Countries helper CTE (region id, iso alpha-2, boundary) is used inline below.
-- ============================================================
-- 1) App downloads by country (scoped by share.language_entity_id)
--    Uses latest session country_code per download when available; otherwise
--    falls back to point-in-polygon on app_downloads.location.
-- ============================================================
CREATE OR REPLACE VIEW vw_language_app_downloads_by_country AS
WITH
  latest_session_country_by_download AS (
    SELECT DISTINCT
      ON (s.app_download_id) s.app_download_id,
      s.country_code,
      s.started_at
    FROM
      public.sessions s
    WHERE
      s.app_download_id IS NOT NULL
      AND s.country_code IS NOT NULL
    ORDER BY
      s.app_download_id,
      s.started_at DESC
  ),
  countries AS (
    SELECT
      r.id,
      r.boundary,
      rp.value AS country_code
    FROM
      public.regions r
      JOIN public.region_properties rp ON rp.region_id = r.id
      AND rp.key = 'iso3166-1-alpha2'
    WHERE
      r.level = 'country'
      AND r.deleted_at IS NULL
      AND r.boundary IS NOT NULL
  )
SELECT
  sh.language_entity_id,
  COALESCE(ls.country_code, c.country_code) AS country_code,
  COUNT(*) AS downloads,
  MAX(ad.downloaded_at) AS last_download_at
FROM
  public.app_downloads ad
  JOIN public.shares sh ON sh.id = ad.origin_share_id
  LEFT JOIN latest_session_country_by_download ls ON ls.app_download_id = ad.id
  LEFT JOIN countries c ON ad.location IS NOT NULL
  AND st_intersects (c.boundary, ad.location)
GROUP BY
  sh.language_entity_id,
  COALESCE(ls.country_code, c.country_code);


comment ON view vw_language_app_downloads_by_country IS 'App downloads grouped by (language_entity_id, country_code). Uses latest sessions.country_code; falls back to point-in-polygon on app_downloads.location.';


-- ============================================================
-- 2) Listening time by country (scoped by event.language_entity_id)
--    Aggregates duration_seconds joined via session_id to sessions.country_code.
-- ============================================================
CREATE OR REPLACE VIEW vw_language_listening_time_by_country AS
SELECT
  mfl.language_entity_id,
  s.country_code,
  SUM(mfl.duration_seconds)::BIGINT AS total_listened_seconds,
  MAX(mfl.listened_at) AS last_listened_at
FROM
  public.media_file_listens mfl
  LEFT JOIN public.sessions s ON s.id = mfl.session_id
GROUP BY
  mfl.language_entity_id,
  s.country_code;


comment ON view vw_language_listening_time_by_country IS 'Total listening time (seconds) grouped by (language_entity_id, country_code) via sessions.country_code.';


-- ============================================================
-- 3) Popular chapters by country (scoped by event.language_entity_id)
--    Counts chapter_listens joined via session_id to sessions.country_code.
-- ============================================================
CREATE OR REPLACE VIEW vw_language_popular_chapters_by_country AS
SELECT
  cl.language_entity_id,
  cl.chapter_id,
  s.country_code,
  COUNT(*) AS listen_count,
  MAX(cl.listened_at) AS recent_listen_at
FROM
  public.chapter_listens cl
  JOIN public.sessions s ON s.id = cl.session_id
GROUP BY
  cl.language_entity_id,
  cl.chapter_id,
  s.country_code;


comment ON view vw_language_popular_chapters_by_country IS 'Chapter popularity grouped by (language_entity_id, chapter_id, country_code) via sessions.country_code.';
