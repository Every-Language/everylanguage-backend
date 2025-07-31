-- Optimize Fuzzy Search Performance and Fix Alias Matching
-- This migration creates highly optimized fuzzy search functions with:
-- 1. No expensive count calculations (performance)
-- 2. LEFT JOIN instead of correlated subqueries (performance) 
-- 3. Entity name tiebreaker logic (accuracy)
-- 4. Streamlined query structure (performance)
-- ============================================================================
-- ============================================================================
-- HIGHLY OPTIMIZED LANGUAGE SEARCH FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION search_language_aliases (
  search_query TEXT,
  max_results INTEGER DEFAULT 30, -- Smaller default for mobile
  min_similarity DOUBLE PRECISION DEFAULT 0.1,
  include_regions BOOLEAN DEFAULT FALSE
) returns TABLE (
  -- Streamlined return structure (no expensive metadata)
  similarity_threshold_used DOUBLE PRECISION,
  -- Best alias data
  alias_id UUID,
  alias_name TEXT,
  alias_similarity_score DOUBLE PRECISION,
  -- Language entity data
  entity_id UUID,
  entity_name TEXT,
  entity_level TEXT,
  entity_parent_id UUID,
  -- Optional region data (efficient LEFT JOIN aggregation)
  regions JSONB
) language plpgsql security definer
SET
  search_path = public AS $$
DECLARE
  similarity_threshold double precision;
BEGIN
  -- Validate input
  IF length(trim(search_query)) < 2 THEN
    RETURN;
  END IF;

  -- Optimized threshold (less aggressive for better recall)
  CASE 
    WHEN length(trim(search_query)) >= 8 THEN
      similarity_threshold := GREATEST(min_similarity, 0.15);
    WHEN length(trim(search_query)) >= 5 THEN  
      similarity_threshold := GREATEST(min_similarity, 0.25);
    WHEN length(trim(search_query)) >= 3 THEN
      similarity_threshold := GREATEST(min_similarity, 0.35);
    ELSE
      similarity_threshold := GREATEST(min_similarity, 0.45);
  END CASE;

  -- Highly optimized query with LEFT JOIN for regions
  RETURN QUERY
  WITH ranked_aliases AS (
    SELECT 
      la.id as alias_id,
      la.alias_name,
      similarity(la.alias_name, search_query)::double precision as alias_similarity_score,
      le.id as entity_id,
      le.name as entity_name,
      le.level::text as entity_level,
      le.parent_id as entity_parent_id,
      -- Efficient ranking with entity name tiebreaker
      ROW_NUMBER() OVER (
        PARTITION BY le.id 
        ORDER BY 
          similarity(la.alias_name, search_query)::double precision DESC,
          -- TIEBREAKER: Entity name similarity (only calculated when needed)
          similarity(le.name, search_query)::double precision DESC,
          la.alias_name ASC  -- Final consistent tie-breaker
      ) as rn
    FROM language_aliases la
    JOIN language_entities le ON la.language_entity_id = le.id
    WHERE la.deleted_at IS NULL 
      AND le.deleted_at IS NULL
      AND la.alias_name % search_query
      AND similarity(la.alias_name, search_query)::double precision >= similarity_threshold
  )
  SELECT 
    similarity_threshold as similarity_threshold_used,
    ra.alias_id,
    ra.alias_name,
    ra.alias_similarity_score,
    ra.entity_id,
    ra.entity_name,
    ra.entity_level,
    ra.entity_parent_id,
    -- Efficient region aggregation with LEFT JOIN (only when requested)
    CASE 
      WHEN include_regions THEN 
        COALESCE(region_data.regions, '[]'::jsonb)
      ELSE NULL
    END as regions
  FROM ranked_aliases ra
  LEFT JOIN LATERAL (
    -- Optimized region lookup (only executes when include_regions = true)
    SELECT jsonb_agg(
      jsonb_build_object(
        'region_id', reg.id,
        'region_name', reg.name,
        'region_level', reg.level,
        'region_parent_id', reg.parent_id,
        'dominance_level', ler.dominance_level
      )
      ORDER BY ler.dominance_level DESC, reg.name ASC
    ) as regions
    FROM language_entities_regions ler
    JOIN regions reg ON ler.region_id = reg.id
    WHERE ler.language_entity_id = ra.entity_id
      AND ler.deleted_at IS NULL
      AND reg.deleted_at IS NULL
      AND include_regions = true  -- Only execute when needed
  ) region_data ON include_regions = true
  WHERE ra.rn = 1  -- Best alias per entity
  ORDER BY 
    ra.alias_similarity_score DESC,
    ra.entity_name ASC
  LIMIT max_results;
