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

### 1. ISO 639-3 Main Code Set (`iso-639-3.tab`)

**File Structure:**

```
Id	Part2b	Part2t	Part1	Scope	Language_Type	Ref_Name	Comment
eng	eng	eng	en	I	L	English
ara	ara	ara	ar	M	L	Arabic
```

**Mapping to Database:**

#### 1.1 language_entities Table

Add an entry in `language_entities` for each entry in the iso-639-3.tab

- **Primary Key**: `id` = UUID (not the iso 639 Id)
- **Name**: `name` = `Ref_Name` field
- **Level**: `level` = derived from `Scope` field:
  - `M` (Macrolanguage) → `"family"`
  - `I` (Individual) → `"language"`
  - `S` (Special) → `"language"`
- **Parent**: `parent_id` = NULL initially (will be set from macrolanguages file)

Also, we need to add one/two entries in `language_entity_sources` for each entry in iso-639-3.tab

- `id` UUID
- `language_entity_id` references the UUID of the created language entity
- `source` = "SIL"
- `version` = "2023"
- `is_external` = TRUE
- `external_id_type` = "iso-639-3"
- `external_id` ISO 639-3.tab `Id` field
- `created_by` null

AND (only if `part1` is not empty)

- `id` UUID
- `language_entity_id` references the UUID of the created language entity
- `source` = "SIL"
- `version` = "2023"
- `is_external` = TRUE
- `external_id_type` = "iso-639-2"
- `external_id` ISO 639-3.tab `Part1` field
- `created_by` null

Also, we need to add an entry in the `language_properties` table for each entry in the iso-639-3.tab

- `language_entity_id` = UUID referencing the created language entity
- `key` = `"iso_639_language_type"`
- `value` = `Language_Type` field (`L`, `E`, `A`, `H`, `C`, `S`), but mapped to the full word (Living, Extinct, Ancient, Historical, Constructed, Special)

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

- Find language_entities_sources with `external_id` = `I_Id`, then find the associated language_entity
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

- Find language_entities_sources with `external_id` = `I_Id`, then find the associated language_entity
- then add an entry to language_aliases:
- `id` UUID
- `language_entity_id` references the language_entity found above
- `alias_name` = `Print_Name`

**Entry 2 - Inverted Name (if different):**

- Find language_entities_sources with `external_id` = `I_Id`, then find the associated language_entity
- then add an entry to language_aliases:
- `id` UUID
- `language_entity_id` references the language_entity found above
- `alias_name` = `Inverted_Name`
- **Condition**: Only create if `Inverted_Name` ≠ `Print_Name`
