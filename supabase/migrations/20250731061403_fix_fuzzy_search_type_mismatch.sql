-- Fix Fuzzy Search Type Mismatch
-- This migration fixes the type mismatch between real and double precision
-- in the fuzzy search functions
-- ============================================================================
-- ============================================================================
-- FIX LANGUAGE FUZZY SEARCH FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION search_language_aliases (
  search_query TEXT,
  max_results INTEGER DEFAULT 50,
  min_similarity DOUBLE PRECISION DEFAULT 0.1
) returns TABLE (
  -- Search metadata
  total_found INTEGER,
  max_limit_hit BOOLEAN,
  similarity_threshold_used DOUBLE PRECISION,
  -- Alias data
  alias_id UUID,
  alias_name TEXT,
  alias_similarity_score DOUBLE PRECISION,
  -- Language entity data
  entity_id UUID,
  entity_name TEXT,
  entity_level TEXT,
  entity_parent_id UUID
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

  -- Get count to check if we hit the limit
  SELECT COUNT(*) INTO result_count
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
    
    SELECT COUNT(*) INTO result_count
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

  -- Return the results
  RETURN QUERY
  SELECT 
    -- Metadata
    result_count as total_found,
    (result_count > max_results) as max_limit_hit,
    similarity_threshold as similarity_threshold_used,
    
    -- Alias data
    la.id as alias_id,
    la.alias_name,
    GREATEST(
      similarity(la.alias_name, search_query)::double precision,
      similarity(le.name, search_query)::double precision
    ) as alias_similarity_score,
    
    -- Entity data
    le.id as entity_id,
    le.name as entity_name,
    le.level::text as entity_level,
    le.parent_id as entity_parent_id

  FROM language_aliases la
  JOIN language_entities le ON la.language_entity_id = le.id
  WHERE la.deleted_at IS NULL 
    AND le.deleted_at IS NULL
    AND (la.alias_name % search_query OR le.name % search_query)
    AND GREATEST(
      similarity(la.alias_name, search_query)::double precision,
      similarity(le.name, search_query)::double precision
    ) >= similarity_threshold
  ORDER BY 
    GREATEST(
      similarity(la.alias_name, search_query)::double precision,
      similarity(le.name, search_query)::double precision
    ) DESC,
    le.level ASC,  -- Prefer 'language' over 'dialect'
    le.name ASC
  LIMIT max_results;
END;
$$;


-- ============================================================================
-- FIX REGION FUZZY SEARCH FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION search_region_aliases (
  search_query TEXT,
  max_results INTEGER DEFAULT 50,
  min_similarity DOUBLE PRECISION DEFAULT 0.1
) returns TABLE (
  -- Search metadata
  total_found INTEGER,
  max_limit_hit BOOLEAN,
  similarity_threshold_used DOUBLE PRECISION,
  -- Alias data
  alias_id UUID,
  alias_name TEXT,
  alias_similarity_score DOUBLE PRECISION,
  -- Region data
  region_id UUID,
  region_name TEXT,
  region_level TEXT,
  region_parent_id UUID
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

  -- Get count to check if we hit the limit
  SELECT COUNT(*) INTO result_count
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
    
    SELECT COUNT(*) INTO result_count
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

  -- Return the results
  RETURN QUERY
  SELECT 
    -- Metadata
    result_count as total_found,
    (result_count > max_results) as max_limit_hit,
    similarity_threshold as similarity_threshold_used,
    
    -- Alias data
    ra.id as alias_id,
    ra.alias_name,
    GREATEST(
      similarity(ra.alias_name, search_query)::double precision,
      similarity(r.name, search_query)::double precision
    ) as alias_similarity_score,
    
    -- Region data
    r.id as region_id,
    r.name as region_name,
    r.level::text as region_level,
    r.parent_id as region_parent_id

  FROM region_aliases ra
  JOIN regions r ON ra.region_id = r.id
  WHERE ra.deleted_at IS NULL 
    AND r.deleted_at IS NULL
    AND (ra.alias_name % search_query OR r.name % search_query)
    AND GREATEST(
      similarity(ra.alias_name, search_query)::double precision,
      similarity(r.name, search_query)::double precision
    ) >= similarity_threshold
  ORDER BY 
    GREATEST(
      similarity(ra.alias_name, search_query)::double precision,
      similarity(r.name, search_query)::double precision
    ) DESC,
    r.level ASC,  -- Prefer higher-level regions
    r.name ASC
  LIMIT max_results;
END;
$$;
