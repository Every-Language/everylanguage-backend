## Repeatable Sync (Idempotent Re-run)

### Goals

- Allow manual re-runs as legacy apps continue writing to OMT AWS.
- Avoid duplicates in projects, audio_versions, media_files, media_files_verses.
- Re-copy missing or mismatched files only.

### Strategies

- Maintain source→target mapping tables:
  - `migration_omt_translations(omt_translation_id TEXT PRIMARY KEY, project_id UUID)`
  - `migration_omt_audio_to_media(omt_audio_id TEXT PRIMARY KEY, media_file_id UUID)`
- Use UPSERTs with natural keys:
  - projects: lookup via mapping table; otherwise insert and record mapping.
  - audio_versions: `(project_id, name)` unique.
  - media_files: prefer mapping via `omt_audio_id`; fallback to matching `object_key` if unique.
  - media_files_verses: delete-and-reinsert for a given media_file_id to fully refresh from timestamps.

### File Sync Rules

- Before copy, HEAD on R2 by `object_key`:
  - If exists and sizes match → skip copy.
  - If missing or size mismatch → (re)copy.
- Keep a manifest (object_key → size, last_copied_at) for quick decisions.

### Ordering and Batching

- Run in order: projects → audio_versions → media_files → media_files_verses → file copy.
- Batch sizes: 500–1000 rows per insert; 5–20 concurrent file copies.

### Failure Handling

- Log per-record failures with source IDs and reason.
- Continue with next records; summarize failures at end.
- Safe to re-run only failed segments.

### Cutover Considerations

- For final cutover, run a last sync, then flip client apps to EL backend.
- Optionally, freeze writes on OMT for a short window before final re-run.
