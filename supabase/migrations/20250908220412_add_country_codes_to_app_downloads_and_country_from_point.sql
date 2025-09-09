-- Add country/region/continent codes to app_downloads and helper RPC to map a point to ISO alpha-2 country code.
-- Idempotent guards allow safe re-runs.
-- ============================================================
-- 1) Schema changes: app_downloads geo codes
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'app_downloads' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE public.app_downloads ADD COLUMN country_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'app_downloads' AND column_name = 'region_code'
  ) THEN
    ALTER TABLE public.app_downloads ADD COLUMN region_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'app_downloads' AND column_name = 'continent_code'
  ) THEN
    ALTER TABLE public.app_downloads ADD COLUMN continent_code text;
  END IF;
END $$;


-- Helpful index for group-bys
CREATE INDEX if NOT EXISTS idx_app_downloads_country_code ON public.app_downloads (country_code);


comment ON COLUMN public.app_downloads.country_code IS 'ISO 3166-1 alpha-2 country code normalized to regions polygons (from device/IP point).';


-- ============================================================
-- 2) RPC: Map lon/lat to ISO 3166-1 alpha-2 country code
--      Strategy: ST_Intersects first; if none, nearest polygon via KNN.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_country_code_from_point (lon DOUBLE PRECISION, lat DOUBLE PRECISION) returns TEXT language sql stable security invoker
SET
  search_path = public AS $$
  WITH pt AS (
    SELECT ST_SetSRID(ST_MakePoint(lon, lat), 4326) AS geom
  ),
  inside AS (
    SELECT rp.value AS country_code
    FROM public.regions r
    JOIN public.region_properties rp
      ON rp.region_id = r.id AND rp.key = 'iso3166-1-alpha2'
    JOIN pt ON ST_Intersects(r.boundary, pt.geom)
    WHERE r.level = 'country'
      AND r.deleted_at IS NULL
      AND r.boundary IS NOT NULL
    ORDER BY ST_Area(r.boundary) ASC
    LIMIT 1
  )
  SELECT COALESCE(
    (SELECT country_code FROM inside),
    (
      SELECT rp.value AS country_code
      FROM public.regions r
      JOIN public.region_properties rp
        ON rp.region_id = r.id AND rp.key = 'iso3166-1-alpha2'
      JOIN pt ON TRUE
      WHERE r.level = 'country'
        AND r.deleted_at IS NULL
        AND r.boundary IS NOT NULL
      ORDER BY r.boundary <-> pt.geom
      LIMIT 1
    )
  )
$$;


comment ON function public.get_country_code_from_point (DOUBLE PRECISION, DOUBLE PRECISION) IS 'Returns ISO 3166-1 alpha-2 for point via regions polygons; uses intersects first, then KNN nearest.';
