# Fuzzy Search Implementation Guide

This guide explains how to implement the fuzzy search system in your React Native frontend using the backend functions created in the migration.

## **Overview**

The backend provides two main search functions:

- `search_language_aliases()` - Fuzzy search for languages
- `search_region_aliases()` - Fuzzy search for regions

Additional data can be fetched using regular Supabase queries after the user selects a specific entity.

## **1. Language Fuzzy Search**

### **Basic Search Implementation**

```typescript
interface LanguageSearchResult {
  // Search metadata
  total_found: number;
  max_limit_hit: boolean;
  similarity_threshold_used: number;

  // Alias data
  alias_id: string;
  alias_name: string;
  alias_similarity_score: number;

  // Language entity data
  entity_id: string;
  entity_name: string;
  entity_level: 'family' | 'language' | 'dialect' | 'mother_tongue';
  entity_parent_id: string | null;
}

const searchLanguages = async (
  query: string,
  maxResults: number = 50,
  minSimilarity: number = 0.1
): Promise<{
  results: LanguageSearchResult[];
  metadata: {
    totalFound: number;
    maxLimitHit: boolean;
    thresholdUsed: number;
  };
}> => {
  const { data, error } = await supabase.rpc('search_language_aliases', {
    search_query: query,
    max_results: maxResults,
    min_similarity: minSimilarity,
  });

  if (error) throw error;
  if (!data?.length) {
    return {
      results: [],
      metadata: { totalFound: 0, maxLimitHit: false, thresholdUsed: 0 },
    };
  }

  return {
    results: data,
    metadata: {
      totalFound: data[0].total_found,
      maxLimitHit: data[0].max_limit_hit,
      thresholdUsed: data[0].similarity_threshold_used,
    },
  };
};
```

### **React Native Component Example**

```typescript
import React, { useState, useEffect } from 'react'
import { View, TextInput, FlatList, Text, TouchableOpacity, Alert } from 'react-native'

const LanguageSearchScreen = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LanguageSearchResult[]>([])
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(false)

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true)
      try {
        const { results, metadata } = await searchLanguages(query)
        setResults(results)
        setMetadata(metadata)

        // Show warning if too many results
        if (metadata.maxLimitHit) {
          Alert.alert(
            'Too many results',
            `Found ${metadata.totalFound} results. Please be more specific.`
          )
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const handleSelectLanguage = (result: LanguageSearchResult) => {
    // Navigate to language details or store selection
    console.log('Selected language:', result.entity_name)
    // Navigate to details screen with entity_id
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search for a language..."
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 12,
          marginBottom: 16
        }}
      />

      {loading && <Text>Searching...</Text>}

      <FlatList
        data={results}
        keyExtractor={(item) => item.alias_id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleSelectLanguage(item)}
            style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}
          >
            <Text style={{ fontWeight: 'bold' }}>{item.entity_name}</Text>
            {item.alias_name !== item.entity_name && (
              <Text style={{ color: '#666' }}>({item.alias_name})</Text>
            )}
            <Text style={{ fontSize: 12, color: '#999' }}>
              {item.entity_level} • {Math.round(item.alias_similarity_score * 100)}% match
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}
```

## **2. Region Fuzzy Search**

### **Basic Search Implementation**

```typescript
interface RegionSearchResult {
  // Search metadata
  total_found: number;
  max_limit_hit: boolean;
  similarity_threshold_used: number;

  // Alias data
  alias_id: string;
  alias_name: string;
  alias_similarity_score: number;

  // Region data
  region_id: string;
  region_name: string;
  region_level:
    | 'continent'
    | 'world_region'
    | 'country'
    | 'state'
    | 'province'
    | 'district'
    | 'town'
    | 'village';
  region_parent_id: string | null;
}

const searchRegions = async (
  query: string,
  maxResults: number = 50,
  minSimilarity: number = 0.1
): Promise<{
  results: RegionSearchResult[];
  metadata: { totalFound: number; maxLimitHit: boolean; thresholdUsed: number };
}> => {
  const { data, error } = await supabase.rpc('search_region_aliases', {
    search_query: query,
    max_results: maxResults,
    min_similarity: minSimilarity,
  });

  if (error) throw error;
  if (!data?.length) {
    return {
      results: [],
      metadata: { totalFound: 0, maxLimitHit: false, thresholdUsed: 0 },
    };
  }

  return {
    results: data,
    metadata: {
      totalFound: data[0].total_found,
      maxLimitHit: data[0].max_limit_hit,
      thresholdUsed: data[0].similarity_threshold_used,
    },
  };
};
```

