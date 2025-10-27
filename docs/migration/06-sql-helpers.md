## SQL Helpers and Function Specs

### 1) Mapping Tables (idempotent)

```sql
CREATE TABLE IF NOT EXISTS migration_omt_translations (
  omt_translation_id TEXT PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS migration_omt_audio_to_media (
  omt_audio_id TEXT PRIMARY KEY,
  media_file_id UUID NOT NULL REFERENCES media_files (id) ON DELETE CASCADE
);
```

### 2) Helper Views/Lookups

- First/last verse for a chapter:

```sql
-- first
CREATE OR REPLACE VIEW vw_first_verse_per_chapter AS
SELECT DISTINCT ON (v.chapter_id)
  v.chapter_id,
  v.id AS first_verse_id
FROM verses v
ORDER BY v.chapter_id, v.verse_number ASC;

-- last
CREATE OR REPLACE VIEW vw_last_verse_per_chapter AS
SELECT DISTINCT ON (v.chapter_id)
  v.chapter_id,
  v.id AS last_verse_id
FROM verses v
ORDER BY v.chapter_id, v.verse_number DESC;
```

### 3) Upsert Routines (SECURITY DEFINER)

- Implement as `LANGUAGE SQL` or `plpgsql` functions that:
  - take payload arrays (JSONB) for batch work
  - upsert `projects`, `audio_versions`, `media_files`
  - write mapping tables
  - delete-and-reinsert `media_files_verses` for a given `media_file_id`
- Example signature sketches:

```sql
CREATE OR REPLACE FUNCTION migration_upsert_projects(p_items JSONB)
RETURNS VOID
SECURITY DEFINER
AS $$
-- iterate JSONB array and upsert rows; write to migration_omt_translations
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION migration_upsert_audio_versions(p_items JSONB)
RETURNS VOID
SECURITY DEFINER
AS $$
-- iterate and upsert; keyed by (project_id, name)
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION migration_upsert_media_files(p_items JSONB)
RETURNS VOID
SECURITY DEFINER
AS $$
-- iterate; set chapter_id, start_verse_id, end_verse_id; statuses; object_key
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION migration_refresh_media_files_verses(p_items JSONB)
RETURNS VOID
SECURITY DEFINER
AS $$
-- items: [ { media_file_id, chapter_id, timestamps: [ ... ], duration } ]
-- delete existing for media_file_id; insert sequential verse mappings
$$ LANGUAGE plpgsql;
```

### 4) Permissions

- Mark functions SECURITY DEFINER and owned by a role with required privileges.
- Expose only to the migration operator role.

### 5) Verification Queries

```sql
-- Counts parity
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM media_files;
SELECT COUNT(*) FROM media_files_verses;

-- Sample join coverage
SELECT mf.id, mf.chapter_id, COUNT(mfv.*) AS verse_rows
FROM media_files mf
LEFT JOIN media_files_verses mfv ON mfv.media_file_id = mf.id
GROUP BY mf.id, mf.chapter_id
ORDER BY verse_rows ASC
LIMIT 20;
```
