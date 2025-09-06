-- Fix hierarchy functions to avoid 42P19 recursive CTE error
-- Implements separate recursive CTEs for ancestors (up) and descendants (down)
-- and a non-recursive siblings CTE. Also preserves soft-delete filtering.
-- Replace get_language_entity_hierarchy
CREATE OR REPLACE FUNCTION public.get_language_entity_hierarchy (
  entity_id UUID,
  generations_up INTEGER DEFAULT 3,
  generations_down INTEGER DEFAULT 3
) returns TABLE (
  hierarchy_entity_id UUID,
  hierarchy_entity_name TEXT,
  hierarchy_entity_level TEXT,
  hierarchy_parent_id UUID,
  relationship_type TEXT,
  generation_distance INTEGER
) language plpgsql security definer
SET
  search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE
  self_row AS (
    SELECT le.id, le.name, le.level::text AS level, le.parent_id
    FROM language_entities le
    WHERE le.id = entity_id AND le.deleted_at IS NULL
  ),
  up AS (
    SELECT p.id, p.name, p.level::text AS level, p.parent_id, -1 AS distance
    FROM language_entities p
    JOIN self_row s ON p.id = s.parent_id
    WHERE p.deleted_at IS NULL
  UNION ALL
    SELECT p2.id, p2.name, p2.level::text, p2.parent_id, u.distance - 1
    FROM language_entities p2
    JOIN up u ON p2.id = u.parent_id
    WHERE p2.deleted_at IS NULL
      AND abs(u.distance) < generations_up
  ),
  down AS (
    SELECT c.id, c.name, c.level::text AS level, c.parent_id, 1 AS distance
    FROM language_entities c
    JOIN self_row s ON c.parent_id = s.id
    WHERE c.deleted_at IS NULL
  UNION ALL
    SELECT c2.id, c2.name, c2.level::text, c2.parent_id, d.distance + 1
    FROM language_entities c2
    JOIN down d ON c2.parent_id = d.id
    WHERE c2.deleted_at IS NULL
      AND d.distance < generations_down
  ),
  siblings AS (
    SELECT sib.id, sib.name, sib.level::text AS level, sib.parent_id, 0 AS distance
    FROM language_entities sib
    JOIN self_row s ON sib.parent_id = s.parent_id
    WHERE sib.id <> s.id
      AND sib.deleted_at IS NULL
      AND s.parent_id IS NOT NULL
  )
  SELECT 
    s.id AS hierarchy_entity_id,
    s.name AS hierarchy_entity_name,
    s.level AS hierarchy_entity_level,
    s.parent_id AS hierarchy_parent_id,
    'self'::text AS relationship_type,
    0 AS generation_distance
  FROM self_row s
  UNION ALL
  SELECT 
    u.id AS hierarchy_entity_id,
    u.name AS hierarchy_entity_name,
    u.level AS hierarchy_entity_level,
    u.parent_id AS hierarchy_parent_id,
    'ancestor'::text AS relationship_type,
    u.distance AS generation_distance
  FROM up u
  UNION ALL
  SELECT 
    d.id AS hierarchy_entity_id,
    d.name AS hierarchy_entity_name,
    d.level AS hierarchy_entity_level,
    d.parent_id AS hierarchy_parent_id,
    'descendant'::text AS relationship_type,
    d.distance AS generation_distance
  FROM down d
  UNION ALL
  SELECT 
    b.id AS hierarchy_entity_id,
    b.name AS hierarchy_entity_name,
    b.level AS hierarchy_entity_level,
    b.parent_id AS hierarchy_parent_id,
    'sibling'::text AS relationship_type,
    b.distance AS generation_distance
  FROM siblings b
  ORDER BY generation_distance ASC, hierarchy_entity_name ASC;
END;
$$;


-- Replace get_region_hierarchy
CREATE OR REPLACE FUNCTION public.get_region_hierarchy (
  region_id UUID,
  generations_up INTEGER DEFAULT 3,
  generations_down INTEGER DEFAULT 3
) returns TABLE (
  hierarchy_region_id UUID,
  hierarchy_region_name TEXT,
  hierarchy_region_level TEXT,
  hierarchy_parent_id UUID,
  relationship_type TEXT,
  generation_distance INTEGER
) language plpgsql security definer
SET
  search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE
  self_row AS (
    SELECT r.id, r.name, r.level::text AS level, r.parent_id
    FROM regions r
    WHERE r.id = region_id AND r.deleted_at IS NULL
  ),
  up AS (
    SELECT p.id, p.name, p.level::text AS level, p.parent_id, -1 AS distance
    FROM regions p
    JOIN self_row s ON p.id = s.parent_id
    WHERE p.deleted_at IS NULL
  UNION ALL
    SELECT p2.id, p2.name, p2.level::text, p2.parent_id, u.distance - 1
    FROM regions p2
    JOIN up u ON p2.id = u.parent_id
    WHERE p2.deleted_at IS NULL
      AND abs(u.distance) < generations_up
  ),
  down AS (
    SELECT c.id, c.name, c.level::text AS level, c.parent_id, 1 AS distance
    FROM regions c
    JOIN self_row s ON c.parent_id = s.id
    WHERE c.deleted_at IS NULL
  UNION ALL
    SELECT c2.id, c2.name, c2.level::text, c2.parent_id, d.distance + 1
    FROM regions c2
    JOIN down d ON c2.parent_id = d.id
    WHERE c2.deleted_at IS NULL
      AND d.distance < generations_down
  ),
  siblings AS (
    SELECT sib.id, sib.name, sib.level::text AS level, sib.parent_id, 0 AS distance
    FROM regions sib
    JOIN self_row s ON sib.parent_id = s.parent_id
    WHERE sib.id <> s.id
      AND sib.deleted_at IS NULL
      AND s.parent_id IS NOT NULL
  )
  SELECT 
    s.id AS hierarchy_region_id,
    s.name AS hierarchy_region_name,
    s.level AS hierarchy_region_level,
    s.parent_id AS hierarchy_parent_id,
    'self'::text AS relationship_type,
    0 AS generation_distance
  FROM self_row s
  UNION ALL
  SELECT 
    u.id AS hierarchy_region_id,
    u.name AS hierarchy_region_name,
    u.level AS hierarchy_region_level,
    u.parent_id AS hierarchy_parent_id,
    'ancestor'::text AS relationship_type,
    u.distance AS generation_distance
  FROM up u
  UNION ALL
  SELECT 
    d.id AS hierarchy_region_id,
    d.name AS hierarchy_region_name,
    d.level AS hierarchy_region_level,
    d.parent_id AS hierarchy_parent_id,
    'descendant'::text AS relationship_type,
    d.distance AS generation_distance
  FROM down d
  UNION ALL
  SELECT 
    b.id AS hierarchy_region_id,
    b.name AS hierarchy_region_name,
    b.level AS hierarchy_region_level,
    b.parent_id AS hierarchy_parent_id,
    'sibling'::text AS relationship_type,
    b.distance AS generation_distance
  FROM siblings b
  ORDER BY generation_distance ASC, hierarchy_region_name ASC;
END;
$$;
