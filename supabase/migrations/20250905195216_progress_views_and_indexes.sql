-- Progress Views and Indexes
-- ============================================================
-- This migration adds views to compute audio/text coverage at
-- verse, chapter, and book levels; plus version-level summaries
-- and supporting indexes. Deleted rows are excluded.
-- Guard: drop views if they already exist (idempotent for re-runs)
DO $$ BEGIN
  EXECUTE 'DROP VIEW IF EXISTS language_entity_best_audio_version CASCADE';
EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN
  EXECUTE 'DROP VIEW IF EXISTS language_entity_best_text_version CASCADE';
EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN
  EXECUTE 'DROP VIEW IF EXISTS audio_version_progress_summary CASCADE';
EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN
  EXECUTE 'DROP VIEW IF EXISTS text_version_progress_summary CASCADE';
EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN
  EXECUTE 'DROP VIEW IF EXISTS audio_book_coverage CASCADE';
EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN
  EXECUTE 'DROP VIEW IF EXISTS text_book_coverage CASCADE';
EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN
  EXECUTE 'DROP VIEW IF EXISTS audio_chapter_coverage CASCADE';
EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN
  EXECUTE 'DROP VIEW IF EXISTS text_chapter_coverage CASCADE';
EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN
  EXECUTE 'DROP VIEW IF EXISTS audio_verse_coverage CASCADE';
EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN
  EXECUTE 'DROP VIEW IF EXISTS text_verse_coverage CASCADE';
EXCEPTION WHEN others THEN NULL; END $$;


-- ============================================================
-- Base verse coverage views
-- ============================================================
-- Audio verse coverage: include only live, published, bible audio files.
CREATE OR REPLACE VIEW audio_verse_coverage AS (
  -- Explicit verse mappings
  SELECT DISTINCT
    mf.audio_version_id,
    mfv.verse_id
  FROM
    media_files mf
    JOIN media_files_verses mfv ON mfv.media_file_id = mf.id
  WHERE
    mf.deleted_at IS NULL
    AND mf.media_type = 'audio'
    AND mf.is_bible_audio IS TRUE
    AND mf.upload_status = 'completed'
    AND mf.publish_status = 'published'
    AND mfv.deleted_at IS NULL
    AND mf.audio_version_id IS NOT NULL
)
UNION
(
  -- Chapter-level files -> expand to all verses in the chapter
  SELECT DISTINCT
    mf.audio_version_id,
    v.id AS verse_id
  FROM
    media_files mf
    JOIN verses v ON v.chapter_id = mf.chapter_id
  WHERE
    mf.deleted_at IS NULL
    AND mf.media_type = 'audio'
    AND mf.is_bible_audio IS TRUE
    AND mf.upload_status = 'completed'
    AND mf.publish_status = 'published'
    AND mf.chapter_id IS NOT NULL
    AND mf.audio_version_id IS NOT NULL
)
UNION
(
  -- Verse-range files -> expand by verses.global_order
  SELECT DISTINCT
    mf.audio_version_id,
    v.id AS verse_id
  FROM
    media_files mf
    JOIN verses vs ON vs.id = mf.start_verse_id
    LEFT JOIN verses ve ON ve.id = mf.end_verse_id
    JOIN verses v ON v.global_order BETWEEN vs.global_order AND COALESCE(ve.global_order, vs.global_order)
  WHERE
    mf.deleted_at IS NULL
    AND mf.media_type = 'audio'
    AND mf.is_bible_audio IS TRUE
    AND mf.upload_status = 'completed'
    AND mf.publish_status = 'published'
    AND mf.start_verse_id IS NOT NULL
    AND mf.audio_version_id IS NOT NULL
);


comment ON view audio_verse_coverage IS 'Audio verse coverage for bible audio files (live/published only).';


-- Text verse coverage: only non-deleted text and versions
CREATE OR REPLACE VIEW text_verse_coverage AS
SELECT
  vt.text_version_id,
  vt.verse_id
FROM
  verse_texts vt
  JOIN text_versions tv ON tv.id = vt.text_version_id
WHERE
  vt.deleted_at IS NULL
  AND tv.deleted_at IS NULL;


comment ON view text_verse_coverage IS 'Text verse coverage per text_version (non-deleted only).';


