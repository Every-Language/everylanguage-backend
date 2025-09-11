-- Improve region bbox/center cache:
-- - Use largest contiguous polygon (core landmass) for bbox & center
-- - Compute dateline-aware bbox by comparing normal vs shifted longitudes
-- - Keep simplified boundary based on full geometry for overlays
CREATE OR REPLACE FUNCTION public.refresh_region_spatial_cache (p_region_id UUID) returns void language plpgsql security invoker
SET
  search_path = public AS $$
DECLARE
  raw geometry(Geometry, 4326);
  g geometry(MULTIPOLYGON, 4326);
  core geometry(POLYGON, 4326);
  core_shifted geometry(Geometry, 4326);
  bbox_geom geometry(Geometry, 4326);
  pt geometry(POINT, 4326);
  n_minx DOUBLE PRECISION;
  n_maxx DOUBLE PRECISION;
  s_minx DOUBLE PRECISION;
  s_maxx DOUBLE PRECISION;
  width_n DOUBLE PRECISION;
  width_s DOUBLE PRECISION;
BEGIN
  SELECT boundary INTO raw FROM public.regions WHERE id = p_region_id;

  IF raw IS NULL THEN
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

  -- Normalize to MultiPolygon for consistent processing
  g := ST_Multi(ST_CollectionExtract(raw, 3));

  -- Choose the largest contiguous polygon (by geodesic area) as the core landmass
  SELECT (d.geom)::geometry(POLYGON, 4326)
  INTO core
  FROM (
    SELECT (ST_Dump(g)).geom
  ) AS d
  ORDER BY ST_Area(d.geom::geography) DESC
  LIMIT 1;

  -- Fallback: if something odd happens, use the first polygon of the multipolygon
  IF core IS NULL THEN
    core := ST_GeometryN(g, 1)::geometry(POLYGON, 4326);
  END IF;

  -- Compare normal vs shifted longitudes to get a minimal-width bbox across the antimeridian
  n_minx := ST_XMin(core);
  n_maxx := ST_XMax(core);
  width_n := n_maxx - n_minx;

  core_shifted := ST_ShiftLongitude(core);
  s_minx := ST_XMin(core_shifted);
  s_maxx := ST_XMax(core_shifted);
  width_s := s_maxx - s_minx;

  IF width_s < width_n THEN
    -- Prefer the shifted representation (already in a short-span orientation)
    bbox_geom := core_shifted;
  ELSE
    bbox_geom := core;
  END IF;

  pt := ST_PointOnSurface(bbox_geom);

  -- Normalize outputs to the standard [-180, 180] longitude range
  UPDATE public.regions
  SET bbox_min_lon = CASE
                        WHEN ST_XMin(bbox_geom) > 180 THEN ST_XMin(bbox_geom) - 360
                        WHEN ST_XMin(bbox_geom) < -180 THEN ST_XMin(bbox_geom) + 360
                        ELSE ST_XMin(bbox_geom)
                      END,
      bbox_min_lat = ST_YMin(bbox_geom),
      bbox_max_lon = CASE
                        WHEN ST_XMax(bbox_geom) > 180 THEN ST_XMax(bbox_geom) - 360
                        WHEN ST_XMax(bbox_geom) < -180 THEN ST_XMax(bbox_geom) + 360
                        ELSE ST_XMax(bbox_geom)
                      END,
      bbox_max_lat = ST_YMax(bbox_geom),
      center_lon = CASE
                     WHEN ST_X(pt) > 180 THEN ST_X(pt) - 360
                     WHEN ST_X(pt) < -180 THEN ST_X(pt) + 360
                     ELSE ST_X(pt)
                   END,
      center_lat = ST_Y(pt),
      boundary_simplified = ST_Multi(ST_SimplifyPreserveTopology(g, 0.02))
  WHERE id = p_region_id;
END;
$$;


-- Backfill cache for existing rows using the improved logic
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.regions WHERE boundary IS NOT NULL LOOP
    PERFORM public.refresh_region_spatial_cache(r.id);
  END LOOP;
END $$;
