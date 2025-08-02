-- Replace Fuzzy Search Functions with Improved Deduplicated Versions
-- This migration replaces the original functions with improved versions that include:
-- - Server-side deduplication (one result per entity)
-- - Optional related data (regions for languages, languages for regions)
-- ============================================================================
-- ============================================================================
-- IMPROVED LANGUAGE SEARCH FUNCTION (REPLACES ORIGINAL)
-- ============================================================================
CREATE OR REPLACE FUNCTION search_language_aliases (
  search_query TEXT,
  max_results INTEGER DEFAULT 50,
  min_similarity DOUBLE PRECISION DEFAULT 0.1,
  include_regions BOOLEAN DEFAULT FALSE
) returns TABLE (
  -- Search metadata
  total_found INTEGER,
  max_limit_hit BOOLEAN,
  similarity_threshold_used DOUBLE PRECISION,
  -- Best alias data (highest scoring alias for each entity)
  alias_id UUID,
  alias_name TEXT,
  alias_similarity_score DOUBLE PRECISION,
  -- Language entity data
  entity_id UUID,
  entity_name TEXT,
  entity_level TEXT,
  entity_parent_id UUID,
  -- Optional region data (JSON array)
  regions JSONB
) language plpgsql security definer
SET
  search_path = public AS $$
DECLARE
  result_count integer;
  similarity_threshold double precision;
BEGIN
  -- Validate input
  IF length(trim(search_query)) < 2 THEN
    RETURN;
  END IF;

  -- Dynamic similarity threshold based on query length
  CASE 
    WHEN length(trim(search_query)) >= 8 THEN
      similarity_threshold := GREATEST(min_similarity, 0.15);
    WHEN length(trim(search_query)) >= 5 THEN  
      similarity_threshold := GREATEST(min_similarity, 0.25);
    ELSE
      similarity_threshold := GREATEST(min_similarity, 0.35);
  END CASE;

  -- Get count to check if we hit the limit (count unique entities, not aliases)
  SELECT COUNT(DISTINCT le.id) INTO result_count
  FROM language_aliases la
  JOIN language_entities le ON la.language_entity_id = le.id
  WHERE la.deleted_at IS NULL 
    AND le.deleted_at IS NULL
    AND (la.alias_name % search_query OR le.name % search_query)
    AND GREATEST(
      similarity(la.alias_name, search_query)::double precision,
      similarity(le.name, search_query)::double precision
    ) >= similarity_threshold;

  -- Adjust threshold if we have too many results
  WHILE result_count > max_results AND similarity_threshold < 0.7 LOOP
    similarity_threshold := similarity_threshold + 0.1;
    
    SELECT COUNT(DISTINCT le.id) INTO result_count
    FROM language_aliases la
    JOIN language_entities le ON la.language_entity_id = le.id
    WHERE la.deleted_at IS NULL 
      AND le.deleted_at IS NULL
      AND (la.alias_name % search_query OR le.name % search_query)
      AND GREATEST(
        similarity(la.alias_name, search_query)::double precision,
        similarity(le.name, search_query)::double precision
      ) >= similarity_threshold;
  END LOOP;

  -- Return results with optional region data
  RETURN QUERY
  WITH ranked_matches AS (
    SELECT 
      la.id as alias_id,
      la.alias_name,
      GREATEST(
        similarity(la.alias_name, search_query)::double precision,
        similarity(le.name, search_query)::double precision
      ) as alias_similarity_score,
      le.id as entity_id,
      le.name as entity_name,
      le.level::text as entity_level,
      le.parent_id as entity_parent_id,
      ROW_NUMBER() OVER (
        PARTITION BY le.id 
        ORDER BY GREATEST(
          similarity(la.alias_name, search_query)::double precision,
          similarity(le.name, search_query)::double precision
        ) DESC,
        la.alias_name ASC  -- Tie-breaker for consistent results
      ) as rn
    FROM language_aliases la
    JOIN language_entities le ON la.language_entity_id = le.id
    WHERE la.deleted_at IS NULL 
      AND le.deleted_at IS NULL
      AND (la.alias_name % search_query OR le.name % search_query)
      AND GREATEST(
        similarity(la.alias_name, search_query)::double precision,
        similarity(le.name, search_query)::double precision
      ) >= similarity_threshold
  ),
  results_with_regions AS (
    SELECT 
      r.*,
      CASE 
        WHEN include_regions THEN
          COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'region_id', reg.id,
                  'region_name', reg.name,
                  'region_level', reg.level,
                  'region_parent_id', reg.parent_id,
                  'dominance_level', ler.dominance_level
                )
                ORDER BY ler.dominance_level DESC, reg.name ASC
              )
              FROM language_entities_regions ler
              JOIN regions reg ON ler.region_id = reg.id
              WHERE ler.language_entity_id = r.entity_id
                AND ler.deleted_at IS NULL
                AND reg.deleted_at IS NULL
            ),
            '[]'::jsonb
          )
        ELSE NULL
      END as regions
    FROM ranked_matches r
    WHERE r.rn = 1
  )
  SELECT 
    result_count as total_found,
    (result_count > max_results) as max_limit_hit,
    similarity_threshold as similarity_threshold_used,
    rwr.alias_id,
    rwr.alias_name,
    rwr.alias_similarity_score,
    rwr.entity_id,
    rwr.entity_name,
    rwr.entity_level,
    rwr.entity_parent_id,
    rwr.regions
  FROM results_with_regions rwr
  ORDER BY 
    rwr.alias_similarity_score DESC,
    rwr.entity_level ASC,  -- Prefer 'language' over 'dialect'
    rwr.entity_name ASC
  LIMIT max_results;
