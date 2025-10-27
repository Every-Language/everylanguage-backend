## Runbook – Dev Migration (OMT AWS dev → everylanguage-backend-dev)

### Prerequisites

- Supabase project: `everylanguage-backend-dev` (service role for migration).
- AppSync (dev) endpoint/key from OMT CDK outputs.
- AWS credentials for source S3 bucket (read-only).
- R2 credentials (write to `el-backend-dev-media-files`).

### One-time Prep

1. Generate language mapping CSV (see `07-language-mapping.md`).
2. Review and finalize mappings for `sourceLanguageId` and `motherTongueId`.
3. Create migration mapping tables (see `06-sql-helpers.md`) in dev DB.

### Execution Steps

1. Export OMT translations and audio files via AppSync.
2. UPSERT `projects` and `audio_versions`:
   - `bible_version_id = 'bible-version-protestant-standard'`.
3. UPSERT `media_files` with chapter and verse range and statuses.
4. UPSERT `media_files_verses` from timestamps (sequential mapping).
5. Copy S3 objects → R2 (`el-backend-dev-media-files`) and set `object_key` (if not set already).

### Verification

- Counts parity: translations↔projects, audioFiles↔media_files, timestamps↔media_files_verses (≤, allowing truncation).
- Spot-check a chapter (e.g., `gen-1`): ensure verse mapping aligns and durations are sane.
- Generate a few signed URLs and fetch bytes to confirm R2 objects.

### Re-run

- Safe to re-run. The ETL performs UPSERTs and skips already-copied objects (by `object_key` + size).
- See `05-repeatable-sync.md` for idempotency details.
