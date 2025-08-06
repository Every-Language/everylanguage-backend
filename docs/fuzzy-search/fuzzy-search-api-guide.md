# Fuzzy Search API Guide

This guide explains how to implement language and region fuzzy search functionality in your frontend application.

## Overview

The system provides PostgreSQL functions for fuzzy text matching:

- `search_language_aliases` - Search for languages and dialects
- `search_language_aliases_with_versions` - Search for languages filtered by content availability
- `search_region_aliases` - Search for regions, countries, and locations

All functions use PostgreSQL's trigram similarity matching and return ranked results with configurable similarity thresholds.

## Function: search_language_aliases

### Purpose

Searches language entities (languages and dialects) by matching against their aliases and names.

### Input Parameters

- `search_query` (TEXT, required) - The search term (minimum 2 characters)
- `max_results` (INTEGER, optional, default: 30) - Maximum number of results to return
- `min_similarity` (DOUBLE PRECISION, optional, default: 0.1) - Minimum similarity score (0.0-1.0)
- `include_regions` (BOOLEAN, optional, default: false) - Whether to include associated region data

### Output Format

Returns a table with the following columns:

#### Metadata

- `similarity_threshold_used` (DOUBLE PRECISION) - The actual threshold used (may be higher than min_similarity)

#### Best Alias Data

- `alias_id` (UUID) - ID of the best matching alias
- `alias_name` (TEXT) - Name of the best matching alias
- `alias_similarity_score` (DOUBLE PRECISION) - Similarity score (0.0-1.0, higher is better)

#### Language Entity Data

- `entity_id` (UUID) - ID of the language entity
- `entity_name` (TEXT) - Official name of the language/dialect
- `entity_level` (TEXT) - Either "language" or "dialect"
- `entity_parent_id` (UUID) - Parent language ID (null for root languages)

#### Optional Region Data

- `regions` (JSONB or NULL) - Array of associated regions (only when include_regions=true)

Each region object contains:

- `region_id` (UUID)
- `region_name` (TEXT)
- `region_level` (TEXT)
- `region_parent_id` (UUID)
- `dominance_level` (INTEGER) - Ranking of language prominence in this region

### Calling from Frontend

#### Via Supabase Client RPC (Recommended)

```javascript
const { data, error } = await supabase.rpc('search_language_aliases', {
  search_query: 'english',
  max_results: 10,
  min_similarity: 0.2,
  include_regions: true,
});
```

## Function: search_language_aliases_with_versions

### Purpose

Searches language entities filtered by content availability (audio versions, text versions, or both). This is ideal for finding languages that have specific types of content available.

### Input Parameters

- `search_query` (TEXT, required) - The search term (minimum 2 characters)
- `filter_type` (version_filter_type, optional, default: 'either') - Content availability filter:
  - `'audio_only'` - Only languages with audio versions
  - `'text_only'` - Only languages with text versions
  - `'both_required'` - Only languages with both audio AND text versions
  - `'either'` - Languages with audio OR text versions (most inclusive)
- `max_results` (INTEGER, optional, default: 30) - Maximum number of results to return
- `min_similarity` (DOUBLE PRECISION, optional, default: 0.1) - Minimum similarity score (0.0-1.0)
- `include_regions` (BOOLEAN, optional, default: false) - Whether to include associated region data

### Output Format

Returns a table with the following columns:

#### Metadata

- `similarity_threshold_used` (DOUBLE PRECISION) - The actual threshold used (may be higher than min_similarity)

#### Best Alias Data

- `alias_id` (UUID) - ID of the best matching alias
- `alias_name` (TEXT) - Name of the best matching alias
- `alias_similarity_score` (DOUBLE PRECISION) - Similarity score (0.0-1.0, higher is better)

#### Language Entity Data

- `entity_id` (UUID) - ID of the language entity
- `entity_name` (TEXT) - Official name of the language/dialect
- `entity_level` (TEXT) - Either "language" or "dialect"
- `entity_parent_id` (UUID) - Parent language ID (null for root languages)

#### Content Availability Data

- `audio_version_count` (INTEGER) - Number of audio versions available for this language
- `text_version_count` (INTEGER) - Number of text versions available for this language

#### Optional Region Data

- `regions` (JSONB or NULL) - Array of associated regions (only when include_regions=true)

Each region object contains:

- `region_id` (UUID)
- `region_name` (TEXT)
- `region_level` (TEXT)
- `region_parent_id` (UUID)
- `dominance_level` (INTEGER) - Ranking of language prominence in this region

### Calling from Frontend

#### Via Supabase Client RPC (Recommended)

**Search languages with audio content only:**

```javascript
const { data, error } = await supabase.rpc(
  'search_language_aliases_with_versions',
  {
    search_query: 'english',
    filter_type: 'audio_only',
    max_results: 10,
    min_similarity: 0.2,
  }
);
```

**Search languages with text content only:**

```javascript
const { data, error } = await supabase.rpc(
  'search_language_aliases_with_versions',
  {
    search_query: 'spanish',
    filter_type: 'text_only',
    max_results: 15,
  }
);
```

**Search languages with both audio and text content:**

