-- Add Flexible Version-Filtered Language Fuzzy Search
-- This migration creates a flexible fuzzy search function that can filter by:
-- - Audio versions only
-- - Text versions only  
-- - Both audio and text versions required
-- - Either audio or text versions
-- ============================================================================
-- Create enum for version filter types
CREATE TYPE version_filter_type AS ENUM(
  'audio_only',
  'text_only',
  'both_required',
  'either'
);


-- ============================================================================
-- FLEXIBLE VERSION-FILTERED LANGUAGE SEARCH FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION search_language_aliases_with_versions (
  search_query TEXT,
  filter_type version_filter_type DEFAULT 'either',
  max_results INTEGER DEFAULT 30,
  min_similarity DOUBLE PRECISION DEFAULT 0.1,
  include_regions BOOLEAN DEFAULT FALSE
) returns TABLE (
  -- Streamlined return structure
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
  -- Optional region data
  regions JSONB,
  -- Version counts for this language
  audio_version_count INTEGER,
  text_version_count INTEGER
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

  -- Optimized threshold based on query length
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

  -- Flexible query with version filtering
  RETURN QUERY
  WITH language_version_counts AS (
    -- Get version counts for each language entity
    SELECT 
      le.id as entity_id,
      COALESCE(av_counts.audio_count, 0) as audio_version_count,
      COALESCE(tv_counts.text_count, 0) as text_version_count
    FROM language_entities le
    LEFT JOIN (
      SELECT 
        language_entity_id,
        COUNT(*) as audio_count
      FROM audio_versions 
      WHERE deleted_at IS NULL
      GROUP BY language_entity_id
    ) av_counts ON le.id = av_counts.language_entity_id
    LEFT JOIN (
      SELECT 
        language_entity_id,
        COUNT(*) as text_count
      FROM text_versions 
      WHERE deleted_at IS NULL
      GROUP BY language_entity_id
    ) tv_counts ON le.id = tv_counts.language_entity_id
    WHERE le.deleted_at IS NULL
  ),
  filtered_entities AS (
    -- Apply version filtering based on filter_type
    SELECT 
      entity_id,
      audio_version_count,
      text_version_count
    FROM language_version_counts
    WHERE 
      CASE filter_type
        WHEN 'audio_only' THEN audio_version_count > 0
        WHEN 'text_only' THEN text_version_count > 0
        WHEN 'both_required' THEN audio_version_count > 0 AND text_version_count > 0
        WHEN 'either' THEN audio_version_count > 0 OR text_version_count > 0
        ELSE false  -- Fallback case
      END
  ),
  ranked_aliases AS (
    SELECT 
      la.id as alias_id,
      la.alias_name,
      similarity(la.alias_name, search_query)::double precision as alias_similarity_score,
      le.id as entity_id,
      le.name as entity_name,
      le.level::text as entity_level,
      le.parent_id as entity_parent_id,
      fe.audio_version_count,
      fe.text_version_count,
      -- Efficient ranking with entity name tiebreaker
      ROW_NUMBER() OVER (
        PARTITION BY le.id 
        ORDER BY 
          similarity(la.alias_name, search_query)::double precision DESC,
          similarity(le.name, search_query)::double precision DESC,
          la.alias_name ASC
      ) as rn
    FROM language_aliases la
    JOIN language_entities le ON la.language_entity_id = le.id
    JOIN filtered_entities fe ON le.id = fe.entity_id  -- Only include filtered entities
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
    -- Efficient region aggregation (only when requested)
    CASE 
      WHEN include_regions THEN 
        COALESCE(region_data.regions, '[]'::jsonb)
      ELSE NULL
    END as regions,
    ra.audio_version_count::INTEGER,
    ra.text_version_count::INTEGER
  FROM ranked_aliases ra
  LEFT JOIN LATERAL (
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
      AND include_regions = true
  ) region_data ON include_regions = true
  WHERE ra.rn = 1  -- Best alias per entity
  ORDER BY 
    ra.alias_similarity_score DESC,
    ra.entity_name ASC
  LIMIT max_results;
END;
$$;


-- ============================================================================
-- COMMENTS AND INDEXES
-- ============================================================================
-- Add helpful comments
comment ON function search_language_aliases_with_versions IS 'Flexible fuzzy search for language aliases with version filtering options (audio_only, text_only, both_required, either)';


comment ON type version_filter_type IS 'Filter types for language version searches: audio_only, text_only, both_required, either';


-- Add indexes for performance if they don't already exist
CREATE INDEX if NOT EXISTS idx_audio_versions_language_entity_id_not_deleted ON audio_versions (language_entity_id)
WHERE
  deleted_at IS NULL;


CREATE INDEX if NOT EXISTS idx_text_versions_language_entity_id_not_deleted ON text_versions (language_entity_id)
WHERE
  deleted_at IS NULL;