-- ============================================================
-- Aggregations: chapter and book
-- ============================================================
-- Audio chapter coverage: has_any + completeness vs total_verses
CREATE OR REPLACE VIEW audio_chapter_coverage AS
SELECT
  avc.audio_version_id,
  v.chapter_id,
  COUNT(DISTINCT avc.verse_id) AS covered_verses,
  c.total_verses,
  (COUNT(DISTINCT avc.verse_id) > 0) AS has_any,
  (COUNT(DISTINCT avc.verse_id) = c.total_verses) AS is_complete
FROM
  audio_verse_coverage avc
  JOIN verses v ON v.id = avc.verse_id
  JOIN chapters c ON c.id = v.chapter_id
GROUP BY
  avc.audio_version_id,
  v.chapter_id,
  c.total_verses;


comment ON view audio_chapter_coverage IS 'Audio coverage aggregated to chapter level.';


-- Audio book coverage: book is complete when all its chapters are complete
CREATE OR REPLACE VIEW audio_book_coverage AS
WITH
  chapters_per_book AS (
    SELECT
      b.id AS book_id,
      COUNT(*) AS total_chapters
    FROM
      chapters c
      JOIN books b ON b.id = c.book_id
    GROUP BY
      b.id
  ),
  chapters_complete AS (
    SELECT
      acc.audio_version_id,
      c.book_id,
      COUNT(*) AS complete_chapters
    FROM
      audio_chapter_coverage acc
      JOIN chapters c ON c.id = acc.chapter_id
    WHERE
      acc.is_complete
    GROUP BY
      acc.audio_version_id,
      c.book_id
  )
SELECT
  cpb.book_id,
  cc.audio_version_id,
  cc.complete_chapters,
  cpb.total_chapters,
  (
    COALESCE(cc.complete_chapters, 0) = cpb.total_chapters
  ) AS is_complete
FROM
  chapters_per_book cpb
  LEFT JOIN chapters_complete cc ON cc.book_id = cpb.book_id;


comment ON view audio_book_coverage IS 'Audio coverage aggregated to book level (complete only if all chapters complete).';


-- Text chapter coverage: completeness vs total_verses
CREATE OR REPLACE VIEW text_chapter_coverage AS
SELECT
  tvc.text_version_id,
  v.chapter_id,
  COUNT(DISTINCT tvc.verse_id) AS verses_with_text,
  c.total_verses,
  (COUNT(DISTINCT tvc.verse_id) = c.total_verses) AS is_complete
FROM
  text_verse_coverage tvc
  JOIN verses v ON v.id = tvc.verse_id
  JOIN chapters c ON c.id = v.chapter_id
GROUP BY
  tvc.text_version_id,
  v.chapter_id,
  c.total_verses;


comment ON view text_chapter_coverage IS 'Text coverage aggregated to chapter level.';


-- Text book coverage: complete when all its chapters are complete
CREATE OR REPLACE VIEW text_book_coverage AS
WITH
  chapters_per_book AS (
    SELECT
      b.id AS book_id,
      COUNT(*) AS total_chapters
    FROM
      chapters c
      JOIN books b ON b.id = c.book_id
    GROUP BY
      b.id
  ),
  chapters_complete AS (
    SELECT
      tcc.text_version_id,
      c.book_id,
      COUNT(*) AS complete_chapters
    FROM
      text_chapter_coverage tcc
      JOIN chapters c ON c.id = tcc.chapter_id
    WHERE
      tcc.is_complete
    GROUP BY
      tcc.text_version_id,
      c.book_id
  )
SELECT
  cpb.book_id,
  cc.text_version_id,
  cc.complete_chapters,
  cpb.total_chapters,
  (
    COALESCE(cc.complete_chapters, 0) = cpb.total_chapters
  ) AS is_complete
FROM
  chapters_per_book cpb
  LEFT JOIN chapters_complete cc ON cc.book_id = cpb.book_id;


comment ON view text_book_coverage IS 'Text coverage aggregated to book level (complete only if all chapters complete).';


