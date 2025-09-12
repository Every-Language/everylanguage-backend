-- Country-language listens heatmap view (per-country, per-language, snapped to grid)
-- Allows rendering a single country's heatmap with color differentiation by language.
-- Idempotent guards included so this migration can be re-run safely.
-- Drop if exists (guard)
DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_country_language_listens_heatmap'; EXCEPTION WHEN others THEN NULL; END $$;


-- View definition
CREATE OR REPLACE VIEW vw_country_language_listens_heatmap AS
WITH
  -- Union of all listening events (scope: session_id, language, timestamp)
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
  -- Country polygons and ISO codes from regions
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
  COALESCE(s.country_code, c.country_code) AS country_code,
  ae.language_entity_id,
  st_snaptogrid (s.location, 0.5, 0.5) AS grid, -- default ~0.5° grid
  COUNT(*)::BIGINT AS event_count,
  MAX(ae.ts) AS last_event_at
FROM
  all_events ae
  JOIN public.sessions s ON s.id = ae.session_id
  LEFT JOIN countries c ON s.location IS NOT NULL
  AND st_intersects (c.boundary, s.location)
WHERE
  s.location IS NOT NULL
  AND (
    s.country_code IS NOT NULL
    OR c.country_code IS NOT NULL
  )
GROUP BY
  COALESCE(s.country_code, c.country_code),
  ae.language_entity_id,
  st_snaptogrid (s.location, 0.5, 0.5);


comment ON view vw_country_language_listens_heatmap IS 'Per-country listens heatmap grouped by (country_code, language_entity_id, grid). Use to render a country heatmap with per-language colors.';
