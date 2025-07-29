# Language Data Seeding Plan

This document outlines the detailed mapping strategy for seeding the language database from ISO 639-3 and ROLV data sources.

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
  - `external_id` (string)
  - `version` (string)
  - `is_external` (boolean)

- **`language_aliases`**: Alternative names for language entities

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
  - `dominance_level` (number)

## Data Source Mapping

### 1. ISO 639-3 Main Code Set (`iso-639-3.tab`)

**File Structure:**

```
Id	Part2b	Part2t	Part1	Scope	Language_Type	Ref_Name	Comment
eng	eng	eng	en	I	L	English
ara	ara	ara	ar	M	L	Arabic
```

**Mapping to Database:**

#### 1.1 language_entities Table

- **Primary Key**: `id` = ISO 639-3 `Id` field
- **Name**: `name` = `Ref_Name` field
- **Level**: `level` = derived from `Scope` field:
  - `M` (Macrolanguage) → `"family"`
  - `I` (Individual) → `"language"`
  - `S` (Special) → `"language"`
- **Parent**: `parent_id` = NULL initially (will be set from macrolanguages file)

#### 1.2 language_entity_sources Table

Create **two entries** per language:

**Entry 1 - ISO 639-3 Code:**

- `language_entity_id` = ISO 639-3 `Id`
- `source` = `"SIL"`
- `external_id` = ISO 639-3 `Id`
- `version` = `"2025"`
- `is_external` = `true`

**Entry 2 - ISO 639-1 Code (if exists):**

- `language_entity_id` = ISO 639-3 `Id`
- `source` = `"SIL"`
- `external_id` = `Part1` field value
- `version` = `"2025"`
- `is_external` = `true`
- **Condition**: Only create if `Part1` is not empty

#### 1.3 language_properties Table

- `language_entity_id` = ISO 639-3 `Id`
- `key` = `"language_type"`
- `value` = `Language_Type` field (`L`, `E`, `A`, `H`, `C`, `S`)

**Note**: The `Comment` field is not stored as specified by requirements.

### 2. ISO 639-3 Macrolanguages (`iso-639-3-macrolanguages.tab`)

**File Structure:**

```
M_Id	I_Id	I_Status
ara	aao	A
ara	abh	A
```

**Mapping to Database:**

#### 2.1 Update language_entities.parent_id

For each row where `I_Status` = `"A"` (Active):

- Find language_entity with `id` = `I_Id`
- Set `parent_id` = `M_Id`
- This creates the hierarchical relationship: Individual Language → Macrolanguage

### 3. ISO 639-3 Name Index (`iso-639-3_Name_Index.tab`)

**File Structure:**

```
Id	Print_Name	Inverted_Name
eng	English	English
spa	Spanish	Spanish
spa	Castilian	Castilian
```

**Mapping to Database:**

#### 3.1 language_aliases Table

Create **two entries** per row (if different):

**Entry 1 - Print Name:**

- `language_entity_id` = `Id`
- `alias_name` = `Print_Name`

**Entry 2 - Inverted Name (if different):**

- `language_entity_id` = `Id`
- `alias_name` = `Inverted_Name`
- **Condition**: Only create if `Inverted_Name` ≠ `Print_Name`

### 4. ROLV Main Data (`ROLV.json`)

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

#### 4.1 language_entities Table

- **Primary Key**: `id` = `LanguageTag` field
- **Name**: `name` = `VarietyName` field
- **Level**: `level` = `"dialect"`
- **Parent**: `parent_id` = `LanguageCode` field (must exist in language_entities)

#### 4.2 language_entity_sources Table

Create **two entries** per ROLV record:

**Entry 1 - ROLV Code:**

- `language_entity_id` = `LanguageTag`
- `source` = `"GRN"`
- `external_id` = `ROLVCode` (convert to string)
- `version` = `"2025"`
- `is_external` = `true`

**Entry 2 - IETF Language Tag:**

- `language_entity_id` = `LanguageTag`
- `source` = `"IETF"`
- `external_id` = `LanguageTag`
- `version` = `"2025"`
- `is_external` = `true`

#### 4.3 Region Mapping

**Prerequisites**: Ensure regions exist for country codes and location names.

**Process**:

1. **Find/Create Country Region**:

   - Look up region with `name` = country name derived from `CountryCode`
   - If not found, create region with `level` = `"country"`

2. **Find/Create Location Region** (if `LocationName` is more specific):

   - Parse `LocationName` for sub-regions (e.g., "United States, California")
   - Create hierarchical regions as needed
   - Most specific region gets `level` = `"state"` or `"province"`

3. **Link Language to Regions**:
   - Create entry in `language_entities_regions`
   - `language_entity_id` = `LanguageTag`
   - `region_id` = most specific region ID
   - `dominance_level` = NULL (or assign based on business rules)

### 5. ROLV Alternate Names (`rolv_altnames.json`)

**File Structure:**

```json
{
  "ROLVCode": 12345,
  "LanguageTag": "en-US-x-HIS12345",
  "AlternateName": "American English"
}
```

**Mapping to Database:**

#### 5.1 language_aliases Table

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

## Data Validation Rules

### Language Entity Creation

- **Unique Constraint**: `language_entities.id` must be unique
- **Parent Validation**: `parent_id` must exist in `language_entities` table
- **Level Hierarchy**: Ensure logical hierarchy (family → language → dialect → mother_tongue)

### Source Tracking

- **Unique Constraint**: (`language_entity_id`, `source`, `external_id`) must be unique
- **External ID Format**: Validate format based on source type

### Alias Management

- **Unique Constraint**: (`language_entity_id`, `alias_name`) must be unique
- **Non-empty**: `alias_name` cannot be empty or whitespace-only

### Region Handling

- **Country Code Mapping**: Use ISO 3166-1 alpha-2 codes for country lookup
- **Location Parsing**: Handle complex location strings with multiple administrative levels
- **Hierarchy Validation**: Ensure region parent-child relationships are logical

## Expected Outcomes

After successful seeding:

- **~7,900 ISO 639-3 languages** (family + individual language levels)
- **~30,000+ ROLV varieties** (dialect level)
- **~50,000+ aliases** from both sources
- **Complete source tracking** for all external data
- **Rich geographical relationships** via regions
- **Hierarchical language structure** supporting complex queries

## Error Handling

### Missing Parent References

- **ROLV entries** with `LanguageCode` not in `language_entities`: Log warning, skip entry
- **Macrolanguage mappings** with invalid codes: Log warning, skip mapping

### Duplicate Handling

- **Duplicate language entities**: Use `ON CONFLICT` to skip
- **Duplicate aliases**: Use `ON CONFLICT` to skip
- **Duplicate sources**: Use `ON CONFLICT` to update version if newer

### Data Quality Issues

- **Empty/invalid names**: Skip record, log warning
- **Invalid enum values**: Skip record, log error
- **Region resolution failures**: Create minimal region entry, log warning

This plan ensures comprehensive language data coverage while maintaining data integrity and traceability back to original sources.