```javascript
const { data, error } = await supabase.rpc(
  'search_language_aliases_with_versions',
  {
    search_query: 'french',
    filter_type: 'both_required',
    max_results: 5,
    include_regions: true,
  }
);
```

**Search languages with any content (default):**

```javascript
const { data, error } = await supabase.rpc(
  'search_language_aliases_with_versions',
  {
    search_query: 'mandarin',
    filter_type: 'either', // or omit this parameter
    max_results: 20,
  }
);
```

## Function: search_region_aliases

### Purpose

Searches region entities (countries, states, cities, etc.) by matching against their aliases and names.

### Input Parameters

- `search_query` (TEXT, required) - The search term (minimum 2 characters)
- `max_results` (INTEGER, optional, default: 30) - Maximum number of results to return
- `min_similarity` (DOUBLE PRECISION, optional, default: 0.1) - Minimum similarity score (0.0-1.0)
- `include_languages` (BOOLEAN, optional, default: false) - Whether to include associated language data

### Output Format

Returns a table with the following columns:

#### Metadata

- `similarity_threshold_used` (DOUBLE PRECISION) - The actual threshold used (may be higher than min_similarity)

#### Best Alias Data

- `alias_id` (UUID) - ID of the best matching alias
- `alias_name` (TEXT) - Name of the best matching alias
- `alias_similarity_score` (DOUBLE PRECISION) - Similarity score (0.0-1.0, higher is better)

#### Region Data

- `region_id` (UUID) - ID of the region entity
- `region_name` (TEXT) - Official name of the region
- `region_level` (TEXT) - Type of region (e.g., "country", "state", "city")
- `region_parent_id` (UUID) - Parent region ID (null for root regions)

#### Optional Language Data

- `languages` (JSONB or NULL) - Array of associated languages (only when include_languages=true)

Each language object contains:

- `entity_id` (UUID)
- `entity_name` (TEXT)
- `entity_level` (TEXT)
- `entity_parent_id` (UUID)
- `dominance_level` (INTEGER) - Ranking of language prominence in this region

### Calling from Frontend

#### Via Supabase Client RPC (Recommended)

```javascript
const { data, error } = await supabase.rpc('search_region_aliases', {
  search_query: 'united states',
  max_results: 5,
  min_similarity: 0.3,
  include_languages: false,
});
```

## Important Implementation Notes

### Dynamic Similarity Thresholds

All functions automatically adjust similarity thresholds based on query length:

- 8+ characters: minimum 0.15 threshold
- 5-7 characters: minimum 0.25 threshold
- 3-4 characters: minimum 0.35 threshold
- 2 characters: minimum 0.45 threshold

The actual threshold used is returned in `similarity_threshold_used`.

### Performance Considerations

- Results are automatically deduplicated (one result per entity)
- Best matching alias per entity is returned
- Results are ordered by similarity score (highest first)
- Default `max_results` is 30 for mobile optimization
- Setting `include_regions`/`include_languages` to false improves performance
- The version-filtered search is optimized with efficient JOIN operations

### Choosing the Right Function

**Use `search_language_aliases`** when:

- You want to search all languages regardless of content availability
- You need a simple, fast search without content filtering

**Use `search_language_aliases_with_versions`** when:

- You need to filter languages by content availability
- Building audio-only or text-only features
- You want to know content counts for each language
- You need to ensure languages have specific types of content

### Data Format Examples

#### Language Search Response (with versions)

```json
[
  {
    "similarity_threshold_used": 0.25,
    "alias_id": "uuid-here",
    "alias_name": "English",
    "alias_similarity_score": 0.95,
    "entity_id": "uuid-here",
    "entity_name": "English",
    "entity_level": "language",
    "entity_parent_id": null,
    "audio_version_count": 3,
    "text_version_count": 5,
    "regions": [
      {
        "region_id": "uuid-here",
        "region_name": "United States",
        "region_level": "country",
        "region_parent_id": "uuid-here",
        "dominance_level": 5
      }
    ]
  }
]
```

#### Language Search Response (original function)

```json
[
  {
    "similarity_threshold_used": 0.25,
    "alias_id": "uuid-here",
    "alias_name": "English",
    "alias_similarity_score": 0.95,
    "entity_id": "uuid-here",
    "entity_name": "English",
    "entity_level": "language",
    "entity_parent_id": null,
    "regions": [
      {
        "region_id": "uuid-here",
        "region_name": "United States",
        "region_level": "country",
        "region_parent_id": "uuid-here",
        "dominance_level": 5
      }
    ]
  }
]
```

#### Region Search Response

```json
[
  {
    "similarity_threshold_used": 0.15,
    "alias_id": "uuid-here",
    "alias_name": "USA",
    "alias_similarity_score": 0.88,
    "region_id": "uuid-here",
    "region_name": "United States",
    "region_level": "country",
    "region_parent_id": null,
    "languages": [
      {
        "entity_id": "uuid-here",
        "entity_name": "English",
        "entity_level": "language",
        "entity_parent_id": null,
        "dominance_level": 5
      }
    ]
  }
]
```

## Error Handling

All functions will return empty result sets (not errors) when:

- Search query is less than 2 characters
- No matches found above similarity threshold
- Invalid parameters provided

Always check the `error` property in your Supabase response for connection or permission issues.
