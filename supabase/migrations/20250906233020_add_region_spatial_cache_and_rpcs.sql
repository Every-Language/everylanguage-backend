-- Add region spatial cache columns and optimized RPCs for fast selection
-- 1) Derived columns for bbox and center (numeric), and a simplified boundary for overlays
ALTER TABLE public.regions
ADD COLUMN IF NOT EXISTS bbox_min_lon DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS bbox_min_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS bbox_max_lon DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS bbox_max_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS center_lon DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS center_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS boundary_simplified geometry (multipolygon, 4326);


comment ON COLUMN public.regions.bbox_min_lon IS 'Precomputed bounding box min longitude for fast map fit';


comment ON COLUMN public.regions.bbox_min_lat IS 'Precomputed bounding box min latitude for fast map fit';


comment ON COLUMN public.regions.bbox_max_lon IS 'Precomputed bounding box max longitude for fast map fit';


comment ON COLUMN public.regions.bbox_max_lat IS 'Precomputed bounding box max latitude for fast map fit';


comment ON COLUMN public.regions.center_lon IS 'Precomputed center longitude using ST_PointOnSurface for safe centering';


comment ON COLUMN public.regions.center_lat IS 'Precomputed center latitude using ST_PointOnSurface for safe centering';


comment ON COLUMN public.regions.boundary_simplified IS 'Pre-simplified multipolygon boundary for lightweight overlay rendering';


-- 2) Function to refresh derived columns for a region
CREATE OR REPLACE FUNCTION public.refresh_region_spatial_cache (p_region_id UUID) returns void language plpgsql security invoker
SET
  search_path = public AS $$
DECLARE
  g geometry(MULTIPOLYGON, 4326);
  pt geometry(POINT, 4326);
BEGIN
  SELECT boundary INTO g FROM public.regions WHERE id = p_region_id;

  IF g IS NULL THEN
    UPDATE public.regions
    SET bbox_min_lon = NULL,
        bbox_min_lat = NULL,
        bbox_max_lon = NULL,
        bbox_max_lat = NULL,
        center_lon = NULL,
        center_lat = NULL,
        boundary_simplified = NULL
    WHERE id = p_region_id;
    RETURN;
  END IF;

  pt := ST_PointOnSurface(g);

  UPDATE public.regions
  SET bbox_min_lon = ST_XMin(g),
      bbox_min_lat = ST_YMin(g),
      bbox_max_lon = ST_XMax(g),
      bbox_max_lat = ST_YMax(g),
      center_lon = ST_X(pt),
      center_lat = ST_Y(pt),
      boundary_simplified = ST_SimplifyPreserveTopology(g, 0.02) -- ~2km tolerance at equator
  WHERE id = p_region_id;
END;
$$;


-- 3) Trigger to keep cache in sync on INSERT/UPDATE of boundary
CREATE OR REPLACE FUNCTION public.trg_refresh_region_spatial_cache () returns trigger language plpgsql security invoker
SET
  search_path = public AS $$
BEGIN
  PERFORM public.refresh_region_spatial_cache(NEW.id);
  RETURN NEW;
END;
$$;


DROP TRIGGER if EXISTS refresh_region_spatial_cache ON public.regions;


CREATE TRIGGER refresh_region_spatial_cache
AFTER insert
OR
UPDATE of boundary ON public.regions FOR each ROW
EXECUTE function public.trg_refresh_region_spatial_cache ();


-- 4) Backfill cache for existing rows
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.regions WHERE boundary IS NOT NULL LOOP
    PERFORM public.refresh_region_spatial_cache(r.id);
  END LOOP;
END $$;


-- 5) RPC: Fast bbox and center by region id (minimal payload)
CREATE OR REPLACE FUNCTION public.get_region_bbox_by_id (p_region_id UUID) returns TABLE (
  id UUID,
  name TEXT,
  level region_level,
  parent_id UUID,
  min_lon DOUBLE PRECISION,
  min_lat DOUBLE PRECISION,
  max_lon DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  center_lon DOUBLE PRECISION,
  center_lat DOUBLE PRECISION
) language sql stable security invoker
SET
  search_path = public AS $$
  SELECT
    r.id,
    r.name,
    r.level,
    r.parent_id,
    r.bbox_min_lon AS min_lon,
    r.bbox_min_lat AS min_lat,
    r.bbox_max_lon AS max_lon,
    r.bbox_max_lat AS max_lat,
    r.center_lon,
    r.center_lat
  FROM public.regions r
  WHERE r.id = p_region_id AND r.deleted_at IS NULL
$$;


comment ON function public.get_region_bbox_by_id (UUID) IS 'Returns header + precomputed bbox and center for a region id. Minimal payload for instant map fit.';


