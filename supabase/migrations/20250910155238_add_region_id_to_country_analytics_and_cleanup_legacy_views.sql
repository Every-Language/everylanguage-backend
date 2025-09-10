-- Add region_id to country analytics views/MVs via reusable helper, and drop legacy views
-- Guards: drop dependent views/MVs we will recreate
DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_app_downloads_by_country'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_listening_time_by_country'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_popular_chapters_by_country'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_listens_stats'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_language_downloads_by_country'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_language_listening_time_by_country'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_language_popular_chapters_by_country'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS mv_language_listens_stats'; EXCEPTION WHEN others THEN NULL; END $$;


-- Drop legacy/superseded views
DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_aliases_mojibake_preview'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_downloads_count'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_app_downloads_count'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_listening_time'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_language_popular_chapters'; EXCEPTION WHEN others THEN NULL; END $$;


-- Helper: map ISO alpha-2 to region_id (country region)
CREATE OR REPLACE VIEW vw_iso_country_to_region AS
SELECT DISTINCT
  ON (code) code,
  region_id
FROM
  (
    -- Prefer explicit source mapping when present
    SELECT
      UPPER(TRIM(rs.external_id)) AS code,
      rs.region_id
    FROM
      public.region_sources rs
    WHERE
      rs.deleted_at IS NULL
      AND rs.external_id IS NOT NULL
      AND (
        rs.external_id_type IS NULL
        OR rs.external_id_type ILIKE 'iso3166-1-alpha2'
      )
    UNION ALL
    -- Fallback to regions with region_properties('iso3166-1-alpha2')
    SELECT
      UPPER(TRIM(rp.value)) AS code,
      r.id AS region_id
    FROM
      public.regions r
      JOIN public.region_properties rp ON rp.region_id = r.id
      AND rp.key = 'iso3166-1-alpha2'
    WHERE
      r.level = 'country'
      AND r.deleted_at IS NULL
      AND r.boundary IS NOT NULL
  ) s
ORDER BY
  code,
  region_id;


-- DISTICT ON keeps first per code
comment ON view vw_iso_country_to_region IS 'Maps ISO 3166-1 alpha-2 code to regions.id (country). Uses region_sources.external_id if present, else region_properties fallback.';


-- Countries CTE body reused in multiple views
-- Note: not a real CTE here; each view includes its own countries CTE.
-- 1) Unified stats view: downloads, listening time, and popular chapters
CREATE OR REPLACE VIEW vw_language_listens_stats AS
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
  ),
  d AS (
    SELECT
      e.code AS country_code,
      COALESCE(c.id, icr.region_id) AS region_id,
      sh.language_entity_id,
      COUNT(*) AS downloads,
      MAX(ad.downloaded_at) AS last_download_at
    FROM
      public.app_downloads ad
      JOIN public.shares sh ON sh.id = ad.origin_share_id
      LEFT JOIN latest_session_country_by_download ls ON ls.app_download_id = ad.id
      LEFT JOIN countries c ON (
        ls.country_code IS NULL
        AND ad.location IS NOT NULL
        AND st_intersects (c.boundary, ad.location)
      )
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(ls.country_code, c.country_code) AS code
      ) e ON TRUE
      LEFT JOIN vw_iso_country_to_region icr ON UPPER(TRIM(e.code)) = icr.code
    GROUP BY
      e.code,
      COALESCE(c.id, icr.region_id),
      sh.language_entity_id
  ),
  t AS (
    SELECT
      e.code AS country_code,
      COALESCE(c.id, icr.region_id) AS region_id,
      mfl.language_entity_id,
      SUM(mfl.duration_seconds)::BIGINT AS total_listened_seconds,
      MAX(mfl.listened_at) AS last_listened_at
    FROM
      public.media_file_listens mfl
      LEFT JOIN public.sessions s ON s.id = mfl.session_id
      LEFT JOIN countries c ON (
        s.country_code IS NULL
        AND s.location IS NOT NULL
        AND st_intersects (c.boundary, s.location)
      )
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(s.country_code, c.country_code) AS code
      ) e ON TRUE
      LEFT JOIN vw_iso_country_to_region icr ON UPPER(TRIM(e.code)) = icr.code
    GROUP BY
      e.code,
      COALESCE(c.id, icr.region_id),
      mfl.language_entity_id
  ),
  p AS (
    SELECT
      e.code AS country_code,
      COALESCE(c.id, icr.region_id) AS region_id,
      cl.language_entity_id,
      cl.chapter_id,
      COUNT(*) AS listen_count,
      MAX(cl.listened_at) AS recent_listen_at
    FROM
      public.chapter_listens cl
      JOIN public.sessions s ON s.id = cl.session_id
      LEFT JOIN countries c ON (
        s.country_code IS NULL
        AND s.location IS NOT NULL
        AND st_intersects (c.boundary, s.location)
      )
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(s.country_code, c.country_code) AS code
      ) e ON TRUE
      LEFT JOIN vw_iso_country_to_region icr ON UPPER(TRIM(e.code)) = icr.code
    GROUP BY
      e.code,
      COALESCE(c.id, icr.region_id),
      cl.language_entity_id,
      cl.chapter_id
  ),
  s AS (
    SELECT
      COALESCE(d.country_code, t.country_code) AS country_code,
      COALESCE(d.region_id, t.region_id) AS region_id,
      COALESCE(d.language_entity_id, t.language_entity_id) AS language_entity_id,
      d.downloads,
      d.last_download_at,
      t.total_listened_seconds,
      t.last_listened_at
    FROM
      d
      FULL OUTER JOIN t ON d.country_code = t.country_code
      AND d.region_id = t.region_id
      AND d.language_entity_id = t.language_entity_id
  )