END;
$$;


-- ============================================================================
-- IMPROVED REGION SEARCH FUNCTION (REPLACES ORIGINAL)
-- ============================================================================
CREATE OR REPLACE FUNCTION search_region_aliases (
  search_query TEXT,
  max_results INTEGER DEFAULT 50,
  min_similarity DOUBLE PRECISION DEFAULT 0.1,
  include_languages BOOLEAN DEFAULT FALSE
) returns TABLE (
  -- Search metadata
  total_found INTEGER,
  max_limit_hit BOOLEAN,
  similarity_threshold_used DOUBLE PRECISION,
  -- Best alias data (highest scoring alias for each region)
  alias_id UUID,
  alias_name TEXT,
  alias_similarity_score DOUBLE PRECISION,
  -- Region data
  region_id UUID,
  region_name TEXT,
  region_level TEXT,
  region_parent_id UUID,
  -- Optional language data (JSON array)
  languages JSONB
) language plpgsql security definer
SET
  search_path = public AS $$
DECLARE
  result_count integer;
  similarity_threshold double precision;
BEGIN
  -- Validate input
  IF length(trim(search_query)) < 2 THEN
    RETURN;
  END IF;

  -- Dynamic similarity threshold based on query length
  CASE 
    WHEN length(trim(search_query)) >= 8 THEN
      similarity_threshold := GREATEST(min_similarity, 0.15);
    WHEN length(trim(search_query)) >= 5 THEN  
      similarity_threshold := GREATEST(min_similarity, 0.25);
    ELSE
      similarity_threshold := GREATEST(min_similarity, 0.35);
  END CASE;

  -- Get count to check if we hit the limit (count unique regions, not aliases)
  SELECT COUNT(DISTINCT r.id) INTO result_count
  FROM region_aliases ra
  JOIN regions r ON ra.region_id = r.id
  WHERE ra.deleted_at IS NULL 
    AND r.deleted_at IS NULL
    AND (ra.alias_name % search_query OR r.name % search_query)
    AND GREATEST(
      similarity(ra.alias_name, search_query)::double precision,
      similarity(r.name, search_query)::double precision
    ) >= similarity_threshold;

  -- Adjust threshold if we have too many results
  WHILE result_count > max_results AND similarity_threshold < 0.7 LOOP
    similarity_threshold := similarity_threshold + 0.1;
    
    SELECT COUNT(DISTINCT r.id) INTO result_count
    FROM region_aliases ra
    JOIN regions r ON ra.region_id = r.id
    WHERE ra.deleted_at IS NULL 
      AND r.deleted_at IS NULL
      AND (ra.alias_name % search_query OR r.name % search_query)
      AND GREATEST(
        similarity(ra.alias_name, search_query)::double precision,
        similarity(r.name, search_query)::double precision
      ) >= similarity_threshold;
  END LOOP;

  -- Return results with optional language data
  RETURN QUERY
  WITH ranked_matches AS (
    SELECT 
      ra.id as alias_id,
      ra.alias_name,
      GREATEST(
        similarity(ra.alias_name, search_query)::double precision,
        similarity(r.name, search_query)::double precision
      ) as alias_similarity_score,
      r.id as region_id,
      r.name as region_name,
      r.level::text as region_level,
      r.parent_id as region_parent_id,
      ROW_NUMBER() OVER (
        PARTITION BY r.id 
        ORDER BY GREATEST(
          similarity(ra.alias_name, search_query)::double precision,
          similarity(r.name, search_query)::double precision
        ) DESC,
        ra.alias_name ASC  -- Tie-breaker for consistent results
      ) as rn
    FROM region_aliases ra
    JOIN regions r ON ra.region_id = r.id
    WHERE ra.deleted_at IS NULL 
      AND r.deleted_at IS NULL
      AND (ra.alias_name % search_query OR r.name % search_query)
      AND GREATEST(
        similarity(ra.alias_name, search_query)::double precision,
        similarity(r.name, search_query)::double precision
      ) >= similarity_threshold
  ),
  results_with_languages AS (
    SELECT 
      r.*,
      CASE 
        WHEN include_languages THEN
          COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'entity_id', le.id,
                  'entity_name', le.name,
                  'entity_level', le.level,
                  'entity_parent_id', le.parent_id,
                  'dominance_level', ler.dominance_level
                )
                ORDER BY ler.dominance_level DESC, le.name ASC
              )
              FROM language_entities_regions ler
              JOIN language_entities le ON ler.language_entity_id = le.id
              WHERE ler.region_id = r.region_id
                AND ler.deleted_at IS NULL
                AND le.deleted_at IS NULL
            ),
            '[]'::jsonb
          )
        ELSE NULL
      END as languages
    FROM ranked_matches r
    WHERE r.rn = 1
  )
  SELECT 
    result_count as total_found,
    (result_count > max_results) as max_limit_hit,
    similarity_threshold as similarity_threshold_used,
    rwl.alias_id,
    rwl.alias_name,
    rwl.alias_similarity_score,
    rwl.region_id,
    rwl.region_name,
    rwl.region_level,
    rwl.region_parent_id,
    rwl.languages
  FROM results_with_languages rwl
  ORDER BY 
    rwl.alias_similarity_score DESC,
    rwl.region_level ASC,  -- Prefer higher-level regions
    rwl.region_name ASC
  LIMIT max_results;
END;
$$;
