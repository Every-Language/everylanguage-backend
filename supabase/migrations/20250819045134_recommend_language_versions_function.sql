-- Recommend Language Versions by Global Popularity (Rolling Aggregate)
-- This function returns a list of languages and their version details ranked by
-- recent popularity using media_file_listens, intended for pre-type suggestions.
-- It mirrors the return shape of search_language_aliases_with_versions so the UI
-- can reuse the same rendering path.
-- Signature intentionally differs (no search_query):
--   - filter_type: version presence filter (audio_only, text_only, both_required, either)
--   - max_results: limit
--   - lookback_days: popularity window (default 90)
--   - include_regions: optionally include linked regions JSON
CREATE OR REPLACE FUNCTION recommend_language_versions (
  filter_type version_filter_type DEFAULT 'either',
  max_results INTEGER DEFAULT 30,
  lookback_days INTEGER DEFAULT 90,
  include_regions BOOLEAN DEFAULT FALSE
) returns TABLE (
  -- Keep identical column list to search_language_aliases_with_versions
  similarity_threshold_used DOUBLE PRECISION,
  alias_id UUID,
  alias_name TEXT,
  alias_similarity_score DOUBLE PRECISION,
  entity_id UUID,
  entity_name TEXT,
  entity_level TEXT,
  entity_parent_id UUID,
  regions JSONB,
  audio_version_count INTEGER,
  text_version_count INTEGER,
  audio_versions JSONB,
  text_versions JSONB
) language plpgsql security definer
SET
  search_path = public AS $$
BEGIN
  -- Popularity-driven recommendations do not use text similarity
  -- so we return NULLs in the similarity-related fields to match the shape.

  RETURN QUERY
  WITH popularity AS (
    SELECT
      mfl.language_entity_id,
      COUNT(*)::bigint AS listens_count
    FROM media_file_listens mfl
    WHERE mfl.language_entity_id IS NOT NULL
      AND (mfl.listened_at IS NULL OR mfl.listened_at >= (NOW() - (make_interval(days => lookback_days))))
    GROUP BY mfl.language_entity_id
  ),
  version_counts AS (
    SELECT 
      le.id AS entity_id,
      COALESCE(av.audio_count, 0) AS audio_count,
      COALESCE(tv.text_count, 0) AS text_count
    FROM language_entities le
    LEFT JOIN (
      SELECT language_entity_id, COUNT(*)::int AS audio_count
      FROM audio_versions
      WHERE deleted_at IS NULL
      GROUP BY language_entity_id
    ) av ON av.language_entity_id = le.id
    LEFT JOIN (
      SELECT language_entity_id, COUNT(*)::int AS text_count
      FROM text_versions
      WHERE deleted_at IS NULL
      GROUP BY language_entity_id
    ) tv ON tv.language_entity_id = le.id
    WHERE le.deleted_at IS NULL
  ),
  filtered AS (
    SELECT
      vc.entity_id,
      vc.audio_count,
      vc.text_count
    FROM version_counts vc
    WHERE CASE filter_type
      WHEN 'audio_only' THEN vc.audio_count > 0
      WHEN 'text_only' THEN vc.text_count > 0
      WHEN 'both_required' THEN vc.audio_count > 0 AND vc.text_count > 0
      WHEN 'either' THEN vc.audio_count > 0 OR vc.text_count > 0
      ELSE FALSE
    END
  ),
  ranked AS (
    SELECT
      le.id AS entity_id,
      le.name AS entity_name,
      le.level::text AS entity_level,
      le.parent_id AS entity_parent_id,
      COALESCE(p.listens_count, 0) AS listens_count,
      f.audio_count,
      f.text_count
    FROM filtered f
    JOIN language_entities le ON le.id = f.entity_id
    LEFT JOIN popularity p ON p.language_entity_id = f.entity_id
    WHERE le.deleted_at IS NULL
  ),
  ranked_ordered AS (
    SELECT r.*
    FROM ranked r
    ORDER BY
      r.listens_count DESC,
      r.audio_count DESC,
      r.text_count DESC,
      r.entity_level ASC,  -- prefer 'language' over 'dialect'
      r.entity_name ASC
    LIMIT max_results
  )
  SELECT
    NULL::double precision AS similarity_threshold_used,
    -- Choose a canonical alias: prefer alias that equals entity name, else smallest by name
    alias_pick.alias_id,
    alias_pick.alias_name,
    NULL::double precision AS alias_similarity_score,
    ro.entity_id,
    ro.entity_name,
    ro.entity_level,
    ro.entity_parent_id,
    CASE WHEN include_regions THEN COALESCE(region_data.regions, '[]'::jsonb) ELSE NULL END AS regions,
    ro.audio_count::int AS audio_version_count,
    ro.text_count::int AS text_version_count,
    COALESCE(audio_version_data.audio_versions, '[]'::jsonb) AS audio_versions,
    COALESCE(text_version_data.text_versions, '[]'::jsonb) AS text_versions
  FROM ranked_ordered ro
  LEFT JOIN LATERAL (
    SELECT la.id AS alias_id, la.alias_name
    FROM language_aliases la
    WHERE la.language_entity_id = ro.entity_id AND la.deleted_at IS NULL
    ORDER BY (la.alias_name = ro.entity_name) DESC, la.alias_name ASC
    LIMIT 1
  ) alias_pick ON TRUE
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
    ) AS regions
    FROM language_entities_regions ler
    JOIN regions reg ON reg.id = ler.region_id
    WHERE ler.language_entity_id = ro.entity_id
      AND ler.deleted_at IS NULL
      AND reg.deleted_at IS NULL
      AND include_regions = TRUE
  ) region_data ON include_regions = TRUE
  LEFT JOIN LATERAL (
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
    ) AS audio_versions
    FROM audio_versions av
    WHERE av.language_entity_id = ro.entity_id AND av.deleted_at IS NULL
  ) audio_version_data ON TRUE
  LEFT JOIN LATERAL (
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
    ) AS text_versions
    FROM text_versions tv
    WHERE tv.language_entity_id = ro.entity_id AND tv.deleted_at IS NULL
  ) text_version_data ON TRUE
  ;
END;
$$;


comment ON function recommend_language_versions IS 'Recommend language versions for pre-type suggestions using global media_file_listens popularity (rolling lookback), returning the same shape as search_language_aliases_with_versions.';
