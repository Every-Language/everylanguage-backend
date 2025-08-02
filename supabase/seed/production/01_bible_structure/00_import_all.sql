-- Master Bible Import Script
-- Complete Protestant Bible with all verses
-- Generated for 66 books, 1189 chapters, 31,102 verses

-- Begin transaction for atomic import
BEGIN;

-- Temporarily disable foreign key constraints for bulk loading
SET session_replication_role = replica;

-- Import Bible version and books
\i supabase/seed/production/01_bible_structure/01_bible_version_books.sql

-- Import all chapters
\i supabase/seed/production/01_bible_structure/02_all_chapters.sql

-- Import all verses (7 chunks)
\i supabase/seed/production/01_bible_structure/03_verses_000001_005000.sql
\i supabase/seed/production/01_bible_structure/04_verses_005001_010000.sql
\i supabase/seed/production/01_bible_structure/05_verses_010001_015000.sql
\i supabase/seed/production/01_bible_structure/06_verses_015001_020000.sql
\i supabase/seed/production/01_bible_structure/07_verses_020001_025000.sql
\i supabase/seed/production/01_bible_structure/08_verses_025001_030000.sql
\i supabase/seed/production/01_bible_structure/09_verses_030001_031102.sql

-- Re-enable foreign key constraints
SET session_replication_role = DEFAULT;

-- Refresh global order values
SELECT refresh_all_global_orders();

-- Commit transaction
COMMIT;

-- Verification queries
SELECT 'Bible data import completed!' as status;

-- Count summary
SELECT 
  'bible_versions' as table_name,
  count(*) as total
FROM bible_versions
UNION ALL
SELECT 'books', count(*) FROM books
UNION ALL
SELECT 'chapters', count(*) FROM chapters
UNION ALL
SELECT 'verses', count(*) FROM verses;

-- Testament breakdown
SELECT testament, count(*) as book_count 
FROM books 
GROUP BY testament 
ORDER BY testament;

-- Sample data verification
SELECT 
  b.name as book_name,
  c.chapter_number,
  c.total_verses,
  count(v.id) as actual_verses
FROM books b
JOIN chapters c ON c.book_id = b.id
JOIN verses v ON v.chapter_id = c.id
WHERE b.book_number IN (1, 19, 40, 66) -- Genesis, Psalms, Matthew, Revelation
GROUP BY b.name, b.book_number, c.chapter_number, c.total_verses
ORDER BY b.book_number, c.chapter_number
LIMIT 10;
