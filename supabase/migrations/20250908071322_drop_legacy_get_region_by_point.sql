-- Drop deprecated RPC: get_region_by_point
-- Safe since it has been superseded by get_region_minimal_by_point and others
DROP FUNCTION if EXISTS public.get_region_by_point (
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  region_level,
  BOOLEAN
);
