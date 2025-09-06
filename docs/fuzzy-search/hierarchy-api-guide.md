# Hierarchy Navigation API Guide

This guide explains how to navigate and query hierarchical relationships for language entities and regions in your frontend application.

## Overview

The system provides PostgreSQL functions for navigating hierarchical data structures:

**Language Entity Hierarchy Functions:**

- `get_language_entity_hierarchy` - Get complete hierarchy tree (ancestors, descendants, siblings)
- `get_language_entity_path` - Get breadcrumb-style path string

**Region Hierarchy Functions:**

- `get_region_hierarchy` - Get complete hierarchy tree (ancestors, descendants, siblings)
- `get_region_path` - Get breadcrumb-style path string

All functions respect soft deletes and return only active (non-deleted) records.

## Language Entity Hierarchy

### Function: get_language_entity_hierarchy

#### Purpose

Retrieves the complete hierarchical tree around a specific language entity, including ancestors (parents), descendants (children), and siblings, with configurable depth limits.

#### Input Parameters

- `entity_id` (UUID, required) - The ID of the language entity to center the hierarchy around
- `generations_up` (INTEGER, optional, default: 3) - How many levels up to traverse (ancestors)
- `generations_down` (INTEGER, optional, default: 3) - How many levels down to traverse (descendants)

#### Output Format

Returns a table with the following columns:

- `hierarchy_entity_id` (UUID) - ID of the related language entity
- `hierarchy_entity_name` (TEXT) - Name of the related language entity
- `hierarchy_entity_level` (TEXT) - Level type: 'family', 'language', 'dialect', 'mother_tongue'
- `hierarchy_parent_id` (UUID) - Parent entity ID (null for root entities)
- `relationship_type` (TEXT) - Relationship to the target entity:
  - `'self'` - The target entity itself
  - `'ancestor'` - Parent, grandparent, etc.
  - `'descendant'` - Child, grandchild, etc.
  - `'sibling'` - Same parent, different entity
- `generation_distance` (INTEGER) - Distance from target entity:
  - `0` for self and siblings
  - Negative numbers for ancestors (-1 = parent, -2 = grandparent, etc.)
  - Positive numbers for descendants (1 = child, 2 = grandchild, etc.)

#### Calling from Frontend

```javascript
const { data, error } = await supabase.rpc('get_language_entity_hierarchy', {
  entity_id: 'your-language-entity-uuid',
  generations_up: 2, // Go up 2 levels to find grandparents
  generations_down: 2, // Go down 2 levels to find grandchildren
});
```

#### Example Response

```json
[
  {
    "hierarchy_entity_id": "uuid-grandparent",
    "hierarchy_entity_name": "Indo-European",
    "hierarchy_entity_level": "family",
    "hierarchy_parent_id": null,
    "relationship_type": "ancestor",
    "generation_distance": -2
  },
  {
    "hierarchy_entity_id": "uuid-parent",
    "hierarchy_entity_name": "Germanic",
    "hierarchy_entity_level": "language",
    "hierarchy_parent_id": "uuid-grandparent",
    "relationship_type": "ancestor",
    "generation_distance": -1
  },
  {
    "hierarchy_entity_id": "uuid-self",
    "hierarchy_entity_name": "English",
    "hierarchy_entity_level": "language",
    "hierarchy_parent_id": "uuid-parent",
    "relationship_type": "self",
    "generation_distance": 0
  },
  {
    "hierarchy_entity_id": "uuid-sibling",
    "hierarchy_entity_name": "German",
    "hierarchy_entity_level": "language",
    "hierarchy_parent_id": "uuid-parent",
    "relationship_type": "sibling",
    "generation_distance": 0
  },
  {
    "hierarchy_entity_id": "uuid-child",
    "hierarchy_entity_name": "American English",
    "hierarchy_entity_level": "dialect",
    "hierarchy_parent_id": "uuid-self",
    "relationship_type": "descendant",
    "generation_distance": 1
  }
]
```

### Function: get_language_entity_path

#### Purpose

Generates a human-readable breadcrumb path showing the full hierarchy from root to the specified language entity.

