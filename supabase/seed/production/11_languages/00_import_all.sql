-- Master Language Import Script
-- Generated from ISO 639-3 and ROLV data
-- Run this file to import all language data in the correct order

-- Begin transaction for atomic import
BEGIN;

-- Temporarily disable foreign key constraints for bulk loading
SET session_replication_role = replica;

-- Import language entities (21 chunks)
\i supabase/seed/production/11_languages/01_language_entities.sql
\i supabase/seed/production/11_languages/02_language_entities.sql
\i supabase/seed/production/11_languages/03_language_entities.sql
\i supabase/seed/production/11_languages/04_language_entities.sql
\i supabase/seed/production/11_languages/05_language_entities.sql
\i supabase/seed/production/11_languages/06_language_entities.sql
\i supabase/seed/production/11_languages/07_language_entities.sql
\i supabase/seed/production/11_languages/08_language_entities.sql
\i supabase/seed/production/11_languages/09_language_entities.sql
\i supabase/seed/production/11_languages/10_language_entities.sql
\i supabase/seed/production/11_languages/11_language_entities.sql
\i supabase/seed/production/11_languages/12_language_entities.sql
\i supabase/seed/production/11_languages/13_language_entities.sql
\i supabase/seed/production/11_languages/14_language_entities.sql
\i supabase/seed/production/11_languages/15_language_entities.sql
\i supabase/seed/production/11_languages/16_language_entities.sql
\i supabase/seed/production/11_languages/17_language_entities.sql
\i supabase/seed/production/11_languages/18_language_entities.sql
\i supabase/seed/production/11_languages/19_language_entities.sql
\i supabase/seed/production/11_languages/20_language_entities.sql
\i supabase/seed/production/11_languages/21_language_entities.sql

-- Import language entity sources (33 chunks)
\i supabase/seed/production/11_languages/01_language_entity_sources.sql
\i supabase/seed/production/11_languages/02_language_entity_sources.sql
\i supabase/seed/production/11_languages/03_language_entity_sources.sql
\i supabase/seed/production/11_languages/04_language_entity_sources.sql
\i supabase/seed/production/11_languages/05_language_entity_sources.sql
\i supabase/seed/production/11_languages/06_language_entity_sources.sql
\i supabase/seed/production/11_languages/07_language_entity_sources.sql
\i supabase/seed/production/11_languages/08_language_entity_sources.sql
\i supabase/seed/production/11_languages/09_language_entity_sources.sql
\i supabase/seed/production/11_languages/10_language_entity_sources.sql
\i supabase/seed/production/11_languages/11_language_entity_sources.sql
\i supabase/seed/production/11_languages/12_language_entity_sources.sql
\i supabase/seed/production/11_languages/13_language_entity_sources.sql
\i supabase/seed/production/11_languages/14_language_entity_sources.sql
\i supabase/seed/production/11_languages/15_language_entity_sources.sql
\i supabase/seed/production/11_languages/16_language_entity_sources.sql
\i supabase/seed/production/11_languages/17_language_entity_sources.sql
\i supabase/seed/production/11_languages/18_language_entity_sources.sql
\i supabase/seed/production/11_languages/19_language_entity_sources.sql
\i supabase/seed/production/11_languages/20_language_entity_sources.sql
\i supabase/seed/production/11_languages/21_language_entity_sources.sql
\i supabase/seed/production/11_languages/22_language_entity_sources.sql
\i supabase/seed/production/11_languages/23_language_entity_sources.sql
\i supabase/seed/production/11_languages/24_language_entity_sources.sql
\i supabase/seed/production/11_languages/25_language_entity_sources.sql
\i supabase/seed/production/11_languages/26_language_entity_sources.sql
\i supabase/seed/production/11_languages/27_language_entity_sources.sql
\i supabase/seed/production/11_languages/28_language_entity_sources.sql
\i supabase/seed/production/11_languages/29_language_entity_sources.sql
\i supabase/seed/production/11_languages/30_language_entity_sources.sql
\i supabase/seed/production/11_languages/31_language_entity_sources.sql
\i supabase/seed/production/11_languages/32_language_entity_sources.sql
\i supabase/seed/production/11_languages/33_language_entity_sources.sql