-- 6) RPC: Header + properties (JSON) by id in a single roundtrip
CREATE OR REPLACE FUNCTION public.get_region_header_and_properties_by_id (p_region_id UUID) returns TABLE (
  id UUID,
  name TEXT,
  level region_level,
  parent_id UUID,
  properties JSONB
) language sql stable security invoker
SET
  search_path = public AS $$
  SELECT
    r.id,
    r.name,
    r.level,
    r.parent_id,
    (
      SELECT COALESCE(jsonb_object_agg(rp.key, rp.value), '{}'::jsonb)
      FROM public.region_properties rp
      WHERE rp.region_id = r.id AND rp.deleted_at IS NULL
    ) AS properties
  FROM public.regions r
  WHERE r.id = p_region_id AND r.deleted_at IS NULL
$$;


comment ON function public.get_region_header_and_properties_by_id (UUID) IS 'Returns region header plus properties as a single JSON object.';


-- 7) RPC: List languages for a region, optionally including descendants (deduped)
CREATE OR REPLACE FUNCTION public.list_languages_for_region (
  p_region_id UUID,
  p_include_descendants BOOLEAN DEFAULT TRUE
) returns TABLE (id UUID, name TEXT, level language_entity_level) language sql stable security invoker
SET
  search_path = public AS $$
  WITH RECURSIVE region_tree AS (
    SELECT id FROM public.regions WHERE id = p_region_id AND deleted_at IS NULL
    UNION ALL
    SELECT r.id
    FROM public.regions r
    JOIN region_tree rt ON r.parent_id = rt.id
    WHERE p_include_descendants AND r.deleted_at IS NULL
  )
  SELECT DISTINCT le.id, le.name, le.level
  FROM region_tree rt
  JOIN public.language_entities_regions ler
    ON ler.region_id = rt.id AND ler.deleted_at IS NULL
  JOIN public.language_entities le
    ON le.id = ler.language_entity_id AND le.deleted_at IS NULL
  ORDER BY le.name
$$;


comment ON function public.list_languages_for_region (UUID, BOOLEAN) IS 'Returns distinct languages linked to a region; can include descendants with p_include_descendants.';


-- 8) RPC: Get simplified boundary for overlay (precomputed or on-the-fly)
CREATE OR REPLACE FUNCTION public.get_region_boundary_simplified_by_id (
  p_region_id UUID,
  p_tolerance DOUBLE PRECISION DEFAULT NULL
) returns TABLE (boundary geometry (multipolygon, 4326)) language sql stable security invoker
SET
  search_path = public AS $$
  SELECT
    CASE
      WHEN p_tolerance IS NULL THEN COALESCE(r.boundary_simplified, r.boundary)
      ELSE ST_SimplifyPreserveTopology(r.boundary, p_tolerance)
    END AS boundary
  FROM public.regions r
  WHERE r.id = p_region_id AND r.deleted_at IS NULL AND r.boundary IS NOT NULL
$$;


comment ON function public.get_region_boundary_simplified_by_id (UUID, DOUBLE PRECISION) IS 'Returns a simplified multipolygon boundary. Uses precomputed simplified geometry unless a custom tolerance is provided.';


-- 9) RPC: Minimal selection by point -> header + bbox + center (no geometry)
CREATE OR REPLACE FUNCTION public.get_region_minimal_by_point (
  lon DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  lookup_level region_level DEFAULT 'country'
) returns TABLE (
  id UUID,
  name TEXT,
  level region_level,
  parent_id UUID,
  min_lon DOUBLE PRECISION,
  min_lat DOUBLE PRECISION,
  max_lon DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  center_lon DOUBLE PRECISION,
  center_lat DOUBLE PRECISION
) language sql stable security invoker
SET
  search_path = public AS $$
  WITH pt AS (
    SELECT ST_SetSRID(ST_MakePoint(lon, lat), 4326) AS geom
  )
  SELECT
    r.id,
    r.name,
    r.level,
    r.parent_id,
    r.bbox_min_lon AS min_lon,
    r.bbox_min_lat AS min_lat,
    r.bbox_max_lon AS max_lon,
    r.bbox_max_lat AS max_lat,
    r.center_lon,
    r.center_lat
  FROM public.regions r
  JOIN pt ON ST_Intersects(r.boundary, pt.geom)
  WHERE r.level = lookup_level
    AND r.deleted_at IS NULL
    AND r.boundary IS NOT NULL
  ORDER BY ST_Area(r.boundary) ASC
  LIMIT 1
$$;


comment ON function public.get_region_minimal_by_point (DOUBLE PRECISION, DOUBLE PRECISION, region_level) IS 'Point-in-polygon selection returning header + precomputed bbox/center for instant map fit.';
