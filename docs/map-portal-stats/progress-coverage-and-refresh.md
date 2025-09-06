### Progress Coverage and Refresh System

This doc explains the schema, views/materialized-views (MVs), the refresh queue, and how to schedule periodic refreshes.

### What you get

- Audio coverage (verse/chapter/book) and summaries per `audio_version_id`.
- Text coverage (verse/chapter/book) and summaries per `text_version_id`.
- Best version selectors per `language_entity_id`.
- Optional materialized views for fast reads.
- A refresh queue + Edge Function to update MVs after writes.

### Read models

- Views:
  - Audio: `audio_verse_coverage`, `audio_chapter_coverage`, `audio_book_coverage`, `audio_version_progress_summary`
  - Text: `text_verse_coverage`, `text_chapter_coverage`, `text_book_coverage`, `text_version_progress_summary`
  - Best version: `language_entity_best_audio_version`, `language_entity_best_text_version`
- MVs (preferred in prod):
  - Audio: `mv_audio_verse_coverage`, `mv_audio_chapter_coverage`, `mv_audio_book_coverage`, `mv_audio_version_progress_summary`
  - Text: `mv_text_verse_coverage`, `mv_text_chapter_coverage`, `mv_text_book_coverage`, `mv_text_version_progress_summary`

See `docs/frontend-progress-guide.md` for supabase-js examples.

### Refresh system

- Queue table: `progress_refresh_queue(kind text, version_id uuid)`
- Triggers enqueue when relevant data changes:
  - `media_files`, `media_files_verses` (audio)
  - `verse_texts` (text)
- RPC functions:
  - `refresh_progress_materialized_views_full()` — initial populate (non-concurrent).
  - `refresh_progress_materialized_views_concurrently()` — normal path (requires unique indexes on MVs).
  - `refresh_progress_materialized_views_safe()` — concurrent refresh with full fallback.
  - `drain_progress_refresh_queue()` — refresh MVs and delete all queue items.

### Edge Function

- `supabase/functions/refresh-progress/index.ts`
  - POST invokes the RPC `drain_progress_refresh_queue` and returns drained items.
  - Requires env: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (set via Supabase dashboard or local `.env` when serving).

### Local testing

- Seed sample data:
  - `psql ... -f scripts/db_tests/progress_views_test.sql`
- Drain via SQL:
  - `select * from drain_progress_refresh_queue();`
- Or run the function locally:
  - `supabase functions serve --no-verify-jwt refresh-progress --env-file supabase/.env`
  - `curl -X POST http://127.0.0.1:54321/functions/v1/refresh-progress`

### Scheduling (Supabase cron)

1. Deploy the Edge Function `refresh-progress` to your project.
2. In Supabase Dashboard → Edge Functions → Add Schedule:
   - Name: `refresh-progress-cron`
   - Function: `refresh-progress`
   - Schedule: e.g. `every 15 minutes` or a CRON expression `*/15 * * * *`
   - Auth: No JWT verification (uses anon). Ensure anon key has permission to call the RPC (default PostgREST).

Notes:

- If your dataset or write rate is high, you can also run the Edge Function more frequently or add a manual GitHub Action hitting the function endpoint post-deploy.
- For strict isolation, you can secure the function with a secret header and check it in the handler.

### Operational tips

- On first deployment, run `refresh_progress_materialized_views_full()` once to populate MVs.
- Thereafter, rely on the queue + cron-driven refreshes.
- Monitor MV query latency and queue size; adjust cron frequency as needed.
- All migrations were created using `supabase migrations new`; CI/CD will apply them in production.
