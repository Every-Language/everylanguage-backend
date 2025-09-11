-- Analytics Materialized Views by Country
-- Creates materialized views for downloads, listening time, and popular chapters by country.
-- Also updates refresh functions to include these MVs.
-- Guard drops for idempotency
DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_language_downloads_by_country'; EXCEPTION WHEN others THEN NULL; END $$;


--
DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_language_listening_time_by_country'; EXCEPTION WHEN others THEN NULL; END $$;


--
DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_language_popular_chapters_by_country'; EXCEPTION WHEN others THEN NULL; END $$;


-- 1) Downloads by country (prefer app_downloads.country_code, otherwise fallback via sessions/app_download_id)
CREATE MATERIALIZED VIEW mv_language_downloads_by_country AS
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
  )
SELECT
  sh.language_entity_id,
  COALESCE(ad.country_code, ls.country_code) AS country_code,
  COUNT(*) AS downloads,
  MAX(ad.downloaded_at) AS last_download_at
FROM
  public.app_downloads ad
  JOIN public.shares sh ON sh.id = ad.origin_share_id
  LEFT JOIN latest_session_country_by_download ls ON ls.app_download_id = ad.id
GROUP BY
  sh.language_entity_id,
  COALESCE(ad.country_code, ls.country_code)
WITH
  no data;


CREATE UNIQUE INDEX mv_language_downloads_by_country_pkey ON mv_language_downloads_by_country (language_entity_id, country_code);


CREATE INDEX mv_language_downloads_by_country_downloads ON mv_language_downloads_by_country (downloads DESC);


comment ON materialized view mv_language_downloads_by_country IS 'Materialized app downloads grouped by (language_entity_id, country_code).';


-- 2) Listening time by country
CREATE MATERIALIZED VIEW mv_language_listening_time_by_country AS
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
  s.country_code
WITH
  no data;


CREATE UNIQUE INDEX mv_language_listening_time_by_country_pkey ON mv_language_listening_time_by_country (language_entity_id, country_code);


CREATE INDEX mv_language_listening_time_by_country_seconds ON mv_language_listening_time_by_country (total_listened_seconds DESC);


comment ON materialized view mv_language_listening_time_by_country IS 'Materialized total listening time grouped by (language_entity_id, country_code).';


-- 3) Popular chapters by country
CREATE MATERIALIZED VIEW mv_language_popular_chapters_by_country AS
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
  s.country_code
WITH
  no data;


CREATE UNIQUE INDEX mv_language_popular_chapters_by_country_pkey ON mv_language_popular_chapters_by_country (language_entity_id, chapter_id, country_code);


CREATE INDEX mv_language_popular_chapters_by_country_count ON mv_language_popular_chapters_by_country (listen_count DESC);


comment ON materialized view mv_language_popular_chapters_by_country IS 'Materialized chapter popularity grouped by (language_entity_id, chapter_id, country_code).';


-- Update refresh functions to include analytics MVs
CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_full () returns void language plpgsql security definer AS $$
BEGIN
  -- Existing summary MVs
  REFRESH MATERIALIZED VIEW mv_audio_version_progress_summary;
  REFRESH MATERIALIZED VIEW mv_text_version_progress_summary;
  -- Analytics MVs
  REFRESH MATERIALIZED VIEW mv_language_downloads_by_country;
  REFRESH MATERIALIZED VIEW mv_language_listening_time_by_country;
  REFRESH MATERIALIZED VIEW mv_language_popular_chapters_by_country;
END;
$$;


CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_concurrently () returns void language plpgsql security definer AS $$
BEGIN
  -- Existing summary MVs
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_version_progress_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_text_version_progress_summary;
  -- Analytics MVs
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_language_downloads_by_country;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_language_listening_time_by_country;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_language_popular_chapters_by_country;
END;
$$;