#### Input Parameters

- `entity_id` (UUID, required) - The ID of the language entity

#### Output Format

Returns a TEXT string with the hierarchy path using " > " as separator.

#### Calling from Frontend

```javascript
const { data, error } = await supabase.rpc('get_language_entity_path', {
  entity_id: 'your-language-entity-uuid',
});
```

#### Example Response

```json
"Indo-European > Germanic > English > American English"
```

## Region Hierarchy

### Function: get_region_hierarchy

#### Purpose

Retrieves the complete hierarchical tree around a specific region, including ancestors (parent regions), descendants (child regions), and siblings, with configurable depth limits.

#### Input Parameters

- `region_id` (UUID, required) - The ID of the region to center the hierarchy around
- `generations_up` (INTEGER, optional, default: 3) - How many levels up to traverse (ancestors)
- `generations_down` (INTEGER, optional, default: 3) - How many levels down to traverse (descendants)

#### Output Format

Returns a table with the following columns:

- `hierarchy_region_id` (UUID) - ID of the related region
- `hierarchy_region_name` (TEXT) - Name of the related region
- `hierarchy_region_level` (TEXT) - Level type: 'continent', 'world_region', 'country', 'state', 'province', 'district', 'town', 'village'
- `hierarchy_parent_id` (UUID) - Parent region ID (null for root regions)
- `relationship_type` (TEXT) - Relationship to the target region:
  - `'self'` - The target region itself
  - `'ancestor'` - Parent, grandparent, etc.
  - `'descendant'` - Child, grandchild, etc.
  - `'sibling'` - Same parent, different region
- `generation_distance` (INTEGER) - Distance from target region:
  - `0` for self and siblings
  - Negative numbers for ancestors (-1 = parent, -2 = grandparent, etc.)
  - Positive numbers for descendants (1 = child, 2 = grandchild, etc.)

#### Calling from Frontend

```javascript
const { data, error } = await supabase.rpc('get_region_hierarchy', {
  region_id: 'your-region-uuid',
  generations_up: 4, // Go up to continent level
  generations_down: 2, // Go down to districts/towns
});
```

#### Example Response

```json
[
  {
    "hierarchy_region_id": "uuid-continent",
    "hierarchy_region_name": "North America",
    "hierarchy_region_level": "continent",
    "hierarchy_parent_id": null,
    "relationship_type": "ancestor",
    "generation_distance": -2
  },
  {
    "hierarchy_region_id": "uuid-country",
    "hierarchy_region_name": "United States",
    "hierarchy_region_level": "country",
    "hierarchy_parent_id": "uuid-continent",
    "relationship_type": "ancestor",
    "generation_distance": -1
  },
  {
    "hierarchy_region_id": "uuid-self",
    "hierarchy_region_name": "California",
    "hierarchy_region_level": "state",
    "hierarchy_parent_id": "uuid-country",
    "relationship_type": "self",
    "generation_distance": 0
  },
  {
    "hierarchy_region_id": "uuid-sibling",
    "hierarchy_region_name": "Nevada",
    "hierarchy_region_level": "state",
    "hierarchy_parent_id": "uuid-country",
    "relationship_type": "sibling",
    "generation_distance": 0
  },
  {
    "hierarchy_region_id": "uuid-child",
    "hierarchy_region_name": "Los Angeles County",
    "hierarchy_region_level": "district",
    "hierarchy_parent_id": "uuid-self",
    "relationship_type": "descendant",
    "generation_distance": 1
  }
]
```

### Function: get_region_path

#### Purpose

Generates a human-readable breadcrumb path showing the full hierarchy from root to the specified region.

#### Input Parameters

- `region_id` (UUID, required) - The ID of the region

#### Output Format

Returns a TEXT string with the hierarchy path using " > " as separator.

#### Calling from Frontend

```javascript
const { data, error } = await supabase.rpc('get_region_path', {
  region_id: 'your-region-uuid',
});
```

#### Example Response

```json
"North America > United States > California > Los Angeles County"
```

## Common Use Cases

### Building Hierarchical Trees

Use the hierarchy functions to build interactive tree views:

