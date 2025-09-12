-- Ensure refresh function outputs MultiPolygon consistently
CREATE OR REPLACE FUNCTION public.refresh_region_spatial_cache (p_region_id UUID) returns void language plpgsql security invoker
SET
  search_path = public AS $$
DECLARE
  g geometry(MULTIPOLYGON, 4326);
  raw geometry(Geometry, 4326);
  pt geometry(POINT, 4326);
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

  -- Normalize to MultiPolygon
  g := ST_Multi(ST_CollectionExtract(raw, 3));

  pt := ST_PointOnSurface(g);

  UPDATE public.regions
  SET bbox_min_lon = ST_XMin(g),
      bbox_min_lat = ST_YMin(g),
      bbox_max_lon = ST_XMax(g),
      bbox_max_lat = ST_YMax(g),
      center_lon = ST_X(pt),
      center_lat = ST_Y(pt),
      boundary_simplified = ST_Multi(ST_SimplifyPreserveTopology(g, 0.02))
  WHERE id = p_region_id;
END;
$$;