-- ============================================================
-- Version-level summaries
-- ============================================================
-- Audio version summary
CREATE OR REPLACE VIEW audio_version_progress_summary AS
WITH
  scope AS (
    SELECT
      av.id,
      av.bible_version_id
    FROM
      audio_versions av
    WHERE
      av.deleted_at IS NULL
  ),
  verse_totals AS (
    SELECT
      s.id AS audio_version_id,
      COUNT(v.id)::BIGINT AS total_verses
    FROM
      scope s
      JOIN books b ON b.bible_version_id = s.bible_version_id
      JOIN chapters c ON c.book_id = b.id
      JOIN verses v ON v.chapter_id = c.id
    GROUP BY
      s.id
  ),
  verse_covered AS (
    SELECT
      avc.audio_version_id,
      COUNT(DISTINCT avc.verse_id)::BIGINT AS covered_verses
    FROM
      audio_verse_coverage avc
    GROUP BY
      avc.audio_version_id
  ),
  chapter_totals AS (
    SELECT
      s.id AS audio_version_id,
      COUNT(c.id)::BIGINT AS total_chapters
    FROM
      scope s
      JOIN books b ON b.bible_version_id = s.bible_version_id
      JOIN chapters c ON c.book_id = b.id
    GROUP BY
      s.id
  ),
  chapters_with_any AS (
    SELECT
      acc.audio_version_id,
      COUNT(*)::BIGINT AS chapters_with_audio
    FROM
      audio_chapter_coverage acc
    WHERE
      acc.has_any
    GROUP BY
      acc.audio_version_id
  ),
  book_totals AS (
    SELECT
      s.id AS audio_version_id,
      COUNT(b.id)::BIGINT AS total_books
    FROM
      scope s
      JOIN books b ON b.bible_version_id = s.bible_version_id
    GROUP BY
      s.id
  ),
  books_complete AS (
    SELECT
      abc.audio_version_id,
      COUNT(*)::BIGINT AS books_complete
    FROM
      audio_book_coverage abc
    WHERE
      abc.is_complete
    GROUP BY
      abc.audio_version_id
  )
SELECT
  s.id AS audio_version_id,
  COALESCE(vc.covered_verses, 0) AS covered_verses,
  vt.total_verses,
  (
    COALESCE(vc.covered_verses, 0)::NUMERIC / NULLIF(vt.total_verses, 0)
  ) AS verse_fraction,
  COALESCE(ca.chapters_with_audio, 0) AS chapters_with_audio,
  ct.total_chapters,
  (
    COALESCE(ca.chapters_with_audio, 0)::NUMERIC / NULLIF(ct.total_chapters, 0)
  ) AS chapter_fraction,
  COALESCE(bc.books_complete, 0) AS books_complete,
  bt.total_books,
  (
    COALESCE(bc.books_complete, 0)::NUMERIC / NULLIF(bt.total_books, 0)
  ) AS book_fraction
FROM
  scope s
  JOIN verse_totals vt ON vt.audio_version_id = s.id
  LEFT JOIN verse_covered vc ON vc.audio_version_id = s.id
  JOIN chapter_totals ct ON ct.audio_version_id = s.id
  LEFT JOIN chapters_with_any ca ON ca.audio_version_id = s.id
  JOIN book_totals bt ON bt.audio_version_id = s.id
  LEFT JOIN books_complete bc ON bc.audio_version_id = s.id;


comment ON view audio_version_progress_summary IS 'Summary coverage metrics for each audio_version.';


-- Text version summary
CREATE OR REPLACE VIEW text_version_progress_summary AS
WITH
  scope AS (
    SELECT
      tv.id,
      tv.bible_version_id
    FROM
      text_versions tv
    WHERE
      tv.deleted_at IS NULL
  ),
  verse_totals AS (
    SELECT
      s.id AS text_version_id,
      COUNT(v.id)::BIGINT AS total_verses
    FROM
      scope s
      JOIN books b ON b.bible_version_id = s.bible_version_id
      JOIN chapters c ON c.book_id = b.id
      JOIN verses v ON v.chapter_id = c.id
    GROUP BY
      s.id
  ),
  verse_covered AS (
    SELECT
      tvc.text_version_id,
      COUNT(DISTINCT tvc.verse_id)::BIGINT AS covered_verses
    FROM
      text_verse_coverage tvc
    GROUP BY
      tvc.text_version_id
  ),
  chapter_totals AS (
    SELECT
      s.id AS text_version_id,
      COUNT(c.id)::BIGINT AS total_chapters
    FROM
      scope s
      JOIN books b ON b.bible_version_id = s.bible_version_id
      JOIN chapters c ON c.book_id = b.id
    GROUP BY
      s.id
  ),
  chapters_complete AS (
    SELECT
      tcc.text_version_id,
      COUNT(*)::BIGINT AS complete_chapters
    FROM
      text_chapter_coverage tcc
    WHERE
      tcc.is_complete
    GROUP BY
      tcc.text_version_id
  ),
  book_totals AS (
    SELECT
      s.id AS text_version_id,
      COUNT(b.id)::BIGINT AS total_books
    FROM
      scope s
      JOIN books b ON b.bible_version_id = s.bible_version_id
    GROUP BY
      s.id
  ),
  books_complete AS (
    SELECT
      tbc.text_version_id,
      COUNT(*)::BIGINT AS books_complete
    FROM
      text_book_coverage tbc
    WHERE
      tbc.is_complete
    GROUP BY
      tbc.text_version_id
  )
