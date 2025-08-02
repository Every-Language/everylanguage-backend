-- Enable Fuzzy Search System
-- This migration sets up comprehensive fuzzy search for languages and regions
-- with pg_trgm extension, optimized indexes, and search functions
-- ============================================================================
-- ============================================================================
-- ENABLE EXTENSIONS
-- ============================================================================
-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION if NOT EXISTS pg_trgm;


-- ============================================================================
-- TRIGRAM INDEXES FOR FUZZY SEARCH
-- ============================================================================
-- Language aliases fuzzy search index
CREATE INDEX if NOT EXISTS language_aliases_alias_name_trgm_idx ON language_aliases USING gin (alias_name gin_trgm_ops)
WHERE
  deleted_at IS NULL;


-- Language entities name fuzzy search index  
CREATE INDEX if NOT EXISTS language_entities_name_trgm_idx ON language_entities USING gin (name gin_trgm_ops)
WHERE
  deleted_at IS NULL;


-- Region aliases fuzzy search index
CREATE INDEX if NOT EXISTS region_aliases_alias_name_trgm_idx ON region_aliases USING gin (alias_name gin_trgm_ops)
WHERE
  deleted_at IS NULL;


-- Region name fuzzy search index
CREATE INDEX if NOT EXISTS regions_name_trgm_idx ON regions USING gin (name gin_trgm_ops)
WHERE
  deleted_at IS NULL;


-- ============================================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- ============================================================================
-- Optimize hierarchy queries
CREATE INDEX if NOT EXISTS language_entities_parent_id_idx ON language_entities (parent_id)
WHERE
  deleted_at IS NULL;


CREATE INDEX if NOT EXISTS regions_parent_id_idx ON regions (parent_id)
WHERE
  deleted_at IS NULL;


-- Optimize related data queries  
CREATE INDEX if NOT EXISTS text_versions_language_entity_id_idx ON text_versions (language_entity_id)
WHERE
  deleted_at IS NULL;


CREATE INDEX if NOT EXISTS audio_versions_language_entity_id_idx ON audio_versions (language_entity_id)
WHERE
  deleted_at IS NULL;


-- ============================================================================
-- LANGUAGE FUZZY SEARCH FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION search_language_aliases (
  search_query TEXT,
  max_results INTEGER DEFAULT 50,
  min_similarity FLOAT DEFAULT 0.1
) returns TABLE (
  -- Search metadata
  total_found INTEGER,
  max_limit_hit BOOLEAN,
  similarity_threshold_used FLOAT,
  -- Alias data
  alias_id UUID,
  alias_name TEXT,
  alias_similarity_score FLOAT,
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
  similarity_threshold float;
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
      similarity(la.alias_name, search_query),
      similarity(le.name, search_query)
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
        similarity(la.alias_name, search_query),
        similarity(le.name, search_query)
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
      similarity(la.alias_name, search_query),
      similarity(le.name, search_query)
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
      similarity(la.alias_name, search_query),
      similarity(le.name, search_query)
    ) >= similarity_threshold
  ORDER BY 
    GREATEST(
      similarity(la.alias_name, search_query),
      similarity(le.name, search_query)
    ) DESC,
    le.level ASC,  -- Prefer 'language' over 'dialect'
    le.name ASC
  LIMIT max_results;
END;
$$;


-- ============================================================================
-- REGION FUZZY SEARCH FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION search_region_aliases (
  search_query TEXT,
  max_results INTEGER DEFAULT 50,
  min_similarity FLOAT DEFAULT 0.1
) returns TABLE (
  -- Search metadata
  total_found INTEGER,
  max_limit_hit BOOLEAN,
  similarity_threshold_used FLOAT,
  -- Alias data
  alias_id UUID,
  alias_name TEXT,
  alias_similarity_score FLOAT,
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
  similarity_threshold float;
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
      similarity(ra.alias_name, search_query),
      similarity(r.name, search_query)
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
        similarity(ra.alias_name, search_query),
        similarity(r.name, search_query)
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
      similarity(ra.alias_name, search_query),
      similarity(r.name, search_query)
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
      similarity(ra.alias_name, search_query),
      similarity(r.name, search_query)
    ) >= similarity_threshold
  ORDER BY 
    GREATEST(
      similarity(ra.alias_name, search_query),
      similarity(r.name, search_query)
    ) DESC,
    r.level ASC,  -- Prefer higher-level regions
    r.name ASC
  LIMIT max_results;
END;
$$;


