### Frontend Guide: Querying Bible Progress via Supabase

This guide shows how a frontend (using supabase-js) can query verse/chapter/book progress for a specific version or a language entity.

Prereqs

- You have a Supabase client: `const supabase = createClient(SUPABASE_URL, ANON_KEY)`
- Public RLS allows reads on the views.

Key views (logical views; MV equivalents prefixed with `mv_`)

- Audio:
  - `audio_version_progress_summary` (one row per `audio_version_id`)
  - `audio_book_coverage` (rows keyed by `(audio_version_id, book_id)`)
  - `audio_chapter_coverage` (rows keyed by `(audio_version_id, chapter_id)`)
  - Best version for a language: `language_entity_best_audio_version`
- Text:
  - `text_version_progress_summary` (one row per `text_version_id`)
  - `text_book_coverage` (rows keyed by `(text_version_id, book_id)`)
  - `text_chapter_coverage` (rows keyed by `(text_version_id, chapter_id)`)
  - Best version for a language: `language_entity_best_text_version`

Use materialized views when they exist for faster reads:

- Replace the table names above with:
  - `mv_audio_*` and `mv_text_*` (e.g., `mv_audio_version_progress_summary`).
- Fallback to logical views if MVs are not present.

Selecting a version for a language_entity

```ts
// Given a languageEntityId (UUID)
const { data: bestAudio, error: bestAudioErr } = await supabase
  .from('language_entity_best_audio_version')
  .select('*')
  .eq('language_entity_id', languageEntityId)
  .single();

const audioVersionId = bestAudio?.audio_version_id ?? null;

const { data: bestText, error: bestTextErr } = await supabase
  .from('language_entity_best_text_version')
  .select('*')
  .eq('language_entity_id', languageEntityId)
  .single();

const textVersionId = bestText?.text_version_id ?? null;
```

Overall progress for a specific version

```ts
// Audio
const { data: audioSummary } = await supabase
  .from('mv_audio_version_progress_summary') // or 'audio_version_progress_summary'
  .select('*')
  .eq('audio_version_id', audioVersionId)
  .single();

// Text
const { data: textSummary } = await supabase
  .from('mv_text_version_progress_summary') // or 'text_version_progress_summary'
  .select('*')
  .eq('text_version_id', textVersionId)
  .single();
```

Per-book progress for a version

```ts
// Audio: books complete when all chapters complete
const { data: audioBooks } = await supabase
  .from('mv_audio_book_coverage') // or 'audio_book_coverage'
  .select('*')
  .eq('audio_version_id', audioVersionId)
  .order('book_id');

// Text: books complete when all chapters complete
const { data: textBooks } = await supabase
  .from('mv_text_book_coverage') // or 'text_book_coverage'
  .select('*')
  .eq('text_version_id', textVersionId)
  .order('book_id');
```

Per-chapter progress for a version

```ts
// Audio: has_any indicates at least one covered verse; is_complete means all verses covered
const { data: audioChapters } = await supabase
  .from('mv_audio_chapter_coverage') // or 'audio_chapter_coverage'
  .select('*')
  .eq('audio_version_id', audioVersionId)
  .order('chapter_id');

// Text: is_complete means all verses present
const { data: textChapters } = await supabase
  .from('mv_text_chapter_coverage') // or 'text_chapter_coverage'
  .select('*')
  .eq('text_version_id', textVersionId)
  .order('chapter_id');
```

Per-verse coverage for a version

```ts
// Audio: union of explicit verse mappings, chapter-level files, and verse-range files
const { data: audioVerses } = await supabase
  .from('mv_audio_verse_coverage') // or 'audio_verse_coverage'
  .select('verse_id')
  .eq('audio_version_id', audioVersionId);

// Text: verses that have verse_texts
const { data: textVerses } = await supabase
  .from('mv_text_verse_coverage') // or 'text_verse_coverage'
  .select('verse_id')
  .eq('text_version_id', textVersionId);
```

Notes

- All coverage respects deletions/publish status, so reads are safe for public use.
- Prefer MV tables for production if available, and fall back to logical views in development or before MV rollout.
- If you need specific ordering (biblical order), join on `chapters`/`books` or use a helper query that returns `global_order`.