END;
$$;


-- ============================================================================
-- HIGHLY OPTIMIZED REGION SEARCH FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION search_region_aliases (
  search_query TEXT,
  max_results INTEGER DEFAULT 30, -- Smaller default for mobile
  min_similarity DOUBLE PRECISION DEFAULT 0.1,
  include_languages BOOLEAN DEFAULT FALSE
) returns TABLE (
  -- Streamlined return structure (no expensive metadata)
  similarity_threshold_used DOUBLE PRECISION,
  -- Best alias data
  alias_id UUID,
  alias_name TEXT,
  alias_similarity_score DOUBLE PRECISION,
  -- Region data
  region_id UUID,
  region_name TEXT,
  region_level TEXT,
  region_parent_id UUID,
  -- Optional language data (efficient LEFT JOIN aggregation)
  languages JSONB
) language plpgsql security definer
SET
  search_path = public AS $$
DECLARE
  similarity_threshold double precision;
BEGIN
  -- Validate input
  IF length(trim(search_query)) < 2 THEN
    RETURN;
  END IF;

  -- Optimized threshold (less aggressive for better recall)
  CASE 
    WHEN length(trim(search_query)) >= 8 THEN
      similarity_threshold := GREATEST(min_similarity, 0.15);
    WHEN length(trim(search_query)) >= 5 THEN  
      similarity_threshold := GREATEST(min_similarity, 0.25);
    WHEN length(trim(search_query)) >= 3 THEN
      similarity_threshold := GREATEST(min_similarity, 0.35);
    ELSE
      similarity_threshold := GREATEST(min_similarity, 0.45);
  END CASE;

  -- Highly optimized query with LEFT JOIN for languages
  RETURN QUERY
  WITH ranked_aliases AS (
    SELECT 
      ra.id as alias_id,
      ra.alias_name,
      similarity(ra.alias_name, search_query)::double precision as alias_similarity_score,
      r.id as region_id,
      r.name as region_name,
      r.level::text as region_level,
      r.parent_id as region_parent_id,
      -- Efficient ranking with region name tiebreaker
      ROW_NUMBER() OVER (
        PARTITION BY r.id 
        ORDER BY 
          similarity(ra.alias_name, search_query)::double precision DESC,
          -- TIEBREAKER: Region name similarity (only calculated when needed)
          similarity(r.name, search_query)::double precision DESC,
          ra.alias_name ASC  -- Final consistent tie-breaker
      ) as rn
    FROM region_aliases ra
    JOIN regions r ON ra.region_id = r.id
    WHERE ra.deleted_at IS NULL 
      AND r.deleted_at IS NULL
      AND ra.alias_name % search_query
      AND similarity(ra.alias_name, search_query)::double precision >= similarity_threshold
  )
  SELECT 
    similarity_threshold as similarity_threshold_used,
    ra.alias_id,
    ra.alias_name,
    ra.alias_similarity_score,
    ra.region_id,
    ra.region_name,
    ra.region_level,
    ra.region_parent_id,
    -- Efficient language aggregation with LEFT JOIN (only when requested)
    CASE 
      WHEN include_languages THEN 
        COALESCE(language_data.languages, '[]'::jsonb)
      ELSE NULL
    END as languages
  FROM ranked_aliases ra
  LEFT JOIN LATERAL (
    -- Optimized language lookup (only executes when include_languages = true)
    SELECT jsonb_agg(
      jsonb_build_object(
        'entity_id', le.id,
        'entity_name', le.name,
        'entity_level', le.level,
        'entity_parent_id', le.parent_id,
        'dominance_level', ler.dominance_level
      )
      ORDER BY ler.dominance_level DESC, le.name ASC
    ) as languages
    FROM language_entities_regions ler
    JOIN language_entities le ON ler.language_entity_id = le.id
    WHERE ler.region_id = ra.region_id
      AND ler.deleted_at IS NULL
      AND le.deleted_at IS NULL
      AND include_languages = true  -- Only execute when needed
  ) language_data ON include_languages = true
  WHERE ra.rn = 1  -- Best alias per region
  ORDER BY 
    ra.alias_similarity_score DESC,
    ra.region_name ASC
  LIMIT max_results;
END;
$$;