## **3. Getting Detailed Entity Information**

After the user selects a language or region, fetch detailed information using regular Supabase queries:

### **Language Entity Details**

```typescript
interface LanguageEntityDetails {
  id: string;
  name: string;
  level: string;
  parent_id: string | null;
  sources: Array<{
    id: string;
    source: string;
    version: string | null;
    is_external: boolean;
    external_id: string | null;
  }>;
  properties: Array<{
    id: string;
    key: string;
    value: string;
  }>;
  regions: Array<{
    region_id: string;
    region_name: string;
    region_level: string;
    dominance_level: number;
  }>;
  text_versions: Array<{
    id: string;
    name: string;
    bible_version_id: string;
  }>;
  audio_versions: Array<{
    id: string;
    name: string;
    bible_version_id: string;
  }>;
}

const getLanguageEntityDetails = async (
  entityId: string
): Promise<LanguageEntityDetails> => {
  // Get basic entity info with sources and properties
  const { data: entityData, error: entityError } = await supabase
    .from('language_entities')
    .select(
      `
      id,
      name,
      level,
      parent_id,
      language_entity_sources (
        id,
        source,
        version,
        is_external,
        external_id
      ),
      language_properties (
        id,
        key,
        value
      )
    `
    )
    .eq('id', entityId)
    .eq('language_entity_sources.deleted_at', null)
    .eq('language_properties.deleted_at', null)
    .single();

  if (entityError) throw entityError;

  // Get associated regions
  const { data: regionsData, error: regionsError } = await supabase
    .from('language_entities_regions')
    .select(
      `
      dominance_level,
      regions (
        id,
        name,
        level
      )
    `
    )
    .eq('language_entity_id', entityId)
    .eq('deleted_at', null);

  if (regionsError) throw regionsError;

  // Get text versions
  const { data: textVersions, error: textError } = await supabase
    .from('text_versions')
    .select('id, name, bible_version_id')
    .eq('language_entity_id', entityId)
    .eq('deleted_at', null);

  if (textError) throw textError;

  // Get audio versions
  const { data: audioVersions, error: audioError } = await supabase
    .from('audio_versions')
    .select('id, name, bible_version_id')
    .eq('language_entity_id', entityId)
    .eq('deleted_at', null);

  if (audioError) throw audioError;

  return {
    ...entityData,
    regions:
      regionsData?.map(r => ({
        region_id: r.regions.id,
        region_name: r.regions.name,
        region_level: r.regions.level,
        dominance_level: r.dominance_level,
      })) || [],
    text_versions: textVersions || [],
    audio_versions: audioVersions || [],
  };
};
```

### **Region Entity Details**

```typescript
interface RegionEntityDetails {
  id: string;
  name: string;
  level: string;
  parent_id: string | null;
  sources: Array<{
    id: string;
    source: string;
    version: string | null;
    is_external: boolean;
  }>;
  properties: Array<{
    id: string;
    key: string;
    value: string;
  }>;
  languages: Array<{
    language_entity_id: string;
    language_name: string;
    language_level: string;
    dominance_level: number;
  }>;
}

const getRegionEntityDetails = async (
  regionId: string
): Promise<RegionEntityDetails> => {
  // Get basic region info with sources and properties
  const { data: regionData, error: regionError } = await supabase
    .from('regions')
    .select(
      `
      id,
      name,
      level,
      parent_id,
      region_sources (
        id,
        source,
        version,
        is_external
      ),
      region_properties (
        id,
        key,
        value
      )
    `
    )
    .eq('id', regionId)
    .eq('region_sources.deleted_at', null)
    .eq('region_properties.deleted_at', null)
    .single();

  if (regionError) throw regionError;

  // Get associated languages
  const { data: languagesData, error: languagesError } = await supabase
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
    .eq('region_id', regionId)
    .eq('deleted_at', null);

  if (languagesError) throw languagesError;

  return {
    ...regionData,
    languages:
      languagesData?.map(l => ({
        language_entity_id: l.language_entities.id,
        language_name: l.language_entities.name,
        language_level: l.language_entities.level,
        dominance_level: l.dominance_level,
      })) || [],
  };
};
```

