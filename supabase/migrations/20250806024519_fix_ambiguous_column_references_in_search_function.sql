-- Fix Ambiguous Column References in search_language_aliases_with_versions
-- This migration fixes column reference ambiguity that occurs when function
-- output column names conflict with CTE column names
-- ENHANCED: Now returns actual version details in addition to counts
-- ============================================================================
-- Drop and recreate the function with fixed column references
DROP FUNCTION if EXISTS search_language_aliases_with_versions (
  TEXT,
  version_filter_type,
  INTEGER,
  DOUBLE PRECISION,
  BOOLEAN
);


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
  text_version_count INTEGER,
  -- ENHANCED: Actual version details
  audio_versions JSONB,
  text_versions JSONB
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

  -- Enhanced query with version filtering and details
  RETURN QUERY
  WITH language_version_counts AS (
    -- Get version counts for each language entity
    SELECT 
      le.id as lang_entity_id,
      COALESCE(av_counts.audio_count, 0) as audio_count,
      COALESCE(tv_counts.text_count, 0) as text_count
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
      lvc.lang_entity_id,
      lvc.audio_count,
      lvc.text_count
    FROM language_version_counts lvc
    WHERE 
      CASE filter_type
        WHEN 'audio_only' THEN lvc.audio_count > 0
        WHEN 'text_only' THEN lvc.text_count > 0
        WHEN 'both_required' THEN lvc.audio_count > 0 AND lvc.text_count > 0
        WHEN 'either' THEN lvc.audio_count > 0 OR lvc.text_count > 0
        ELSE false  -- Fallback case
      END
  ),
  ranked_aliases AS (
    SELECT 
      la.id as alias_id,
      la.alias_name,
      similarity(la.alias_name, search_query)::double precision as alias_similarity_score,
      le.id as lang_entity_id,
      le.name as lang_entity_name,
      le.level::text as lang_entity_level,
      le.parent_id as lang_entity_parent_id,
      fe.audio_count,
      fe.text_count,
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
    JOIN filtered_entities fe ON le.id = fe.lang_entity_id  -- Only include filtered entities
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
    ra.lang_entity_id as entity_id,
    ra.lang_entity_name as entity_name,
    ra.lang_entity_level as entity_level,
    ra.lang_entity_parent_id as entity_parent_id,
    -- Efficient region aggregation (only when requested)
    CASE 
      WHEN include_regions THEN 
        COALESCE(region_data.regions, '[]'::jsonb)
      ELSE NULL
    END as regions,
    ra.audio_count::INTEGER as audio_version_count,
    ra.text_count::INTEGER as text_version_count,
    -- ENHANCED: Return actual audio version details
    COALESCE(audio_version_data.audio_versions, '[]'::jsonb) as audio_versions,
    -- ENHANCED: Return actual text version details  
    COALESCE(text_version_data.text_versions, '[]'::jsonb) as text_versions
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
    WHERE ler.language_entity_id = ra.lang_entity_id
      AND ler.deleted_at IS NULL
      AND reg.deleted_at IS NULL
      AND include_regions = true
  ) region_data ON include_regions = true
  LEFT JOIN LATERAL (
    -- Get audio version details
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', av.id,
        'name', av.name,
        'bible_version_id', av.bible_version_id,
        'project_id', av.project_id,
        'created_at', av.created_at,
        'created_by', av.created_by
      )
      ORDER BY av.name ASC
    ) as audio_versions
    FROM audio_versions av
    WHERE av.language_entity_id = ra.lang_entity_id
      AND av.deleted_at IS NULL
  ) audio_version_data ON true
  LEFT JOIN LATERAL (
    -- Get text version details
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', tv.id,
        'name', tv.name,
        'bible_version_id', tv.bible_version_id,
        'project_id', tv.project_id,
        'text_version_source', tv.text_version_source,
        'created_at', tv.created_at,
        'created_by', tv.created_by
      )
      ORDER BY tv.name ASC
    ) as text_versions
    FROM text_versions tv
    WHERE tv.language_entity_id = ra.lang_entity_id
      AND tv.deleted_at IS NULL
  ) text_version_data ON true
  WHERE ra.rn = 1  -- Best alias per entity
  ORDER BY 
    ra.alias_similarity_score DESC,
    ra.lang_entity_name ASC
  LIMIT max_results;
END;
$$;


-- Update comment
comment ON function search_language_aliases_with_versions IS 'Enhanced fuzzy search for language aliases with version filtering and complete version details (audio_only, text_only, both_required, either) - fixed column ambiguity';