```javascript
// Get the full tree around a language
const buildLanguageTree = async entityId => {
  const { data, error } = await supabase.rpc('get_language_entity_hierarchy', {
    entity_id: entityId,
    generations_up: 5,
    generations_down: 5,
  });

  if (error) throw error;

  // Group by relationship type for easier rendering
  const tree = {
    self: data.find(item => item.relationship_type === 'self'),
    ancestors: data
      .filter(item => item.relationship_type === 'ancestor')
      .sort((a, b) => a.generation_distance - b.generation_distance),
    descendants: data
      .filter(item => item.relationship_type === 'descendant')
      .sort((a, b) => a.generation_distance - b.generation_distance),
    siblings: data
      .filter(item => item.relationship_type === 'sibling')
      .sort((a, b) =>
        a.hierarchy_entity_name.localeCompare(b.hierarchy_entity_name)
      ),
  };

  return tree;
};
```

### Breadcrumb Navigation

Use the path functions for breadcrumb navigation:

```javascript
// Get breadcrumbs for current location
const getBreadcrumbs = async regionId => {
  const { data: path, error } = await supabase.rpc('get_region_path', {
    region_id: regionId,
  });

  if (error) throw error;

  // Split the path into individual breadcrumb items
  const breadcrumbs = path.split(' > ').map((name, index, array) => ({
    name,
    isLast: index === array.length - 1,
  }));

  return breadcrumbs;
};
```

### Finding Related Entities

Find languages spoken in a region and its sub-regions:

```javascript
// Get all sub-regions first, then find languages
const getLanguagesInRegionHierarchy = async regionId => {
  // Get all descendant regions
  const { data: regions, error: regionError } = await supabase.rpc(
    'get_region_hierarchy',
    {
      region_id: regionId,
      generations_up: 0, // Don't need ancestors
      generations_down: 3, // Get 3 levels of sub-regions
    }
  );

  if (regionError) throw regionError;

  // Extract region IDs including self and descendants
  const regionIds = regions
    .filter(
      r =>
        r.relationship_type === 'self' || r.relationship_type === 'descendant'
    )
    .map(r => r.hierarchy_region_id);

  // Get languages associated with these regions
  const { data: languages, error: langError } = await supabase
    .from('language_entities_regions')
    .select(
      `
      dominance_level,
      language_entities (
        id,
        name,
        level
      )
    `
    )
    .in('region_id', regionIds)
    .order('dominance_level', { ascending: false });

  return languages;
};
```

## Performance Considerations

- **Depth Limits**: Keep `generations_up` and `generations_down` reasonable (typically 3-5) to avoid performance issues
- **Caching**: Consider caching path results since hierarchy structures change infrequently
- **Indexing**: The functions use proper indexes on `parent_id` columns for efficient traversal
- **Soft Deletes**: All functions automatically exclude soft-deleted records

## Error Handling

All functions will return empty result sets (not errors) when:

- Entity/region ID doesn't exist
- Entity/region is soft-deleted
- No relationships found within the specified depth limits

Always check the `error` property in your Supabase response for connection or permission issues.

## Hierarchy Levels

### Language Entity Levels

- `family` - Language family (e.g., "Indo-European")
- `language` - Individual language (e.g., "English")
- `dialect` - Regional dialect (e.g., "American English")
- `mother_tongue` - Specific mother tongue variation

### Region Levels

- `continent` - Continental level (e.g., "North America")
- `world_region` - World regions (e.g., "Northern America")
- `country` - Country level (e.g., "United States")
- `state` - State/province level (e.g., "California")
- `province` - Province level
- `district` - District/county level
- `town` - Town/city level
- `village` - Village level

## Manual SQL Testing

You can validate hierarchy behavior directly in SQL (useful for local testing and debugging).

### Language hierarchy (ad-hoc SQL around a specific entity)

Run this to fetch self, ancestors, descendants, and siblings without calling the function (works in Supabase SQL editor or psql):

