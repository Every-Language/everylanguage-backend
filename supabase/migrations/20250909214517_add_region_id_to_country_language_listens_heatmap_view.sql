-- Update vw_country_language_listens_heatmap to include region_id resolved from country_code
-- Strategy:
-- 1) Prefer spatial country polygon id when session.country_code is null (already in countries CTE)
-- 2) Otherwise, map the effective country_code to a region via region_sources.external_id = country_code
--    (and optionally external_id_type = 'iso3166-1-alpha2' if present)
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
  ),
  -- Map ISO alpha-2 codes to region ids via region_sources.external_id
  iso_to_region AS (
    SELECT DISTINCT
      ON (rs.external_id) UPPER(TRIM(rs.external_id)) AS country_code,
      rs.region_id
    FROM
      public.region_sources rs
      -- Prefer explicit type match if present, but don't require it
    WHERE
      rs.deleted_at IS NULL
      AND rs.external_id IS NOT NULL
      AND (
        rs.external_id_type IS NULL
        OR rs.external_id_type ILIKE 'iso3166-1-alpha2'
      )
  )
SELECT
  e.code AS country_code,
  COALESCE(c.id, itr.region_id) AS region_id,
  ae.language_entity_id,
  st_snaptogrid (s.location, 0.5, 0.5) AS grid,
  COUNT(*)::BIGINT AS event_count,
  MAX(ae.ts) AS last_event_at
FROM
  all_events ae
  JOIN public.sessions s ON s.id = ae.session_id
  LEFT JOIN countries c ON s.country_code IS NULL
  AND s.location IS NOT NULL
  AND st_intersects (c.boundary, s.location)
  -- Determine effective country code
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(s.country_code, c.country_code) AS code
  ) e ON TRUE
  -- Map code -> region_id via external_id if available
  LEFT JOIN iso_to_region itr ON UPPER(TRIM(e.code)) = itr.country_code
WHERE
  s.location IS NOT NULL
  AND (
    s.country_code IS NOT NULL
    OR c.country_code IS NOT NULL
  )
GROUP BY
  e.code,
  COALESCE(c.id, itr.region_id),
  ae.language_entity_id,
  st_snaptogrid (s.location, 0.5, 0.5);


comment ON view vw_country_language_listens_heatmap IS 'Per-country listens heatmap grouped by (country_code, region_id, language_entity_id, grid). Region resolved via region_sources.external_id or country polygon id.';
