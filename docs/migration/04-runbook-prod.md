## Runbook – Prod Migration (OMT AWS prod → everylanguage-backend-prod)

### Prerequisites

- Supabase project: `everylanguage-backend-prod` (service role for migration).
- AppSync (prod) endpoint/key from OMT CDK outputs.
- AWS credentials for source S3 bucket (read-only).
- R2 credentials (write to `el-backend-prod-media-files`).

### One-time Prep

1. Finalize language mappings (ideally copied from dev if identical).
2. Create migration mapping tables (see `06-sql-helpers.md`) in prod DB.

### Execution Steps

1. Export OMT translations and audio files via AppSync.
2. UPSERT `projects` and `audio_versions` with `bible_version_id = 'bible-version-protestant-standard'`.
3. UPSERT `media_files` and `media_files_verses` (same logic as dev).
4. Copy S3 objects → R2 (`el-backend-prod-media-files`) and set `object_key`.

### Verification

- Counts parity and spot checks as in dev.
- Review analytics/coverage views refresh results.

### Re-run

- Same idempotent re-run process as dev.