```sql
WITH RECURSIVE
cfg AS (
  SELECT
    '00542823-58a1-4251-ae62-f208dd1296b2'::uuid AS entity_id, -- Arabic (example)
    6::int AS generations_up,
    6::int AS generations_down
),
self_row AS (
  SELECT le.id, le.name, le.level::text AS level, le.parent_id
  FROM language_entities le, cfg
  WHERE le.id = cfg.entity_id AND le.deleted_at IS NULL
),
up AS (
  SELECT p.id, p.name, p.level::text AS level, p.parent_id, -1 AS distance
  FROM language_entities p JOIN self_row s ON p.id = s.parent_id
  WHERE p.deleted_at IS NULL
UNION ALL
  SELECT p2.id, p2.name, p2.level::text, p2.parent_id, u.distance - 1
  FROM language_entities p2 JOIN up u ON p2.id = u.parent_id JOIN cfg ON TRUE
  WHERE p2.deleted_at IS NULL AND abs(u.distance) < cfg.generations_up
),
down AS (
  SELECT c.id, c.name, c.level::text AS level, c.parent_id, 1 AS distance
  FROM language_entities c JOIN self_row s ON c.parent_id = s.id
  WHERE c.deleted_at IS NULL
UNION ALL
  SELECT c2.id, c2.name, c2.level::text, c2.parent_id, d.distance + 1
  FROM language_entities c2 JOIN down d ON c2.parent_id = d.id JOIN cfg ON TRUE
  WHERE c2.deleted_at IS NULL AND d.distance < cfg.generations_down
),
siblings AS (
  SELECT sib.id, sib.name, sib.level::text AS level, sib.parent_id, 0 AS distance
  FROM language_entities sib JOIN self_row s ON sib.parent_id = s.parent_id
  WHERE sib.id <> s.id AND sib.deleted_at IS NULL AND s.parent_id IS NOT NULL
)
SELECT s.id AS hierarchy_entity_id,
       s.name AS hierarchy_entity_name,
       s.level AS hierarchy_entity_level,
       s.parent_id AS hierarchy_parent_id,
       'self'::text AS relationship_type,
       0 AS generation_distance
FROM self_row s
UNION ALL
SELECT u.id, u.name, u.level, u.parent_id, 'ancestor', u.distance FROM up u
UNION ALL
SELECT d.id, d.name, d.level, d.parent_id, 'descendant', d.distance FROM down d
UNION ALL
SELECT b.id, b.name, b.level, b.parent_id, 'sibling', b.distance FROM siblings b
ORDER BY relationship_type, generation_distance, hierarchy_entity_name;
```

Quick helpers:

- **Counts by relationship**

```sql
WITH RECURSIVE ...
-- same CTEs as above through siblings, then
, combined AS (
  SELECT s.id, s.name, s.level, s.parent_id, 'self'::text AS relationship_type, 0 AS generation_distance FROM self_row s
  UNION ALL SELECT u.id, u.name, u.level, u.parent_id, 'ancestor', u.distance FROM up u
  UNION ALL SELECT d.id, d.name, d.level, d.parent_id, 'descendant', d.distance FROM down d
  UNION ALL SELECT b.id, b.name, b.level, b.parent_id, 'sibling', b.distance FROM siblings b
)
SELECT relationship_type, COUNT(*)
FROM combined
GROUP BY relationship_type
ORDER BY relationship_type;
```

- **Direct children (descendants at distance 1)**

```sql
WITH RECURSIVE ...
-- same CTEs as above through combined
SELECT *
FROM combined
WHERE relationship_type = 'descendant' AND generation_distance = 1
ORDER BY name
LIMIT 200;
```

- **Path (root → ... → entity)**

```sql
WITH RECURSIVE up AS (
  SELECT le.id, le.name, le.parent_id, 0 AS depth
  FROM language_entities le
  WHERE le.id = '00542823-58a1-4251-ae62-f208dd1296b2'::uuid AND le.deleted_at IS NULL
UNION ALL
  SELECT p.id, p.name, p.parent_id, up.depth - 1
  FROM language_entities p JOIN up ON p.id = up.parent_id
  WHERE p.deleted_at IS NULL
)
SELECT string_agg(name, ' > ' ORDER BY depth) AS path
FROM up;
```