-- ============================================================================
-- HIERARCHY NAVIGATION FUNCTIONS
-- ============================================================================
-- Get language entity hierarchy (ancestors and descendants)
CREATE OR REPLACE FUNCTION get_language_entity_hierarchy (
  entity_id UUID,
  generations_up INTEGER DEFAULT 3,
  generations_down INTEGER DEFAULT 3
) returns TABLE (
  hierarchy_entity_id UUID,
  hierarchy_entity_name TEXT,
  hierarchy_entity_level TEXT,
  hierarchy_parent_id UUID,
  relationship_type TEXT, -- 'self', 'ancestor', 'descendant', 'sibling'
  generation_distance INTEGER -- 0 for self, negative for ancestors, positive for descendants
) language plpgsql security definer
SET
  search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE hierarchy AS (
    -- Self (starting point)
    SELECT 
      le.id,
      le.name,
      le.level::text,
      le.parent_id,
      'self'::text as rel_type,
      0 as gen_distance
    FROM language_entities le
    WHERE le.id = entity_id AND le.deleted_at IS NULL
    
    UNION ALL
    
    -- Ancestors (going up)
    SELECT 
      parent.id,
      parent.name,
      parent.level::text,
      parent.parent_id,
      'ancestor'::text as rel_type,
      h.gen_distance - 1
    FROM language_entities parent
    JOIN hierarchy h ON parent.id = h.parent_id
    WHERE parent.deleted_at IS NULL 
      AND h.gen_distance > -generations_up
    
    UNION ALL
    
    -- Descendants (going down)  
    SELECT 
      child.id,
      child.name,
      child.level::text,
      child.parent_id,
      'descendant'::text as rel_type,
      h.gen_distance + 1
    FROM language_entities child
    JOIN hierarchy h ON child.parent_id = h.id
    WHERE child.deleted_at IS NULL 
      AND h.gen_distance < generations_down
  ),
  siblings AS (
    -- Get siblings (same parent, different entity)
    SELECT 
      sibling.id,
      sibling.name,
      sibling.level::text,
      sibling.parent_id,
      'sibling'::text as rel_type,
      0 as gen_distance
    FROM language_entities target
    JOIN language_entities sibling ON sibling.parent_id = target.parent_id
    WHERE target.id = entity_id 
      AND sibling.id != entity_id
      AND target.deleted_at IS NULL 
      AND sibling.deleted_at IS NULL
      AND target.parent_id IS NOT NULL
  )
  SELECT 
    h.id as hierarchy_entity_id,
    h.name as hierarchy_entity_name,
    h.level as hierarchy_entity_level,
    h.parent_id as hierarchy_parent_id,
    h.rel_type as relationship_type,
    h.gen_distance as generation_distance
  FROM hierarchy h
  UNION ALL
  SELECT 
    s.id as hierarchy_entity_id,
    s.name as hierarchy_entity_name,
    s.level as hierarchy_entity_level,
    s.parent_id as hierarchy_parent_id,
    s.rel_type as relationship_type,
    s.gen_distance as generation_distance
  FROM siblings s
  ORDER BY generation_distance ASC, hierarchy_entity_name ASC;
END;
$$;


-- Get region hierarchy (ancestors and descendants)
CREATE OR REPLACE FUNCTION get_region_hierarchy (
  region_id UUID,
  generations_up INTEGER DEFAULT 3,
  generations_down INTEGER DEFAULT 3
) returns TABLE (
  hierarchy_region_id UUID,
  hierarchy_region_name TEXT,
  hierarchy_region_level TEXT,
  hierarchy_parent_id UUID,
  relationship_type TEXT, -- 'self', 'ancestor', 'descendant', 'sibling'
  generation_distance INTEGER -- 0 for self, negative for ancestors, positive for descendants
) language plpgsql security definer
SET
  search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE hierarchy AS (
    -- Self (starting point)
    SELECT 
      r.id,
      r.name,
      r.level::text,
      r.parent_id,
      'self'::text as rel_type,
      0 as gen_distance
    FROM regions r
    WHERE r.id = region_id AND r.deleted_at IS NULL
    
    UNION ALL
    
    -- Ancestors (going up)
    SELECT 
      parent.id,
      parent.name,
      parent.level::text,
      parent.parent_id,
      'ancestor'::text as rel_type,
      h.gen_distance - 1
    FROM regions parent
    JOIN hierarchy h ON parent.id = h.parent_id
    WHERE parent.deleted_at IS NULL 
      AND h.gen_distance > -generations_up
    
    UNION ALL
    
    -- Descendants (going down)  
    SELECT 
      child.id,
      child.name,
      child.level::text,
      child.parent_id,
      'descendant'::text as rel_type,
      h.gen_distance + 1
    FROM regions child
    JOIN hierarchy h ON child.parent_id = h.id
    WHERE child.deleted_at IS NULL 
      AND h.gen_distance < generations_down
  ),
  siblings AS (
    -- Get siblings (same parent, different region)
    SELECT 
      sibling.id,
      sibling.name,
      sibling.level::text,
      sibling.parent_id,
      'sibling'::text as rel_type,
      0 as gen_distance
    FROM regions target
    JOIN regions sibling ON sibling.parent_id = target.parent_id
    WHERE target.id = region_id 
      AND sibling.id != region_id
      AND target.deleted_at IS NULL 
      AND sibling.deleted_at IS NULL
      AND target.parent_id IS NOT NULL
  )
  SELECT 
    h.id as hierarchy_region_id,
    h.name as hierarchy_region_name,
    h.level as hierarchy_region_level,
    h.parent_id as hierarchy_parent_id,
    h.rel_type as relationship_type,
    h.gen_distance as generation_distance
  FROM hierarchy h
  UNION ALL
  SELECT 
    s.id as hierarchy_region_id,
    s.name as hierarchy_region_name,
    s.level as hierarchy_region_level,
    s.parent_id as hierarchy_parent_id,
    s.rel_type as relationship_type,
    s.gen_distance as generation_distance
  FROM siblings s
  ORDER BY generation_distance ASC, hierarchy_region_name ASC;
END;
$$;
