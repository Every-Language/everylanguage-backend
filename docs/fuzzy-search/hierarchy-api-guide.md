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
