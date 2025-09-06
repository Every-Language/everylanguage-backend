### Materialized Views Optimization Plan for Progress Coverage

This document describes how to convert the progress views into materialized views (MVs), add indexes, and implement a targeted refresh strategy that keeps read latency low while avoiding heavy recomputation.

### Goals

- **Fast reads** for coverage at verse/chapter/book/version levels.
- **Incremental refresh** limited to affected versions after writes.
- **Simplicity first**: start with views; adopt MVs once needed.

### Materialized Views to Create

Create MVs mirroring the logical views:

- `mv_audio_verse_coverage(audio_version_id, verse_id)`
- `mv_audio_chapter_coverage(audio_version_id, chapter_id, covered_verses, total_verses, has_any, is_complete)`
- `mv_audio_book_coverage(audio_version_id, book_id, complete_chapters, total_chapters, is_complete)`
- `mv_audio_version_progress_summary(audio_version_id, covered_verses, total_verses, verse_fraction, chapters_with_audio, total_chapters, chapter_fraction, books_complete, total_books, book_fraction)`

- `mv_text_verse_coverage(text_version_id, verse_id)`
- `mv_text_chapter_coverage(text_version_id, chapter_id, verses_with_text, total_verses, is_complete)`
- `mv_text_book_coverage(text_version_id, book_id, complete_chapters, total_chapters, is_complete)`
- `mv_text_version_progress_summary(text_version_id, covered_verses, total_verses, verse_fraction, complete_chapters, total_chapters, chapter_fraction, books_complete, total_books, book_fraction)`

Build each MV from the corresponding view definition already implemented in migrations.

### Indexes on MVs

Add indexes to support point lookups and joins:

- `mv_audio_verse_coverage`: unique `(audio_version_id, verse_id)`
- `mv_audio_chapter_coverage`: `(audio_version_id, chapter_id)`
- `mv_audio_book_coverage`: `(audio_version_id, book_id)`
- `mv_audio_version_progress_summary`: primary key `(audio_version_id)`

- `mv_text_verse_coverage`: unique `(text_version_id, verse_id)`
- `mv_text_chapter_coverage`: `(text_version_id, chapter_id)`
- `mv_text_book_coverage`: `(text_version_id, book_id)`
- `mv_text_version_progress_summary`: primary key `(text_version_id)`

### Refresh Strategy

Use a small queue to capture which versions changed and refresh only the affected rows.

1. Queue tables:

```sql
create table if not exists progress_refresh_queue (
  id bigserial primary key,
  kind text not null check (kind in ('audio', 'text')),
  version_id uuid not null,
  enqueued_at timestamp with time zone default now(),
  unique (kind, version_id)
);
```

2. Enqueue on writes:

- Audio changes enqueue `('audio', audio_version_id)` on:
  - insert/update/delete to `media_files` where the row qualifies for bible audio (media_type='audio', is_bible_audio, completed+published) OR transitions in/out of that state
  - insert/update/delete to `media_files_verses`
- Text changes enqueue `('text', text_version_id)` on:
  - insert/update/delete to `verse_texts` (non-deleted)

Implement with lightweight triggers that `insert ... on conflict do nothing` into `progress_refresh_queue` when the related version_id is known.

3. Refresh job:

- A scheduled job (Supabase cron or an Edge Function invoked by scheduler) drains the queue in batches.
- For each `(kind, version_id)`:
  - Refresh dependent MVs in dependency order. Use `REFRESH MATERIALIZED VIEW CONCURRENTLY` if indexes are present.

Example pseudo-flow for audio:

```sql
-- Refresh leaf
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_verse_coverage;

-- Dependent rollups
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_chapter_coverage;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_book_coverage;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audio_version_progress_summary;
```

Because Postgres MVs don’t support predicate refresh (per-version) directly, there are two approaches:

- Simple: refresh full MVs; acceptable while dataset size is modest.
- Advanced: partition MVs by version (e.g., one MV per version via parameterized tables or table partitions) to enable small-scope refresh. Only adopt if full refresh becomes too slow.

4. Clearing the queue:

- After successful refresh, `delete from progress_refresh_queue where kind=... and version_id=...`.
- Use a retry strategy and dead-letter table for failures to avoid losing signals.

### API Consumption

- Update read paths to prefer the MVs when present; fall back to views if MVs are missing.
- For `language_entity` queries, read from `language_entity_best_audio_version` / `language_entity_best_text_version` (or MV equivalents, if you later materialize those as well).

### Rollout Plan

1. Measure baseline with views and added indexes.
2. If P95 latency is high or concurrent load increases, enable MVs for the heaviest views first:
   - `mv_audio_verse_coverage` and `mv_text_verse_coverage`.
3. Add chapter/book/version MVs.
4. Introduce enqueue triggers and the scheduled refresh job.
5. Monitor job runtime and view query latency; consider MV partitioning if necessary.

### Notes

- Keep all write-side triggers minimal and resilient.
- Maintain the `created_by` FKs to `public.users` consistently.
- Do not run refreshes against production outside CI/CD deployment or scheduled jobs.
