## Language Mapping Workflow

### Goal

Map OMT `sourceLanguageId` and `motherTongueId` to `language_entities.id` in EL backend.

### Process

1. Export candidate list with heuristics:
   - Match by exact name, alias, ISO code, or ROD dialect code when available.
   - Produce CSV with columns: `omt_translation_id, sourceLanguageId, motherTongueId, omt_name, candidates_json`.
2. Manually review CSV, selecting the correct `language_entities.id` for both source and target.
3. Save an approved CSV with columns:
   - `omt_translation_id, source_language_entity_id, target_language_entity_id`
4. ETL uses this CSV to set `projects.source_language_entity_id` and `projects.target_language_entity_id`.
5. Denormalize `projects.target_language_entity_id` into `media_files.language_entity_id` for child media.

### Notes

- Ambiguities are expected; document rationale for chosen IDs in a comments column.
- Keep the approved CSV under `docs/migration/artifacts/` for dev and prod separately.
