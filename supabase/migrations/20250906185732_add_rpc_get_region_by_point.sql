-- RPC: get_region_by_point
-- Returns the region at the specified level (default 'country') that covers a lon/lat point.
-- Uses PostGIS spatial index on regions.boundary.
CREATE OR REPLACE FUNCTION public.get_region_by_point (
  lon DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  lookup_level region_level DEFAULT 'country',
  include_geometry BOOLEAN DEFAULT FALSE
) returns TABLE (
  id UUID,
  name TEXT,
  level region_level,
  parent_id UUID,
  boundary geometry (multipolygon, 4326)
) language sql stable AS $$
  WITH pt AS (
    SELECT ST_SetSRID(ST_MakePoint(lon, lat), 4326) AS geom
  )
  SELECT
    r.id,
    r.name,
    r.level,
    r.parent_id,
    CASE WHEN include_geometry THEN r.boundary ELSE NULL END AS boundary
  FROM regions r
  JOIN pt ON ST_Intersects(r.boundary, pt.geom)
  WHERE r.level = lookup_level
    AND r.deleted_at IS NULL
    AND r.boundary IS NOT NULL
  ORDER BY ST_Area(r.boundary) ASC
  LIMIT 1;
$$;


comment ON function public.get_region_by_point (
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  region_level,
  BOOLEAN
) IS 'Returns the single region at the requested level (default country) that covers a lon/lat point. Optionally include multipolygon geometry.';
