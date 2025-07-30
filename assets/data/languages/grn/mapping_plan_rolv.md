# Language Data Seeding Plan

This document outlines the detailed mapping strategy for seeding the language database from ISO 639-3 data source.

## Database Schema Overview

The target database has the following key tables for language data:

- **`language_entities`**: Core language/dialect entities with hierarchical relationships

  - `id` (string, PK)
  - `name` (string)
  - `level` (enum: "family" | "language" | "dialect" | "mother_tongue")
  - `parent_id` (string, FK to language_entities.id)

- **`language_entity_sources`**: Tracks external data sources for each language entity

  - `language_entity_id` (string, FK)
  - `source` (string)
  - `is_external` (bool) - whether external or user created
  - `external_id_type` (text) - which type of ID is in the external_id eg. iso-639-3 eg. rolvcode
  - `external_id` (string) - the actual ID in the external database eg. aab
  - `version` (string) - version of the external database
  - `created_by` (fk to public.users.id) nullable, only filled in if it is a user created language

- **`language_aliases`**: Alternative names for language entities. Should also include an entry for the actual/primary name as this table will be indexed for searching

  - `language_entity_id` (string, FK)
  - `alias_name` (string)

- **`language_properties`**: Key-value pairs for additional language metadata

  - `language_entity_id` (string, FK)
  - `key` (string)
  - `value` (string)

- **`regions`**: Hierarchical geographical regions

  - `id` (string, PK)
  - `name` (string)
  - `level` (enum: "continent" | "world_region" | "country" | "state" | "province" | "district" | "town" | "village")
  - `parent_id` (string, FK)

- **`language_entities_regions`**: Many-to-many relationship between languages and regions
  - `language_entity_id` (string, FK)
  - `region_id` (string, FK)
  - `dominance_level` (float, scale of 0-1 showing strength of association, nullable if unknown)

## Data Source Mapping

### 1. ROLV Main Data (`ROLV.json`)

**File Structure:**

```json
{
  "LanguageCode": "eng",
  "LanguageName": "English",
  "ROLVCode": 12345,
  "LanguageTag": "en-US-x-HIS12345",
  "VarietyName": "English: American",
  "CountryCode": "US",
  "LocationName": "United States"
}
```

**Mapping to Database:**

For each entry in the ROLV.json file, we will need to:

#### 1.1 One entry in thelanguage_entities Table

- **Primary Key**: `id` = UUID
- **Name**: `name` = `VarietyName` field
- **Level**: `level` = `"dialect"`
- **Parent**: `parent_id` - get the languageCode, find the language_entity_sources entry with `external_id` matching `languageCode`, find the associated `language_entities` object, then take this object's UUID - this is the `parent_id`

#### 1.2 two entries in the language_entity_sources Table

**Entry 1 - ROLV Code:**

- `id` UUID
- `language_entity_id` = references record created in the 1.1 step above
- `source` = `"GRN"`
- `version` = `"2025"`
- `is_external` = `true`
- `external_id_type` = `"rolv_code"`
- `external_id` = the actual `ROLVCode` value (convert to string)
- `created_by` null

**Entry 2 - IETF Language Tag:**

- `id` UUID
- `language_entity_id` = references record created in the 1.1 step above
- `source` = `"IETF"`
- `version` = `"2025"`
- `is_external` = `true`
- `external_id_type` = `"bcp-47"`
- `external_id` = the actual `LanguageTag` value
- `created_by` null

#### 1.3 One entry in the language_entities_regions table

- `id` UUID
- `language_entity_id` references record created in the 1.1 step above
- `region_id` find the entry in `region_sources` where `external_id` matches the `CountryCode` field in the ROLV.json, then find the associated `regions` record, then take the `id` of that record
- `dominance_level` set this to `1`

### 2. ROLV Alternate Names (`rolv_altnames.json`)

**File Structure:**

```json
{
  "ROLVCode": 12345,
  "LanguageTag": "en-US-x-HIS12345",
  "AlternateName": "American English"
}
```

**Mapping to Database:**

#### 2.1 one entry in the language_aliases Table

- `language_entity_id` = `LanguageTag`
- `alias_name` = `AlternateName`

**Note**: Must verify that `LanguageTag` exists in `language_entities` before creating alias.

## Processing Order

The seeding process must follow this specific order due to foreign key dependencies:

1. **First**: Process `iso-639-3.tab` → Creates base language entities
2. **Second**: Process `iso-639-3-macrolanguages.tab` → Sets up parent-child relationships
3. **Third**: Process `iso-639-3_Name_Index.tab` → Adds ISO 639-3 aliases
4. **Fourth**: Process `ROLV.json` → Creates dialect-level entities with regions
5. **Fifth**: Process `rolv_altnames.json` → Adds ROLV aliases
