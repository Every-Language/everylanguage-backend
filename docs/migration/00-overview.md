## OMT → EL Backend Migration Overview

### Scope

- **Source**: AWS AppSync/Dynamo-backed OMT backend (via `omt_backend_cdk`) – OmtTranslations, OmtAudioFiles, OmtVerseTimestamps, and audio files in S3.
- **Target**: Supabase Postgres + R2-backed EL backend (`el-backend`) – projects, audio_versions, media_files, media_files_verses, and audio files in Cloudflare R2.

### Environments

- **Dev**: OMT AWS dev → Supabase project `everylanguage-backend-dev`.
- **Prod**: OMT AWS prod → Supabase project `everylanguage-backend-prod`.
- Staging: not migrated.

### Entities and Mapping

- **OmtTranslations → projects**
  - `id` → new `projects.id` (UUID). Keep a mapping table for re-runs.
  - `translationName` → `projects.name`.
  - `sourceLanguageId` → manual map to `projects.source_language_entity_id`.
  - `motherTongueId` → manual map to `projects.target_language_entity_id`.
  - Denormalize `projects.target_language_entity_id` to `media_files.language_entity_id` for all child media.
- **projects → audio_versions (new per project)**
  - `name`: `OMT` (or `OMT v{version}` when needed)
  - `language_entity_id`: `projects.target_language_entity_id`
  - `bible_version_id`: `bible-version-protestant-standard`
  - `project_id`: the project created from the translation
- **OmtAudioFiles → media_files**
  - Maintain association to the project’s `audio_version_id`.
  - `bookChapter` → `media_files.chapter_id` (chapter like `gen-1`).
  - Auto-fill `start_verse_id` and `end_verse_id` as first and last verse of the chapter.
  - Files: copy S3 → R2 and set `media_files.object_key`, `storage_provider = 'r2'`.
  - Status mapping: `upload_status='uploaded'`, `publish_status='pending'`, `check_status='pending'`.
- **OmtVerseTimestamps → media_files_verses**
  - Convert array of timestamps into per-verse rows, mapped sequentially to the chapter’s verses.
  - Compute `start_time_seconds` from each timestamp; `duration_seconds` from the gap to the next timestamp; last one uses media duration tail.

### Object Key Strategy (R2)

- Use `{timestamp}-{filename}.{extension}` (e.g., `1754634514201-Bhujel_Psalms_Chapter116_V001_019.mp3`).
- Store in `media_files.object_key` and set `storage_provider = 'r2'`.
- Buckets are environment-specific (dev/prod).

### Repeatable Sync (Manual, Idempotent)

- Re-runnable on demand; not real-time.
- Maintain mapping tables for source IDs to target IDs.
- UPSERTs for projects, audio_versions, media_files.
- Copy files only when missing or size differs; re-copy on mismatch.
- Emit a reconciliation report (counts, diffs, failures).

### High-level Steps

1. Discover and export OMT via AppSync.
2. Prepare language mapping CSV (manual approval): map `sourceLanguageId` and `motherTongueId`.
3. Insert/UPSERT `projects` and `audio_versions`.
4. Insert/UPSERT `media_files` (chapter_id, verse range, statuses, object_key, sizes, durations).
5. Insert/UPSERT `media_files_verses` from timestamps.
6. Copy S3 objects to R2; verify; set `object_key` if not already set.
7. Verification: counts parity, spot checks, coverage views refresh.

### Safety and Constraints

- Use Supabase service role or SECURITY DEFINER functions to bypass RLS during migration.
- Batched, transactional writes per logical group.
- No destructive operations on existing target data.

### References

- Source GraphQL schema: `omt_backend_cdk/lib/api/graphql/schema.graphql`
- Target DB schema: migrations under `el-backend/supabase/migrations/`