## **4. Hierarchical Navigation**

### **Language Entity Hierarchy**

```typescript
interface HierarchyNode {
  hierarchy_entity_id: string;
  hierarchy_entity_name: string;
  hierarchy_entity_level: string;
  hierarchy_parent_id: string | null;
  relationship_type: 'self' | 'ancestor' | 'descendant' | 'sibling';
  generation_distance: number;
}

const getLanguageEntityHierarchy = async (
  entityId: string,
  generationsUp: number = 3,
  generationsDown: number = 3
): Promise<HierarchyNode[]> => {
  const { data, error } = await supabase.rpc('get_language_entity_hierarchy', {
    entity_id: entityId,
    generations_up: generationsUp,
    generations_down: generationsDown,
  });

  if (error) throw error;
  return data || [];
};
```

### **Region Hierarchy**

```typescript
interface RegionHierarchyNode {
  hierarchy_region_id: string;
  hierarchy_region_name: string;
  hierarchy_region_level: string;
  hierarchy_parent_id: string | null;
  relationship_type: 'self' | 'ancestor' | 'descendant' | 'sibling';
  generation_distance: number;
}

const getRegionHierarchy = async (
  regionId: string,
  generationsUp: number = 3,
  generationsDown: number = 3
): Promise<RegionHierarchyNode[]> => {
  const { data, error } = await supabase.rpc('get_region_hierarchy', {
    region_id: regionId,
    generations_up: generationsUp,
    generations_down: generationsDown,
  });

  if (error) throw error;
  return data || [];
};
```

## **5. Advanced Search Options**

### **Custom Similarity Thresholds**

```typescript
// For more lenient search (more results)
const lenientSearch = await searchLanguages(query, 50, 0.05);

// For stricter search (fewer, higher quality results)
const strictSearch = await searchLanguages(query, 20, 0.4);
```

### **Progressive Search Strategy**

```typescript
const progressiveLanguageSearch = async (query: string) => {
  // Try strict search first
  let results = await searchLanguages(query, 15, 0.35);

  if (results.results.length < 5) {
    // Fall back to more lenient search
    results = await searchLanguages(query, 25, 0.2);
  }

  if (results.results.length < 3) {
    // Final fallback - very lenient
    results = await searchLanguages(query, 35, 0.1);
  }

  return results;
};
```

## **6. Performance Considerations**

### **Debouncing**

Always debounce search queries to avoid excessive API calls:

```typescript
import { useDebounce } from 'use-debounce';

const [query, setQuery] = useState('');
const [debouncedQuery] = useDebounce(query, 300);

useEffect(() => {
  if (debouncedQuery.length >= 2) {
    performSearch(debouncedQuery);
  }
}, [debouncedQuery]);
```

### **Caching**

Consider caching search results for better UX:

```typescript
const searchCache = new Map<string, any>();

const cachedSearch = async (query: string) => {
  const cacheKey = `${query}-${maxResults}-${minSimilarity}`;

  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  const results = await searchLanguages(query);
  searchCache.set(cacheKey, results);

  return results;
};
```

## **7. Error Handling**

```typescript
const safeSearch = async (query: string) => {
  try {
    return await searchLanguages(query);
  } catch (error) {
    console.error('Search failed:', error);

    // Fallback to simpler search or show error message
    return {
      results: [],
      metadata: { totalFound: 0, maxLimitHit: false, thresholdUsed: 0 },
    };
  }
};
```

## **8. Testing the Implementation**

### **Test Search Queries**

```typescript
// Test exact matches
await searchLanguages('English');

// Test fuzzy matches
await searchLanguages('inglish'); // Should find "English"
await searchLanguages('espanol'); // Should find "Español"

// Test partial matches
await searchLanguages('chin'); // Should find "Chinese", "Chin", etc.

// Test edge cases
await searchLanguages('a'); // Should return empty (too short)
await searchLanguages('xyz123'); // Should return empty or very few results
```

This implementation provides a comprehensive fuzzy search system that's both powerful and user-friendly, with good performance characteristics and proper error handling.