SELECT
  s.id AS text_version_id,
  COALESCE(vc.covered_verses, 0) AS covered_verses,
  vt.total_verses,
  (
    COALESCE(vc.covered_verses, 0)::NUMERIC / NULLIF(vt.total_verses, 0)
  ) AS verse_fraction,
  COALESCE(cc.complete_chapters, 0) AS complete_chapters,
  ct.total_chapters,
  (
    COALESCE(cc.complete_chapters, 0)::NUMERIC / NULLIF(ct.total_chapters, 0)
  ) AS chapter_fraction,
  COALESCE(bc.books_complete, 0) AS books_complete,
  bt.total_books,
  (
    COALESCE(bc.books_complete, 0)::NUMERIC / NULLIF(bt.total_books, 0)
  ) AS book_fraction
FROM
  scope s
  JOIN verse_totals vt ON vt.text_version_id = s.id
  LEFT JOIN verse_covered vc ON vc.text_version_id = s.id
  JOIN chapter_totals ct ON ct.text_version_id = s.id
  LEFT JOIN chapters_complete cc ON cc.text_version_id = s.id
  JOIN book_totals bt ON bt.text_version_id = s.id
  LEFT JOIN books_complete bc ON bc.text_version_id = s.id;


comment ON view text_version_progress_summary IS 'Summary coverage metrics for each text_version.';


-- ============================================================
-- Best version per language_entity
-- ============================================================
CREATE OR REPLACE VIEW language_entity_best_audio_version AS
SELECT DISTINCT
  ON (av.language_entity_id) av.language_entity_id,
  av.id AS audio_version_id
FROM
  audio_versions av
  JOIN audio_version_progress_summary s ON s.audio_version_id = av.id
WHERE
  av.deleted_at IS NULL
ORDER BY
  av.language_entity_id,
  s.verse_fraction DESC,
  s.chapter_fraction DESC,
  s.book_fraction DESC,
  av.created_at DESC;


comment ON view language_entity_best_audio_version IS 'Best audio_version per language_entity based on coverage fractions.';


CREATE OR REPLACE VIEW language_entity_best_text_version AS
SELECT DISTINCT
  ON (tv.language_entity_id) tv.language_entity_id,
  tv.id AS text_version_id
FROM
  text_versions tv
  JOIN text_version_progress_summary s ON s.text_version_id = tv.id
WHERE
  tv.deleted_at IS NULL
ORDER BY
  tv.language_entity_id,
  s.verse_fraction DESC,
  s.chapter_fraction DESC,
  s.book_fraction DESC,
  tv.created_at DESC;


comment ON view language_entity_best_text_version IS 'Best text_version per language_entity based on coverage fractions.';


-- ============================================================
-- Indexes to support coverage queries
-- ============================================================
-- Media files filtering for bible audio
CREATE INDEX if NOT EXISTS idx_media_files_audio_published ON media_files (audio_version_id)
WHERE
  media_type = 'audio'
  AND is_bible_audio IS TRUE
  AND upload_status = 'completed'
  AND publish_status = 'published'
  AND audio_version_id IS NOT NULL;


-- Optional chapter expansion
CREATE INDEX if NOT EXISTS idx_media_files_chapter_id ON media_files (chapter_id)
WHERE
  chapter_id IS NOT NULL;


-- media_files_verses lookup by verse
CREATE INDEX if NOT EXISTS idx_media_files_verses_verse_not_deleted ON media_files_verses (verse_id)
WHERE
  deleted_at IS NULL;


-- Structure traversal
CREATE INDEX if NOT EXISTS idx_verses_chapter ON verses (chapter_id);


CREATE INDEX if NOT EXISTS idx_chapters_book ON chapters (book_id);


CREATE INDEX if NOT EXISTS idx_books_bible_version ON books (bible_version_id);


-- Global order for range expansions
CREATE INDEX if NOT EXISTS idx_verses_global_order ON verses (global_order);


-- Text coverage lookups
CREATE INDEX if NOT EXISTS idx_verse_texts_text_version ON verse_texts (text_version_id)
WHERE
  deleted_at IS NULL;