-- Import language aliases (50 chunks)
\i supabase/seed/production/11_languages/01_language_aliases.sql
\i supabase/seed/production/11_languages/02_language_aliases.sql
\i supabase/seed/production/11_languages/03_language_aliases.sql
\i supabase/seed/production/11_languages/04_language_aliases.sql
\i supabase/seed/production/11_languages/05_language_aliases.sql
\i supabase/seed/production/11_languages/06_language_aliases.sql
\i supabase/seed/production/11_languages/07_language_aliases.sql
\i supabase/seed/production/11_languages/08_language_aliases.sql
\i supabase/seed/production/11_languages/09_language_aliases.sql
\i supabase/seed/production/11_languages/10_language_aliases.sql
\i supabase/seed/production/11_languages/11_language_aliases.sql
\i supabase/seed/production/11_languages/12_language_aliases.sql
\i supabase/seed/production/11_languages/13_language_aliases.sql
\i supabase/seed/production/11_languages/14_language_aliases.sql
\i supabase/seed/production/11_languages/15_language_aliases.sql
\i supabase/seed/production/11_languages/16_language_aliases.sql
\i supabase/seed/production/11_languages/17_language_aliases.sql
\i supabase/seed/production/11_languages/18_language_aliases.sql
\i supabase/seed/production/11_languages/19_language_aliases.sql
\i supabase/seed/production/11_languages/20_language_aliases.sql
\i supabase/seed/production/11_languages/21_language_aliases.sql
\i supabase/seed/production/11_languages/22_language_aliases.sql
\i supabase/seed/production/11_languages/23_language_aliases.sql
\i supabase/seed/production/11_languages/24_language_aliases.sql
\i supabase/seed/production/11_languages/25_language_aliases.sql
\i supabase/seed/production/11_languages/26_language_aliases.sql
\i supabase/seed/production/11_languages/27_language_aliases.sql
\i supabase/seed/production/11_languages/28_language_aliases.sql
\i supabase/seed/production/11_languages/29_language_aliases.sql
\i supabase/seed/production/11_languages/30_language_aliases.sql
\i supabase/seed/production/11_languages/31_language_aliases.sql
\i supabase/seed/production/11_languages/32_language_aliases.sql
\i supabase/seed/production/11_languages/33_language_aliases.sql
\i supabase/seed/production/11_languages/34_language_aliases.sql
\i supabase/seed/production/11_languages/35_language_aliases.sql
\i supabase/seed/production/11_languages/36_language_aliases.sql
\i supabase/seed/production/11_languages/37_language_aliases.sql
\i supabase/seed/production/11_languages/38_language_aliases.sql
\i supabase/seed/production/11_languages/39_language_aliases.sql
\i supabase/seed/production/11_languages/40_language_aliases.sql
\i supabase/seed/production/11_languages/41_language_aliases.sql
\i supabase/seed/production/11_languages/42_language_aliases.sql
\i supabase/seed/production/11_languages/43_language_aliases.sql
\i supabase/seed/production/11_languages/44_language_aliases.sql
\i supabase/seed/production/11_languages/45_language_aliases.sql
\i supabase/seed/production/11_languages/46_language_aliases.sql
\i supabase/seed/production/11_languages/47_language_aliases.sql
\i supabase/seed/production/11_languages/48_language_aliases.sql
\i supabase/seed/production/11_languages/49_language_aliases.sql
\i supabase/seed/production/11_languages/50_language_aliases.sql

-- Import language properties (8 chunks)
\i supabase/seed/production/11_languages/01_language_properties.sql
\i supabase/seed/production/11_languages/02_language_properties.sql
\i supabase/seed/production/11_languages/03_language_properties.sql
\i supabase/seed/production/11_languages/04_language_properties.sql
\i supabase/seed/production/11_languages/05_language_properties.sql
\i supabase/seed/production/11_languages/06_language_properties.sql
\i supabase/seed/production/11_languages/07_language_properties.sql
\i supabase/seed/production/11_languages/08_language_properties.sql

-- Import language-region linkages
\i supabase/seed/production/11_languages/99_language_entities_regions.sql

-- Re-enable foreign key constraints
SET session_replication_role = DEFAULT;

-- Commit transaction
COMMIT;

-- Verification queries
SELECT 'Language data import completed!' as status;

-- Count summary
SELECT 
  'language_entities' as table_name,
  count(*) as total
FROM language_entities
UNION ALL
SELECT 'language_entity_sources', count(*) FROM language_entity_sources
UNION ALL
SELECT 'language_aliases', count(*) FROM language_aliases
UNION ALL
SELECT 'language_properties', count(*) FROM language_properties
UNION ALL
SELECT 'language_entities_regions', count(*) FROM language_entities_regions;

-- Level breakdown
SELECT level, count(*) as count 
FROM language_entities 
GROUP BY level 
ORDER BY count DESC;

-- Source breakdown
SELECT source, external_id_type, count(*) as count 
FROM language_entity_sources 
GROUP BY source, external_id_type 
ORDER BY source, external_id_type;

-- Region linkage sample
SELECT 
  le.name as dialect_name,
  r.name as country_name,
  ler.dominance_level
FROM language_entities_regions ler
JOIN language_entities le ON le.id = ler.language_entity_id
JOIN regions r ON r.id = ler.region_id
WHERE le.level = 'dialect'
LIMIT 10;
