-- Inline intermediate coverage views into summary views and drop intermediates
-- ============================================================
-- Audio version summary with inlined coverage logic
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
  -- Inlined audio_verse_coverage
  avc AS (
    (
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
    )
  ),
  verse_covered AS (
    SELECT
      avc.audio_version_id,
      COUNT(DISTINCT avc.verse_id)::BIGINT AS covered_verses
    FROM
      avc
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
  -- Inlined audio_chapter_coverage
  acc AS (
    SELECT
      avc.audio_version_id,
      v.chapter_id,
      COUNT(DISTINCT avc.verse_id) AS covered_verses,
      c.total_verses,
      (COUNT(DISTINCT avc.verse_id) > 0) AS has_any,
      (COUNT(DISTINCT avc.verse_id) = c.total_verses) AS is_complete
    FROM
      avc
      JOIN verses v ON v.id = avc.verse_id
      JOIN chapters c ON c.id = v.chapter_id
    GROUP BY
      avc.audio_version_id,
      v.chapter_id,
      c.total_verses
  ),
  chapters_with_any AS (
    SELECT
      acc.audio_version_id,
      COUNT(*)::BIGINT AS chapters_with_audio
    FROM
      acc
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
  -- Inlined audio_book_coverage pieces
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
      acc
      JOIN chapters c ON c.id = acc.chapter_id
    WHERE
      acc.is_complete
    GROUP BY
      acc.audio_version_id,
      c.book_id
  ),
  abc AS (
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
      LEFT JOIN chapters_complete cc ON cc.book_id = cpb.book_id
  ),
  books_complete AS (
    SELECT
      abc.audio_version_id,
      COUNT(*)::BIGINT AS books_complete
    FROM
      abc
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


comment ON view audio_version_progress_summary IS 'Summary coverage metrics for each audio_version. Intermediates inlined.';


-- Text version summary with inlined coverage logic
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
  -- Inlined text_verse_coverage
  tvc AS (
    SELECT
      vt.text_version_id,
      vt.verse_id
    FROM
      verse_texts vt
      JOIN text_versions tv ON tv.id = vt.text_version_id
    WHERE
      vt.deleted_at IS NULL
      AND tv.deleted_at IS NULL
  ),
  verse_covered AS (
    SELECT
      tvc.text_version_id,
      COUNT(DISTINCT tvc.verse_id)::BIGINT AS covered_verses
    FROM
      tvc
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
  -- Inlined text_chapter_coverage
  tcc AS (
    SELECT
      tvc.text_version_id,
      v.chapter_id,
      COUNT(DISTINCT tvc.verse_id) AS verses_with_text,
      c.total_verses,
      (COUNT(DISTINCT tvc.verse_id) = c.total_verses) AS is_complete
    FROM
      tvc
      JOIN verses v ON v.id = tvc.verse_id
      JOIN chapters c ON c.id = v.chapter_id
    GROUP BY
      tvc.text_version_id,
      v.chapter_id,
      c.total_verses
  ),
  chapters_complete AS (
    SELECT
      tcc.text_version_id,
      c.book_id,
      COUNT(*) AS complete_chapters
    FROM
      tcc
      JOIN chapters c ON c.id = tcc.chapter_id
    WHERE
      tcc.is_complete
    GROUP BY
      tcc.text_version_id,
      c.book_id
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
  tbc AS (
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
      LEFT JOIN chapters_complete cc ON cc.book_id = cpb.book_id
  ),
  books_complete AS (
    SELECT
      tbc.text_version_id,
      COUNT(*)::BIGINT AS books_complete
    FROM
      tbc
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
  LEFT JOIN (
    SELECT
      text_version_id,
      SUM(
        CASE
          WHEN is_complete THEN 1
          ELSE 0
        END
      )::BIGINT AS complete_chapters
    FROM
      tcc
    GROUP BY
      text_version_id
  ) cc ON cc.text_version_id = s.id
  JOIN book_totals bt ON bt.text_version_id = s.id
  LEFT JOIN books_complete bc ON bc.text_version_id = s.id;


comment ON view text_version_progress_summary IS 'Summary coverage metrics for each text_version. Intermediates inlined.';


-- Now drop intermediate views that are no longer referenced
DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS audio_book_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS audio_chapter_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS audio_verse_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS text_book_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS text_chapter_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS text_verse_coverage'; EXCEPTION WHEN others THEN NULL; END $$;


DROP VIEW if EXISTS public.passages_with_playlist_id;
