## Schema and Field Mapping

### OmtTranslations → projects

- id: generate UUID for `projects.id`. Keep a mapping: `(omt_translation_id) → (project_id)`.
- translationName → `projects.name`.
- sourceLanguageId → manual map to `projects.source_language_entity_id`.
- motherTongueId → manual map to `projects.target_language_entity_id`.
- created_at/updated_at: set by DB defaults or use OMT timestamps if available.

### projects → audio_versions (one per project)

- name: `OMT` (or `OMT v{version}` if multiple per project are needed later).
- language_entity_id: `projects.target_language_entity_id`.
- bible_version_id: `bible-version-protestant-standard`.
- project_id: link to the created project.
- De-duplication key: `(project_id, name)`.

### OmtAudioFiles → media_files

- Association: via project’s `audio_version_id`.
- media_type: `audio`.
- language_entity_id: denormalize from `projects.target_language_entity_id`.
- object_key: `{timestamp}-{filename}.{ext}`; no bucket URL.
- storage_provider: `'r2'`.
- duration_seconds: from OMT `duration` (float → integer/real; floor or round appropriately).
- file_size: from OMT `fileSize`.
- version: from OMT `version`.
- chapter_id: from OMT `bookChapter` (e.g., `gen-1`).
  - If `bookChapter` is empty but `book` and `chapter` exist, derive the code (e.g., map numeric book to code, then concat `-{chapter}`).
- start_verse_id / end_verse_id:

  - start = first verse of chapter; end = last verse of chapter.
  - Example SQL:

    ```sql
    -- first
    SELECT v.id
    FROM verses v
    WHERE v.chapter_id = $1
    ORDER BY v.verse_number
    LIMIT 1;

    -- last
    SELECT v.id
    FROM verses v
    WHERE v.chapter_id = $1
    ORDER BY v.verse_number DESC
    LIMIT 1;
    ```

- Statuses (per requirements):
  - upload_status: `'uploaded'` if file present/copied.
  - publish_status: `'pending'`.
  - check_status: `'pending'`.

### OmtVerseTimestamps → media_files_verses

- Input: array of timestamps (seconds, float).
- Ordering: sort ascending and map 1:1 to verses of `chapter_id` in ascending `verse_number`.
- For N timestamps t[0..N-1] and M verses v[0..M-1]:
  - Use K = MIN(N, M).
  - For i in 0..K-1:
    - start_time_seconds = floor(t[i])
    - duration_seconds = floor((t[i+1] - t[i])) for i < K-1; for i = K-1 use `media_files.duration_seconds - start_time_seconds` (min 1).
  - If N != M, log discrepancy. Do not create beyond K rows.
- Insert rows `(media_file_id, verse_id, start_time_seconds, duration_seconds)`.
- Unique per `(media_file_id, verse_id)`.

### Mapping Keys and Idempotency

- Keep staging tables in the target DB:
  - `migration_omt_translations(omt_translation_id TEXT PRIMARY KEY, project_id UUID NOT NULL)`
  - `migration_omt_audio_to_media(omt_audio_id TEXT PRIMARY KEY, media_file_id UUID NOT NULL)`
- UPSERT strategy:
  - projects: match by `omt_translation_id` mapping; if not found, insert.
  - audio_versions: match by `(project_id, name)`.
  - media_files: match by `omt_audio_id` mapping or by `object_key` as secondary key.
  - media_files_verses: delete-and-reinsert for a given `media_file_id` or upsert by `(media_file_id, verse_id)`.

### Notes on Chapter/Verse Identity

- Production seed uses code-like IDs (e.g., `gen-1`, `gen-1-1`).
- Where type differences exist across environments, resolve `chapter_id` by code via a helper lookup and fetch verse IDs from DB rather than assuming formats.