SELECT
  country_code,
  region_id,
  language_entity_id,
  NULL::TEXT AS chapter_id,
  downloads,
  last_download_at,
  total_listened_seconds,
  last_listened_at,
  NULL::BIGINT AS listen_count,
  NULL::TIMESTAMPTZ AS recent_listen_at
FROM
  s
UNION ALL
SELECT
  country_code,
  region_id,
  language_entity_id,
  chapter_id,
  NULL::BIGINT AS downloads,
  NULL::TIMESTAMPTZ AS last_download_at,
  NULL::BIGINT AS total_listened_seconds,
  NULL::TIMESTAMPTZ AS last_listened_at,
  listen_count,
  recent_listen_at
FROM
  p;


comment ON view vw_language_listens_stats IS 'Unified analytics: per-country stats per language (downloads + listening time) and per-chapter popularity rows (chapter_id set).';


-- 4) Refactor heatmap view to use helper mapping (drop/recreate)
DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_country_language_listens_heatmap'; EXCEPTION WHEN others THEN NULL; END $$;


CREATE OR REPLACE VIEW vw_country_language_listens_heatmap AS
WITH
  all_events AS (
    SELECT
      session_id,
      language_entity_id,
      listened_at AS ts
    FROM
      public.verse_listens
    UNION ALL
    SELECT
      session_id,
      language_entity_id,
      listened_at AS ts
    FROM
      public.chapter_listens
    UNION ALL
    SELECT
      session_id,
      language_entity_id,
      listened_at AS ts
    FROM
      public.media_file_listens
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
  e.code AS country_code,
  COALESCE(c.id, icr.region_id) AS region_id,
  ae.language_entity_id,
  st_snaptogrid (s.location, 0.5, 0.5) AS grid,
  COUNT(*)::BIGINT AS event_count,
  MAX(ae.ts) AS last_event_at
FROM
  all_events ae
  JOIN public.sessions s ON s.id = ae.session_id
  LEFT JOIN countries c ON (
    s.country_code IS NULL
    AND s.location IS NOT NULL
    AND st_intersects (c.boundary, s.location)
  )
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(s.country_code, c.country_code) AS code
  ) e ON TRUE
  LEFT JOIN vw_iso_country_to_region icr ON UPPER(TRIM(e.code)) = icr.code
WHERE
  s.location IS NOT NULL
  AND e.code IS NOT NULL
GROUP BY
  e.code,
  COALESCE(c.id, icr.region_id),
  ae.language_entity_id,
  st_snaptogrid (s.location, 0.5, 0.5);


comment ON view vw_country_language_listens_heatmap IS 'Per-country listens heatmap grouped by (country_code, region_id, language_entity_id, grid).';


-- 5) Create unified MV for stats
CREATE MATERIALIZED VIEW mv_language_listens_stats AS
SELECT
  *
FROM
  vw_language_listens_stats
WITH
  no data;


CREATE INDEX mv_language_listens_stats_lang_country ON mv_language_listens_stats (language_entity_id, country_code);


CREATE INDEX mv_language_listens_stats_region ON mv_language_listens_stats (region_id);


CREATE INDEX mv_language_listens_stats_chapter ON mv_language_listens_stats (chapter_id);


-- 6) Ensure refresh functions include these MVs (idempotent overwrite)
CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_full () returns void language plpgsql security definer AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_audio_version_progress_summary;
  REFRESH MATERIALIZED VIEW mv_text_version_progress_summary;
  REFRESH MATERIALIZED VIEW mv_language_listens_stats;
END; $$;


CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_concurrently () returns void language plpgsql security definer AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_version_progress_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_text_version_progress_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_language_listens_stats;
END; $$;
